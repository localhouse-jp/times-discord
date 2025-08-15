import fs from 'fs';
import { CONSTANTS } from '../constants';

export interface BotConfig {
  notificationChannelId?: string;
  notificationEnabled: boolean;
  timesChannelId?: string;
  greetingMessage: string;
  threadArchiveMinutes: number;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;
  private readonly configFile: string;

  private constructor() {
    this.configFile = CONSTANTS.CONFIG_FILE;
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getDefaultConfig(): BotConfig {
    return {
      notificationEnabled: true,
      greetingMessage: CONSTANTS.DEFAULT_GREETING,
      threadArchiveMinutes: CONSTANTS.DEFAULT_ARCHIVE_MINUTES
    };
  }

  private loadConfig(): void {
    if (fs.existsSync(this.configFile)) {
      try {
        const data = fs.readFileSync(this.configFile, 'utf-8');
        this.config = { ...this.config, ...JSON.parse(data) };
      } catch (err) {
        console.error('設定ファイル読み込みエラー:', err);
      }
    }
  }

  saveConfig(): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('設定ファイル保存エラー:', err);
    }
  }

  getConfig(): BotConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BotConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  get notificationEnabled(): boolean {
    return this.config.notificationEnabled;
  }

  get notificationChannelId(): string | undefined {
    return this.config.notificationChannelId;
  }

  get timesChannelId(): string | undefined {
    return this.config.timesChannelId;
  }

  get greetingMessage(): string {
    return this.config.greetingMessage;
  }

  get threadArchiveMinutes(): number {
    return this.config.threadArchiveMinutes;
  }
}