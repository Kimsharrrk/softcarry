import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { registryService } from './registry/registryService';
import { templateEngine } from './templates/templateEngine';
import { cacheService } from './cache/cacheService';
import { telemetryService } from './telemetry/telemetryService';
import { OS, PackageMeta } from './types';

dotenv.config();

const server = Fastify({
  logger: false // Set to false during high-throughput benchmarks
});

// Register CORS
server.register(cors, {
  origin: '*'
});

// Helper: detect OS from user-agent or query
function detectOS(userAgent: string | undefined, queryOS?: string): OS {
  if (queryOS === 'windows' || queryOS === 'macos' || queryOS === 'linux') {
    return queryOS as OS;
  }
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('powershell') || ua.includes('windows')) {
    return 'windows';
  }
  if (ua.includes('darwin') || ua.includes('mac') || ua.includes('curl')) {
    return 'macos';
  }
  return 'linux';
}

// 1. One-Liner Script Serving Endpoint (Super-Optimized with L1/L2 Caching)
server.get<{
  Params: { presetId: string };
  Querystring: { os?: string; bypass_cache?: string; packages?: string; custom?: string };
}>('/run/:presetId', async (req, reply) => {
  const startTime = process.hrtime();
  const { presetId } = req.params;
  const os = detectOS(req.headers['user-agent'], req.query.os);
  const bypassCache = req.query.bypass_cache === 'true';

  // Key must reflect the actual contents, otherwise different boards would share one cached script.
  const cacheKey = `script:${os}:${presetId}:${req.query.packages || ''}:${req.query.custom || ''}`;

  // Check Cache
  if (!bypassCache) {
    const cachedScript = await cacheService.get(cacheKey);
    if (cachedScript) {
      const diff = process.hrtime(startTime);
      const elapsedMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
      reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('X-Cache', 'HIT')
        .header('X-Response-Time-Ms', elapsedMs)
        .send(cachedScript);
      return;
    }
  }

  const packages = resolvePackages(presetId, req.query);
  if (!packages) {
    reply.status(404).send(`# Error: Preset '${presetId}' not found on EDCS.\n`);
    return;
  }
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:4000';
  const telemetryUrl = `${protocol}://${host}/api/telemetry`;

  const renderedScript = templateEngine.render(os, presetId, packages, telemetryUrl);

  // Store into cache (10 min TTL)
  await cacheService.set(cacheKey, renderedScript, 600);

  const diff = process.hrtime(startTime);
  const elapsedMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

  reply
    .header('Content-Type', 'text/plain; charset=utf-8')
    .header('X-Cache', 'MISS')
    .header('X-Response-Time-Ms', elapsedMs)
    .send(renderedScript);
});

// 2. Packages Catalog API
server.get('/api/packages', async (_req, reply) => {
  const packages = registryService.getAllPackages();
  return reply.send({ success: true, count: packages.length, data: packages });
});

// 3. Presets API
server.get('/api/presets', async (_req, reply) => {
  const presets = registryService.getAllPresets();
  return reply.send({ success: true, count: presets.length, data: presets });
});

