// Carries the simulation's events (see src/presentation.ts) to whatever shows them: the synth for sound,
// the fight scene for particles and camera effects, the HUD for text. Scenes plug themselves in when they
// start. Views use the same FxTarget for effects of their own (dust under Pip's feet, steam from Sunny).
import type { GameAudio } from '../audio';
import type { Burst, Presenter, Ring, SfxName, ToastTone } from '../presentation';

export interface FxTarget {
  burst(x: number, y: number, burst: Burst): void;
  ring(x: number, y: number, ring: Ring): void;
  shake(px: number): void;
  flash(alpha: number, color?: string): void;
  punch(amount: number): void;
  clear(): void;
}
export interface ToastTarget {
  toast(text: string, seconds?: number, tone?: ToastTone): void;
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
  ring(x: number, y: number, ring: Ring) {
    this.fx?.ring(x, y, ring);
  }
  shake(px: number) {
    this.fx?.shake(px);
  }
  flash(alpha: number, color?: string) {
    this.fx?.flash(alpha, color);
  }
  punch(amount: number) {
    this.fx?.punch(amount);
  }
  toast(text: string, seconds?: number, tone?: ToastTone) {
    this.hud?.toast(text, seconds, tone);
  }
  // A new fight starts clean.
  reset() {
    this.fx?.clear();
    this.hud?.clear();
  }
}
