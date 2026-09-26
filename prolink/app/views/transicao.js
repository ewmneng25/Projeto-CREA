/* ============================================================
   ProLink — splash e transições

   Duas coisas, com propósitos diferentes:

   SPLASH ..... aparece uma vez por sessão do navegador, na porta
                de entrada. Serve para a marca existir antes da
                interface, e para cobrir o instante em que a
                página monta.

   TRANSIÇÃO .. aparece quando a pessoa troca de contexto: entra,
                sai, cria conta, muda de perfil. Não é enfeite —
                é o aviso de que o chão mudou. Navegar entre telas
                do mesmo contexto não mostra transição nenhuma,
                senão viraria atraso.

   Nenhuma das duas bloqueia conteúdo por mais tempo do que a
   navegação levaria de qualquer jeito, e ambas somem sozinhas
   caso a página seguinte demore.
   ============================================================ */
(function (window, document) {
  "use strict";

  var CHAVE_SPLASH = "prolink_splash_visto";
  var DURACAO_SPLASH = 2300;   // tempo de ler a assinatura sem virar espera
  var DURACAO_TRANSICAO = 620;
  var LIMITE_SEGURANCA = 4000;   // nunca deixa a tela presa

  var reduzirMovimento = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==================================================================
  // A MARCA
  // Mesma treliça do cabeçalho, redesenhada aqui porque o splash
  // existe antes de qualquer HTML da página.
  // ==================================================================
  function marca(tamanho, ident) {
    return '' +
      '<svg class="splash-marca" width="' + tamanho + '" height="' + tamanho + '" ' +
      'viewBox="0 0 44 44" fill="none" aria-hidden="true">' +
        '<g stroke="url(#' + ident + '-b)" stroke-width="2.6" stroke-linecap="round">' +
          '<path class="splash-barra" d="M22 7.5 6.5 34.5"/>' +
          '<path class="splash-barra" d="M22 7.5 37.5 34.5"/>' +
          '<path class="splash-barra" d="M6.5 34.5h31"/>' +
          '<path class="splash-barra" d="M22 7.5V22"/>' +
          '<path class="splash-barra" d="M22 22 6.5 34.5"/>' +
          '<path class="splash-barra" d="M22 22l15.5 12.5"/>' +
        "</g>" +
        '<g fill="url(#' + ident + '-n)">' +
          '<circle class="splash-no" cx="22" cy="7.5" r="4.2"/>' +
          '<circle class="splash-no" cx="6.5" cy="34.5" r="4.2"/>' +
          '<circle class="splash-no" cx="37.5" cy="34.5" r="4.2"/>' +
        "</g>" +
        '<circle class="splash-no splash-centro" cx="22" cy="22" r="5.6" fill="#0b1220"/>' +
        '<circle class="splash-no splash-centro" cx="22" cy="22" r="5.6" fill="none" ' +
          'stroke="#7aa7ff" stroke-width="2.4"/>' +
        '<circle class="splash-no splash-centro" cx="22" cy="22" r="1.9" fill="#7aa7ff"/>' +
        "<defs>" +
          '<linearGradient id="' + ident + '-b" gradientUnits="userSpaceOnUse" ' +
            'x1="6" y1="8" x2="38" y2="35">' +
            '<stop stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/>' +
          "</linearGradient>" +
          '<linearGradient id="' + ident + '-n" gradientUnits="userSpaceOnUse" ' +
            'x1="6" y1="8" x2="38" y2="35">' +
            '<stop stop-color="#93c5fd"/><stop offset="1" stop-color="#2563eb"/>' +
          "</linearGradient>" +
        "</defs>" +
      "</svg>";
  }

  function marcaNome(classe) {
    return '<p class="' + classe + '">Pro<span>Link</span></p>';
  }

  // ==================================================================
  // SPLASH
  // ==================================================================
  function jaViuSplash() {
    try {
      return window.sessionStorage.getItem(CHAVE_SPLASH) === "1";
    } catch (erro) {
      return false;
    }
  }

  function marcarSplashVisto() {
    try {
      window.sessionStorage.setItem(CHAVE_SPLASH, "1");
    } catch (erro) { /* sem sessionStorage: aparece de novo, sem prejuízo */ }
  }

  function mostrarSplash() {
    var tela = document.createElement("div");
    tela.className = "splash";
    tela.setAttribute("role", "status");
    tela.setAttribute("aria-label", "Carregando o ProLink");

    tela.innerHTML =
      '<div class="splash-conteudo">' +
        marca(180, "splash") +
        marcaNome("splash-nome") +
        '<p class="splash-frase">Conecte. Valide. Construa.</p>' +
        '<div class="splash-barra-carga"><span></span></div>' +
      "</div>";

    document.body.appendChild(tela);
    document.documentElement.classList.add("com-splash");
    document.documentElement.classList.remove("splash-pendente");

    window.setTimeout(function () {
      tela.classList.add("splash-saindo");
      document.documentElement.classList.remove("com-splash");
      window.setTimeout(function () {
        tela.remove();
        /* Quem espera o splash sair (a caixinha de boas-vindas) é avisado. */
        document.dispatchEvent(new CustomEvent("prolink:splash-fim"));
      }, 420);
    }, reduzirMovimento ? 400 : DURACAO_SPLASH);

    marcarSplashVisto();
  }

  // ==================================================================
  // TRANSIÇÃO
  // ==================================================================
  var emTransicao = false;

  /**
   * Mostra a transição e navega quando ela estiver na tela.
   *
   * @param {string} texto    o que está acontecendo, em uma linha
   * @param {string} destino  para onde ir; sem destino, só mostra
   */
  function transicionar(texto, destino) {
    if (emTransicao) { return; }
    emTransicao = true;

    var tela = document.createElement("div");
    tela.className = "transicao";
    tela.setAttribute("role", "status");
    tela.setAttribute("aria-live", "polite");

    tela.innerHTML =
      '<div class="transicao-conteudo">' +
        marca(128, "transicao") +
        '<p class="transicao-texto">' + texto + "</p>" +
        '<div class="splash-barra-carga transicao-carga"><span></span></div>' +
      "</div>";

    document.body.appendChild(tela);

    if (!destino) { return; }

    var navegou = false;

    function seguir() {
      if (navegou) { return; }
      navegou = true;
      window.location.href = destino;
    }

    window.setTimeout(seguir, reduzirMovimento ? 120 : DURACAO_TRANSICAO);

    /* Se a navegação travar, a tela não fica presa para sempre. */
    window.setTimeout(function () {
      tela.remove();
      emTransicao = false;
    }, LIMITE_SEGURANCA);
  }

  window.ProLinkTransicao = {
    mostrar: transicionar,
    /** Some ao voltar pelo histórico, em vez de ficar congelada na tela. */
    limpar: function () {
      var tela = document.querySelector(".transicao");
      if (tela) { tela.remove(); }
      emTransicao = false;
    }
  };

  // ==================================================================
  // GATILHOS
  // ==================================================================
  /* O splash é só da porta de entrada, uma vez por sessão do navegador. */
  var pagina = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

  if ((pagina === "index.html" || pagina === "") && !jaViuSplash()) {
    /* O script fica no fim do body: o body já existe, então o splash
       entra na hora, sem esperar o resto da página. */
    if (document.body) {
      mostrarSplash();
    } else {
      document.addEventListener("DOMContentLoaded", mostrarSplash);
    }
  } else {
    document.documentElement.classList.remove("splash-pendente");
  }

  /* Voltar pelo histórico traz a página do cache com a transição na
     tela. Limpar no pageshow evita a tela morta. */
  window.addEventListener("pageshow", function (evento) {
    if (evento.persisted) { window.ProLinkTransicao.limpar(); }
  });

  /* Links marcados com data-transicao trocam de contexto. */
  document.addEventListener("click", function (evento) {
    var link = evento.target.closest("[data-transicao]");
    if (!link) { return; }

    var destino = link.getAttribute("href");
    if (!destino || destino.charAt(0) === "#") { return; }

    evento.preventDefault();
    transicionar(link.getAttribute("data-transicao") || "Um instante…", destino);
  });
})(window, document);
