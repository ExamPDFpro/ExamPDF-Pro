import { useSyncExternalStore } from 'react';
import { enStore } from './en.store'; import { bnStore } from './bn.store'; import { hiStore } from './hi.store';
import { enAdmin } from './en.admin'; import { bnAdmin } from './bn.admin'; import { hiAdmin } from './hi.admin';
export type Lang = 'en' | 'bn' | 'hi';
export const en = { ...enStore, ...enAdmin };
export type Key = keyof typeof en;
const dict: Record<Lang, Record<string, string>> = { en, bn: { ...bnStore, ...bnAdmin }, hi: { ...hiStore, ...hiAdmin } };
export const LANGS: { code: Lang; label: string }[] = [{ code: 'en', label: 'English' }, { code: 'bn', label: 'বাংলা' }, { code: 'hi', label: 'हिन्दी' }];
const LS = 'exampdf_lang';
const read = (): Lang => { try { const v = localStorage.getItem(LS); return v === 'bn' || v === 'hi' ? v : 'en'; } catch { return 'en'; } };
let cur: Lang = read();
let overrides: Record<string, Record<string, string>> = {};
const subs = new Set<() => void>();
const FONT_ID = 'exampdf-lang-font';
function applyDoc() {
  document.documentElement.lang = cur;
  document.getElementById(FONT_ID)?.remove();
  if (cur === 'en') return;
  const fam = cur === 'bn' ? 'Noto+Sans+Bengali:wght@400;600;800' : 'Noto+Sans+Devanagari:wght@400;600;800';
  const l = document.createElement('link'); l.id = FONT_ID; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`; document.head.appendChild(l);
}
applyDoc();
export const getLang = () => cur;
export function setLang(l: Lang) { cur = l; try { localStorage.setItem(LS, l); } catch { /* storage unavailable */ } applyDoc(); subs.forEach((f) => f()); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useLang = (): Lang => useSyncExternalStore(subscribe, getLang, getLang);
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dict[cur][key] ?? en[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export const useT = () => { useLang(); return t; };
export function setOverrides(o: any) { overrides = o && typeof o === 'object' ? o : {}; }
export const getOverrides = () => overrides;
/** Admin-editable text: use the admin's per-language override, else the built-in translation when the text is still the default, else the original. */
export function dyn(key: string, value: string | undefined | null, tkey?: Key): string {
  const v = value ?? '';
  if (!v || cur === 'en') return v;
  const o = overrides?.[cur]?.[key];
  if (o && o.trim()) return o;
  if (tkey && v === en[tkey]) return t(tkey);
  return v;
}
/** True when `dyn` would have to fall back to the English text for a custom (non-default) value. */
export function missingTranslation(lang: Lang, key: string, value: string | undefined | null, tkey?: Key): boolean {
  const v = value ?? ''; if (!v || lang === 'en') return false;
  if ((overrides?.[lang]?.[key] || '').trim()) return false;
  if (tkey && v === en[tkey]) return false;
  return true;
}
/** Group of fields shown in one language only: if any field lacks a translation, the whole group is shown in English. */
export function dynGroup<T extends Record<string, { v: string | undefined | null; tkey?: Key }>>(prefix: string, fields: T): { [K in keyof T]: string } {
  const out: any = {};
  const missing = cur !== 'en' && Object.entries(fields).some(([f, x]) => missingTranslation(cur, `${prefix}.${f}`, x.v, x.tkey));
  for (const [f, x] of Object.entries(fields)) out[f] = missing ? (x.v ?? '') : dyn(`${prefix}.${f}`, x.v, x.tkey);
  return out;
}
/** Database item with *_bn / *_hi columns (products, categories). Whole item falls back to English if any non-empty English field is untranslated. */
export function locItem<T extends Record<string, any>>(item: T, fields: string[]): Record<string, string> {
  const out: Record<string, string> = {}; const L = cur;
  const miss = L !== 'en' && fields.some((f) => (item[f] ?? '') !== '' && !(String(item[`${f}_${L}`] ?? '').trim()));
  for (const f of fields) out[f] = !miss && L !== 'en' && String(item[`${f}_${L}`] ?? '').trim() ? String(item[`${f}_${L}`]) : String(item[f] ?? '');
  return out;
}
export const itemMissing = (item: Record<string, any>, fields: string[], L: 'bn' | 'hi') => fields.some((f) => (item[f] ?? '') !== '' && !String(item[`${f}_${L}`] ?? '').trim());
