// Payment-method ON/OFF settings. Stored inside the existing website_settings 'payment' JSON as `methods`, so no database change is needed.
// Existing methods (UPI ID, QR, Bank) default to ON when nothing is saved, so the live checkout keeps looking exactly as before.
// New app buttons (PhonePe, Paytm, Google Pay) default to OFF until the Admin turns them on.
export const PAY_METHODS = ['upi', 'qr', 'bank', 'phonepe', 'paytm', 'gpay'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const APP_METHODS = ['phonepe', 'paytm', 'gpay'] as const;
const DEFAULT_ON: Record<PayMethod, boolean> = { upi: true, qr: true, bank: true, phonepe: false, paytm: false, gpay: false };
export const isOn = (pay: any, m: PayMethod): boolean => { const v = pay?.methods?.[m]; return typeof v === 'boolean' ? v : DEFAULT_ON[m]; };
// Deep links reuse the Admin's existing UPI ID. Nothing here invents a payee.
export function appLink(m: (typeof APP_METHODS)[number], q: string): string {
  if (m === 'phonepe') return `phonepe://pay?${q}`;
  if (m === 'paytm') return `paytmmp://pay?${q}`;
  return `tez://upi/pay?${q}`;
}
