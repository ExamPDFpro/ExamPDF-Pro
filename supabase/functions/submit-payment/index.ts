import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: ud } = await svc.auth.getUser(token);
    const user = ud?.user;
    if (!user) return json({ error: "আগে Login করুন।" }, 401);
    const body = await req.json();
    const ref = String(body.payment_reference || "").trim();
    if (ref.length < 4 || ref.length > 64) return json({ error: "সঠিক Transaction ID / UTR দিন।" }, 400);

    let orderId: string | undefined = body.order_id;
    if (orderId) {
      const { data: o } = await svc.from("orders").select("id,user_id,status").eq("id", orderId).maybeSingle();
      if (!o || o.user_id !== user.id) return json({ error: "Order পাওয়া যায়নি।" }, 404);
      if (o.status === "approved" || o.status === "cancelled") return json({ error: "এই Order-এ আর payment নেওয়া যাবে না।" }, 400);
    } else {
      const ids: string[] = Array.isArray(body.product_ids) ? [...new Set(body.product_ids as string[])] : [];
      if (!ids.length) return json({ error: "কোনো PDF বাছাই করা হয়নি।" }, 400);
      const { data: prods } = await svc.from("pdf_products").select("id,selling_price").in("id", ids).eq("is_published", true).eq("is_active", true);
      const { data: owned } = await svc.from("purchases").select("product_id").eq("user_id", user.id).in("product_id", ids);
      const have = new Set((owned || []).map((r: any) => r.product_id));
      const items = (prods || []).filter((p: any) => !have.has(p.id));
      if (!items.length) return json({ error: "এই PDF(গুলো) আপনি আগেই কিনেছেন বা পাওয়া যায়নি।" }, 400);
      const total = items.reduce((s: number, p: any) => s + Number(p.selling_price), 0);
      const { data: o, error: oe } = await svc.from("orders").insert({ user_id: user.id, total, status: "awaiting_payment" }).select("id").single();
      if (oe) throw oe;
      orderId = o.id;
      const { error: ie } = await svc.from("order_items").insert(items.map((p: any) => ({ order_id: orderId, product_id: p.id, unit_price: p.selling_price })));
      if (ie) throw ie;
    }
    // One UTR cannot be reused on another order unless that payment was rejected.
    const { data: dup } = await svc.from("payments").select("id").ilike("payment_reference", ref).neq("order_id", orderId!).neq("status", "rejected").limit(1);
    if (dup && dup.length) return json({ error: "এই Transaction ID আগেই ব্যবহার হয়েছে।" }, 409);

    const upload_path = `${user.id}/${orderId}-${Date.now()}`;
    const { error: pe } = await svc.from("payments").upsert({ order_id: orderId, user_id: user.id, payment_reference: ref, proof_path: upload_path, status: "pending", reviewed_by: null, reviewed_at: null }, { onConflict: "order_id" });
    if (pe) throw pe;
    await svc.from("orders").update({ status: "payment_submitted" }).eq("id", orderId!);
    return json({ upload_path, order_id: orderId });
  } catch (e) { return json({ error: (e as Error).message || "Server error" }, 500); }
});
