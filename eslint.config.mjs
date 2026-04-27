// Root ESLint flat config — re-exports shared config from packages/eslint-config.
// Each app/package may extend or override.
import baseConfig from './packages/eslint-config/index.js';

export default baseConfig;
