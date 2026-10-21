/* ============================================================
   RodaCerto — gestor financeiro do motorista de app
   Dados 100% no navegador (localStorage). Com backup em arquivo.
   ============================================================ */

const STORE = 'rodacerto_v1';
const LIC_STORE = 'rodacerto_lic_v1';

/* ============================================================
   LICENÇA / TRIAL
   - 7 dias grátis a partir do 1º uso
   - Depois trava e pede Pix de R$ 20
   - Código de liberação é AMARRADO AO APARELHO:
     o código que você gera só funciona naquele celular.
     Se o motorista passar pra outro, não libera (ID diferente).
   ============================================================ */

// >>> CONFIGURE AQUI (seus dados de recebimento) <<<
const CONFIG_DONO = {
  pix: 'sua-chave-pix@exemplo.com',   // troque pela sua chave Pix
  whatsapp: '5511999999999',          // seu número com DDI+DDD, só números
  diasTrial: 7,
  segredo: 'TROQUE-ESSE-SEGREDO-123'  // segredo secreto SÓ SEU (nunca divulgue)
};

function licCarregar(){
  try{ return JSON.parse(localStorage.getItem(LIC_STORE)) || {}; }
  catch(e){ return {}; }
}
function licSalvar(l){ localStorage.setItem(LIC_STORE, JSON.stringify(l)); }

// Gera/recupera um ID único e estável para ESTE aparelho/navegador
function idAparelho(){
  let l = licCarregar();
  if(!l.idAparelho){
    // 6 caracteres legíveis, baseado em aleatoriedade local do aparelho
    const base = (Date.now().toString(36) + Math.random().toString(36).slice(2)).toUpperCase();
    l.idAparelho = base.replace(/[^A-Z0-9]/g,'').slice(0,6);
    licSalvar(l);
  }
  return l.idAparelho;
}

// Hash simples e determinístico (sem libs). Converte string -> número.
function hashStr(str){
  let h = 5381;
  for(let i=0;i<str.length;i++){ h = ((h<<5)+h) ^ str.charCodeAt(i); }
  return (h >>> 0);
}

// O código de liberação correto para ESTE aparelho.
// Depende do ID do aparelho + do seu segredo => só você consegue gerar,
// e só vale naquele aparelho específico.
function codigoEsperado(id){
  const n = hashStr(CONFIG_DONO.segredo + '|' + id);
  // vira um código de 8 caracteres alfanuméricos legível
  let s = n.toString(36).toUpperCase();
  s = (s + hashStr(id + CONFIG_DONO.segredo).toString(36).toUpperCase());
  return s.replace(/[^A-Z0-9]/g,'').slice(0,8);
}

function licAtivada(){ return licCarregar().ativada === true; }

// Marca início do trial no 1º uso e retorna quantos dias faltam (ou negativo se expirou)
function diasRestantesTrial(){
  let l = licCarregar();
  if(!l.inicio){ l.inicio = Date.now(); licSalvar(l); }
  const passados = (Date.now() - l.inicio) / (1000*60*60*24);
  return Math.ceil(CONFIG_DONO.diasTrial - passados);
}

function tentarLiberar(codigoDigitado){
  const id = idAparelho();
  const esperado = codigoEsperado(id);
  if((codigoDigitado||'').trim().toUpperCase() === esperado){
    const l = licCarregar(); l.ativada = true; licSalvar(l);
    return true;
  }
  return false;
}

// Decide se mostra app, faixa de trial ou bloqueio
function checarLicenca(){
  const faixa = document.getElementById('faixa-trial');
  const bloq = document.getElementById('tela-bloqueio');

  if(licAtivada()){
    faixa.classList.add('hidden');
    bloq.classList.add('hidden');
    return;
  }

  const dias = diasRestantesTrial();
  if(dias > 0){
    // ainda no trial
    faixa.classList.remove('hidden');
    bloq.classList.add('hidden');
    faixa.innerHTML = `🎁 Teste grátis: faltam <b>${dias} dia${dias>1?'s':''}</b>. Depois libere por R$ 20.`;
    faixa.classList.toggle('urgente', dias<=2);
  }else{
    // expirou -> bloqueia
    faixa.classList.add('hidden');
    montarTelaBloqueio();
    bloq.classList.remove('hidden');
  }
}

