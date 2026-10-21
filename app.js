/* ============================================================
   RodaCerto — gestor financeiro do motorista de app
   Dados 100% no navegador (localStorage). Com backup em arquivo.
   ============================================================ */

const APP_VERSAO = 'v9';   // marcador visível p/ sabermos qual build carregou
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

// Frases motivacionais — mostradas aleatoriamente na tela inicial.
// Escritas pela experiência real de quem dirige. Dão força de verdade.
const FRASES = [
  "Nem toda corrida vai valer a pena. Nem todo passageiro vai agradecer. Nem todo dia vai fechar no lucro. Mas enquanto você estiver no volante, ainda existe uma próxima corrida. Não desista no meio do caminho.",
  "Tem dia que a gente liga o aplicativo sem saber como vai pagar as contas. Mas desliga sabendo que, pelo menos hoje, a gente tentou. E isso também é coragem.",
  "Motorista de app não dirige só um carro. Dirige sonhos, boletos, planos e a esperança de dias melhores. Então segura firme esse volante. Essa fase não define o seu destino.",
  "Às vezes Deus não abre uma estrada nova. Ele simplesmente te dá força para continuar dirigindo pela estrada que você já está. E talvez a próxima corrida seja justamente a que você precisava.",
  "Você não está rodando à toa. Cada quilômetro tem um propósito: uma conta paga, uma comida em casa, um filho sorrindo, um sonho sendo mantido vivo. Continue.",
  "Tem passageiro que cancela, corrida que dá prejuízo e dia que parece que tudo deu errado. Mas uma corrida ruim não pode fazer você acreditar que o dia inteiro será ruim.",
  "\u201CPai, se for para acontecer, me dê forças para continuar.\u201D E talvez a resposta venha de um jeito simples: \u201CSó aceita a próxima corrida.\u201D",
  "Você pode estar cansado. Pode estar preocupado. Pode até estar sem saber como vai terminar o mês. Mas lembre: você já sobreviveu a dias que um dia também pareciam impossíveis.",
  "Não tenha vergonha de estar dirigindo. Vergonha seria desistir de lutar pela sua família. Trabalho honesto, por mais difícil que seja, continua sendo trabalho digno.",
  "Hoje pode estar difícil. Amanhã talvez também esteja. Mas não entregue seu futuro por causa de um dia ruim. Abasteça, respire, ligue o app e continue.",
  "Tem gente que só vê um motorista. Mas dentro daquele carro existe um pai, um marido, uma mãe, um filho, alguém pagando dívida, construindo uma casa ou tentando recomeçar. Respeite sua própria caminhada.",
  "A vida de motorista de app é uma mistura de trânsito, ansiedade, combustível e boletos. 😂 Mas também é liberdade, luta e oportunidade. Enquanto houver estrada, ainda há possibilidade de mudar a história.",
  "Você não precisa vencer o mês inteiro hoje. Vença apenas a próxima corrida. Depois a próxima. E quando perceber, você chegou mais longe do que imaginava.",
  "Quando o dinheiro estiver curto, a gasolina cara e a cabeça cheia, lembre-se: você não precisa ter todas as respostas para continuar. Só precisa dar o próximo passo.",
  "Talvez você esteja rodando cansado sem perceber que está mais perto de conseguir do que imagina. Não pare na corrida anterior ao seu melhor dia.",
  "\u201CTudo posso naquele que me fortalece.\u201D Às vezes essa força não vem como milagre. Vem como coragem para levantar cedo, entrar no carro, ligar o aplicativo e tentar mais uma vez.",
  "Tem dia que você pede a Deus uma saída e parece que nada acontece. Então você entra no carro, liga o aplicativo e começa a rodar. Talvez aquela seja a sua resposta: \u201CEu não vou fazer por você, mas vou te dar força para você continuar.\u201D",
  "Não desista porque hoje foi ruim. Você ainda não sabe o que pode acontecer na próxima corrida. Enquanto houver estrada, haverá esperança. 🚗🙏"
];

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
  // cada bloco é isolado: se um falhar, os outros continuam funcionando
  try{ renderHoje(); }catch(e){ console.error('renderHoje',e); }
  try{ renderConfig(); }catch(e){ console.error('renderConfig',e); }
  try{ renderCorridaInfo(); }catch(e){ console.error('renderCorridaInfo',e); }
  try{ renderHistorico(); }catch(e){ console.error('renderHistorico',e); }
  try{ renderAgenda(); }catch(e){ console.error('renderAgenda',e); }
  try{ renderBackup(); }catch(e){ console.error('renderBackup',e); }
  salvar();
}

