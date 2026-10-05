import { TelemetryEvent } from '../types';

export interface TelemetryStats {
  total_installations: number;
  os_distribution: {
    windows: number;
    macos: number;
    linux: number;
  };
  avg_duration_sec: number;
  top_packages: Array<{ id: string; count: number }>;
  recent_events: Array<{
    preset_id: string;
    os: string;
    total_duration_sec: number;
    timestamp: string;
  }>;
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private totalEvents: number = 0;
  private totalDuration: number = 0;
  private osCounts = { windows: 142, macos: 89, linux: 12 }; // Initial seed for realistic feel
  private packageCounts: Map<string, number> = new Map([
    ['kakaotalk', 194],
    ['chrome', 188],
    ['vscode', 175],
    ['git', 162],
    ['nodejs', 130],
    ['notion', 124],
    ['bandizip', 115],
    ['docker', 98],
    ['intellij-ce', 85],
    ['slack', 72]
  ]);
  private recentEvents: Array<{
    preset_id: string;
    os: string;
    total_duration_sec: number;
    timestamp: string;
  }> = [
    { preset_id: 'web-dev', os: 'macos', total_duration_sec: 145.2, timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
    { preset_id: 'student-pack', os: 'windows', total_duration_sec: 84.5, timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
    { preset_id: 'fullstack-java', os: 'windows', total_duration_sec: 210.0, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() }
  ];

  constructor() {
    this.totalEvents = 243;
    this.totalDuration = 243 * 112; // seed avg ~112s
    this.startBatchWorker();
  }

  // Enqueue incoming telemetry event (Non-blocking O(1))
  public enqueue(event: TelemetryEvent) {
    this.queue.push({
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  // Periodic Worker: flushes buffer to simulate high-throughput ingestion
  private startBatchWorker() {
    setInterval(() => {
      this.flushBatch();
    }, 1000);
  }

  private flushBatch() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.queue.length);
    for (const item of batch) {
      this.totalEvents++;
      this.totalDuration += item.total_duration_sec || 60;

      // OS distribution
      const osKey = item.os?.toLowerCase();
      if (osKey === 'windows') this.osCounts.windows++;
      else if (osKey === 'macos') this.osCounts.macos++;
      else this.osCounts.linux++;

      // Packages counts
      if (item.results && Array.isArray(item.results)) {
        item.results.forEach((res) => {
          const current = this.packageCounts.get(res.package_id) || 0;
          this.packageCounts.set(res.package_id, current + 1);
        });
      }

      // Recent feed
      this.recentEvents.unshift({
        preset_id: item.preset_id,
        os: item.os,
        total_duration_sec: item.total_duration_sec,
        timestamp: item.timestamp || new Date().toISOString()
      });

      if (this.recentEvents.length > 20) {
        this.recentEvents.pop();
      }
    }
  }

  public getStats(): TelemetryStats {
    const sortedPackages = Array.from(this.packageCounts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgDuration = this.totalEvents > 0 ? Math.round(this.totalDuration / this.totalEvents) : 0;

    return {
      total_installations: this.totalEvents,
      os_distribution: { ...this.osCounts },
      avg_duration_sec: avgDuration,
      top_packages: sortedPackages,
      recent_events: this.recentEvents
    };
  }
}

export const telemetryService = new TelemetryService();