function montarTelaBloqueio(){
  const id = idAparelho();
  document.getElementById('id-aparelho').textContent = id;
  document.getElementById('pix-chave').textContent = CONFIG_DONO.pix;
  const msg = encodeURIComponent(`Olá! Quero liberar o RodaCerto. Meu código de aparelho é: ${id}`);
  document.getElementById('link-whatsapp').href = `https://wa.me/${CONFIG_DONO.whatsapp}?text=${msg}`;
}


// ---------- Estado padrão ----------
function estadoPadrao(){
  return {
    // despesas por tipo: 'fixa' | 'variavel' | 'avulsa'
    despesas: [],          // [{id, nome, valor, tipo}]
    // cartões por pessoa, com parcelas e controle de pagamento do mês
    cartoes: [],           // [{id, dono, vencimento, parcelas:[{id,nome,valor,total,paga,restantes}], pago:{'YYYY-MM':true}}]
    carro: { combustivel:0, consumo:0, manutencao:0 },
    meta: { dias:24, kmDia:200, lucro:0 },
    ganhos: []             // [{id, data:'YYYY-MM-DD', valor}]
  };
}

// Sugestões prontas por tipo (o motorista toca e já adiciona)
const SUGESTOES = {
  fixa:    ['Aluguel','Mensalidade do carro','Internet','Escola das crianças','Seguro do carro','Plano de saúde'],
  variavel:['Combustível','Comida / mercado','Energia (luz)','Água','Gás','Telefone'],
  avulsa:  ['Manutenção','Pneu','Troca de óleo','Multa','Peça do carro','Imprevisto']
};

let dados = carregar();

function carregar(){
  try{
    const raw = localStorage.getItem(STORE);
    if(!raw) return estadoPadrao();
    return Object.assign(estadoPadrao(), JSON.parse(raw));
  }catch(e){ return estadoPadrao(); }
}
function salvar(){ localStorage.setItem(STORE, JSON.stringify(dados)); }

// ---------- Utilidades ----------
const $ = (s)=>document.querySelector(s);
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const numero = (v)=>{ const n = parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; };
const reais = (v)=>'R$ '+ (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const reaisCurto = (v)=>'R$ '+ Math.round(Number(v)||0).toLocaleString('pt-BR');
function hojeISO(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2200);
}

// ---------- CÁLCULOS PRINCIPAIS ----------
// Soma das despesas (opcionalmente filtrando por tipo)
function somaDespesas(tipo){
  return dados.despesas
    .filter(d=> !tipo || d.tipo===tipo)
    .reduce((s,d)=>s+numero(d.valor),0);
}

// Quanto de parcela de cartão cai ESTE mês (só parcelas que ainda têm valor a pagar)
function totalCartoesMes(){
  let total = 0;
  (dados.cartoes||[]).forEach(c=>{
    (c.parcelas||[]).forEach(p=>{
      if(numero(p.restantes) > 0) total += numero(p.valor);
    });
  });
  return total;
}

// Total geral de despesas do mês = despesas (todos os tipos) + parcelas de cartão do mês
function totalDespesas(){ return somaDespesas() + totalCartoesMes(); }

// Custo por km rodado (só o combustível + outros custos por km)
function custoPorKm(){
  const c = dados.carro;
  const comb = (numero(c.consumo)>0) ? numero(c.combustivel)/numero(c.consumo) : 0;
  return comb + numero(c.manutencao);
}

// Meta mensal = despesas + lucro desejado
function metaMensal(){ return totalDespesas() + numero(dados.meta.lucro); }

// Meta diária = meta mensal / dias trabalhados
function metaDiaria(){
  const dias = numero(dados.meta.dias)||1;
  return metaMensal()/dias;
}

// Mínimo aceitável por km: precisa cobrir o custo do km + contribuir pra meta.
// Lógica: por dia ele roda kmDia e quer ganhar (líquido) a metaDiaria.
// Então faturamento/km mínimo = custoPorKm + (metaDiaria / kmDia)
function minimoPorKm(){
  const kmDia = numero(dados.meta.kmDia)||1;
  return custoPorKm() + (metaDiaria()/kmDia);
}

