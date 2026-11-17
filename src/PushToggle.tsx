import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { pushState, pushOn, pushOff, type PushState } from './lib/push';
import { useT } from './i18n';
// Footer link: turn browser notifications on / off. Hidden on browsers that cannot do web push.
export default function PushToggle({ cl, say }: { cl: string; say: (s: string) => void }) {
  const t = useT();
  const [st, setSt] = useState<PushState>('unsupported'), [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setSt); }, []);
  if (st === 'unsupported') return null;
  const click = async () => {
    if (busy) return; setBusy(true);
    try {
      if (st === 'on') { setSt(await pushOff()); say(t('push.stopped')); }
      else { const r = await pushOn(); setSt(r); say(r === 'on' ? t('push.ok') : r === 'denied' ? t('push.denied') : t('push.error')); }
    } catch { say(t('push.error')); }
    setBusy(false);
  };
  return <button className={cl} onClick={click} disabled={busy}>{st === 'on' ? <BellOff className="mr-2 inline h-4 w-4" /> : <Bell className="mr-2 inline h-4 w-4" />}{st === 'on' ? t('push.turnoff') : st === 'denied' ? t('push.blocked') : t('push.turnon')}</button>;
}
