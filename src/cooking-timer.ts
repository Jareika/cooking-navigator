export type CookingTimerStatus = "running" | "paused" | "finished";

export interface CookingTimerSnapshot {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: CookingTimerStatus;
}

interface CookingTimer extends CookingTimerSnapshot {
  endsAt?: number;
}

export interface CookingTimerControllerOptions {
  getAlarmSoundUrl: () => string | undefined;
  getAlarmVolume: () => number;
  notice: (message: string) => void;
}

/**
 * Verwaltet die laufenden Koch-Timer unabhängig von CookbookView.
 *
 * Dadurch bleiben Timer aktiv, wenn zwischen Rezeptseiten gewechselt oder
 * die CookbookView neu gerendert wird. Die Zeit wird über einen absoluten
 * Endzeitpunkt berechnet, nicht über einen bloßen Sekundenzähler.
 */
export class CookingTimerController {
  private readonly timers = new Map<string, CookingTimer>();
  private readonly listeners = new Set<() => void>();
  private ticker: number | null = null;
  private preparedAlarm: HTMLAudioElement | null = null;
  private preparedAlarmUrl: string | undefined;

  constructor(
    private readonly options: CookingTimerControllerOptions,
  ) {}

  getTimer(id: string): CookingTimerSnapshot | undefined {
    const timer = this.timers.get(id);

    return timer ? this.toSnapshot(timer) : undefined;
  }

