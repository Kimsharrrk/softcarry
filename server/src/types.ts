export type OS = 'windows' | 'macos' | 'linux';

export type Category = 'messenger' | 'browser' | 'developer' | 'productivity' | 'utility';

export type SlotSize = '1x1' | '2x1' | '2x2';

export type ItemRarity = 'legendary' | 'epic' | 'rare' | 'common';

export interface PackageMeta {
  id: string;
  name: string;
  category: Category;
  description: string;
  icon: string;
  winget_id: string | null;
  brew_cask?: string | null;
  brew_formula?: string | null;
  popular: boolean;
  size_mb: number;
  slots: SlotSize;
  rarity: ItemRarity;
  stat_boost: string;
}

export interface Preset {
  id: string;
  title: string;
  class_name: string; // e.g. "웹 프론트엔드 마법사"
  class_icon: string; // e.g. "🧙‍♂️"
  description: string;
  packages: string[];
  created_at: string;
  author?: string;
  is_official?: boolean;
}

export interface TelemetryEvent {
  preset_id: string;
  os: string;
  total_duration_sec: number;
  timestamp?: string;
  results?: Array<{
    package_id: string;
    status: 'success' | 'warning' | 'error';
    duration_sec: number;
  }>;
}
