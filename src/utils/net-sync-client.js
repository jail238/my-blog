import { plannerCloud } from './planner-cloud';
import { NET_ORIGIN, matchNetRecords, validNetMessage } from './net-records.js';

export function initNetSync() {
  const byId = (id) => document.getElementById(id);
  const account = byId('sync-account-status');
  const status = byId('sync-transfer-status');
  const save = byId('sync-save');
  const nonce = new URL(location.href).searchParams.get('nonce');
  const source = window.opener;
  const connected = /^[a-f0-9]{48}$/.test(nonce ?? '') && source;
  history.replaceState(null, '', location.pathname);
  let allowed = false;
  let received = false;
  let pending;
  let receiving = false;
  let checking = false;
  const code = `javascript:(()=>{const s=document.createElement('script');s.src=${JSON.stringify(`${location.origin}/net-import.js`)}+'?v=1';s.onerror=()=>alert('M.S.K. Sync could not load. Please retry.');document.head.append(s)})();void(0)`;
  const bookmark = byId('sync-bookmark');
  bookmark.href = code;
  bookmark.addEventListener('click', (event) => { event.preventDefault(); account.textContent = 'Save this link as a bookmark, then run it on NET.'; });
  byId('sync-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code); account.textContent = 'Bookmark URL copied.'; }
    catch { account.textContent = 'Clipboard unavailable. Drag the M.S.K. Sync link to your bookmarks bar.'; }
  });
  if (connected) { byId('sync-transfer').hidden = false; byId('sync-setup').hidden = true; }
  async function checkAccount() {
    if (checking) return;
    if (!plannerCloud) { account.textContent = 'Sync is not configured.'; return; }
    checking = true;
    try {
      const { data: { session } } = await plannerCloud.auth.getSession();
      if (!session) { allowed = false; account.textContent = 'Sign in on the Planner tab, then return here.'; byId('sync-sign-in').hidden = false; save.hidden = true; return; }
      const { data, error } = await plannerCloud.rpc('can_import_net_records');
      if (error) throw error;
      allowed = data === true;
      account.textContent = allowed ? 'Connected · Archive owner' : 'This GitHub account cannot publish archive records.';
      byId('sync-sign-in').hidden = allowed;
      save.hidden = !allowed || !pending;
    } catch { allowed = false; account.textContent = 'Connection could not be verified. Please retry.'; }
    finally { checking = false; }
  }
  byId('sync-check').addEventListener('click', checkAccount);
  window.addEventListener('focus', checkAccount);
  const handshake = setInterval(() => {
    if (connected && allowed && !received && !source.closed) source.postMessage({ channel: 'msk-net-v1', nonce, type: 'READY' }, NET_ORIGIN);
  }, 1000);
  const expiry = setTimeout(() => {
    clearInterval(handshake);
    if (!received && connected) status.textContent = 'Connection expired. Run the NET bookmark again.';
    window.removeEventListener('message', onMessage);
  }, 15 * 60 * 1000);
  async function onMessage(event) {
    if (!connected || !allowed || received || !['PROGRESS', 'RECORDS', 'ERROR'].some((type) => validNetMessage(event, source, nonce, type))) return;
    if (event.data.type === 'PROGRESS') {
      const index = event.data.index;
      if (Number.isInteger(index) && index >= 1 && index <= 5) { byId('sync-progress').hidden = false; byId('sync-progress').value = index; status.textContent = `Reading difficulty ${index}/5…`; }
      return;
    }
    if (event.data.type === 'ERROR') { clearInterval(handshake); status.textContent = String(event.data.message).slice(0, 300); return; }
    if (receiving) return;
    receiving = true;
    try {
      const response = await fetch('/record-catalog.json');
      if (!response.ok) throw new Error('Song catalog could not be loaded. Nothing was saved.');
      pending = matchNetRecords(event.data.payload, await response.json());
      received = true;
      source.postMessage({ channel: 'msk-net-v1', nonce, type: 'RECEIVED' }, NET_ORIGIN);
      clearInterval(handshake);
      byId('sync-progress').hidden = true;
      byId('sync-summary').hidden = false;
      byId('sync-matched').textContent = Object.keys(pending.records).length.toLocaleString('en-US');
      byId('sync-unmatched-count').textContent = pending.unmatched.length.toLocaleString('en-US');
      const unmatched = byId('sync-unmatched');
      unmatched.hidden = pending.unmatched.length === 0;
      const list = unmatched.querySelector('ul');
      list.replaceChildren(...pending.unmatched.map((text) => { const li = document.createElement('li'); li.textContent = text; return li; }));
      status.textContent = pending.unmatched.length ? 'Review unmatched charts below. They will be skipped; their existing records will be kept.' : 'Ready to save.';
      byId('sync-date-note').hidden = false;
      save.hidden = false;
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Import failed. Nothing was saved.'; }
    finally { receiving = false; }
  }
  window.addEventListener('message', onMessage);
  save.addEventListener('click', async () => {
    if (!allowed || !pending || !plannerCloud || save.disabled) return;
    save.disabled = true;
    status.textContent = 'Saving…';
    try {
      const { data, error } = await plannerCloud.rpc('import_net_records', { incoming_records: pending.records, incoming_profile: pending.profile });
      if (error) throw error;
      status.textContent = `Saved · ${data.changed} updated charts · ${data.milestones} new AP/AP+ milestones`;
      save.hidden = true;
      pending = undefined;
      clearTimeout(expiry);
      window.removeEventListener('message', onMessage);
      byId('sync-view').hidden = false;
      if (connected && !source.closed) source.postMessage({ channel: 'msk-net-v1', nonce, type: 'SAVED' }, NET_ORIGIN);
      try { const channel = new BroadcastChannel('msk-records'); channel.postMessage('updated'); channel.close(); } catch {}
    } catch { status.textContent = 'Could not save. Your existing records are unchanged. Check your connection and retry.'; }
    finally { save.disabled = false; }
  });
  window.addEventListener('pagehide', () => { clearTimeout(expiry); clearInterval(handshake); window.removeEventListener('message', onMessage); }, { once: true });
  checkAccount();
}
