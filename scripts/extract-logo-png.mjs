import fs from 'node:fs';

const svg = fs.readFileSync('public/logo-icon.svg', 'utf8');
const prefix = 'data:image/png;base64,';
const start = svg.indexOf(prefix);
if (start === -1) throw new Error('prefix not found');
const dataStart = start + prefix.length;
const dataEnd = svg.indexOf('"', dataStart);
const b64 = svg.slice(dataStart, dataEnd);
const buf = Buffer.from(b64, 'base64');
console.log('b64 len', b64.length, 'buf len', buf.length, 'magic', buf.subarray(0, 8).toString('hex'));
fs.writeFileSync('build/logo-source.png', buf);
