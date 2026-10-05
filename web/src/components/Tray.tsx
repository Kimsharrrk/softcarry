import React, { useState } from 'react';
import { DragPayload, NewTile, PackageItem, Preset } from '../types';
import { DRAG_MIME } from './Board';
import { MagnifyingGlass, Check, Plus } from '@phosphor-icons/react';

// Same rule the server enforces for anything that ends up inside a shell command.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._@+-]{0,100}$/;

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'developer', label: '개발' },
  { id: 'messenger', label: '메신저' },
  { id: 'browser', label: '브라우저' },
  { id: 'productivity', label: '생산성' },
  { id: 'utility', label: '유틸' },
];

interface TrayProps {
  packages: PackageItem[];
  presets: Preset[];
  onBoardIds: Set<string>;
  onAdd: (item: NewTile) => void;
  onRemoveCatalog: (pkgId: string) => void;
  onLoadPreset: (preset: Preset) => void;
}

const toTile = (p: PackageItem): NewTile => ({
  pkgId: p.id,
  name: p.name.split(' (')[0],
  winget_id: p.winget_id,
  brew_cask: p.brew_cask,
  brew_formula: p.brew_formula,
  size_mb: p.size_mb,
});

export const Tray: React.FC<TrayProps> = ({ packages, presets, onBoardIds, onAdd, onRemoveCatalog, onLoadPreset }) => {
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  // custom form
  const [showCustom, setShowCustom] = useState(false);
  const [cName, setCName] = useState('');
  const [cWin, setCWin] = useState('');
  const [cBrew, setCBrew] = useState('');
  const [cBrewKind, setCBrewKind] = useState<'cask' | 'formula'>('cask');
  const [cError, setCError] = useState('');

  const filtered = packages.filter((p) => {
    const q = query.trim().toLowerCase();
    return (cat === 'all' || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  });

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = cName.trim();
    const win = cWin.trim();
    const brew = cBrew.trim();
    if (!name) return setCError('이름을 입력해 주세요.');
    if (!win && !brew) return setCError('winget ID 또는 brew 이름 중 하나는 필요해요.');
    if (win && !SAFE_ID.test(win)) return setCError('winget ID 형식이 올바르지 않아요. 예: Spotify.Spotify');
    if (brew && !SAFE_ID.test(brew)) return setCError('brew 이름 형식이 올바르지 않아요. 예: spotify');
    onAdd({
      name: name.slice(0, 40),
      winget_id: win || null,
      brew_cask: brew && cBrewKind === 'cask' ? brew : null,
      brew_formula: brew && cBrewKind === 'formula' ? brew : null,
    });
    setCName('');
    setCWin('');
    setCBrew('');
    setCError('');
  };

  return (
    <div className="rounded-3xl p-5 sm:p-7 bg-stone-100/80 border border-stone-300/80 shadow-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="font-handwriting text-2xl font-bold text-stone-900">drawer</h3>
          <p className="text-xs text-stone-600">누르면 보드 끝에 추가, 끌어서 원하는 자리에 놓을 수도 있어요.</p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            className="w-full sm:w-56 bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-stone-800"
          />
        </div>
      </div>

      {/* Presets are only a shortcut to fill the board; everything stays editable. */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500">빠른 시작</span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onLoadPreset(p)}
              className="px-3 py-1 rounded-full text-xs border border-stone-300 bg-stone-50 hover:border-stone-800 transition-colors"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors ${
              cat === c.id ? 'bg-stone-900 text-stone-100' : 'bg-stone-200/70 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((p) => {
          const placed = onBoardIds.has(p.id);
          return (
            <button
              key={p.id}
              draggable={!placed}
              onDragStart={(e) => {
                const payload: DragPayload = { t: 'new', item: toTile(p) };
                e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => (placed ? onRemoveCatalog(p.id) : onAdd(toTile(p)))}
              title={placed ? '보드에서 빼기' : '보드에 추가'}
              className={`inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-xl text-sm border transition-all ${
                placed
                  ? 'bg-stone-300/70 border-stone-400 text-stone-500'
                  : 'bg-stone-50 border-stone-300 text-stone-800 hover:border-stone-800 cursor-grab active:cursor-grabbing'
              }`}
            >
              <span>{p.name.split(' (')[0]}</span>
              {placed ? <Check size={12} weight="bold" /> : <Plus size={12} />}
            </button>
          );
        })}
        {filtered.length === 0 && <span className="text-xs text-stone-500">검색 결과가 없어요. 아래에서 직접 입력해 추가해 보세요.</span>}
      </div>

      {/* Custom item */}
      <div className="border-t border-stone-300/70 pt-4">
        <button onClick={() => setShowCustom((v) => !v)} className="text-sm font-semibold text-stone-800 hover:underline">
          {showCustom ? '− 직접 입력 닫기' : '+ 목록에 없는 도구 직접 입력'}
        </button>

        {showCustom && (
          <form onSubmit={submitCustom} className="mt-3 grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1.2fr_auto] gap-2 items-end">
            <label className="text-[11px] text-stone-600">
              이름
              <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Spotify" className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-stone-800" />
            </label>
            <label className="text-[11px] text-stone-600">
              Windows (winget ID)
              <input value={cWin} onChange={(e) => setCWin(e.target.value)} placeholder="Spotify.Spotify" className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-2 text-sm font-mono-subtle focus:outline-none focus:border-stone-800" />
            </label>
            <label className="text-[11px] text-stone-600">
              macOS (brew)
              <div className="mt-1 flex gap-1">
                <input value={cBrew} onChange={(e) => setCBrew(e.target.value)} placeholder="spotify" className="w-full min-w-0 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-2 text-sm font-mono-subtle focus:outline-none focus:border-stone-800" />
                <select value={cBrewKind} onChange={(e) => setCBrewKind(e.target.value as 'cask' | 'formula')} className="bg-stone-50 border border-stone-300 rounded-lg px-1.5 text-xs">
                  <option value="cask">cask</option>
                  <option value="formula">formula</option>
                </select>
              </div>
            </label>
            <button type="submit" className="px-4 py-2 rounded-lg bg-stone-900 text-stone-100 text-sm font-semibold hover:bg-stone-700 transition-colors">
              추가
            </button>
            {cError && <p className="sm:col-span-4 text-xs text-red-600">{cError}</p>}
            <p className="sm:col-span-4 text-[11px] text-stone-500">
              ID는 <span className="font-mono-subtle">winget search 이름</span>, <span className="font-mono-subtle">brew search 이름</span>으로 찾을 수 있어요. 한쪽 OS만 입력해도 됩니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