// ---------- GANHOS ----------
function ganhosDe(dataISO){ return dados.ganhos.filter(g=>g.data===dataISO); }
function totalDia(dataISO){ return ganhosDe(dataISO).reduce((s,g)=>s+numero(g.valor),0); }
function mesAtual(){ return hojeISO().slice(0,7); }
function totalMes(){ return dados.ganhos.filter(g=>g.data.startsWith(mesAtual())).reduce((s,g)=>s+numero(g.valor),0); }

/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */
function render(){
  renderHoje();
  renderConfig();
  renderCorridaInfo();
  renderHistorico();
  salvar();
}

function renderHoje(){
  const iso = hojeISO();
  const feito = totalDia(iso);
  const metaD = metaDiaria();
  const faltam = Math.max(0, metaD - feito);

  // data amigável
  const d = new Date();
  $('#data-hoje').textContent = d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});

  $('#meta-feito').textContent = reaisCurto(feito);
  $('#meta-total').textContent = reaisCurto(metaD);
  $('#kpi-hoje').textContent = reais(feito);
  $('#kpi-corridas').textContent = ganhosDe(iso).length;

  const pct = metaD>0 ? Math.min(100,(feito/metaD)*100) : 0;
  $('#barra-hoje').style.width = pct+'%';

  if(metaD<=0){
    $('#meta-falta').textContent = 'Configure suas despesas na aba ⚙️ para ver sua meta.';
  }else if(faltam<=0){
    $('#meta-falta').textContent = '🎉 Meta batida! Tudo o que vier agora é lucro extra.';
  }else{
    $('#meta-falta').textContent = `Faltam ${reais(faltam)} para bater a meta de hoje.`;
  }

  // lista de ganhos do dia
  const lista = $('#lista-ganhos'); lista.innerHTML='';
  ganhosDe(iso).slice().reverse().forEach(g=>{
    const el=document.createElement('div'); el.className='item';
    el.innerHTML=`<span class="nome">⚡ corrida</span>
      <span><span class="val">${reais(g.valor)}</span>
      <span class="x" data-del="${g.id}">×</span></span>`;
    lista.appendChild(el);
  });
}

// tipo de despesa selecionado na aba Config
let tipoAtivo = 'fixa';
const EXPLICA = {
  fixa:'Gastos que vêm TODO mês com o mesmo valor (aluguel, parcela do carro, internet...).',
  variavel:'Gastos de todo mês que mudam de valor (combustível, mercado, luz...).',
  avulsa:'Gastos que caíram SÓ este mês (manutenção, pneu, imprevisto...).'
};

function renderConfig(){
  renderDespesas();
  renderCartoes();

  // carro
  $('#car-combustivel').value = dados.carro.combustivel||'';
  $('#car-consumo').value = dados.carro.consumo||'';
  $('#car-manutencao').value = dados.carro.manutencao||'';
  $('#custo-km').textContent = reais(custoPorKm());

  // meta
  $('#meta-dias').value = dados.meta.dias||'';
  $('#meta-km-dia').value = dados.meta.kmDia||'';
  $('#meta-lucro').value = dados.meta.lucro||'';
}

