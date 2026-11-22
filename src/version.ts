export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD_TIME = __APP_BUILD_TIME__;

export type VersionInfo = {
  version: string;
  buildTime: string;
};

export function isNewerVersion(remote: VersionInfo, local: VersionInfo): boolean {
  if (remote.version !== local.version) {
    const remoteParts = remote.version.split('.').map((part) => Number(part) || 0);
    const localParts = local.version.split('.').map((part) => Number(part) || 0);
    const length = Math.max(remoteParts.length, localParts.length);
    for (let i = 0; i < length; i += 1) {
      const r = remoteParts[i] ?? 0;
      const l = localParts[i] ?? 0;
      if (r > l) return true;
      if (r < l) return false;
    }
  }
  const remoteTime = Date.parse(remote.buildTime);
  const localTime = Date.parse(local.buildTime);
  if (Number.isNaN(remoteTime) || Number.isNaN(localTime)) return false;
  return remoteTime > localTime + 1000;
}
