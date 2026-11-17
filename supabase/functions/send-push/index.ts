import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
// Sends a FREE web-push notification to every saved subscription. Main admin only.
// Secrets (set in Supabase, never in the repo): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ud } = await svc.auth.getUser((req.headers.get("Authorization") || "").replace("Bearer ", ""));
    const user = ud?.user; if (!user) return json({ error: "login_required" }, 401);
    const { data: pr } = await svc.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (pr?.role !== "admin") return json({ error: "not_allowed" }, 403);
    const b = await req.json();
    const title = String(b?.title || "").trim(), body = String(b?.body || "").trim(), url = String(b?.url || "").trim();
    if (title.length < 1 || title.length > 80 || body.length < 1 || body.length > 200) return json({ error: "invalid_message" }, 400);
    if (url && !/^https:\/\//i.test(url)) return json({ error: "invalid_link" }, 400);
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
    const { data: subs, error } = await svc.from("push_subscriptions").select("id,endpoint,p256dh,auth").limit(5000);
    if (error) throw error;
    const payload = JSON.stringify({ title, body, url: url || undefined });
    let sent = 0, failed = 0; const dead: string[] = [];
    for (let i = 0; i < (subs || []).length; i += 20) {
      await Promise.all((subs || []).slice(i, i + 20).map(async (s) => {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++; }
        catch (e: any) { failed++; if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id); }
      }));
    }
    if (dead.length) await svc.from("push_subscriptions").delete().in("id", dead);   // browsers that unsubscribed
    return json({ sent, failed, removed: dead.length, total: (subs || []).length });
  } catch (_e) { return json({ error: "server_error" }, 500); }
});
