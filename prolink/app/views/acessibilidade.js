/* ============================================================
   ProLink — acessibilidade (leitor de tela e teclado)

   Carregado em todas as telas, antes dos demais scripts. Cuida do
   que vale para o sistema inteiro, inclusive para o conteúdo que os
   controllers desenham depois:

   1. Diálogos modais ([role=dialog][aria-modal=true]): o foco entra
      no diálogo ao abrir, fica preso nele com Tab e Shift+Tab e
      volta para quem abriu quando ele fecha.
   2. Níveis de título: os títulos seguem uma hierarquia sem saltos
      (h1 > h2 > h3), sem mudar a aparência — o nível lido pelo leitor
      de tela é ajustado com aria-level.
   3. Grupos de opção ([role=radiogroup]): as setas do teclado passam
      de uma opção para a outra, como num grupo de rádio nativo.
   4. Áreas com rolagem (conversa, notificações): recebem foco pelo
      teclado para poderem ser roladas sem mouse.
   5. Avisos de retorno (erros e situações do cadastro e do portfólio):
      ficam em regiões vivas, lidas assim que mudam.
   ============================================================ */
(function (window, document) {
  "use strict";

  var FOCAVEIS = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), ' +
    '[contenteditable="true"]';

  function visivel(el) {
    if (!el || !el.isConnected || el.closest("[hidden]")) { return false; }
    var estilo = window.getComputedStyle(el);
    return estilo.display !== "none" && estilo.visibility !== "hidden" && el.getClientRects().length > 0;
  }

  function focaveisDe(raiz) {
    return Array.prototype.filter.call(raiz.querySelectorAll(FOCAVEIS), visivel);
  }

  // ==================================================================
  // 1. DIÁLOGOS MODAIS
  // ==================================================================
  var abertos = [];            // diálogos visíveis, na ordem em que abriram
  var retornoPendente = null;  // foco a devolver quando um diálogo é trocado por outro
  var restaurarTimer = null;
  var ultimoFocoFora = null;   // último elemento focado fora de qualquer diálogo

  /* Guardado o tempo todo: quando o diálogo aparece, o próprio componente
     já pode ter puxado o foco para dentro dele. */
  document.addEventListener("focusin", function (evento) {
    var alvo = evento.target;
    if (alvo && alvo.closest && !alvo.closest('[role="dialog"], [role="alertdialog"]') && alvo !== document.body) {
      ultimoFocoFora = alvo;
    }
  }, true);
  document.addEventListener("mousedown", function (evento) {
    var alvo = evento.target && evento.target.closest && evento.target.closest(FOCAVEIS);
    if (alvo && !alvo.closest('[role="dialog"], [role="alertdialog"]')) { ultimoFocoFora = alvo; }
  }, true);

  function dialogosVisiveis() {
    return Array.prototype.filter.call(
      document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'),
      visivel);
  }

  function focarDentro(dialogo) {
    if (dialogo.contains(document.activeElement)) { return; }
    var alvo = dialogo.querySelector("[data-foco-inicial]");
    if (!alvo || !visivel(alvo)) {
      alvo = focaveisDe(dialogo).filter(function (el) {
        return el.matches("input:not([type=checkbox]):not([type=radio]), select, textarea");
      })[0] || focaveisDe(dialogo)[0];
    }
    if (!alvo) {
      if (!dialogo.hasAttribute("tabindex")) { dialogo.setAttribute("tabindex", "-1"); }
      alvo = dialogo;
    }
    try { alvo.focus({ preventScroll: true }); } catch (erro) { alvo.focus(); }
  }

  function atualizarDialogos() {
    var agora = dialogosVisiveis();

    /* Diálogos que acabaram de abrir. */
    agora.forEach(function (d) {
      if (abertos.some(function (a) { return a.el === d; })) { return; }
      var origem;
      if (retornoPendente) {
        origem = retornoPendente;
        retornoPendente = null;
        window.clearTimeout(restaurarTimer);
      } else if (abertos.length) {
        origem = null;  // aberto de dentro de outro diálogo: volta para o anterior
      } else {
        origem = ultimoFocoFora;
      }
      abertos.push({ el: d, origem: origem && origem !== document.body ? origem : null });
      /* Um instante para o próprio componente escolher onde pôr o foco. */
      window.setTimeout(function () { if (visivel(d)) { focarDentro(d); } }, 60);
    });

    /* Diálogos que fecharam (removidos ou escondidos). */
    abertos = abertos.filter(function (a) {
      if (agora.indexOf(a.el) !== -1) { return true; }
      var origem = a.origem;
      retornoPendente = origem;
      window.clearTimeout(restaurarTimer);
      /* Se outro diálogo tomar o lugar (o tour troca de balão a cada
         passo), ele herda a origem; senão o foco volta para ela. */
      restaurarTimer = window.setTimeout(function () {
        var alvo = retornoPendente;
        retornoPendente = null;
        if (dialogosVisiveis().length) { return; }
        if (alvo && alvo.isConnected && visivel(alvo)) {
          try { alvo.focus({ preventScroll: true }); } catch (erro) { alvo.focus(); }
        } else {
          var principal = document.getElementById("conteudo");
          if (principal) {
            if (!principal.hasAttribute("tabindex")) { principal.setAttribute("tabindex", "-1"); }
            principal.focus({ preventScroll: true });
          }
        }
      }, 120);
      return false;
    });
  }

  /* Tab e Shift+Tab ficam dentro do diálogo do topo. */
  document.addEventListener("keydown", function (evento) {
    if (evento.key !== "Tab" || !abertos.length) { return; }
    var topo = abertos[abertos.length - 1].el;
    if (!visivel(topo)) { return; }
    var lista = focaveisDe(topo);
    if (!lista.length) { evento.preventDefault(); topo.focus(); return; }
    var primeiro = lista[0], ultimo = lista[lista.length - 1];
    var atual = document.activeElement;
    if (!topo.contains(atual)) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primeiro).focus();
    } else if (evento.shiftKey && (atual === primeiro || atual === topo)) {
      evento.preventDefault(); ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault(); primeiro.focus();
    }
  }, true);

  /* Foco que escapa do diálogo pelo mouse ou por script volta para ele. */
  document.addEventListener("focusin", function (evento) {
    if (!abertos.length) { return; }
    var topo = abertos[abertos.length - 1].el;
    if (visivel(topo) && !topo.contains(evento.target)) { focarDentro(topo); }
  });

  // ==================================================================
  // 2. NÍVEIS DE TÍTULO
  // ==================================================================
  function nivelOriginal(h) {
    if (!h.hasAttribute("data-nivel-original")) {
      var n = h.getAttribute("aria-level") || (/^H[1-6]$/.test(h.tagName) ? h.tagName.charAt(1) : "2");
      h.setAttribute("data-nivel-original", n);
    }
    return parseInt(h.getAttribute("data-nivel-original"), 10);
  }

  function nivelar(raiz, anterior) {
    Array.prototype.forEach.call(raiz.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'), function (h) {
      /* Títulos dentro de um diálogo seguem a hierarquia do diálogo. */
      if (h.closest('[role="dialog"]') !== (raiz.matches('[role="dialog"]') ? raiz : null)) { return; }
      if (!visivel(h)) { return; }
      var original = nivelOriginal(h);
      var nivel = Math.min(original, anterior + 1);
      if (nivel !== original) {
        h.setAttribute("aria-level", String(nivel));
        if (!h.hasAttribute("role") && !/^H[1-6]$/.test(h.tagName)) { h.setAttribute("role", "heading"); }
      } else if (h.getAttribute("aria-level") && h.getAttribute("aria-level") !== String(original)) {
        h.setAttribute("aria-level", String(original));
      } else if (/^H[1-6]$/.test(h.tagName) && String(original) === h.tagName.charAt(1)) {
        h.removeAttribute("aria-level");
      }
      anterior = nivel;
    });
  }

  function atualizarTitulos() {
    var principal = document.getElementById("conteudo") || document.querySelector("main");
    if (principal) { nivelar(principal, principal.querySelector("h1") ? 0 : 1); }
    dialogosVisiveis().forEach(function (d) { nivelar(d, 1); });
  }

  // ==================================================================
  // 3. GRUPOS DE OPÇÃO COM SETAS
  // ==================================================================
  document.addEventListener("keydown", function (evento) {
    var opcao = evento.target.closest && evento.target.closest('[role="radio"]');
    if (!opcao) { return; }
    var grupo = opcao.closest('[role="radiogroup"]');
    if (!grupo) { return; }
    var passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
    if (!passo) { return; }
    var opcoes = Array.prototype.filter.call(grupo.querySelectorAll('[role="radio"]'), visivel);
    var i = opcoes.indexOf(opcao);
    var proxima = opcoes[(i + passo + opcoes.length) % opcoes.length];
    if (proxima) {
      evento.preventDefault();
      proxima.focus();
      proxima.click();
    }
  });

  // ==================================================================
  // 4 e 5. ÁREAS COM ROLAGEM E REGIÕES VIVAS
  // ==================================================================
  var AREAS_DE_ROLAGEM = [
    [".mensagens-corpo", "Mensagens da conversa"],
    [".lista-notificacoes", "Lista de notificações"],
    [".coluna-contexto", "Detalhes da conversa"]
  ];
  var REGIOES_VIVAS = [
    [".retorno-crea", "status"],
    ["#erro-tipo-conta", "alert"],
    ["#erro-chave-gemini", "alert"],
    ["#estado-analise", "status"],
    ["#titulo-fila", "status"]
  ];

  function marcarAreas() {
    AREAS_DE_ROLAGEM.forEach(function (par) {
      Array.prototype.forEach.call(document.querySelectorAll(par[0]), function (el) {
        if (el.hasAttribute("tabindex")) { return; }
        var rolavel = el.scrollHeight > el.clientHeight + 2;
        if (rolavel && !focaveisDe(el).length) {
          el.setAttribute("tabindex", "0");
          if (!el.hasAttribute("aria-label")) { el.setAttribute("aria-label", par[1]); }
        }
      });
    });
    REGIOES_VIVAS.forEach(function (par) {
      Array.prototype.forEach.call(document.querySelectorAll(par[0]), function (el) {
        if (!el.hasAttribute("role")) { el.setAttribute("role", par[1]); }
        if (!el.hasAttribute("aria-live")) { el.setAttribute("aria-live", par[1] === "alert" ? "assertive" : "polite"); }
      });
    });
  }

  // ==================================================================
  // OBSERVAÇÃO DO DOCUMENTO
  // ==================================================================
  var agendado = false;
  function agendar() {
    if (agendado) { return; }
    agendado = true;
    window.requestAnimationFrame(function () {
      agendado = false;
      atualizarDialogos();
      atualizarTitulos();
      marcarAreas();
    });
  }

  function iniciar() {
    agendar();
    new MutationObserver(agendar).observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["hidden", "class", "style", "aria-modal"]
    });
    /* A página interna aparece quando os dados terminam de ser desenhados. */
    document.addEventListener("prolink:base-pronta", agendar);
  }

  if (document.body) { iniciar(); } else { document.addEventListener("DOMContentLoaded", iniciar); }

  window.ProLinkAcessibilidade = { atualizar: agendar, focarDentro: focarDentro };
})(window, document);
