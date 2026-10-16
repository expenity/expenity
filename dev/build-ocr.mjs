// Rebuild the pinned local engine bundle; committed language snapshots are intentionally unchanged.
import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('vendor/ocr/core',{recursive:true});
for(const name of ['tesseract.min.js','worker.min.js'])copyFileSync('node_modules/tesseract.js/dist/'+name,'vendor/ocr/'+name);
for(const name of ['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-relaxedsimd-lstm.wasm.js'])copyFileSync('node_modules/tesseract.js-core/'+name,'vendor/ocr/core/'+name);
copyFileSync('node_modules/tesseract.js/LICENSE.md','vendor/ocr/LICENSE-tesseract-js.md');
writeFileSync('vendor/ocr/LICENSE-core',readFileSync('node_modules/tesseract.js-core/LICENSE','utf8').trimEnd()+'\n');