// Frase motivacional aleatória (evita repetir a última)
let ultimaFrase = -1;
function novaFrase(){
  const el = $('#frase-texto');
  if(!el) return;
  let i;
  do { i = Math.floor(Math.random()*FRASES.length); }
  while(FRASES.length>1 && i===ultimaFrase);
  ultimaFrase = i;
  // define o texto IMEDIATAMENTE (garante que aparece); fade é só um detalhe
  el.textContent = FRASES[i];
  el.style.opacity = 0;
  requestAnimationFrame(()=>{ el.style.opacity = 1; });
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
  // resumo do mês VISUALIZADO no calendário (não necessariamente o atual)
  const ym = calYM();                 // 'YYYY-MM' em exibição
  const metaM = metaMensal();
  const ganhoMes = dados.ganhos
    .filter(g=>g.data.startsWith(ym))
    .reduce((s,g)=>s+numero(g.valor),0);
  $('#mes-ganho').textContent = reais(ganhoMes);
  $('#mes-meta').textContent = reais(metaM);
  const pct = metaM>0?Math.min(100,(ganhoMes/metaM)*100):0;
  $('#barra-mes').style.width = pct+'%';
  const faltaM = Math.max(0, metaM-ganhoMes);
  $('#mes-falta').textContent = metaM<=0 ? 'Configure sua meta na aba ⚙️.'
    : (faltaM<=0 ? '🎉 Meta do mês batida!' : `Faltam ${reais(faltaM)} para a meta deste mês.`);
}

/* ============================================================
   AGENDA / CALENDÁRIO
   ============================================================ */
let calData = new Date();                 // mês em exibição
let diaSelecionado = hojeISO();            // dia aberto no detalhe

