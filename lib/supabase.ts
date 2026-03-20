// @ts-nocheck
let _client = null;
export function getSupabase() {
  if (!_client) {
    const { createClient } = require('@supabase/supabase-js');
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}
export const supabase = new Proxy({}, {
  get(_, prop) {
    const c = getSupabase();
    const v = c[prop];
    if (typeof v === 'function') return v.bind(c);
    if (typeof v === 'object' && v !== null) return new Proxy(v, { get(_, p) { const v2 = c[prop][p]; return typeof v2 === 'function' ? v2.bind(c[prop]) : v2; } });
    return v;
  }
});
