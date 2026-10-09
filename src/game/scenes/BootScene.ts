// Runs once: waits for the font, bakes every texture, then starts the fight scene.
import { Scene, Sound } from 'phaser';
import type { GameAudio } from '../../audio';
import { bakeFx } from '../fx';
import { BOSS_VIEWS } from '../views/bossViews';
import { bakeEntities } from '../views/EntityViews';
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

    void loadFont().then(() => {
      bakeWorld(this);
      bakePlayer(this);
      for (const boss of Object.values(BOSS_VIEWS)) boss.bake(this);
      bakeProjectiles(this);
      bakeEntities(this);
      bakePickups(this);
      bakeFx(this);
      bakeHud(this);
      this.scene.start('fight');
    });
  }
}
