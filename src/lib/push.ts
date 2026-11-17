import { supabase, isSupabaseConfigured } from './supabase';
// Free Web Push (browser notifications). The key below is the PUBLIC key; the private key lives only in the server function's secrets.
const VAPID_PUBLIC = 'BJ9-J9pqFhCj3xqpjwIzzvaEzgqL4ZddZpf2nNCrER8d3CqyKxUc8jxuXeswwteehPy86TdBVfr5voEscau1mnQ';
export type PushState = 'unsupported' | 'denied' | 'on' | 'off';
export const pushSupported = () => typeof window !== 'undefined' && isSupabaseConfigured && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const swUrl = () => new URL('sw.js', document.baseURI).toString();
const key = (b64: string) => { const p = '='.repeat((4 - (b64.length % 4)) % 4), s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try { const reg = await navigator.serviceWorker.getRegistration(swUrl()); const sub = await reg?.pushManager.getSubscription(); return sub ? 'on' : 'off'; } catch { return 'off'; }
}
export async function pushOn(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission(); if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.register(swUrl()); await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) }));
  const j: any = sub.toJSON();
  const { error } = await supabase.rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth });
  if (error) { try { await sub.unsubscribe(); } catch { /* ignore */ } throw error; }
  return 'on';
}
export async function pushOff(): Promise<PushState> {
  try { const reg = await navigator.serviceWorker.getRegistration(swUrl()); const sub = await reg?.pushManager.getSubscription(); if (sub) { await supabase.rpc('push_unsubscribe', { p_endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch { /* ignore */ }
  return 'off';
}
