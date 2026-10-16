// Bundled locally. Images and extracted receipt text never leave this worker/device.
import {PaddleOCR} from '@paddleocr/paddleocr-js';
import cvModule from '@techstark/opencv-js';
// Fail closed: model/runtime requests can only read assets from this app origin.
const localFetch=self.fetch.bind(self);
self.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url||input,self.location.href);if(url.origin!==self.location.origin||String(options?.method||input?.method||'GET').toUpperCase()!=='GET')throw Error('Non-local OCR request blocked');return localFetch(input,options);};
let engine;
self.onmessage=async({data})=>{
 let mat;
 try{
  const cv=cvModule instanceof Promise?await cvModule:cvModule;if(!cv.Mat)await new Promise(resolve=>{cv.onRuntimeInitialized=resolve;});
  if(!engine){postMessage({id:data.id,status:'loading'});engine=await PaddleOCR.create({textDetectionModelName:'PP-OCRv5_mobile_det',textDetectionModelAsset:{url:new URL('detection.tar',import.meta.url).href},textRecognitionModelName:'el_PP-OCRv5_mobile_rec',textRecognitionModelAsset:{url:new URL('recognition.tar',import.meta.url).href},textDetectionBatchSize:1,textRecognitionBatchSize:1,ortOptions:{backend:'wasm',numThreads:1,proxy:false,wasmPaths:new URL('./',import.meta.url).href}});}
  postMessage({id:data.id,status:'reading'});mat=cv.matFromImageData(new ImageData(new Uint8ClampedArray(data.pixels),data.width,data.height));const [result]=await engine.predict(mat,{textDetLimitSideLen:1280,textDetLimitType:'max',textRecScoreThresh:0.15});postMessage({id:data.id,result});
 }catch(error){postMessage({id:data.id,error:String(error?.message||error)});}finally{mat?.delete();}
};
