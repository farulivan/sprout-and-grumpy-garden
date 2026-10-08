import { AUTO, Game, Scale, type Scene } from 'phaser';
import { H, RES, W } from '../config';

// The canvas is RES times the logical size and Phaser fits it into the parent element, which
// src/ui/layout.ts keeps at the right size.
export function createGame(parent: string, scenes: Scene[]) {
  return new Game({
    type: AUTO,
    parent,
    width: W * RES,
    height: H * RES,
    backgroundColor: '#a8dcff',
    scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH, expandParent: false },
    banner: false,
    scene: scenes,
  });
}

// Every scene looks at the same 960x540 world through a camera zoomed by RES.
export function fitCamera(scene: Scene) {
  scene.cameras.main.setZoom(RES).centerOn(W / 2, H / 2);
}
