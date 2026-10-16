// Rebuild the browser worker from lockfile dependencies. Model snapshots are committed and hash checked.
import {build} from 'esbuild';
import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='vendor/ocr/paddle/',manifest=JSON.parse(readFileSync(dir+'models.json','utf8'));
for(const [file,record] of Object.entries(manifest.models)){
 const hash=createHash('sha256').update(readFileSync(dir+file)).digest('hex');
 if(hash!==record.sha256)throw Error('Model snapshot mismatch: '+file);
}
await build({entryPoints:['dev/receipt-paddle-worker.mjs'],outfile:dir+'worker.mjs',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked',external:['fs','path'],alias:{'onnxruntime-web':'onnxruntime-web/wasm'}});
for(const file of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])copyFileSync('node_modules/onnxruntime-web/dist/'+file,dir+file);
// Runtime and model licenses are retained alongside the vendored assets.
console.log('Built local, single-threaded OCR worker; model hashes verified.');
