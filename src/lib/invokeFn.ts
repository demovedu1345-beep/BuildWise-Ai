// Edge-function invoker that surfaces JSON `error` messages from non-2xx responses.
// supabase.functions.invoke wraps non-2xx responses in FunctionsHttpError and discards
// the body, so users would otherwise see a generic "non-2xx status code" message
// instead of the actual server-side error (e.g. "AI credits exhausted").
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function invokeFn<T = any>(name: string, body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token ?? ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = json?.error || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  if (json?.error) throw new Error(json.error);
  return json as T;
}
