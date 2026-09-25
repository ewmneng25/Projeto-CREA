/* ============================================================
   ProLink — controller: filtros em abas (roda depois das listas desenhadas)
   ============================================================ */
/* ==================================================================
   6. FILTROS EM ABAS
   Antes, as abas só trocavam o botão marcado. Agora escondem o que
   não pertence ao filtro e avisam quando a lista fica vazia.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  if (!U) { return; }
  var normalizar = U.normalizar;

  /* O que cada rótulo de aba procura nas etiquetas do item. */
  var PROCURA = {
    "projetos": ["projeto"], "parcerias": ["parceria"], "servicos": ["servico"],
    "verificados": ["registro verificado"],
    "na fila": ["na fila", "aguardando"], "em analise": ["em analise"],
    "resolvidas": ["resolvida"], "arquivadas": ["arquivada"],
    "abertas": ["aberta"], "encerradas": ["encerrada", "recusada", "nao selecionada"],
    "concluidos": ["concluido"], "em andamento": ["em andamento", "enviada", "visualizada", "em analise"],
    "arquivados": ["arquivado"], "arts": ["art"], "cats": ["cat"], "em consulta": ["em consulta"],
    "recebidas": ["recebida"], "realizadas": ["realizada"],
    "salvas": ["salvo"], "salvos": ["salvo"],
    "ja trabalhei com": ["ja trabalhou"], "ja contratados": ["ja trabalhou"]
  };

  /* Relação fictícia: com quem cada lado já trabalhou (há conversa e contrato). */
  var JA_TRABALHOU = {
    "profissionais.html": ["ana beatriz farias"],
    "empresa-profissionais.html": ["daniel silva do carmo"]
  };

  function rotulo(botao) {
    return normalizar(botao.childNodes.length
      ? Array.prototype.filter.call(botao.childNodes, function (n) { return n.nodeType === 3; })
          .map(function (n) { return n.textContent; }).join(" ")
      : botao.textContent);
  }

  /** A lista que o grupo de abas controla: o próximo irmão com itens. */
  function alvoDoGrupo(grupo) {
    var n = grupo.nextElementSibling;
    while (n) {
      if (n.matches(".lista-oportunidades, .grade, .cartao-limpo, #lista-minhas-candidaturas") ||
          n.querySelector("article, li")) {
        return n;
      }
      n = n.nextElementSibling;
    }
    return null;
  }

  function itensDe(alvo) {
    var lista = alvo.querySelector("ul.lista-divisoria");
    if (lista) { return Array.prototype.slice.call(lista.children); }
    return Array.prototype.filter.call(alvo.children, function (filho) {
      return filho.matches("article, .cartao, div");
    });
  }

  function categoriasDe(item) {
    var cats = Array.prototype.map.call(item.querySelectorAll(".etiqueta, .documento-tipo"), function (e) {
      return normalizar(e.textContent);
    });
    if (item.dataset.categoria) {
      item.dataset.categoria.split(",").forEach(function (c) { cats.push(normalizar(c)); });
    }
    if (item.querySelector('.salvar[aria-pressed="true"]')) { cats.push("salvo"); }
    var nome = item.querySelector("h3");
    var salvos = [];
    if (nome) {
      var n = normalizar(nome.textContent);
      if ((JA_TRABALHOU[U.paginaAtual()] || []).indexOf(n) !== -1) { cats.push("ja trabalhou"); }
      if (salvos.indexOf(n) !== -1) { cats.push("salvo"); }
    }
    return cats;
  }

  function combina(item, chave) {
    if (!chave || chave === "todas" || chave === "todos") { return true; }
    var procura = PROCURA[chave] || [chave];
    var cats = categoriasDe(item);
    return procura.some(function (p) {
      return cats.some(function (c) { return c === p || c.indexOf(p + " ") === 0 || c.indexOf(p) === 0 && p.length > 3; });
    });
  }

  function aplicar(grupo) {
    var alvo = alvoDoGrupo(grupo);
    if (!alvo) { return; }
    var marcado = grupo.querySelector('.aba-filtro[aria-pressed="true"]');
    var chave = marcado ? rotulo(marcado) : "";
    var visiveis = 0;

    itensDe(alvo).forEach(function (item) {
      if (item.classList.contains("estado-vazio")) { return; }
      /* Item escondido por outro filtro (busca lateral) continua escondido. */
      var ok = combina(item, chave);
      item.classList.toggle("oculto-aba", !ok);
      if (ok && !item.classList.contains("oculto-filtro")) { visiveis += 1; }
    });

    var vazio = alvo.parentNode.querySelector('.estado-vazio[data-de-grupo]');
    if (!visiveis && itensDe(alvo).length) {
      if (!vazio) {
        vazio = document.createElement("p");
        vazio.className = "estado-vazio";
        vazio.setAttribute("data-de-grupo", "1");
        alvo.parentNode.insertBefore(vazio, alvo.nextSibling);
      }
      vazio.textContent = "Nada em “" + (marcado ? marcado.textContent.replace(/\d+/g, "").trim() : "") +
                          "” por enquanto.";
    } else if (vazio) {
      vazio.remove();
    }
    document.dispatchEvent(new CustomEvent("prolink:filtrado", { detail: { alvo: alvo } }));
  }

  document.querySelectorAll(".abas").forEach(function (grupo) {
    var filtros = grupo.querySelectorAll(".aba-filtro");
    if (!filtros.length) { return; }
    filtros.forEach(function (filtro) {
      /* O prolink.js já troca o aria-pressed; aqui só aplicamos o efeito. */
      filtro.addEventListener("click", function () { window.setTimeout(function () { aplicar(grupo); }, 0); });
    });
    aplicar(grupo);
  });

  /* Outras partes (denúncias, avaliações) avisam quando a lista muda. */
  document.addEventListener("prolink:lista-mudou", function () {
    document.querySelectorAll(".abas").forEach(function (grupo) {
      if (grupo.querySelector(".aba-filtro")) { aplicar(grupo); }
    });
  });

  U.reaplicarAbas = function () {
    document.dispatchEvent(new CustomEvent("prolink:lista-mudou"));
  };
})(window, document);