function renderDespesas(){
  // botões de tipo
  document.querySelectorAll('.tipo-btn').forEach(b=>{
    b.classList.toggle('ativo', b.dataset.tipo===tipoAtivo);
  });
  $('#tipo-explica').textContent = EXPLICA[tipoAtivo];

  // sugestões (esconde as que já foram adicionadas nesse tipo)
  const jaTem = dados.despesas.filter(d=>d.tipo===tipoAtivo).map(d=>d.nome.toLowerCase());
  const sug = $('#sugestoes'); sug.innerHTML='';
  SUGESTOES[tipoAtivo].filter(s=>!jaTem.includes(s.toLowerCase())).forEach(nome=>{
    const b=document.createElement('button'); b.className='sugestao';
    b.textContent='+ '+nome; b.dataset.sug=nome;
    sug.appendChild(b);
  });

  // lista do tipo atual
  const lista=$('#lista-despesas'); lista.innerHTML='';
  const doTipo = dados.despesas.filter(d=>d.tipo===tipoAtivo);
  if(doTipo.length===0){
    lista.innerHTML='<p class="vazio" style="padding:10px">Nada aqui ainda. Toque numa sugestão acima.</p>';
  }
  doTipo.forEach(d=>{
    const el=document.createElement('div'); el.className='item';
    el.innerHTML=`<span class="nome">${d.nome}</span>
      <span><span class="val">${reais(d.valor)}</span>
      <span class="x" data-deld="${d.id}">×</span></span>`;
    lista.appendChild(el);
  });

  // totais por tipo
  $('#tot-fixa').textContent = reais(somaDespesas('fixa'));
  $('#tot-variavel').textContent = reais(somaDespesas('variavel'));
  $('#tot-avulsa').textContent = reais(somaDespesas('avulsa'));
  $('#total-despesas').textContent = reais(totalDespesas());
}

function renderCartoes(){
  const cont=$('#lista-cartoes'); cont.innerHTML='';
  const mes = mesAtual();
  (dados.cartoes||[]).forEach(c=>{
    const totalCartao = (c.parcelas||[]).filter(p=>numero(p.restantes)>0).reduce((s,p)=>s+numero(p.valor),0);
    const pagoMes = c.pago && c.pago[mes];
    const el=document.createElement('div'); el.className='cartao';

    let parcelasHtml = (c.parcelas||[]).map(p=>{
      const rest = numero(p.restantes);
      const total = numero(p.total);
      const pagas = total - rest;
      // Mostra claramente A QUE COMPRA a parcela se refere e em que ponto está.
      let info;
      if(rest<=0){
        info = `✅ quitada (${total}x — ${p.nome})`;
      }else if(total>1){
        info = `${pagas+1}ª de ${total}x — ${p.nome} • faltam ${rest}`;
      }else{
        info = `à vista — ${p.nome}`;
      }
      return `<div class="parcela">
        <span>
          <span class="pnome">${p.nome}${total>1?` <small style="color:#92a1bd">(${total}x)</small>`:''}</span><br>
          <span class="pinfo">${info}</span>
        </span>
        <span>
          <span class="pval" style="color:${rest>0?'#fff':'#5b6b85'}">${reais(p.valor)}</span>
          <span class="px" data-delp="${c.id}:${p.id}">×</span>
        </span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="cab">
        <div>
          <div class="dono">💳 ${c.dono}</div>
          <div class="venc">${c.vencimento?('vence dia '+c.vencimento):'sem vencimento'}</div>
        </div>
        <span class="x" data-delc="${c.id}">×</span>
      </div>
      <div class="total-cartao">A pagar este mês: ${reais(totalCartao)}</div>
      <div class="parcelas">${parcelasHtml || '<span class="pinfo" style="padding:4px">Sem lançamentos. Adicione abaixo (ex: Manutenção, 3x).</span>'}</div>
      <div class="add-parcela">
        <input type="text" class="pnome-in" placeholder="Compra (ex: Manutenção)" data-cart="${c.id}" data-f="nome" />
        <input type="number" class="pval-in" inputmode="decimal" placeholder="R$ parcela" data-cart="${c.id}" data-f="valor" />
        <input type="number" class="pvezes-in" inputmode="numeric" placeholder="x" data-cart="${c.id}" data-f="vezes" />
        <button class="mini-add" data-addp="${c.id}">+</button>
      </div>
      <button class="btn-pago ${pagoMes?'pago':'pendente'}" data-pagar="${c.id}">
        ${pagoMes?'✅ Paguei este mês':'Marcar: paguei este mês'}
      </button>`;
    cont.appendChild(el);
  });
  if((dados.cartoes||[]).length===0){
    cont.innerHTML='<p class="vazio">Nenhum cartão ainda. Cadastre abaixo.</p>';
  }
  $('#total-cartoes').textContent = reais(totalCartoesMes());
}

function renderCorridaInfo(){
  $('#corrida-minimo').textContent = minimoPorKm()>0 ? reais(minimoPorKm()) : 'R$ —';
}

function renderHistorico(){
  const metaM = metaMensal();
  const ganhoM = totalMes();
  $('#mes-ganho').textContent = reais(ganhoM);
  $('#mes-meta').textContent = reais(metaM);
  const pct = metaM>0?Math.min(100,(ganhoM/metaM)*100):0;
  $('#barra-mes').style.width = pct+'%';
  const faltaM = Math.max(0, metaM-ganhoM);
  $('#mes-falta').textContent = metaM<=0 ? 'Configure sua meta na aba ⚙️.'
    : (faltaM<=0 ? '🎉 Meta do mês batida!' : `Faltam ${reais(faltaM)} este mês.`);

  // agrupa por dia
  const porDia={};
  dados.ganhos.forEach(g=>{ porDia[g.data]=(porDia[g.data]||0)+numero(g.valor); });
  const dias=Object.keys(porDia).sort().reverse();
  const cont=$('#lista-historico');
  if(dias.length===0){ cont.innerHTML='<p class="vazio">Nenhum ganho registrado ainda.</p>'; return; }
  cont.innerHTML='';
  const metaD=metaDiaria();
  dias.forEach(iso=>{
    const total=porDia[iso];
    const qtd=dados.ganhos.filter(g=>g.data===iso).length;
    const d=new Date(iso+'T12:00:00');
    const pctd=metaD>0?Math.min(100,(total/metaD)*100):0;
    const bateu = metaD>0 && total>=metaD;
    const el=document.createElement('div'); el.className='hist-dia';
    el.innerHTML=`<div class="topo">
        <span class="data">${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})} ${bateu?'✅':''}</span>
        <span class="total">${reais(total)}</span>
      </div>
      <span class="sub">${qtd} corrida(s) • meta do dia ${reais(metaD)}</span>
      <div class="mini-barra"><div style="width:${pctd}%"></div></div>`;
    cont.appendChild(el);
  });
}

/* ============================================================
   AÇÕES / EVENTOS
   ============================================================ */

// Navegação entre abas
document.querySelectorAll('.tabbtn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('ativo'));
    b.classList.add('ativo');
    document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'));
    $('#tab-'+b.dataset.tab).classList.remove('hidden');
  });
});

