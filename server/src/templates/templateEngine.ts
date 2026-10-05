import fs from 'fs';
import path from 'path';
import { PackageMeta, OS } from '../types';

class TemplateEngine {
  private psTemplate: string = '';
  private shTemplate: string = '';
  private psCleanupTemplate: string = '';
  private shCleanupTemplate: string = '';

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates() {
    try {
      const psPath = path.join(__dirname, 'powershell.template.ps1');
      const shPath = path.join(__dirname, 'bash.template.sh');
      const psCleanPath = path.join(__dirname, 'cleanup.ps1');
      const shCleanPath = path.join(__dirname, 'cleanup.sh');

      this.psTemplate = fs.readFileSync(psPath, 'utf-8');
      this.shTemplate = fs.readFileSync(shPath, 'utf-8');
      if (fs.existsSync(psCleanPath)) this.psCleanupTemplate = fs.readFileSync(psCleanPath, 'utf-8');
      if (fs.existsSync(shCleanPath)) this.shCleanupTemplate = fs.readFileSync(shCleanPath, 'utf-8');

      console.log('[TemplateEngine] Loaded install and cleanup templates successfully');
    } catch (err) {
      console.error('[TemplateEngine] Failed to load template files', err);
    }
  }

  public render(
    os: OS,
    presetId: string,
    packages: PackageMeta[],
    telemetryUrl: string
  ): string {
    if (os === 'windows') {
      return this.renderPowerShell(presetId, packages, telemetryUrl);
    } else {
      return this.renderBash(presetId, packages, telemetryUrl);
    }
  }

  private renderPowerShell(
    presetId: string,
    packages: PackageMeta[],
    telemetryUrl: string
  ): string {
    const validPackages = packages.filter((p) => p.winget_id);
    const packageItems = validPackages
      .map(
        (p) =>
          `    @{ id = "${p.id}"; name = "${p.name.replace(/"/g, '`"')}"; winget_id = "${p.winget_id}" }`
      )
      .join(",\n");

    return this.psTemplate
      .replace('{{PACKAGES_ARRAY}}', packageItems)
      .replace('{{PRESET_ID}}', presetId)
      .replace('{{TELEMETRY_URL}}', telemetryUrl);
  }

  private renderBash(
    presetId: string,
    packages: PackageMeta[],
    telemetryUrl: string
  ): string {
    const validPackages = packages.filter((p) => p.brew_cask || p.brew_formula);
    const packageItems = validPackages
      .map((p) => {
        const type = p.brew_cask ? 'cask' : 'formula';
        const target = p.brew_cask || p.brew_formula || '';
        return `    "${p.id}|${p.name}|${type}|${target}"`;
      })
      .join("\n");

    return this.shTemplate
      .replace('{{PACKAGES_ARRAY}}', packageItems)
      .replace('{{PRESET_ID}}', presetId)
      .replace('{{TELEMETRY_URL}}', telemetryUrl);
  }
  public renderCleanup(os: OS, packages: PackageMeta[]): string {
    if (os === 'windows') {
      const validPackages = packages.filter((p) => p.winget_id);
      const packageItems = validPackages
        .map(
          (p) =>
            `    @{ id = "${p.id}"; name = "${p.name.replace(/"/g, '`"')}"; winget_id = "${p.winget_id}" }`
        )
        .join(",\n");
      return this.psCleanupTemplate.replace('{{PACKAGES_ARRAY}}', packageItems);
    } else {
      const validPackages = packages.filter((p) => p.brew_cask || p.brew_formula);
      const packageItems = validPackages
        .map((p) => {
          const type = p.brew_cask ? 'cask' : 'formula';
          const target = p.brew_cask || p.brew_formula || '';
          return `    "${p.id}|${p.name}|${type}|${target}"`;
        })
        .join("\n");
      return this.shCleanupTemplate.replace('{{PACKAGES_ARRAY}}', packageItems);
    }
  }
}

export const templateEngine = new TemplateEngine();
