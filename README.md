# 🚗 RodaCerto — gestor financeiro do motorista de app

App (PWA) que ajuda o motorista de Uber/99 a saber **quanto precisa fazer por dia**
e se **vale a pena** aceitar cada corrida. Dados ficam 100% no celular, com backup.

## Como testar agora
Abra o `index.html` num navegador (de preferência o do celular). Para instalar na tela
inicial: abra pelo Chrome/Safari → menu → "Adicionar à tela inicial".

> Para funcionar offline e instalável de verdade, precisa ser servido por HTTP/HTTPS
> (ex: hospedar no Netlify, Vercel, GitHub Pages, ngrok, etc.). Abrindo só o arquivo
> local a parte offline não ativa, mas o app funciona normalmente.

## O que o app faz
- **🏠 Despesas da casa** — água, luz, internet, cartão, aluguel...
- **🚗 Custo do carro** — combustível (R$/litro + km/litro) e outros custos por km
- **🎯 Meta** — calcula quanto você precisa fazer **por dia** e o **mínimo por km**
- **⚡ Calculadora de corrida** — digita valor + km e diz ✅ VALE A PENA / ❌ RECUSE
  (considera até o km rodado pra buscar o cliente)
- **📊 Histórico** — ganhos do dia/mês e progresso da meta
- **💾 Backup** — baixa um arquivo `.json` que o motorista guarda na nuvem dele

---

## 💰 Monetização (trial de 7 dias + Pix de R$ 20)

O app dá **7 dias grátis**. Quando expira, trava e mostra uma tela com seu Pix.
O motorista paga, te manda o **código de aparelho**, e você devolve o **código de liberação**.

### 1. Configure seus dados
No arquivo `app.js`, no topo, edite o bloco `CONFIG_DONO`:

```js
const CONFIG_DONO = {
  pix: 'sua-chave-pix@exemplo.com',   // sua chave Pix
  whatsapp: '5511999999999',          // seu WhatsApp (DDI+DDD, só números)
  diasTrial: 7,
  segredo: 'TROQUE-ESSE-SEGREDO-123'  // SEGREDO SÓ SEU — nunca divulgue!
};
```

> ⚠️ O `segredo` é a chave do negócio. Guarde-o. Se vazar, qualquer um gera códigos.

### 2. Quando o motorista pagar
Ele te manda o **código de aparelho** (ex: `A1B2C3`) que aparece na tela de bloqueio.
Você gera o **código de liberação** com o script abaixo e manda de volta pra ele:

```bash
node gerar-codigo.js A1B2C3
```

O motorista cola esse código no app e libera **para sempre naquele aparelho**.

### 🔒 Por que não dá pra repassar
O código de liberação é calculado a partir do **código de aparelho + seu segredo**.
Cada celular tem um código de aparelho diferente, então o código que você gerou para o
aparelho dele **não funciona no celular de outra pessoa**. Se ele tentar repassar, o
outro motorista verá "Código inválido para este aparelho".

> Observação honesta: como tudo roda no celular (sem servidor), isso não é 100%
> inviolável por alguém muito técnico, mas segura o uso normal/repasse casual. Quando
> o app crescer, dá pra colocar um servidor e ficar blindado.
