import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyPath = path.join(root, 'certs', 'key.pem');
const certPath = path.join(root, 'certs', 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  await import(pathToFileURL(path.join(root, 'scripts', 'generate-certs.mjs')).href);
}
