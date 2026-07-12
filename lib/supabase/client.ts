import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export const createClient = () => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Lazily-created singleton for components that mount many instances (one
// per feed post/avatar/mention, etc.) -- each currently spins up its own
// GoTrueClient (auth timer + storage listeners) via createClient(). This
// getter creates one on first call and reuses it for every caller.
// Deliberately lazy (not `export const x = createClient()` at module top
// level): "use client" component modules still execute their top-level code
// during the server-side render pass, not only in the browser, and the
// existing `useState(createClient)` pattern already relies on that laziness
// today. Do not change this to eager module-level construction.
let browserClient: ReturnType<typeof createClient> | undefined;
export function getBrowserClient() {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}