// Lançar ganho
$('#btn-add-ganho').addEventListener('click',()=>{
  const v=numero($('#in-ganho').value);
  if(v<=0){ toast('Digite um valor válido'); return; }
  dados.ganhos.push({id:uid(),data:hojeISO(),valor:v});
  $('#in-ganho').value='';
  render(); toast('Ganho lançado! 💰');
});
$('#in-ganho').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#btn-add-ganho').click(); });

// Apagar ganho (delegação)
$('#lista-ganhos').addEventListener('click',e=>{
  const id=e.target.dataset.del; if(!id) return;
  dados.ganhos=dados.ganhos.filter(g=>g.id!==id); render();
});

// Trocar tipo de despesa (Fixa / Variável / Avulsa)
document.querySelectorAll('.tipo-btn').forEach(b=>{
  b.addEventListener('click',()=>{ tipoAtivo=b.dataset.tipo; renderDespesas(); });
});

// Adicionar despesa pelas SUGESTÕES (toque rápido)
$('#sugestoes').addEventListener('click',e=>{
  const nome=e.target.dataset.sug; if(!nome) return;
  const v=prompt(`Quanto é "${nome}" por mês? (R$)`);
  if(v===null) return;
  const valor=numero(v);
  if(valor<=0){ toast('Valor inválido'); return; }
  dados.despesas.push({id:uid(),nome,valor,tipo:tipoAtivo});
  render(); toast(nome+' adicionado');
});

// Adicionar despesa manual
$('#btn-add-despesa').addEventListener('click',()=>{
  const nome=$('#d-nome').value.trim();
  const valor=numero($('#d-valor').value);
  if(!nome || valor<=0){ toast('Preencha nome e valor'); return; }
  dados.despesas.push({id:uid(),nome,valor,tipo:tipoAtivo});
  $('#d-nome').value=''; $('#d-valor').value='';
  render(); toast('Despesa adicionada');
});
$('#d-valor').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#btn-add-despesa').click(); });
$('#lista-despesas').addEventListener('click',e=>{
  const id=e.target.dataset.deld; if(!id) return;
  dados.despesas=dados.despesas.filter(d=>d.id!==id); render();
});

