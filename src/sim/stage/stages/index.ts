// Every stage the game knows. Adding one = a new data file next to gardenPath.ts plus a line here.
import { gardenPath } from './gardenPath';

export const STAGES = { gardenPath };
export type StageId = keyof typeof STAGES;
