import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const certDir = path.join(root, 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const cnfPath = path.join(certDir, 'openssl.cnf');

const extra = (process.env.DASHBOARD_TLS_HOSTS || '')
  .split(/[,\s]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const ips = new Set(['127.0.0.1', '::1', '192.168.137.1']);
const dns = new Set(['localhost']);

for (const item of extra) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(item) || item.includes(':')) {
    ips.add(item.replace(/^\[|\]$/g, ''));
  } else {
    dns.add(item);
  }
}

for (const addrs of Object.values(os.networkInterfaces())) {
  for (const addr of addrs || []) {
    if (addr.internal && addr.family !== 'IPv4') continue;
    const ip = addr.address;
    if (ip && ip !== '0.0.0.0') ips.add(ip);
  }
}

const ipList = [...ips];
const dnsList = [...dns];
const altNames = [
  ...dnsList.map((name, i) => `DNS.${i + 1} = ${name}`),
  ...ipList.map((ip, i) => `IP.${i + 1} = ${ip}`),
].join('\n');

fs.mkdirSync(certDir, { recursive: true });
fs.writeFileSync(
  cnfPath,
  `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = Dashboard

[v3_req]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
${altNames}
`,
);

execFileSync('openssl', [
  'req',
  '-x509',
  '-newkey',
  'rsa:2048',
  '-sha256',
  '-days',
  '3650',
  '-nodes',
  '-keyout',
  keyPath,
  '-out',
  certPath,
  '-config',
  cnfPath,
]);

console.log(`Wrote ${certPath}`);
console.log(`SAN DNS: ${dnsList.join(', ')}`);
console.log(`SAN IP: ${ipList.join(', ')}`);
