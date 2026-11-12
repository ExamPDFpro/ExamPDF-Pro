import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const MSG: Record<string, [number, string]> = {
  login_required: [401, "Please log in first."], not_purchased: [403, "You have not purchased this PDF."], limit_reached: [403, "Download limit reached for this PDF. Please contact support."],
  rate_limited: [429, "Too many downloads. Please try again in a while."], no_file: [404, "File not found."], server_error: [500, "Something went wrong. Please try again."],
};
const fail = (code: string, extra: Record<string, unknown> = {}) => { const [s, m] = MSG[code] || MSG.server_error; return new Response(JSON.stringify({ error: m, error_code: code, ...extra }), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ud } = await svc.auth.getUser((req.headers.get("Authorization") || "").replace("Bearer ", ""));
    const user = ud?.user; if (!user) return fail("login_required");
    const { product_id } = await req.json();
    if (typeof product_id !== "string" || !/^[0-9a-f-]{36}$/i.test(product_id)) return fail("not_purchased");
    const { data: sf } = await svc.from("pdf_secure_files").select("storage_path").eq("product_id", product_id).maybeSingle();
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
    // Verifies: logged in + owns an APPROVED order + under the download limit + not over the hourly rate limit. Then counts the download.
    const { data: c, error } = await svc.rpc("consume_download", { p_user: user.id, p_product: product_id, p_ip: ip, p_ua: req.headers.get("user-agent") || "" });
    if (error) throw error;
    if (!c?.ok) return fail(c?.error || "server_error", { limit: c?.limit });
    const rollback = () => svc.from("purchases").update({ download_count: Math.max(0, (c.limit ?? 5) - (c.remaining ?? 0) - 1) }).eq("id", c.purchase_id);
    if (!sf) { await rollback(); return fail("no_file"); }
    const { data: prod } = await svc.from("pdf_products").select("title").eq("id", product_id).maybeSingle();
    const name = `${(prod?.title || "ExamPDF").replace(/[^\w\- ]+/g, "").trim() || "ExamPDF"}.pdf`;
    // Short-lived signed URL (10 minutes) from the PRIVATE bucket.
    const { data: su, error: se } = await svc.storage.from("paid-pdfs").createSignedUrl(sf.storage_path, 600, { download: name });
    if (se || !su) { await rollback(); return fail("server_error"); }
    return new Response(JSON.stringify({ url: su.signedUrl, remaining: c.remaining }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (_e) { return fail("server_error"); }
});
