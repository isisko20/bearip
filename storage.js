// Shared localStorage-backed store for BEARIP IPs (prototype only, no backend).
const BEARIP_IPS_KEY = 'bearip_ips';
const BEARIP_CURRENT_KEY = 'bearip_current_ip';

function bearipLoadIPs() {
  try {
    const raw = localStorage.getItem(BEARIP_IPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSaveIPs(ips) {
  localStorage.setItem(BEARIP_IPS_KEY, JSON.stringify(ips));
}

function bearipAddIP(ip) {
  const ips = bearipLoadIPs();
  ips.unshift(ip);
  bearipSaveIPs(ips);
  localStorage.setItem(BEARIP_CURRENT_KEY, ip.id);
  return ip;
}

function bearipUpdateIP(id, patch) {
  const ips = bearipLoadIPs();
  const idx = ips.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  ips[idx] = Object.assign({}, ips[idx], patch);
  bearipSaveIPs(ips);
  return ips[idx];
}

function bearipGetCurrentIP() {
  const id = localStorage.getItem(BEARIP_CURRENT_KEY);
  if (!id) return null;
  return bearipLoadIPs().find((i) => i.id === id) || null;
}

function bearipSetCurrentId(id) {
  localStorage.setItem(BEARIP_CURRENT_KEY, id);
}
