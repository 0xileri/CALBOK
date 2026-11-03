'use client';
import {useEffect, useState} from 'react';
type Status = {enabled:boolean; available:boolean; used:number; limit:number};

export function AutomaticMemory() {
  const [settings,setSettings] = useState<Status|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/automatic-memory',{signal:controller.signal,cache:'no-store'})
      .then(async response => {
        if (response.ok) setSettings(await response.json());
      }).catch(() => {
        if (!controller.signal.aborted) setError('Could not load automatic memory settings.');
      });
    return () => controller.abort();
  },[]);
  async function toggle() {
    if (!settings) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/automatic-memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!settings.enabled})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update settings.');
    } finally {
      setBusy(false);
    }
  }
  if (!settings) return error ? <p role="alert">{error}</p> : null;
  return <section className="panel operator-settings">
    <h3>Auto-remember verified outcomes</h3>
    <p>{settings.enabled?'Enabled':'Off'} · {settings.used} of {settings.limit} automatic write attempts used.</p>
    <p>Enabling authorizes up to {settings.limit-settings.used} more Walrus Mainnet write attempts, including existing verified outcomes. Writes can spend from your Walrus account. Pausing takes effect before the next job starts.</p>
    <button className="button secondary" disabled={busy||(!settings.enabled&&(!settings.available||settings.used>=settings.limit))} onClick={()=>void toggle()}>{settings.enabled?'Pause auto-remember':'Enable auto-remember'}</button>
    {error&&<p role="alert">{error}</p>}
  </section>;
}
