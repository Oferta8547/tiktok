/* ============================================================
   ReformaMax — DATAS AUTOMATICAS DOS DEPOIMENTOS
   ============================================================

   As datas dos depoimentos deixam de ser fixas. Cada depoimento
   guarda apenas quantos DIAS ATRAS ele foi publicado, e a data
   real e calculada toda vez que a pagina abre.

   Assim o depoimento mais novo esta sempre a poucos dias do
   dia de hoje, sem precisar mexer no site.

   COMO AJUSTAR:
   no index.html cada data tem o atributo  data-rm-dias="3"
   3  = tres dias atras
   30 = trinta dias atras
   Quanto maior o numero, mais antigo fica o depoimento.
   ============================================================ */

(function () {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* Converte "dias atras" em data no formato dd/mm/aaaa */
  function dataRelativa(dias) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - dias);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /* Deixa disponivel para o bundle do site usar tambem */
  window.rmxDataRel = dataRelativa;

  function aplicar(escopo) {
    var alvos = (escopo || document).querySelectorAll('[data-rm-dias]');
    for (var i = 0; i < alvos.length; i++) {
      var dias = parseInt(alvos[i].getAttribute('data-rm-dias'), 10);
      if (isNaN(dias) || dias < 0) continue;
      var txt = dataRelativa(dias);
      if (alvos[i].textContent !== txt) alvos[i].textContent = txt;
    }
  }

  function iniciar() {
    aplicar(document);

    /* O React pode re-renderizar a lista depois da hidratacao.
       O observer garante que as datas continuem corretas. */
    if (typeof MutationObserver === 'function' && document.body) {
      var mo = new MutationObserver(function () { aplicar(document); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
