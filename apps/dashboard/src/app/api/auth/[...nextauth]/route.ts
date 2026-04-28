// NextAuth v5 catch-all route. `handlers` is `{ GET, POST }` — re-export
// for Next.js App Router consumption.
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
