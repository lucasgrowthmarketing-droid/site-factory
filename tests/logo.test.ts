import {test} from "node:test";
import assert from "node:assert/strict";
import {validateLogoFile,LOGO_MAX_INPUT} from "../src/lib/logo";
import {isLogoUrl} from "../src/lib/domain";
test("upload aceita imagens raster e limita arquivos antes da leitura",()=>{
  for (const type of ['image/png','image/jpeg','image/webp']) assert.doesNotThrow(()=>validateLogoFile({type,size:100}));
  for (const type of ['image/svg+xml','text/html','application/pdf']) assert.throws(()=>validateLogoFile({type,size:100}),/PNG/);
  assert.throws(()=>validateLogoFile({type:'image/png',size:LOGO_MAX_INPUT+1}),/10 MB/);
  assert.throws(()=>validateLogoFile({type:'image/png',size:0}),/10 MB/);
});
test("logos locais admitem somente raster base64 limitado e URLs externas usam HTTPS",()=>{
  assert.equal(isLogoUrl('https://example.com/logo.png'),true);
  assert.equal(isLogoUrl('https://'),false);
  assert.equal(isLogoUrl('http://example.com/logo.png'),false);
  assert.equal(isLogoUrl('data:image/webp;base64,YWJjZA=='),true);
  assert.equal(isLogoUrl('data:image/svg+xml;base64,YWJjZA=='),false);
  assert.equal(isLogoUrl('javascript:alert(1)'),false);
  assert.equal(isLogoUrl('data:image/png;base64,'+'A'.repeat(270001)),false);
});
