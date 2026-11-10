import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: ud } = await svc.auth.getUser(token);
    const user = ud?.user;
    if (!user) return json({ error: "আগে Login করুন।" }, 401);
    const { product_id } = await req.json();
    const { data: pur } = await svc.from("purchases").select("id").eq("user_id", user.id).eq("product_id", product_id).maybeSingle();
    if (!pur) return json({ error: "এই PDF আপনি কেনেননি।" }, 403);
    const { data: sf } = await svc.from("pdf_secure_files").select("storage_path").eq("product_id", product_id).maybeSingle();
    if (!sf) return json({ error: "ফাইল পাওয়া যায়নি।" }, 404);
    const { data: prod } = await svc.from("pdf_products").select("title").eq("id", product_id).maybeSingle();
    const name = `${(prod?.title || "ExamPDF").replace(/[^\w\- ]+/g, "").trim() || "ExamPDF"}.pdf`;
    const { data: su, error } = await svc.storage.from("paid-pdfs").createSignedUrl(sf.storage_path, 120, { download: name });
    if (error || !su) throw error || new Error("signed url failed");
    await svc.from("download_logs").insert({ user_id: user.id, product_id });
    return json({ url: su.signedUrl });
  } catch (e) { return json({ error: (e as Error).message || "Server error" }, 500); }
});
