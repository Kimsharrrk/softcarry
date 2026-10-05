export type OS = 'windows' | 'macos' | 'linux';

export interface PackageItem {
  id: string;
  name: string;
  category: 'messenger' | 'browser' | 'developer' | 'productivity' | 'utility';
  description: string;
  winget_id: string | null;
  brew_cask?: string | null;
  brew_formula?: string | null;
  size_mb: number;
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  packages: string[];
}

export type TileSize = 1 | 2 | 3;

/** One square on the board. Either picked from the catalog or typed by the user. */
export interface Tile {
  uid: string;
  pkgId?: string; // set when it comes from the catalog
  name: string;
  winget_id?: string | null;
  brew_cask?: string | null;
  brew_formula?: string | null;
  size_mb?: number;
  size: TileSize;
  tone: number; // index into the palette
}

/** What the tray hands to the board when adding a new tile. */
export type NewTile = Omit<Tile, 'uid' | 'tone' | 'size'> & { size?: TileSize };

export type DragPayload = { t: 'new'; item: NewTile } | { t: 'move'; uid: string };
