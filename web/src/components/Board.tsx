import React, { useState } from 'react';
import { DragPayload, Tile, TileSize } from '../types';
import { X, Plus } from '@phosphor-icons/react';

export const DRAG_MIME = 'application/x-edcs';

// Muted palette taken from the reference photo: [background, text]
export const TONES: Array<[string, string]> = [
  ['#2a2826', '#f3efe6'], // charcoal
  ['#f4efe4', '#2b2824'], // cream
  ['#c9d3c4', '#243026'], // sage
  ['#e3c9c0', '#3a2622'], // blush
  ['#b9c6d6', '#1f2b3a'], // dusty blue
  ['#d9c7a3', '#33291a'], // sand
  ['#ffffff', '#1c1917'], // white
  ['#8b6f5a', '#f6efe8'], // mocha
];

const LABEL_SIZE: Record<TileSize, string> = { 1: '1.05rem', 2: '1.6rem', 3: '2.2rem' };

function fmtMb(mb?: number) {
  if (!mb) return '';
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)}gb` : `${mb}mb`;
}

interface BoardProps {
  tiles: Tile[];
  onDropAt: (payload: DragPayload, index: number) => void;
  onResize: (uid: string, size: TileSize) => void;
  onRecolor: (uid: string) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
}

export const Board: React.FC<BoardProps> = ({ tiles, onDropAt, onResize, onRecolor, onRemove, onClear }) => {
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);

  const readPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME);
      return raw ? (JSON.parse(raw) as DragPayload) : null;
    } catch {
      return null;
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readPayload(e);
    setOverIndex(null);
    setDraggingUid(null);
    if (payload) onDropAt(payload, index);
  };

  const allowDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = draggingUid ? 'move' : 'copy';
    if (overIndex !== index) setOverIndex(index);
  };

  return (
    <div className="rounded-3xl p-5 sm:p-8 border-4 border-[#cfc8bc]/70 bg-[#e7e2d8]/60">
      <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-stone-400/40">
        <div className="flex items-baseline gap-3">
          <h2 className="font-handwriting text-3xl font-bold text-stone-900">my edc board</h2>
          <span className="text-xs font-mono-subtle text-stone-600">{tiles.length} items</span>
        </div>
        {tiles.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm font-handwriting text-stone-600 hover:text-stone-900 px-3 py-1 rounded-full border border-stone-400/60 hover:bg-stone-200/70 transition-colors"
          >
            모두 비우기
          </button>
        )}
      </div>

      <div
        className="board-grid min-h-[200px]"
        onDragOver={(e) => allowDrop(e, tiles.length)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverIndex(null);
        }}
        onDrop={(e) => handleDrop(e, tiles.length)}
      >
        {tiles.map((t, i) => {
          const [bg, fg] = TONES[t.tone % TONES.length];
          const n = t.size;
          const hasWin = !!t.winget_id;
          const hasMac = !!(t.brew_cask || t.brew_formula);
          return (
            <div
              key={t.uid}
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ t: 'move', uid: t.uid } as DragPayload));
                e.dataTransfer.effectAllowed = 'move';
                setDraggingUid(t.uid);
              }}
              onDragEnd={() => {
                setDraggingUid(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => allowDrop(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') onRemove(t.uid);
              }}
              style={{
                gridColumn: `span ${n}`,
                gridRow: `span ${n}`,
                background: bg,
                color: fg,
                opacity: draggingUid === t.uid ? 0.35 : 1,
                boxShadow:
                  overIndex === i && draggingUid !== t.uid
                    ? '-7px 0 0 0 #1c1917, 0 6px 14px -2px rgba(44,39,34,0.15)'
                    : undefined,
              }}
              className="group relative rounded-[14px] p-2.5 flex flex-col justify-between select-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-stone-900 flatlay-shadow-sm"
            >
              <div className="flex items-start justify-between gap-1 text-[10px] font-mono-subtle opacity-70">
                <span>{fmtMb(t.size_mb)}</span>
                <span className="flex gap-0.5">
                  {hasWin && <span className="px-1 rounded bg-black/10">W</span>}
                  {hasMac && <span className="px-1 rounded bg-black/10">M</span>}
                </span>
              </div>

              <div
                className="font-handwriting font-bold leading-[1.05] break-words line-clamp-3"
                style={{ fontSize: LABEL_SIZE[n] }}
              >
                {t.name}
              </div>

              {/* Hover / focus controls */}
              <div className="absolute inset-0 rounded-[inherit] bg-stone-900/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-wrap items-center justify-center content-center gap-1 p-1">
                {([1, 2, 3] as TileSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onResize(t.uid, s)}
                    aria-label={`크기 ${['S', 'M', 'L'][s - 1]}`}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold font-mono-subtle ${
                      t.size === s ? 'bg-stone-50 text-stone-900' : 'bg-stone-50/20 text-stone-50 hover:bg-stone-50/40'
                    }`}
                  >
                    {['S', 'M', 'L'][s - 1]}
                  </button>
                ))}
                <button
                  onClick={() => onRecolor(t.uid)}
                  aria-label="색 바꾸기"
                  className="w-6 h-6 rounded-full border-2 border-stone-50"
                  style={{ background: bg }}
                />
                <button
                  onClick={() => onRemove(t.uid)}
                  aria-label="삭제"
                  className="w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Always-present drop target at the end */}
        <div
          style={{
            outline: overIndex === tiles.length ? '2px solid #1c1917' : undefined,
            outlineOffset: 2,
          }}
          className="rounded-[14px] border-2 border-dashed border-stone-500/50 flex flex-col items-center justify-center text-stone-500 text-center p-1"
        >
          <Plus size={18} />
          <span className="font-handwriting text-sm leading-none mt-1">
            {tiles.length === 0 ? '여기에 놓기' : '끝에 놓기'}
          </span>
        </div>
      </div>

      {tiles.length === 0 && (
        <p className="text-center text-sm text-stone-600 mt-5">
          아래 서랍에서 항목을 <b>눌러서</b> 추가하거나 이 보드로 <b>끌어다 놓으세요</b>. 직접 입력한 도구도 넣을 수 있어요.
        </p>
      )}
      {tiles.length > 0 && (
        <p className="text-center text-[11px] font-mono-subtle text-stone-500 mt-5">
          드래그로 순서 변경 · 칸에 마우스를 올리면 크기(S/M/L)·색·삭제
        </p>
      )}
    </div>
  );
};
