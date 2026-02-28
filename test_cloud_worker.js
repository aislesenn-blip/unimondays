import fs from 'fs';
const file = 'src/workers/cloud-worker.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'const CHUNK_SIZE = 50;',
  'const CHUNK_SIZE = 50;'
);
console.log(code.includes('const CHUNK_SIZE = 50;'));
