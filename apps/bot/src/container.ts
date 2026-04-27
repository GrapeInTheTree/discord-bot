import { container } from '@sapphire/framework';

import { branding, type Branding } from './config/branding.js';
import { env, type Env } from './config/env.js';

declare module '@sapphire/pieces' {
  interface Container {
    env: Env;
    branding: Branding;
    // Phase 1 will add: db, services
  }
}

container.env = env;
container.branding = branding;
