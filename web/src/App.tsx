import React, { useEffect, useMemo, useState } from 'react';
import { DragPayload, NewTile, PackageItem, Preset, Tile, TileSize } from './types';
import { Board, TONES } from './components/Board';
import { Tray } from './components/Tray';
import { CarryBar } from './components/CarryBar';

let uidCounter = 0;
const nextUid = () => `t${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

// Default square size follows install size, like a real bag: big things take more room.
const sizeFor = (mb?: number): TileSize => (!mb ? 1 : mb >= 1500 ? 3 : mb >= 250 ? 2 : 1);

const STORAGE_KEY = 'edcs.board.v1';

export const App: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [tiles, setTiles] = useState<Tile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Tile[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    Promise.all([fetch('/api/packages').then((r) => r.json()), fetch('/api/presets').then((r) => r.json())])
      .then(([pk, pr]) => {
        if (pk.success) setPackages(pk.data);
        if (pr.success) setPresets(pr.data);
      })
      .catch((err) => console.error('Failed to load catalog', err));
  }, []);

  // The board is the product: keep it across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
    } catch {}
  }, [tiles]);

  const makeTile = (item: NewTile, tone: number): Tile => ({
    ...item,
    uid: nextUid(),
    size: item.size ?? sizeFor(item.size_mb),
    tone: tone % TONES.length,
  });

  const insertAt = (list: Tile[], tile: Tile, index: number) => {
    const copy = list.slice();
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, tile);
    return copy;
  };

  const addTile = (item: NewTile, index?: number) =>
    setTiles((prev) => {
      if (item.pkgId && prev.some((t) => t.pkgId === item.pkgId)) return prev; // catalog items only once
      return insertAt(prev, makeTile(item, prev.length), index ?? prev.length);
    });

  const handleDropAt = (payload: DragPayload, index: number) => {
    if (payload.t === 'new') return addTile(payload.item, index);
    setTiles((prev) => {
      const from = prev.findIndex((t) => t.uid === payload.uid);
      if (from < 0) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(from < index ? index - 1 : index, 0, moved);
      return copy;
    });
  };

  const loadPreset = (preset: Preset) => {
    const items = preset.packages
      .map((id) => packages.find((p) => p.id === id))
      .filter((p): p is PackageItem => Boolean(p));
    setTiles((prev) => {
      const keep = prev.filter((t) => !t.pkgId); // keep what the user typed in
      const added = items.map((p, i) =>
        makeTile(
          { pkgId: p.id, name: p.name.split(' (')[0], winget_id: p.winget_id, brew_cask: p.brew_cask, brew_formula: p.brew_formula, size_mb: p.size_mb },
          keep.length + i
        )
      );
      return [...added, ...keep];
    });
  };

  const onBoardIds = useMemo(() => new Set(tiles.filter((t) => t.pkgId).map((t) => t.pkgId as string)), [tiles]);

  return (
    <div className="linen-texture min-h-screen text-stone-900">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex items-baseline gap-3">
          <span className="font-handwriting text-4xl font-bold">what's in my edc</span>
          <span className="text-xs font-mono-subtle text-stone-600">software carry</span>
        </div>
        <p className="text-sm text-stone-600 mt-2 max-w-xl">
          새 컴퓨터에서 쓸 도구를 칸으로 채우고, 파일 하나를 내려받아 더블클릭하면 설치됩니다.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-48 space-y-8">
        <Board
          tiles={tiles}
          onDropAt={handleDropAt}
          onResize={(uid, size) => setTiles((p) => p.map((t) => (t.uid === uid ? { ...t, size } : t)))}
          onRecolor={(uid) => setTiles((p) => p.map((t) => (t.uid === uid ? { ...t, tone: (t.tone + 1) % TONES.length } : t)))}
          onRemove={(uid) => setTiles((p) => p.filter((t) => t.uid !== uid))}
          onClear={() => setTiles([])}
        />

        <Tray
          packages={packages}
          presets={presets}
          onBoardIds={onBoardIds}
          onAdd={(item) => addTile(item)}
          onRemoveCatalog={(pkgId) => setTiles((p) => p.filter((t) => t.pkgId !== pkgId))}
          onLoadPreset={loadPreset}
        />
      </main>

      <CarryBar tiles={tiles} />
    </div>
  );
};