  getTimers(): CookingTimerSnapshot[] {
    return [...this.timers.values()]
      .map((timer) => this.toSnapshot(timer))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Startet einen neuen Timer. Existiert unter derselben ID bereits ein
   * Timer, wird dieser bewusst mit der vollen Dauer neu gestartet.
   */
  start(
    id: string,
    label: string,
    durationMinutes: number,
  ): void {
    const durationSeconds = Math.max(
      1,
      Math.round(durationMinutes * 60),
    );

    this.prepareAlarm();

    this.timers.set(id, {
      id,
      label,
      durationSeconds,
      remainingSeconds: durationSeconds,
      endsAt: Date.now() + durationSeconds * 1_000,
      status: "running",
    });

    this.ensureTicker();
    this.emit();
  }

  pause(id: string): void {
    const timer = this.timers.get(id);

    if (!timer || timer.status !== "running") {
      return;
    }

    timer.remainingSeconds = this.getRemainingSeconds(timer);
    timer.endsAt = undefined;
    timer.status = "paused";

    this.stopTickerWhenIdle();
    this.emit();
  }

  resume(id: string): void {
    const timer = this.timers.get(id);

    if (!timer || timer.status !== "paused") {
      return;
    }

    timer.endsAt = Date.now() + timer.remainingSeconds * 1_000;
    timer.status = "running";

    this.prepareAlarm();
    this.ensureTicker();
    this.emit();
  }

  addSeconds(id: string, seconds: number): void {
    const timer = this.timers.get(id);

    if (
      !timer ||
      timer.status === "finished" ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return;
    }

    if (timer.status === "running") {
      timer.endsAt =
        (timer.endsAt ?? Date.now()) + Math.round(seconds * 1_000);
    } else {
      timer.remainingSeconds += Math.round(seconds);
    }

    this.emit();
  }

  cancel(id: string): void {
    if (!this.timers.delete(id)) {
      return;
    }

    this.stopTickerWhenIdle();
    this.emit();
  }

  dispose(): void {
    if (this.ticker !== null) {
      window.clearInterval(this.ticker);
      this.ticker = null;
    }

    this.timers.clear();
    this.listeners.clear();
    this.preparedAlarm?.pause();
	this.preparedAlarm?.remove();
    this.preparedAlarm = null;
    this.preparedAlarmUrl = undefined;
  }

  private ensureTicker(): void {
    if (this.ticker !== null) {
      return;
    }

    /**
     * Ein kürzeres Intervall sorgt dafür, dass die Anzeige sauber auf die
     * nächste Sekunde springt. Die eigentliche Restzeit wird stets anhand
     * von Date.now() berechnet und driftet daher nicht.
     */
    this.ticker = window.setInterval(() => {
      this.tick();
    }, 250);
  }

  private stopTickerWhenIdle(): void {
    const hasRunningTimer = [...this.timers.values()].some(
      (timer) => timer.status === "running",
    );

    if (hasRunningTimer || this.ticker === null) {
      return;
    }

    window.clearInterval(this.ticker);
    this.ticker = null;
  }

  private tick(): void {
    let timerFinished = false;

    for (const timer of this.timers.values()) {
      if (
        timer.status !== "running" ||
        this.getRemainingSeconds(timer) > 0
      ) {
        continue;
      }

      timer.remainingSeconds = 0;
      timer.endsAt = undefined;
      timer.status = "finished";
      timerFinished = true;

      this.options.notice(`Timer abgelaufen: ${timer.label}`);
      this.playAlarm();
    }

    this.stopTickerWhenIdle();

    /**
     * Auch ohne Ablauf werden Listener benachrichtigt, damit sichtbare
     * Countdown-Anzeigen jede Sekunde aktualisiert werden können.
     */
    this.emit();

    if (timerFinished) {
      this.emit();
    }
  }

  private getRemainingSeconds(timer: CookingTimer): number {
    if (timer.status !== "running" || !timer.endsAt) {
      return timer.remainingSeconds;
    }

    return Math.max(
      0,
      Math.ceil((timer.endsAt - Date.now()) / 1_000),
    );
  }

  private toSnapshot(timer: CookingTimer): CookingTimerSnapshot {
    return {
      id: timer.id,
      label: timer.label,
      durationSeconds: timer.durationSeconds,
      remainingSeconds: this.getRemainingSeconds(timer),
      status: timer.status,
    };
  }

  /**
   * Die Sounddatei wird beim Start bzw. Fortsetzen vorbereitet. Das ist auf
   * Mobilgeräten hilfreicher als erst beim Ablauf des Timers ein Audioelement
   * zu erzeugen. Eine garantierte Wiedergabe bei gesperrtem iOS-Gerät kann
   * ein Obsidian-Plugin dennoch nicht erzwingen.
   */
  private prepareAlarm(): void {
    const alarmUrl = this.options.getAlarmSoundUrl();

    if (!alarmUrl) {
      this.preparedAlarm?.pause();
	  this.preparedAlarm?.remove();
      this.preparedAlarm = null;
      this.preparedAlarmUrl = undefined;
      return;
    }

    if (
      this.preparedAlarm &&
      this.preparedAlarmUrl === alarmUrl
    ) {
      return;
    }

    this.preparedAlarm?.pause();
	this.preparedAlarm?.remove();

    const audio = document.body.createEl("audio");
    audio.preload = "auto";
    audio.src = alarmUrl;
    audio.volume = this.getAlarmVolume();
    audio.load();

    this.preparedAlarm = audio;
    this.preparedAlarmUrl = alarmUrl;
  }

  private playAlarm(): void {
    this.prepareAlarm();

    if (!this.preparedAlarm) {
      return;
    }

    /**
     * Ein Klon erlaubt es, dass mehrere fast gleichzeitig ablaufende Timer
     * ihren Ton jeweils vollständig abspielen können.
     */
    const audio = this.preparedAlarm.cloneNode(true) as HTMLAudioElement;
    audio.volume = this.getAlarmVolume();
    audio.currentTime = 0;

    void audio.play().catch(() => {
      this.options.notice(
        "Der Timer ist abgelaufen, aber der Klingelton konnte nicht abgespielt werden.",
      );
    });
  }

  private getAlarmVolume(): number {
    const volume = this.options.getAlarmVolume();

    if (!Number.isFinite(volume)) {
      return 0.8;
    }

    return Math.max(0, Math.min(1, volume));
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}