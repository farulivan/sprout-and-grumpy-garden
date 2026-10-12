// Settings a build can be given through the environment (or a .env file). Vite only passes on names that
// start with VITE_, and bakes their values into the built files.
interface ImportMetaEnv {
  // Keeps this build's save apart from other copies of the game on the same domain. See src/save.ts.
  readonly VITE_SAVE_SLOT?: string;
}
