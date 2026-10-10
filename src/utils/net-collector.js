export function runNetCollector(parseScores, parseProfile, siteOrigin) {
  if (location.origin !== 'https://maimaidx-eng.com' || !location.pathname.startsWith('/maimai-mobile/')) {
    alert('Open maimai DX NET International and sign in before running M.S.K. Sync.');
    return;
  }
  if (document.getElementById('msk-net-import')) return;
  const nonce = [...crypto.getRandomValues(new Uint8Array(24))].map((n) => n.toString(16).padStart(2, '0')).join('');
  const panel = document.createElement('section');
  panel.id = 'msk-net-import';
  panel.setAttribute('aria-label', 'M.S.K. record import');
  panel.style.cssText = 'position:fixed;z-index:2147483647;inset:auto 12px 12px;margin:auto;max-width:420px;padding:20px;background:#fff;color:#292d31;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 32px #0004;font:14px/1.5 system-ui;text-align:left;box-sizing:border-box';
  const heading = document.createElement('strong');
  heading.textContent = 'M.S.K. Sync';
  const status = document.createElement('p');
  status.textContent = 'Only scores are sent. Your SEGA password and cookies stay on NET.';
  const button = document.createElement('button');
  button.textContent = 'Connect M.S.K.';
  button.style.cssText = 'padding:10px 16px;border:0;border-radius:6px;background:#30343a;color:white;font:600 14px system-ui;cursor:pointer';
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.style.cssText = 'margin-left:12px;padding:10px;border:0;background:white;color:#555;cursor:pointer';
  panel.append(heading, status, button, close);
  document.body.append(panel);
  let receiver;
  let started = false;
  let controller;
  let resend;
  const timeout = setTimeout(() => { cleanup(); status.textContent = 'Connection expired. Close and run the bookmark again.'; button.disabled = true; }, 15 * 60 * 1000);
  function cleanup() { clearTimeout(timeout); clearInterval(resend); window.removeEventListener('message', onMessage); controller?.abort(); }
  close.onclick = () => { cleanup(); panel.remove(); };
  button.onclick = () => {
    receiver = window.open(`${siteOrigin}/sync/?nonce=${nonce}`, 'msk-net-sync', 'popup,width=640,height=760');
    if (!receiver) { status.textContent = 'Allow pop-ups, then press Connect M.S.K. again.'; return; }
    button.disabled = true;
    status.textContent = 'Keep this NET tab open. Finish connecting in the M.S.K. window.';
  };
  async function getPage(path) {
    const response = await fetch(path, { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok || new URL(response.url).origin !== location.origin || !new URL(response.url).pathname.startsWith('/maimai-mobile/') || new URL(response.url).pathname.includes('/error/')) throw new Error('NET is unavailable or your session expired. Sign in and retry.');
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }
  function send(type, data) { receiver.postMessage({ channel: 'msk-net-v1', nonce, type, ...data }, siteOrigin); }
  async function onMessage(event) {
    if (event.origin !== siteOrigin || event.source !== receiver || event.data?.channel !== 'msk-net-v1' || event.data.nonce !== nonce) return;
    if (event.data.type === 'RECEIVED') { clearInterval(resend); return; }
    if (event.data.type === 'SAVED') { cleanup(); status.textContent = 'Saved to M.S.K. You can close this panel.'; return; }
    if (event.data.type !== 'READY' || started) return;
    started = true;
    controller = new AbortController();
    try {
      const difficulties = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
      const records = [];
      for (let index = 0; index < difficulties.length; index++) {
        status.textContent = `Reading ${difficulties[index]} (${index + 1}/5)…`;
        send('PROGRESS', { index: index + 1 });
        const doc = await getPage(`/maimai-mobile/record/musicGenre/search/?genre=99&diff=${index}`);
        records.push(...parseScores(doc, difficulties[index]));
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      const home = await getPage('/maimai-mobile/home/');
      const profile = parseProfile(home);
      try { Object.assign(profile, parseProfile(await getPage('/maimai-mobile/playerData/'))); } catch {}
      if (!records.length) throw new Error('NET returned no played charts. Nothing was imported.');
      const payload = { version: 1, difficulties, records, profile };
      send('RECORDS', { payload });
      resend = setInterval(() => { if (receiver.closed) cleanup(); else send('RECORDS', { payload }); }, 2000);
      status.textContent = `${records.length} scores read. Review and save them in M.S.K.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Import failed. Nothing was saved.';
      send('ERROR', { message: status.textContent });
      cleanup();
    }
  }
  window.addEventListener('message', onMessage);
}