server.post<{
  Body: { id?: string; title: string; description: string; packages: string[] };
}>('/api/presets', async (req, reply) => {
  const { id, title, description, packages } = req.body || {};
  if (!title || !packages || packages.length === 0) {
    return reply.status(400).send({ error: 'Missing title or packages' });
  }

  const slug = (id || `custom-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const created = registryService.createCustomPreset({
    id: slug,
    title,
    class_name: 'Custom Adventurer',
    class_icon: '🎒',
    description: description || 'Custom user preset',
    packages,
    author: 'Community'
  });

  return reply.status(201).send({ success: true, data: created });
});

// ---- Custom (user-typed) items + launcher file builder ----------------------
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._@+-]{0,100}$/;
const SAFE_NAME = /[^0-9A-Za-z가-힣 ._()+-]/g;

// `custom` query = base64url(JSON [{name, winget_id?, brew_cask?, brew_formula?}])
function parseCustomItems(raw: string | undefined): PackageMeta[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 60).flatMap((it: any, i: number): PackageMeta[] => {
      const name = String(it?.name || '').replace(SAFE_NAME, '').trim().slice(0, 40);
      const win = it?.winget_id && SAFE_ID.test(it.winget_id) ? String(it.winget_id) : null;
      const cask = it?.brew_cask && SAFE_ID.test(it.brew_cask) ? String(it.brew_cask) : null;
      const formula = it?.brew_formula && SAFE_ID.test(it.brew_formula) ? String(it.brew_formula) : null;
      if (!name || (!win && !cask && !formula)) return [];
      return [{
        id: `custom-${i}`, name, category: 'utility', description: 'custom', icon: 'Package',
        winget_id: win, brew_cask: cask, brew_formula: formula, popular: false,
        size_mb: 0, slots: '1x1', rarity: 'common', stat_boost: ''
      }];
    });
  } catch {
    return [];
  }
}

function resolvePackages(presetId: string, query: { packages?: string; custom?: string }): PackageMeta[] | null {
  let ids: string[] = [];
  if (query.packages) {
    ids = query.packages.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (!query.custom) {
    const preset = registryService.getPresetById(presetId);
    if (!preset) return null;
    ids = preset.packages;
  }
  return [...registryService.getPackagesByIds(ids), ...parseCustomItems(query.custom)];
}

// Windows: .bat that carries the PowerShell script inside itself (no quoting issues).
function wrapAsBat(ps: string): string {
  const header = [
    '@echo off',
    'chcp 65001 > nul',
    'title EDCS Launcher',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText('%~f0',[Text.Encoding]::UTF8); $i=$s.IndexOf('#PS_START'+[char]10); Invoke-Expression $s.Substring($i)"`,
    'echo.',
    'pause',
    'exit /b',
    '#PS_START',
  ].join('\r\n');
  return `${header}\n${ps}`;
}

function sendLauncher(reply: any, os: OS, kind: 'install' | 'clean', presetId: string, script: string) {
  const isWin = os === 'windows';
  const name = `edcs-${kind}-${presetId}.${isWin ? 'bat' : 'command'}`;
  reply
    .header('Content-Type', 'application/octet-stream')
    .header('Content-Disposition', `attachment; filename="${name}"`)
    .send(isWin ? wrapAsBat(script) : script);
}

// 4. Cleanup (흔적 삭제). ?file=1 -> double-clickable download, otherwise plain text.
server.get<{
  Params: { presetId: string };
  Querystring: { os?: string; packages?: string; custom?: string; file?: string };
}>('/clean/:presetId', async (req, reply) => {
  const { presetId } = req.params;
  const os = detectOS(req.headers['user-agent'], req.query.os);
  const packages = resolvePackages(presetId, req.query);
  if (!packages) return reply.status(404).send(`# Error: Preset '${presetId}' not found on EDCS.\n`);

  const script = templateEngine.renderCleanup(os, packages);
  if (req.query.file) return sendLauncher(reply, os, 'clean', presetId, script);
  reply.header('Content-Type', 'text/plain; charset=utf-8').send(script);
});

// 5. Launcher download (primary UX: double-click, no terminal)
server.get<{
  Params: { presetId: string };
  Querystring: { os?: string; packages?: string; custom?: string };
}>('/download/:presetId', async (req, reply) => {
  const { presetId } = req.params;
  const os = detectOS(req.headers['user-agent'], req.query.os);
  const packages = resolvePackages(presetId, req.query);
  if (!packages) return reply.status(404).send('Preset not found');

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:4000';
  const script = templateEngine.render(os, presetId, packages, `${protocol}://${host}/api/telemetry`);
  sendLauncher(reply, os, 'install', presetId, script);
});

// 6. High-Throughput Telemetry Ingestion (Non-blocking O(1))
server.post<{
  Body: any;
}>('/api/telemetry', async (req, reply) => {
  const body = req.body || {};
  telemetryService.enqueue(body as any);
  return reply.status(202).send({ status: 'accepted' });
});

// 6. Telemetry Statistics Dashboard API
server.get('/api/telemetry/stats', async (_req, reply) => {
  const stats = telemetryService.getStats();
  return reply.send({ success: true, data: stats });
});

// 7. Health Check
server.get('/health', async (_req, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '0.0.0.0';

server.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`\n======================================================`);
  console.log(`🚀 EDCS Backend Core Server running at ${address}`);
  console.log(`📦 Registry loaded with ${registryService.getAllPackages().length} packages`);
  console.log(`⚡ Try: curl http://localhost:${PORT}/run/web-dev | head -n 25`);
  console.log(`======================================================\n`);
});
