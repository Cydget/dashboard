import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadTlsOptions() {
  const key = path.join(rootDir, 'certs', 'key.pem');
  const cert = path.join(rootDir, 'certs', 'cert.pem');
  if (!fs.existsSync(key) || !fs.existsSync(cert)) {
    return null;
  }
  return {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert),
  };
}
