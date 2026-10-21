#!/usr/bin/env node
/* ============================================================
   Gerador de código de liberação do RodaCerto — USO DO DONO
   ------------------------------------------------------------
   Quando o motorista te pagar o Pix, ele te manda o
   "código de aparelho" que aparece na tela de bloqueio.
   Rode:   node gerar-codigo.js CODIGO_DO_APARELHO
   e envie o resultado de volta pra ele colar no app.

   IMPORTANTE: o 'segredo' abaixo DEVE ser igual ao de app.js.
   ============================================================ */

// >>> Deixe EXATAMENTE igual ao CONFIG_DONO.segredo do app.js <<<
const SEGREDO = 'TROQUE-ESSE-SEGREDO-123';

function hashStr(str){
  let h = 5381;
  for(let i=0;i<str.length;i++){ h = ((h<<5)+h) ^ str.charCodeAt(i); }
  return (h >>> 0);
}

function codigoEsperado(id){
  const n = hashStr(SEGREDO + '|' + id);
  let s = n.toString(36).toUpperCase();
  s = (s + hashStr(id + SEGREDO).toString(36).toUpperCase());
  return s.replace(/[^A-Z0-9]/g,'').slice(0,8);
}

const id = (process.argv[2] || '').trim().toUpperCase();
if(!id){
  console.log('\nUso:  node gerar-codigo.js CODIGO_DO_APARELHO');
  console.log('Ex.:  node gerar-codigo.js A1B2C3\n');
  process.exit(1);
}

console.log('\n==============================');
console.log(' Aparelho : ' + id);
console.log(' LIBERAÇÃO: ' + codigoEsperado(id));
console.log('==============================');
console.log(' Envie o código de LIBERAÇÃO para o motorista colar no app.\n');