function calYM(){
  return calData.getFullYear()+'-'+String(calData.getMonth()+1).padStart(2,'0');
}
function isoDe(ano,mes,dia){
  return ano+'-'+String(mes+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
}

function renderAgenda(){
  const ano = calData.getFullYear(), mes = calData.getMonth();
  const nomeMes = calData.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const tit = $('#cal-titulo'); if(tit) tit.textContent = nomeMes;

  const grade = $('#cal-grade'); if(!grade) return;
  grade.innerHTML='';

  const primeiroDiaSemana = new Date(ano,mes,1).getDay(); // 0=domingo
  const diasNoMes = new Date(ano,mes+1,0).getDate();
  const metaD = metaDiaria();

  // células vazias antes do dia 1
  for(let i=0;i<primeiroDiaSemana;i++){
    const c=document.createElement('div'); c.className='cal-dia vazio-cel'; grade.appendChild(c);
  }
  // dias do mês
  for(let dia=1; dia<=diasNoMes; dia++){
    const iso = isoDe(ano,mes,dia);
    const total = totalDia(iso);
    const c=document.createElement('div');
    c.className='cal-dia';
    if(iso===hojeISO()) c.classList.add('hoje');
    if(iso===diaSelecionado) c.classList.add('sel');
    c.dataset.dia = iso;

    let dot='';
    if(total>0){
      const cor = (metaD>0 && total>=metaD) ? 'verde' : 'amarelo';
      dot = `<span class="dot ${cor}"></span>`;
    }
    c.innerHTML = `<span>${dia}</span>${dot}`;
    grade.appendChild(c);
  }

  renderDiaDetalhe();
}

function renderDiaDetalhe(){
  const cont=$('#dia-detalhe'); if(!cont) return;
  const iso = diaSelecionado;
  const d = new Date(iso+'T12:00:00');
  const titulo = $('#dia-titulo');
  const ehHoje = iso===hojeISO();
  if(titulo) titulo.textContent = (ehHoje?'Hoje — ':'') + d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});

  const total = totalDia(iso);
  const qtd = ganhosDe(iso).length;
  const metaD = metaDiaria();
  const bateu = metaD>0 && total>=metaD;

  let ganhosHtml = ganhosDe(iso).slice().reverse().map(g=>
    `<div class="item"><span class="nome">⚡ corrida</span>
      <span><span class="val">${reais(g.valor)}</span>
      <span class="x" data-delg="${g.id}">×</span></span></div>`
  ).join('');

  cont.innerHTML = `
    <div class="dia-resumo">
      <div class="box"><span>Ganho no dia</span><strong class="verde">${reais(total)}</strong></div>
      <div class="box"><span>Corridas</span><strong>${qtd}</strong></div>
      <div class="box"><span>Meta do dia</span><strong>${metaD>0?reais(metaD):'—'}</strong></div>
    </div>
    ${metaD>0 ? `<div class="meta-falta" style="color:${bateu?'#2dd36f':'#8fa0bf'}">${bateu?'🎉 Meta batida neste dia!':'Faltou '+reais(Math.max(0,metaD-total))+' para a meta deste dia.'}</div>`:''}
    <div class="dia-add">
      <input type="number" id="dia-valor" inputmode="decimal" placeholder="Lançar ganho (R$)" />
      <button class="btn primary" id="dia-add-btn">+ Lançar</button>
    </div>
    <div class="dia-ganhos">${ganhosHtml || '<p class="vazio" style="padding:8px">Nenhum ganho neste dia.</p>'}</div>
  `;

  // liga os eventos do detalhe (recriados a cada render)
  const addBtn = $('#dia-add-btn');
  if(addBtn){
    addBtn.onclick = ()=>{
      const v = numero($('#dia-valor').value);
      if(v<=0){ toast('Digite um valor válido'); return; }
      dados.ganhos.push({id:uid(), data:iso, valor:v});
      render(); toast('Ganho lançado! 💰');
    };
  }
  const valInput = $('#dia-valor');
  if(valInput) valInput.onkeydown = e=>{ if(e.key==='Enter') addBtn.click(); };

  cont.querySelectorAll('[data-delg]').forEach(x=>{
    x.onclick = ()=>{
      dados.ganhos = dados.ganhos.filter(g=>g.id!==x.dataset.delg);
      render();
    };
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
// ---- Controle de backup (para proteger contra perda de dados) ----
const BK_STORE = 'rodacerto_backup_v1';
function bkInfo(){
  try{ return JSON.parse(localStorage.getItem(BK_STORE)) || {}; }catch(e){ return {}; }
}
function bkMarcar(){ const i=bkInfo(); i.ultimo=Date.now(); localStorage.setItem(BK_STORE, JSON.stringify(i)); }

// tem dados que valem a pena proteger?
function temDadosRelevantes(){
  return (dados.ganhos && dados.ganhos.length>0) ||
         (dados.despesas && dados.despesas.length>0) ||
         (dados.cartoes && dados.cartoes.length>0);
}
// dias desde o último backup (ou null se nunca fez)
function diasDesdeBackup(){
  const u = bkInfo().ultimo;
  if(!u) return null;
  return Math.floor((Date.now()-u)/(1000*60*60*24));
}

function fazerBackup(){
  const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='rodacerto-backup-'+hojeISO()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  bkMarcar();
  render();
  toast('Backup salvo! Guarde o arquivo na sua nuvem ☁️');
}

$('#btn-backup').addEventListener('click', fazerBackup);

// lembrete flutuante do topo
$('#faixa-backup-btn').addEventListener('click', fazerBackup);
$('#faixa-backup-x').addEventListener('click',()=>{
  // dispensa o lembrete só por hoje
  const info = bkInfo(); info.dispensado = hojeISO();
  localStorage.setItem(BK_STORE, JSON.stringify(info));
  $('#faixa-backup').classList.add('hidden');
});

// atualiza o status do backup na tela de Config e o lembrete do topo
function renderBackup(){
  const status = $('#backup-status');
  const dias = diasDesdeBackup();
  if(status){
    if(dias===null){
      status.className='backup-status alerta';
      status.textContent = temDadosRelevantes()
        ? '⚠️ Você ainda NÃO fez nenhum backup.'
        : 'Nenhum backup feito ainda.';
    }else if(dias===0){
      status.className='backup-status ok';
      status.textContent = '✅ Último backup: hoje.';
    }else{
      status.className = dias>=7 ? 'backup-status alerta' : 'backup-status';
      status.textContent = `Último backup: há ${dias} dia${dias>1?'s':''}.`;
    }
  }

  // lembrete flutuante no topo
  const faixa = $('#faixa-backup');
  if(!faixa) return;
  if(bkInfo().dispensado===hojeISO()){ faixa.classList.add('hidden'); return; }
  const precisa = temDadosRelevantes() && (dias===null || dias>=3);
  if(precisa){
    $('#faixa-backup-texto').textContent = dias===null
      ? '⚠️ Você tem dados salvos só neste celular. Faça um backup para não perder!'
      : `⚠️ Faz ${dias} dias sem backup. Salve seus dados para não perder!`;
    faixa.classList.remove('hidden');
  }else{
    faixa.classList.add('hidden');
  }
}

$('#btn-restaurar').addEventListener('click',()=>$('#file-restaurar').click());
$('#file-restaurar').addEventListener('change',e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const obj=JSON.parse(reader.result);
      dados=Object.assign(estadoPadrao(),obj);
      bkMarcar();
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

// Service worker DESLIGADO nesta fase (evita cache de versão velha).
// Se houver algum SW antigo registrado no aparelho, remove e limpa os caches.
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>{
    regs.forEach(r=>r.unregister());
  }).catch(()=>{});
  if(window.caches && caches.keys){
    caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});
  }
}

// Botão "outra frase"
$('#btn-frase').addEventListener('click', novaFrase);

// Navegação do calendário
$('#cal-prev').addEventListener('click',()=>{ calData.setMonth(calData.getMonth()-1); renderAgenda(); renderHistorico(); });
$('#cal-next').addEventListener('click',()=>{ calData.setMonth(calData.getMonth()+1); renderAgenda(); renderHistorico(); });

// Clicar num dia do calendário
$('#cal-grade').addEventListener('click',e=>{
  const cel = e.target.closest('.cal-dia');
  if(!cel || !cel.dataset.dia) return;
  diaSelecionado = cel.dataset.dia;
  renderAgenda();
});

// Mostra a versão carregada no topo (ajuda a saber se atualizou)
(function(){ const c=$('#versao-chip'); if(c) c.textContent = APP_VERSAO; })();

// Primeira renderização
render();
novaFrase();
checarLicenca();
