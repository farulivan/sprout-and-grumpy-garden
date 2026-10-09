// Runs once: waits for the font, bakes every texture, then starts the fight scene.
import { Scene, Sound, WEBGL, type Renderer } from 'phaser';
import type { GameAudio } from '../../audio';
import { finishBaking } from '../art/bake';
import { bakeFx } from '../fx';
import { BOSS_VIEWS } from '../views/bossViews';
import { bakeHazards } from '../views/HazardViews';
import { bakePickups } from '../views/PickupViews';
import { bakePlayer } from '../views/PlayerView';
import { bakeProjectiles } from '../views/ProjectileViews';
import { bakeWorld } from '../views/WorldView';
import { bakeHud } from './HudScene';

// Text drawn on a canvas uses whatever font is ready at that moment and never updates, so the font has
// to be loaded before anything is baked. If it does not arrive, start anyway with the fallback font.
function loadFont() {
  const loaded = Promise.all(
    ['400', '600', '700'].map((weight) => document.fonts.load(`${weight} 24px Fredoka`)),
  );
  const giveUp = new Promise((resolve) => setTimeout(resolve, 3000));
  return Promise.race([loaded, giveUp]).catch(() => undefined);
}

export class BootScene extends Scene {
  constructor(private audio: GameAudio) {
    super('boot');
  }

  create() {
    // Play the synth through Phaser's audio context, so its unlock, pause-on-blur and master mute apply.
    if (this.sound instanceof Sound.WebAudioSoundManager)
      this.audio.attach(this.sound.context, this.sound.destination);
    this.sound.mute = this.audio.muted;

    // Draw with one texture per batch, on every device (Phaser already does on phones and tablets).
    // Left alone on desktop, it builds a separate shader for each number of textures a batch happens to
    // use, and each first build drops a frame or more in the middle of the fight. Nearly all the art
    // shares a few atlas textures (see art/bake.ts), so this costs very few extra draw calls.
    if (this.renderer.type === WEBGL)
      (this.renderer as Renderer.WebGL.WebGLRenderer).renderNodes.setMaxParallelTextureUnits(1);

    void loadFont().then(() => {
      bakeWorld(this);
      bakePlayer(this);
      for (const boss of Object.values(BOSS_VIEWS)) boss.bake(this);
      bakeProjectiles(this);
      bakeHazards(this);
      bakePickups(this);
      bakeFx(this);
      bakeHud(this);
      finishBaking(this);
      this.scene.start('fight');
    });
  }
}