/* ---------- CARTÕES ---------- */
// adicionar cartão
$('#btn-add-cartao').addEventListener('click',()=>{
  const dono=$('#cart-dono').value.trim();
  const venc=numero($('#cart-venc').value);
  if(!dono){ toast('Dê um nome ao cartão'); return; }
  dados.cartoes=dados.cartoes||[];
  dados.cartoes.push({id:uid(),dono,vencimento:venc||'',parcelas:[],pago:{}});
  $('#cart-dono').value=''; $('#cart-venc').value='';
  render(); toast('Cartão adicionado 💳');
});

// cliques dentro da lista de cartões (delegação): excluir cartão, excluir parcela,
// adicionar parcela, marcar pago
$('#lista-cartoes').addEventListener('click',e=>{
  const t=e.target;

  // excluir cartão
  if(t.dataset.delc){
    if(confirm('Excluir este cartão e tudo dele?')){
      dados.cartoes=dados.cartoes.filter(c=>c.id!==t.dataset.delc); render();
    }
    return;
  }
  // excluir parcela
  if(t.dataset.delp){
    const [cid,pid]=t.dataset.delp.split(':');
    const c=dados.cartoes.find(x=>x.id===cid);
    if(c){ c.parcelas=c.parcelas.filter(p=>p.id!==pid); render(); }
    return;
  }
  // marcar pago este mês
  if(t.dataset.pagar){
    const c=dados.cartoes.find(x=>x.id===t.dataset.pagar);
    if(!c) return;
    const mes=mesAtual(); c.pago=c.pago||{};
    if(c.pago[mes]){
      // desmarcar
      delete c.pago[mes]; render(); toast('Desmarcado');
    }else{
      // marcar pago: desconta 1 parcela de cada compra ativa
      c.pago[mes]=true;
      (c.parcelas||[]).forEach(p=>{ if(numero(p.restantes)>0) p.restantes=numero(p.restantes)-1; });
      render(); toast('✅ Pago! Parcelas atualizadas');
    }
    return;
  }
  // adicionar parcela/compra ao cartão
  if(t.dataset.addp){
    const cid=t.dataset.addp;
    const c=dados.cartoes.find(x=>x.id===cid); if(!c) return;
    const wrap=t.closest('.add-parcela');
    const nome=wrap.querySelector('[data-f=nome]').value.trim();
    const valor=numero(wrap.querySelector('[data-f=valor]').value);
    const vezes=Math.max(1, Math.round(numero(wrap.querySelector('[data-f=vezes]').value))||1);
    if(!nome || valor<=0){ toast('Preencha compra e valor da parcela'); return; }
    c.parcelas=c.parcelas||[];
    c.parcelas.push({id:uid(),nome,valor,total:vezes,restantes:vezes});
    render(); toast(`${nome}: ${vezes}x de ${reais(valor)}`);
    return;
  }
});

// Salvar config (carro + meta)
$('#btn-salvar-config').addEventListener('click',()=>{
  dados.carro.combustivel=numero($('#car-combustivel').value);
  dados.carro.consumo=numero($('#car-consumo').value);
  dados.carro.manutencao=numero($('#car-manutencao').value);
  dados.meta.dias=numero($('#meta-dias').value)||24;
  dados.meta.kmDia=numero($('#meta-km-dia').value)||200;
  dados.meta.lucro=numero($('#meta-lucro').value);
  render();
  toast(`Pronto! Sua meta é ${reais(metaDiaria())}/dia 🎯`);
});

