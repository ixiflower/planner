export class NotificationService {
  private static instance: NotificationService;
  private startSound: HTMLAudioElement | null = null;
  private endSound: HTMLAudioElement | null = null;
  private isEnabled: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.startSound = new Audio('/sounds/event-start.mp3');
      this.endSound = new Audio('/sounds/event-end.mp3');
      
      this.startSound.load();
      this.endSound.load();
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isNotificationsEnabled(): boolean {
    return this.isEnabled;
  }

  public async playEventStartSound(): Promise<void> {
    if (!this.isEnabled || !this.startSound) return;
    
    try {
      this.startSound.currentTime = 0;
      await this.startSound.play();
    } catch (error) {
      console.error('Failed to play event start sound:', error);
    }
  }

  public async playEventEndSound(): Promise<void> {
    if (!this.isEnabled || !this.endSound) return;
    
    try {
      this.endSound.currentTime = 0;
      await this.endSound.play();
    } catch (error) {
      console.error('Failed to play event end sound:', error);
    }
  }

  public destroy(): void {
    if (this.startSound) {
      this.startSound.pause();
      this.startSound = null;
    }
    if (this.endSound) {
      this.endSound.pause();
      this.endSound = null;
    }
  }
}

export default NotificationService;