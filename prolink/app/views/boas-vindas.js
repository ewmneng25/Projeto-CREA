/* ============================================================
   ProLink — boas-vindas e ativação do modo de acessibilidade

   Na página inicial, assim que o splash sai, aparece uma caixinha de
   boas-vindas que pergunta se a pessoa quer ativar o modo de
   acessibilidade: a Miranda passa a acompanhar a navegação por voz,
   em todas as telas, até ser desativada.

   A caixinha aparece uma vez por sessão do navegador (como o splash)
   e pode ser aberta de novo em qualquer tela com Alt + M.
   ============================================================ */
(function (window, document) {
  "use strict";

  var CHAVE_MODO = "prolink_modo_voz";           // localStorage: modo ligado, até desligar
  var CHAVE_VISTA = "prolink_boas_vindas_vista";  // sessionStorage: já perguntou nesta sessão

  var pagina = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  var dentroDaMoldura = window.parent && window.parent !== window;

  function ler(armazenamento, chave) {
    try { return window[armazenamento].getItem(chave); } catch (erro) { return null; }
  }
  function gravar(armazenamento, chave, valor) {
    try { window[armazenamento].setItem(chave, valor); } catch (erro) { /* sem armazenamento */ }
  }

  var aberta = null;

  function fechar() {
    if (!aberta) { return; }
    aberta.remove();
    aberta = null;
    gravar("sessionStorage", CHAVE_VISTA, "1");
  }

  function ativar() {
    gravar("localStorage", CHAVE_MODO, "1");
    gravar("sessionStorage", CHAVE_VISTA, "1");
    var atual = pagina + window.location.search + window.location.hash;
    var reserva = "acessivel.html?p=" + encodeURIComponent(atual);

    /* A moldura de voz é montada aqui mesmo, sem trocar de página: se veio
       de um clique, o contexto de áudio nasce com o clique ainda valendo;
       se ligou sozinha depois do splash, o primeiro toque libera o som. */
    try {
      var Contexto = window.AudioContext || window.webkitAudioContext;
      if (Contexto) {
        window.ProLinkAudioPreparado = new Contexto();
        window.ProLinkAudioPreparado.resume();
      }
    } catch (erro) { /* sem Web Audio: a moldura avisa */ }

    if (aberta) { aberta.remove(); aberta = null; }
    window.PROLINK_VOZ_PAGINA_INICIAL = atual;
    try { window.history.replaceState(null, "", reserva); } catch (erro) { /* arquivo aberto direto: fica o endereço atual */ }
    var script = document.createElement("script");
    script.src = "app/views/voz-moldura.js";
    script.onerror = function () { window.location.href = reserva; };
    document.body.appendChild(script);
  }

  function abrir() {
    if (aberta || dentroDaMoldura) { return; }
    if (ler("localStorage", CHAVE_MODO) === "1") { return; }
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo modo-voz-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa modo-voz-caixa" role="dialog" aria-modal="true" ' +
          'aria-labelledby="boas-vindas-titulo" aria-describedby="boas-vindas-texto">' +
        '<div class="modo-voz-icone" aria-hidden="true">' +
          '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/>' +
            '<path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>' +
        "</div>" +
        '<h2 id="boas-vindas-titulo">Boas-vindas ao ProLink</h2>' +
        '<div id="boas-vindas-texto">' +
          "<p>Que bom ter você aqui. O ProLink conecta profissionais registrados no Crea a empresas e obras.</p>" +
          "<p>Quer ativar o <strong>modo de acessibilidade</strong>? Nele, a assistente Miranda conversa com você por voz " +
          "e ajuda a navegar por todo o sistema: ela lê as telas, pesquisa, preenche formulários e abre o que você pedir. " +
          "É só falar. O modo continua ligado em todas as telas até você desativar.</p>" +
        "</div>" +
        '<p class="dica modo-voz-dica">O navegador vai pedir permissão para usar o microfone. ' +
          "Atalho em qualquer tela: <kbd>Alt</kbd> + <kbd>M</kbd>.</p>" +
        '<div class="acoes-formulario modo-voz-acoes">' +
          '<button class="btn btn-secundario" type="button" data-boas-vindas="agora-nao">Agora não</button>' +
          '<button class="btn" type="button" data-boas-vindas="ativar" data-foco-inicial>Ativar modo de acessibilidade</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(fundo);
    aberta = fundo;

    fundo.querySelector('[data-boas-vindas="ativar"]').addEventListener("click", ativar);
    fundo.querySelector('[data-boas-vindas="agora-nao"]').addEventListener("click", fechar);
    fundo.addEventListener("click", function (evento) { if (evento.target === fundo) { fechar(); } });
    window.setTimeout(function () {
      var botao = fundo.querySelector("[data-foco-inicial]");
      if (botao && !fundo.contains(document.activeElement)) { botao.focus(); }
    }, 80);
  }

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && aberta) { fechar(); }
  });

  /* O ProLink começa com a voz ligada: na porta de entrada, assim que o
     splash sai, a moldura de voz monta sozinha. Ela pergunta (na caixinha e
     em voz alta) se a pessoa quer continuar com a voz ou desativar. Quem
     desativa não tem a voz ligada sozinha de novo nesta sessão; Alt + M
     continua oferecendo o modo. */
  function deveLigarSozinha() {
    return (pagina === "index.html" || pagina === "") && !dentroDaMoldura &&
      ler("localStorage", CHAVE_MODO) !== "1" && ler("sessionStorage", "prolink_voz_recusada") !== "1";
  }

  var comSplash = !!document.querySelector(".splash") || document.documentElement.classList.contains("splash-pendente");
  if (comSplash && deveLigarSozinha()) {
    var ligou = false;
    var ligar = function () {
      if (ligou || !deveLigarSozinha()) { return; }
      ligou = true;
      ativar();
    };
    document.addEventListener("prolink:splash-fim", function () { window.setTimeout(ligar, 150); });
    /* Rede de segurança, caso o aviso do splash se perca. */
    window.setTimeout(function () {
      if (!document.querySelector(".splash") && !document.documentElement.classList.contains("splash-pendente")) { ligar(); }
    }, 4500);
  }

  window.ProLinkBoasVindas = { abrir: abrir, ativar: ativar };
})(window, document);