// Avaliar corrida
$('#btn-avaliar').addEventListener('click',()=>{
  const valor=numero($('#c-valor').value);
  const km=numero($('#c-km').value);
  const desloc=numero($('#c-deslocamento').value);
  const box=$('#resultado-corrida');

  if(valor<=0 || km<=0){ toast('Preencha valor e distância'); return; }

  const kmTotal = km + desloc;                 // km que o carro realmente roda
  const reaisPorKm = valor / kmTotal;          // o que essa corrida paga por km rodado
  const minimo = minimoPorKm();
  const custo = custoPorKm() * kmTotal;        // quanto essa corrida custa de carro
  const lucroEstimado = valor - custo;         // sobra depois do custo do carro

  let classe, titulo;
  if(minimo<=0){
    // sem config: usa referência simples
    classe = reaisPorKm>=1.5 ? 'bom' : (reaisPorKm>=1 ? 'medio' : 'ruim');
    titulo = classe==='bom'?'✅ Parece boa':'⚠️ Configure sua meta';
  }else if(reaisPorKm >= minimo){
    classe='bom'; titulo='✅ VALE A PENA';
  }else if(reaisPorKm >= minimo*0.85){
    classe='medio'; titulo='⚠️ EM CIMA DO LIMITE';
  }else{
    classe='ruim'; titulo='❌ RECUSE';
  }

  box.className='resultado '+classe;
  box.innerHTML=`
    <div class="veredito">${titulo}</div>
    <div class="detalhe">
      <div class="linha-res"><span>Essa corrida paga</span><b>${reais(reaisPorKm)} / km</b></div>
      <div class="linha-res"><span>Seu mínimo</span><b>${minimo>0?reais(minimo):'defina na config'} / km</b></div>
      <div class="linha-res"><span>Km rodado (c/ deslocamento)</span><b>${kmTotal.toLocaleString('pt-BR')} km</b></div>
      <div class="linha-res"><span>Custo do carro</span><b>${reais(custo)}</b></div>
      <div class="linha-res"><span>Sobra (depois do carro)</span><b style="color:${lucroEstimado>=0?'#22c55e':'#ef4444'}">${reais(lucroEstimado)}</b></div>
    </div>`;
  box.classList.remove('hidden');
});

/* ============================================================
   BACKUP / RESTAURAR / LIMPAR
   ============================================================ */
$('#btn-backup').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='rodacerto-backup-'+hojeISO()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup baixado! Salve na sua nuvem ☁️');
});

$('#btn-restaurar').addEventListener('click',()=>$('#file-restaurar').click());
$('#file-restaurar').addEventListener('change',e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const obj=JSON.parse(reader.result);
      dados=Object.assign(estadoPadrao(),obj);
      render();
      toast('Backup restaurado! ✅');
    }catch(err){ toast('Arquivo inválido ❌'); }
  };
  reader.readAsText(file);
  e.target.value='';
});

$('#btn-limpar').addEventListener('click',()=>{
  if(confirm('Apagar TODOS os dados? Isso não pode ser desfeito.\n\nFaça um backup antes se quiser guardar.')){
    dados=estadoPadrao(); render(); toast('Tudo apagado');
  }
});

/* ============================================================
   EVENTOS DA TELA DE BLOQUEIO / LICENÇA
   ============================================================ */
$('#btn-liberar').addEventListener('click',()=>{
  if(tentarLiberar($('#in-codigo').value)){
    $('#tela-bloqueio').classList.add('hidden');
    checarLicenca();
    render();
    toast('App liberado para sempre! 🎉 Obrigado!');
  }else{
    toast('Código inválido para este aparelho ❌');
  }
});

$('#btn-copiar-pix').addEventListener('click',()=>{
  navigator.clipboard?.writeText(CONFIG_DONO.pix).then(()=>toast('Chave Pix copiada'));
});
$('#btn-copiar-id').addEventListener('click',()=>{
  navigator.clipboard?.writeText(idAparelho()).then(()=>toast('Código do aparelho copiado'));
});

// Registrar service worker (funciona offline / instalável) e
// recarregar automaticamente quando houver uma versão nova publicada.
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    // procura atualização sempre que o app abre
    reg.update().catch(()=>{});
    reg.addEventListener('updatefound',()=>{
      const novo = reg.installing;
      if(!novo) return;
      novo.addEventListener('statechange',()=>{
        // nova versão instalada e já existe uma controlando -> recarrega
        if(novo.state==='installed' && navigator.serviceWorker.controller){
          toast('Atualizando para a nova versão...');
          setTimeout(()=>location.reload(), 800);
        }
      });
    });
  }).catch(()=>{});
}

// Primeira renderização
render();
checarLicenca();
