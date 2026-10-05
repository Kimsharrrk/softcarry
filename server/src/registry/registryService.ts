import fs from 'fs';
import path from 'path';
import { PackageMeta, Preset } from '../types';

class RegistryService {
  private packages: PackageMeta[] = [];
  private packageMap: Map<string, PackageMeta> = new Map();
  private presets: Map<string, Preset> = new Map();

  constructor() {
    this.loadPackages();
    this.initOfficialPresets();
  }

  private loadPackages() {
    try {
      const filePath = path.join(__dirname, 'packages.json');
      const data = fs.readFileSync(filePath, 'utf-8');
      this.packages = JSON.parse(data);
      this.packages.forEach((pkg) => {
        this.packageMap.set(pkg.id, pkg);
      });
      console.log(`[Registry] Successfully loaded ${this.packages.length} packages`);
    } catch (err) {
      console.error('[Registry] Failed to load packages.json', err);
    }
  }

  private initOfficialPresets() {
    const officialPresets: Preset[] = [
      {
        id: 'mage-frontend',
        title: '웹 프론트엔드 마법사',
        class_name: 'Frontend Wizard',
        class_icon: '🧙‍♂️',
        description: 'VS Code, Git, Node.js, Chrome, Slack, 카카오톡',
        packages: ['chrome', 'vscode', 'git', 'nodejs', 'postman', 'slack', 'kakaotalk'],
        created_at: new Date().toISOString(),
        author: 'EDCS Official',
        is_official: true
      },
      {
        id: 'warrior-backend',
        title: '백엔드 스프링 전사',
        class_name: 'Backend Warrior',
        class_icon: '⚔️',
        description: 'IntelliJ, Docker, Git, DBeaver, Postman, 카카오톡',
        packages: ['intellij-ce', 'docker', 'git', 'dbeaver', 'postman', 'chrome', 'kakaotalk'],
        created_at: new Date().toISOString(),
        author: 'EDCS Official',
        is_official: true
      },
      {
        id: 'rogue-student',
        title: '자유 방랑자 (대학생/과제)',
        class_name: 'Student Wanderer',
        class_icon: '🎒',
        description: 'Chrome, Notion, 카카오톡, Zoom, 반디집',
        packages: ['chrome', 'notion', 'kakaotalk', 'zoom', 'bandizip'],
        created_at: new Date().toISOString(),
        author: 'EDCS Official',
        is_official: true
      },
      {
        id: 'assassin-minimal',
        title: '초경량 유목민 암살자',
        class_name: 'Minimal Nomad',
        class_icon: '⚡',
        description: 'Brave 브라우저, Notion, 반디집, 카카오톡',
        packages: ['brave', 'notion', 'bandizip', 'kakaotalk'],
        created_at: new Date().toISOString(),
        author: 'EDCS Official',
        is_official: true
      }
    ];

    officialPresets.forEach((preset) => {
      this.presets.set(preset.id, preset);
    });
  }

  public getAllPackages(): PackageMeta[] {
    return this.packages;
  }

  public getPackageById(id: string): PackageMeta | undefined {
    return this.packageMap.get(id);
  }

  public getPackagesByIds(ids: string[]): PackageMeta[] {
    return ids.map((id) => this.packageMap.get(id)).filter((p): p is PackageMeta => Boolean(p));
  }

  public getAllPresets(): Preset[] {
    return Array.from(this.presets.values());
  }

  public getPresetById(id: string): Preset | undefined {
    return this.presets.get(id);
  }

  public createCustomPreset(preset: Omit<Preset, 'created_at'>): Preset {
    const newPreset: Preset = {
      ...preset,
      created_at: new Date().toISOString()
    };
    this.presets.set(newPreset.id, newPreset);
    return newPreset;
  }
}

export const registryService = new RegistryService();
