// Carries the simulation's events (see src/presentation.ts) to whatever shows them: the synth for sound,
// the fight scene for particles and shake, the HUD for text. Scenes plug themselves in when they start.
import type { GameAudio } from '../audio';
import type { Burst, Presenter, SfxName } from '../presentation';

export interface FxTarget {
  burst(x: number, y: number, burst: Burst): void;
  shake(px: number): void;
  clear(): void;
}
export interface ToastTarget {
  toast(text: string, seconds?: number): void;
  clear(): void;
}

export class GamePresenter implements Presenter {
  fx: FxTarget | null = null;
  hud: ToastTarget | null = null;

  constructor(private audio: GameAudio) {}

  sfx(name: SfxName) {
    this.audio.play(name);
  }
  music(on: boolean) {
    if (on) this.audio.startMusic();
    else this.audio.stopMusic();
  }
  burst(x: number, y: number, burst: Burst) {
    this.fx?.burst(x, y, burst);
  }
  shake(px: number) {
    this.fx?.shake(px);
  }
  toast(text: string, seconds?: number) {
    this.hud?.toast(text, seconds);
  }
  // A new fight starts clean.
  reset() {
    this.fx?.clear();
    this.hud?.clear();
  }
}
