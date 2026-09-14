/* ReformaMax — interacoes da pagina do produto em JS puro.
   Substitui o bundle React: o HTML ja vem pronto do servidor, entao nao existe
   hidratacao, nao existe remontagem e nao existe tela branca. */
(function () {
  'use strict';

  var CAPA = '/__l5e/assets-v1/1cd8e868-bc99-4853-b0d9-13db74ba7f25/carrossel-capa.png';

  var PRODUTOS = [
    { id: '5m', label: '5 Metros', price: 69.99,  image: CAPA },
    { id: '7m', label: '7 Metros', price: 89.99, image: CAPA },
    { id: '9m', label: '9 Metros', price: 109.99, image: CAPA }
  ];

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (a) { return document.querySelector('[data-rm="' + a + '"]'); };

  function brl(v) {
    return 'R$\u00a0' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* ---------------------------------------------------- prazo de entrega */
  function diasUteis(n) {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    var c = 0;
    while (c < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) c++; }
    return d;
  }
  function eta() {
    var M = ['janeiro','fevereiro','março','abril','maio','junho',
             'julho','agosto','setembro','outubro','novembro','dezembro'];
    var a = diasUteis(5), b = diasUteis(9);
    if (a.getMonth() === b.getMonth())
      return 'Chegará entre ' + a.getDate() + ' e ' + b.getDate() + ' de ' + M[b.getMonth()];
    return 'Chegará entre ' + a.getDate() + ' de ' + M[a.getMonth()] +
           ' e ' + b.getDate() + ' de ' + M[b.getMonth()];
  }

  /* ------------------------------------------------------------- carrossel */
  function carrossel() {
    var track = el('track'); if (!track) return;
    var imgs = $$('img', track);
    var counter = el('counter');
    var idx = 0;

    /* faz o deslize parar em uma imagem por vez, em vez de deslizar varias */
    Array.prototype.forEach.call(track.children, function (c) {
      c.style.scrollSnapStop = 'always';
    });

    function pinta() {
      if (counter) counter.textContent = (idx + 1) + ' / ' + imgs.length;
    }
    function vai(i) {
      idx = Math.max(0, Math.min(imgs.length - 1, i));
      track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
      pinta();
    }
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var n = Math.round(track.scrollLeft / track.clientWidth);
        if (n !== idx) { idx = n; pinta(); }
      }, 80);
    }, { passive: true });

    /* Sem setas: no celular, o deslize do dedo (scroll nativo com snap).
       No PC, arrastar com o mouse - e a roda/trackpad na horizontal. */
    var arrastando = false, x0 = 0, s0 = 0, moveu = 0;

    track.addEventListener('dragstart', function (e) { e.preventDefault(); });

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;      /* toque usa o scroll nativo */
      arrastando = true; moveu = 0;
      x0 = e.clientX; s0 = track.scrollLeft;
      track.style.scrollBehavior = 'auto';        /* sem isso o scroll-smooth briga com o arrasto */
      track.style.scrollSnapType = 'none';        /* o snap puxaria de volta a cada pixel arrastado */
      track.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      var d = e.clientX - x0;
      if (Math.abs(d) > moveu) moveu = Math.abs(d);
      track.scrollLeft = s0 - d;
    });

    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      track.style.cursor = 'grab';

      var w = track.clientWidth;
      var alvo;
      if (moveu <= 40) {                       /* arrasto curto: nao troca de imagem */
        alvo = Math.round(s0 / w);
      } else {
        alvo = track.scrollLeft > s0 ? Math.ceil(track.scrollLeft / w)
                                     : Math.floor(track.scrollLeft / w);
      }
      alvo = Math.max(0, Math.min(imgs.length - 1, alvo));

      /* posiciona exatamente no ponto de encaixe antes de religar o snap,
         senao o navegador puxa de volta para a imagem anterior */
      track.scrollLeft = alvo * w;
      idx = alvo; pinta();

      track.style.scrollBehavior = '';
      track.style.scrollSnapType = '';
    }
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);

    track.style.cursor = 'grab';

    pinta();
  }

  /* -------------------------------------------------------------- tamanhos */
  var atual = PRODUTOS[0];
  var barra = null;

  var CLS_ON  = 'touch-manipulation rounded-[4px] border-[1.5px] px-2 py-2.5 text-[13px] transition-colors border-ink bg-ink font-semibold text-ink-foreground';
  var CLS_OFF = 'touch-manipulation rounded-[4px] border-[1.5px] px-2 py-2.5 text-[13px] transition-colors border-border bg-card hover:border-ink/60';
  var PRC_ON  = 'mt-1 block text-[12px] font-bold leading-tight text-ink-foreground';
  var PRC_OFF = 'mt-1 block text-[12px] font-bold leading-tight text-sale';

  function aplica(p) {
    atual = p;
    var a;
    if ((a = el('price'))) a.textContent = brl(p.price);
    if ((a = el('pill')))  a.textContent = p.label;

    var botoes = $$('button', el('sizes'));
    botoes.forEach(function (b, i) {
      var sel = PRODUTOS[i] && PRODUTOS[i].id === p.id;
      b.className = sel ? CLS_ON : CLS_OFF;
      var spans = $$('span', b);
      if (spans[1]) spans[1].className = sel ? PRC_ON : PRC_OFF;
    });

    if (barra) {
      $('img', barra).src = p.image;
      $('img', barra).alt = 'Escada ' + p.label;
      var s = $$('span', barra);
      s[0].textContent = brl(p.price);
      s[1].textContent = p.label;
    }
  }

  function tamanhos() {
    var box = el('sizes'); if (!box) return;
    $$('button', box).forEach(function (b, i) {
      b.addEventListener('click', function () { if (PRODUTOS[i]) aplica(PRODUTOS[i]); });
    });
  }

  /* ------------------------------------------------------- botao de compra */
  function comprar() {
    var q = new URLSearchParams(window.location.search);
    q.set('size', atual.id);
    var url = '/carrinho?' + q.toString();
    setTimeout(function () { window.location.href = url; }, 800);
  }

  /* ---------------------------------------------------------- barra fixa */
  function criaBarra() {
    var d = document.createElement('div');
    d.className = 'fixed inset-x-0 bottom-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-sheet)]';
    d.innerHTML =
      '<div class="flex min-w-0 items-center gap-2">' +
        '<img src="' + atual.image + '" alt="Escada ' + atual.label + '" loading="lazy" width="44" height="44" class="h-11 w-11 shrink-0 rounded object-cover">' +
        '<div class="min-w-0">' +
          '<span class="block text-[15px] font-bold text-sale">' + brl(atual.price) + '</span>' +
          '<span class="block truncate text-[11px] text-muted-foreground">' + atual.label + '</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="buy-pulse min-h-11 shrink-0 touch-manipulation rounded-md bg-[#45a049] px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-white sm:px-5 sm:text-[13px]">COMPRAR AGORA</button>';
    d.style.display = 'none';
    $('button', d).addEventListener('click', comprar);
    document.body.appendChild(d);
    return d;
  }

  function topo() {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Voltar ao topo');
    b.className = 'fixed bottom-20 right-3 z-40 rounded-full border border-border bg-card p-2.5 shadow-soft';
    b.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up h-4 w-4" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>';
    b.style.display = 'none';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    return b;
  }

  /* ------------------------------------------------------------ menu mobile */
  var LINKS = [
    ['index.html', 'Início'], ['order.html', 'Rastreio'], ['contato.html', 'Fale Conosco'],
    ['aviso-legal.html', 'Aviso Legal'], ['politica-de-privacidade.html', 'Política de Privacidade'],
    ['politica-de-reembolso.html', 'Política de Reembolso'], ['politica-de-envio.html', 'Política de Envio'],
    ['termos-de-servico.html', 'Termos de Serviço']
  ];
  function menu() {
    var botao = el('menu'); if (!botao) return;
    var aberto = null;
    botao.addEventListener('click', function () {
      if (aberto) return;
      aberto = document.createElement('div');
      aberto.className = 'fixed inset-0 z-50';
      aberto.innerHTML =
        '<button type="button" aria-label="Fechar menu" class="absolute inset-0 bg-foreground/40"></button>' +
        '<div class="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-card shadow-xl">' +
          '<div class="px-5 pt-5"><button type="button" aria-label="Fechar menu" class="rounded-lg p-1 transition-colors hover:bg-secondary">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-6 w-6" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>' +
          '</button></div><nav class="mt-4 overflow-y-auto px-5 pb-8"><ul>' +
          LINKS.map(function (l) {
            return '<li class="border-b border-border"><a href="' + l[0] + '" class="block py-3.5 text-[15px] font-semibold transition-colors hover:text-brand utmify-ignore">' + l[1] + '</a></li>';
          }).join('') +
          '</ul></nav></div>';
      function fecha() { if (aberto) { aberto.remove(); aberto = null; document.body.style.overflow = ''; } }
      $$('[aria-label="Fechar menu"]', aberto).forEach(function (b) { b.addEventListener('click', fecha); });
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { fecha(); document.removeEventListener('keydown', k); } });
      document.body.style.overflow = 'hidden';
      document.body.appendChild(aberto);
    });
  }


  /* ---------- midias extras dos depoimentos (reviews-extra.js) ---------- */
  function montaExtras() {
    var mapa = window.__rmReviewsExtra;
    if (!mapa) return;

    Array.prototype.forEach.call(document.querySelectorAll('article'), function (art) {
      var av = art.querySelector('img[alt^="Foto de "]');
      if (!av) return;
      var nome = av.getAttribute('alt').replace('Foto de ', '').trim();
      var cfg = mapa[nome];
      if (!cfg) return;

      /* texto e avatar do proprio depoimento, para o modal */
      var ref = art.querySelector('.rmx-video-wrapper, .rmx-img-thumb');
      var texto  = ref ? ref.getAttribute('data-text')   : (art.querySelector('p') ? art.querySelector('p').textContent.trim() : '');
      var avatar = ref ? ref.getAttribute('data-avatar') : av.getAttribute('src');

      /* fileira: usa a existente ou cria uma */
      var row = art.querySelector('.rmx-media-row') ||
                (ref ? ref.parentNode : null);
      if (!row) {
        row = document.createElement('div');
        row.className = 'mt-3';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = 'repeat(3,90px)';
        row.style.gap = '6px';
        row.style.justifyContent = 'start';
        art.appendChild(row);
      }

      var BOX = 'width:90px;height:90px;border-radius:8px;overflow:hidden;' +
                'background-color:#000;cursor:pointer;flex-shrink:0';

      (cfg.videos || []).forEach(function (v) {
        var src = typeof v === 'string' ? v : v.src;
        var poster = typeof v === 'string' ? '' : (v.poster || '');
        var d = document.createElement('div');
        d.className = 'rmx-video-wrapper';
        d.setAttribute('data-src', src);
        d.setAttribute('data-name', nome);
        d.setAttribute('data-avatar', avatar || '');
        d.setAttribute('data-text', texto || '');
        d.setAttribute('role', 'button');
        d.setAttribute('tabindex', '0');
        d.setAttribute('aria-label', 'Ver vídeo de ' + nome);
        d.setAttribute('style', BOX + ';position:relative');
        d.innerHTML =
          '<video class="rmx-thumb-video" src="' + src + '#t=0.001"' +
          (poster ? ' poster="' + poster + '"' : '') +
          ' style="width:100%;height:100%;object-fit:cover;display:block" playsinline muted preload="none" tabindex="-1"></video>' +
          '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:34px;height:34px;' +
          'background:rgba(0,0,0,0.65);border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none">' +
          '<div style="width:0;height:0;border-left:12px solid #fff;border-top:7px solid transparent;' +
          'border-bottom:7px solid transparent;margin-left:3px"></div></div>';
        row.appendChild(d);
      });

      (cfg.fotos || []).forEach(function (src) {
        var d = document.createElement('div');
        d.className = 'rmx-img-thumb';
        d.setAttribute('data-src', src);
        d.setAttribute('data-name', nome);
        d.setAttribute('data-avatar', avatar || '');
        d.setAttribute('data-text', texto || '');
        d.setAttribute('role', 'button');
        d.setAttribute('tabindex', '0');
        d.setAttribute('aria-label', 'Ampliar foto de ' + nome);
        d.setAttribute('style', BOX);
        d.innerHTML = '<img src="' + src + '" alt="Foto enviada por ' + nome + '" ' +
          'loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">';
        row.appendChild(d);
      });
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    var e = el('eta'); if (e) e.textContent = eta();

    carrossel();
    tamanhos();
    menu();
    montaExtras();

    var buy = el('buy');
    if (buy) buy.addEventListener('click', comprar);

    barra = criaBarra();
    var up = topo();

    function aoRolar() {
      if (buy) {
        var passou = buy.getBoundingClientRect().bottom < 0;
        barra.style.display = passou ? 'grid' : 'none';
      }
      up.style.display = window.scrollY > 900 ? 'block' : 'none';
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });
    aoRolar();

    aplica(PRODUTOS[0]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
