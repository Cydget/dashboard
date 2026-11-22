import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;

let needRefresh = false;
let offlineReady = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

export function getPwaRegistrationState() {
  return { needRefresh, offlineReady };
}

export function subscribePwaRegistration(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const applyPwaUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    needRefresh = true;
    notify();
  },
  onOfflineReady() {
    offlineReady = true;
    notify();
  },
});
