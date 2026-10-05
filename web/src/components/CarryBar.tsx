import React, { useState } from 'react';
import { OS, Tile } from '../types';
import { DownloadSimple, Broom, Copy, Check } from '@phosphor-icons/react';

interface CarryBarProps {
  tiles: Tile[];
}

// base64url so the custom list survives a query string (UTF-8 safe).
function encodeCustom(tiles: Tile[]): string {
  const list = tiles
    .filter((t) => !t.pkgId)
    .map((t) => ({ name: t.name, winget_id: t.winget_id, brew_cask: t.brew_cask, brew_formula: t.brew_formula }));
  if (list.length === 0) return '';
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(list))));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const CarryBar: React.FC<CarryBarProps> = ({ tiles }) => {
  const [os, setOs] = useState<OS>('macos');
  const [mode, setMode] = useState<'install' | 'clean'>('install');
  const [copied, setCopied] = useState(false);

  const supports = (t: Tile) => (os === 'windows' ? !!t.winget_id : !!(t.brew_cask || t.brew_formula));
  const installable = tiles.filter(supports);
  const skipped = tiles.length - installable.length;
  const has = installable.length > 0;

  const qs = new URLSearchParams({ os });
  qs.set('packages', tiles.filter((t) => t.pkgId).map((t) => t.pkgId).join(','));
  const custom = encodeCustom(tiles);
  if (custom) qs.set('custom', custom);
  if (mode === 'clean') qs.set('file', '1');

  const path = `/${mode === 'install' ? 'download' : 'clean'}/custom?${qs.toString()}`;

  const cli =
    os === 'windows'
      ? `irm "${location.origin}/${mode === 'install' ? 'run' : 'clean'}/custom?${qs.toString().replace('&file=1', '')}" | iex`
      : `curl -fsSL "${location.origin}/${mode === 'install' ? 'run' : 'clean'}/custom?${qs.toString().replace('&file=1', '')}" | zsh`;

  const copyCli = () => {
    navigator.clipboard.writeText(cli);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(222,217,207,0.96) 70%, transparent)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 pt-8 pointer-events-auto">
        <div className="rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 shadow-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-handwriting text-2xl font-bold leading-none">
              {mode === 'install' ? `${installable.length}개 설치` : `${installable.length}개 삭제`}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {tiles.length === 0
                ? '보드에 칸을 채워 주세요.'
                : skipped > 0
                ? `${os === 'windows' ? 'Windows' : 'macOS'}에서 지원 정보가 없는 ${skipped}개는 제외됩니다.`
                : '내려받은 파일을 더블클릭하면 실행됩니다.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-0.5 rounded-full bg-stone-800 border border-stone-700 text-xs">
              {(['macos', 'windows'] as OS[]).map((o) => (
                <button key={o} onClick={() => setOs(o)} className={`px-3 py-1.5 rounded-full font-medium ${os === o ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-200'}`}>
                  {o === 'macos' ? 'macOS' : 'Windows'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMode((m) => (m === 'install' ? 'clean' : 'install'))}
              className={`px-3 py-2 rounded-full border text-xs flex items-center gap-1.5 ${mode === 'clean' ? 'bg-red-950 text-red-300 border-red-700' : 'bg-stone-800 text-stone-300 border-stone-700 hover:text-white'}`}
              title="공용 PC에서 쓴 뒤 설치한 프로그램을 지우는 파일"
            >
              <Broom size={14} />
              흔적 삭제 {mode === 'clean' ? 'ON' : ''}
            </button>

            <a
              href={has ? path : undefined}
              download
              aria-disabled={!has}
              onClick={(e) => !has && e.preventDefault()}
              className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                !has ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : mode === 'install' ? 'bg-stone-100 text-stone-900 hover:bg-white active:scale-95' : 'bg-red-600 text-white hover:bg-red-500 active:scale-95'
              }`}
            >
              <DownloadSimple size={16} weight="bold" />
              {mode === 'install' ? '실행 파일 받기' : '삭제 파일 받기'} ({os === 'windows' ? '.bat' : '.command'})
            </a>

            <button onClick={copyCli} disabled={!has} className="px-3 py-2 rounded-full text-[11px] font-mono-subtle text-stone-400 hover:text-stone-100 disabled:opacity-40 flex items-center gap-1" title="터미널용 한 줄 명령어 복사">
              {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
              CLI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
