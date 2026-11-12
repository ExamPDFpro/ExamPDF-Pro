import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const MSG: Record<string, [number, string]> = {
  login_required: [401, "Please log in first."], bad_reference: [400, "Enter a valid Transaction ID / UTR (4-40 letters or digits)."],
  order_not_found: [404, "Order not found."], order_closed: [400, "This order can no longer accept a payment."], no_items: [400, "No valid PDF selected, or you already own it."],
  invalid_coupon: [400, "Invalid or expired coupon."], coupon_exhausted: [400, "This coupon has reached its usage limit."], coupon_user_limit: [400, "You have already used this coupon the maximum number of times."],
  coupon_min_order: [400, "Order total is below this coupon's minimum."], coupon_not_applicable: [400, "This coupon does not apply to the selected PDFs."],
  duplicate_reference: [409, "This Transaction ID has already been used."], rate_limited: [429, "Too many attempts. Please try again later."], server_error: [500, "Something went wrong. Please try again."],
};
const fail = (code: string, extra: Record<string, unknown> = {}) => { const [s, m] = MSG[code] || MSG.server_error; return new Response(JSON.stringify({ error: m, error_code: code, ...extra }), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); };
const ok = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ud } = await svc.auth.getUser((req.headers.get("Authorization") || "").replace("Bearer ", ""));
    const user = ud?.user; if (!user) return fail("login_required");
    const body = await req.json();
    const ref = String(body.payment_reference || "").trim();
    if (!/^[A-Za-z0-9._\/-]{4,40}$/.test(ref)) return fail("bad_reference");
    let orderId: string | undefined = typeof body.order_id === "string" ? body.order_id : undefined;
    if (orderId) {
      const { data: o } = await svc.from("orders").select("id,user_id,status").eq("id", orderId).maybeSingle();
      if (!o || o.user_id !== user.id) return fail("order_not_found");
      if (!["awaiting_payment", "payment_submitted", "rejected"].includes(o.status)) return fail("order_closed");
    }
    // A UTR can only be used once (unless that payment was rejected).
    let dq = svc.from("payments").select("id").ilike("payment_reference", ref.replace(/[%_]/g, "\\$&")).neq("status", "rejected").limit(1);
    if (orderId) dq = dq.neq("order_id", orderId);
    const { data: dup } = await dq; if (dup && dup.length) return fail("duplicate_reference");
    if (!orderId) {
      const since = new Date(Date.now() - 3600e3).toISOString();
      const { count } = await svc.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).gt("created_at", since);
      if ((count || 0) >= 15) return fail("rate_limited");
      const ids: string[] = Array.isArray(body.product_ids) ? [...new Set((body.product_ids as unknown[]).filter((x) => typeof x === "string") as string[])].slice(0, 50) : [];
      // Prices, coupon and affiliate attribution are all computed in the database, never from the browser.
      const { data: q, error } = await svc.rpc("create_order_from_quote", { p_user: user.id, p_ids: ids, p_coupon: typeof body.coupon_code === "string" ? body.coupon_code.slice(0, 40) : null, p_ref: typeof body.ref === "string" ? body.ref.slice(0, 40) : null });
      if (error) throw error;
      if (!q?.ok) return fail(q?.error || "server_error", { min_order: q?.min_order });
      orderId = q.order_id;
    }
    const upload_path = `${user.id}/${orderId}-${Date.now()}`;
    const { error: pe } = await svc.from("payments").upsert({ order_id: orderId, user_id: user.id, payment_reference: ref, proof_path: upload_path, status: "pending", reviewed_by: null, reviewed_at: null }, { onConflict: "order_id" });
    if (pe) throw pe;
    await svc.from("orders").update({ status: "payment_submitted" }).eq("id", orderId!);
    return ok({ upload_path, order_id: orderId });
  } catch (_e) { return fail("server_error"); }
});
