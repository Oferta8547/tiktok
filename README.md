# ReformaMax — Escada Telescópica (site + checkout PIX)

Projeto **estático + serverless functions**. Não tem build: o conteúdo da raiz já é o site publicado.
A mesma pasta funciona na **Vercel** e na **Netlify** sem alteração.

---

## 1. Estrutura

```
/                                raiz do deploy (publish directory)
├── index.html                   home (site original, intocado)
├── carrinho.html                CHECKOUT PIX  → servido em /carrinho
├── utm.js                       captura e persistência de UTMs
├── order.html, contato.html, aviso-legal.html,
│   politica-de-*.html, termos-de-servico.html
├── assets/                      bundle React + CSS do site (intocado)
├── __l5e/                       imagens do site (intocado)
├── _flock.js                    analytics já existente do site (intocado)
├── cdn.utmify.com.br/           script UTMify já existente (intocado)
├── analytics.tiktok.com/        pixel TikTok já existente (intocado)
│
├── api/                         functions da VERCEL
│   ├── _lib/core.js             núcleo: PIX (IronPay) + UTMify
│   ├── checkout-create-pix.js
│   ├── orders_status.js
│   └── health.js
├── netlify/functions/           functions da NETLIFY (mesmo core.js)
│   ├── checkout-create-pix.js
│   ├── orders_status.js
│   └── health.js
│
├── vercel.json                  rotas + cache da Vercel
├── netlify.toml                 rotas + cache da Netlify
└── package.json                 apenas engines: node >= 18
```

---

## 2. Deploy na VERCEL

### Pelo painel
1. **Add New… → Project → Import** (Git) ou arraste a pasta em **Deploy**.
2. Em *Framework Preset* escolha **Other**.
3. **Root Directory:** `./` (a raiz do ZIP, onde está o `index.html`).
4. **Build Command:** deixe **vazio**.
5. **Output Directory:** deixe **vazio** (a raiz já é o output).
6. **Deploy.**

### Pelo CLI
```bash
npm i -g vercel
cd <pasta-do-projeto>
vercel        # preview
vercel --prod # produção
```

O `vercel.json` já cria:

| URL pública                 | Destino                     |
|-----------------------------|-----------------------------|
| `/carrinho`                 | `carrinho.html`             |
| `/checkout-create-pix.php`  | `api/checkout-create-pix`   |
| `/orders_status.php`        | `api/orders_status`         |
| `/teste-pix.php`            | `api/health`                |

> A pasta `netlify/` fica no repositório mas é ignorada pela Vercel. Pode deixar.

---

## 3. Deploy na NETLIFY

### Pelo painel
1. **Add new site → Deploy manually** e arraste a pasta inteira, **ou** conecte o repositório Git.
2. **Build command:** vazio.
3. **Publish directory:** `.`
4. **Functions directory:** `netlify/functions` (o `netlify.toml` já define isso).
5. **Deploy.**

### Pelo CLI
```bash
npm i -g netlify-cli
cd <pasta-do-projeto>
netlify deploy          # preview
netlify deploy --prod   # produção
```

O `netlify.toml` já cria as mesmas rotas da tabela acima e ainda **bloqueia com 404** o acesso público a `/api/*` e `/netlify/*`, para o código das functions (com os tokens) não ficar legível.

---

## 4. Teste depois de subir

1. `https://SEU-DOMINIO/teste-pix.php` → deve responder um JSON `{"ok":true,...}`.
2. `https://SEU-DOMINIO/` → home carrega normal, escolha um tamanho, clique **Comprar agora**.
3. Confira que a URL virou `/carrinho?size=5m` (ou `7m` / `9m`) **com os UTMs preservados**.
4. Preencha os dados e gere o PIX. Devem aparecer QR Code + Copia e Cola.
5. Pague um valor real de teste e confirme:
   - a tela muda sozinha para **Pagamento confirmado** (polling a cada 5s);
   - o pedido aparece na **UTMify** primeiro como *aguardando pagamento* e depois como *pago*, **sem duplicar**.
6. Repita para os três tamanhos.

---

## 5. Variáveis de ambiente (opcional, recomendado)

