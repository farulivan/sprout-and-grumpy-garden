// Every stage the game knows. Adding one = a new data file next to gardenPath.ts plus a line here.
import { gardenPath } from './gardenPath';
import { mushroomWood } from './mushroomWood';

export const STAGES = { gardenPath, mushroomWood };
export type StageId = keyof typeof STAGES;
