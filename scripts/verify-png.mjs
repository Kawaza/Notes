import fs from 'node:fs';

const svg = fs.readFileSync('scripts/brand-logo-horizontal.svg', 'utf8');
const m = svg.match(/href="data:image\/png;base64,([^"]+)"/);
const b64 = m[1];
const buf = Buffer.from(b64, 'base64');
const file = fs.readFileSync('src/assets/brand/logo-horizontal.png');

console.log('b64 len', b64.length);
console.log('decoded', buf.length, 'file', file.length, 'match', buf.equals(file));
console.log('IHDR', buf.readUInt32BE(16), buf.readUInt32BE(20));
console.log('IEND at', buf.indexOf('IEND'));
console.log('last bytes', buf.slice(-8).toString('hex'));
