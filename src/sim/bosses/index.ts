// Every boss the game knows. Adding one = a new file next to sunny.ts plus a line here.
import type { Boss } from '../boss';
import type { Fight } from '../fight';
import { Mo } from './mo';
import { Sunny } from './sunny';

export const BOSSES = {
  sunny: (fight: Fight): Boss => new Sunny(fight),
  mo: (fight: Fight): Boss => new Mo(fight),
};
export type BossId = keyof typeof BOSSES;