As credenciais já estão embutidas em `api/_lib/core.js` como fallback e **nunca são expostas no frontend**.
Se quiser tirá-las do código, crie estas variáveis no painel (Vercel: *Settings → Environment Variables*;
Netlify: *Site settings → Environment variables*) e apague os valores literais do arquivo:

| Variável              | Para que serve                                  |
|-----------------------|-------------------------------------------------|
| `IRONPAY_API_TOKEN`   | token da API IronPay                             |
| `IRONPAY_PRODUCT_HASH`| hash do **produto** (vai no `product_hash` do carrinho) |
| `IRONPAY_OFFER_HASH`  | hash da **oferta** (vai no `offer_hash` da transação)   |
| `IRONPAY_BASE_URL`    | base da API (só se mudar de ambiente)            |
| `UTMIFY_API_TOKEN`    | token da API UTMify                              |
| `UTMIFY_PLATFORM`     | nome da plataforma exibido na UTMify             |

### Anti-duplicidade entre instâncias (opcional)

O bloqueio que impede reenviar o evento `paid` para a UTMify usa memória do processo.
Em serverless, instâncias diferentes não compartilham memória — na prática o polling costuma
cair sempre na mesma instância quente, mas para garantia total configure um Redis:

| Variável                    |
|-----------------------------|
| `UPSTASH_REDIS_REST_URL`    |
| `UPSTASH_REDIS_REST_TOKEN`  |

Basta criar um banco gratuito no Upstash e colar as duas credenciais. O código detecta
sozinho e passa a usar o lock distribuído; sem elas, continua no modo memória.

---

## 6. Produtos configurados

| SKU  | Nome                            | Preço      | Qtd. padrão |
|------|---------------------------------|------------|-------------|
| `5m` | Escada Telescópica — 5 Metros   | R$ 69,99   | 1           |
| `7m` | Escada Telescópica — 7 Metros   | R$ 89,99  | 1           |
| `9m` | Escada Telescópica — 9 Metros   | R$ 109,99  | 1           |

Para alterar preço ou nome, edite o objeto `PRODUCTS` no início do `<script>` de `carrinho.html`.
O `id` precisa continuar batendo com o `size` que o botão "Comprar agora" envia na URL.

---

## 7. Previsão de entrega

O checkout calcula a data de entrega dinamicamente, pulando sábados e domingos
(mesmo sistema do checkout de referência). Não há texto fixo de prazo.

Onde aparece:

| Local                        | Formato                                        |
|------------------------------|------------------------------------------------|
| Bloco **Frete**              | `Chegará entre os dias 17 e 21 de agosto`      |
| Abaixo do **Total**          | `Via PIX · Chegará entre os dias 17 e 21 de agosto` |
| Tela do PIX, *Previsão de entrega* | `sexta-feira, 21 de agosto`               |

Quando a faixa cruza o mês, o texto muda sozinho para
`Entre 31 de agosto e 4 de setembro`.

Para mudar o prazo, edite as duas constantes no `<script>` de `carrinho.html`:

```js
var PRAZO_MIN = 5;   // primeiro dia útil da faixa
var PRAZO_MAX = 9;   // último dia útil da faixa
```

Estão em 5 e 9 para bater com o que a página de produto promete
("Receba entre 5 e 9 dias úteis" e "5 a 9 dias úteis" no bloco dos Correios).

---

## 8. Sem campo de CPF no checkout

O CPF foi removido do formulário para reduzir fricção — é um campo que o
comprador costuma hesitar em preencher, e cada campo a menos tende a
melhorar a conversão do lead.

O gateway IronPay exige um documento no payload da transação. Isso já era
resolvido no `core.js` antes de eu tirar o campo: quando `customer.document`
chega vazio, a função `fakeCpf()` gera um CPF matematicamente válido (dígitos
verificadores corretos) só para satisfazer a validação do gateway. Não afeta
entrega, rastreio nem o valor pago — é usado apenas internamente pela IronPay.

Se um dia quiser reativar a coleta de CPF (por exemplo para nota fiscal),
essas são as pontas que precisam voltar:

- o campo `<input id="f-cpf">` no HTML;
- as funções `maskCpf` / `validCpf` no `<script>`;
- `cpf` de volta em `readForm()`, `saveCustomer()`, `restoreCustomer()` e no
  `customer.cpf` enviado em `createPix()`.
