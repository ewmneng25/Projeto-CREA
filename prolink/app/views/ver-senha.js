/* ============================================================
   ProLink — "olhinho" para ver a senha

   Todo campo de senha do sistema (entrar, criar conta, recuperar
   acesso, trocar senha nas configurações, chave do Gemini) ganha um
   botão com um olho para mostrar ou esconder o que foi digitado.
   Vale também para os campos criados depois (diálogos), porque a
   página é observada.

   Acessibilidade: é um botão de verdade, com nome fixo ("Mostrar
   senha") e estado em aria-pressed — o leitor de tela diz "Mostrar
   senha, botão, pressionado" quando a senha está visível.

   O campo fica marcado com data-senha: mesmo visível (type="text"),
   a assistente de voz continua sem ler nem repetir o valor.
   ============================================================ */
(function (window, document) {
  "use strict";

  var OLHO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_FECHADO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4"/>' +
    '<path d="M6.3 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3.5 3.5l17 17"/></svg>';

  var contador = 0;

  function nomeDoCampo(input) {
    return input.id === "campo-chave-gemini" ? "chave" : "senha";
  }

  function equipar(input) {
    if (input.hasAttribute("data-olho")) { return; }
    input.setAttribute("data-olho", "1");
    input.setAttribute("data-senha", "1");
    if (!input.id) { contador += 1; input.id = "campo-senha-" + contador; }

    /* Onde já existe a moldura com ícone (tela de entrar), o botão entra
       nela; nos demais campos, uma moldura mínima em volta do campo. */
    var moldura = input.parentNode;
    if (!moldura.classList || !moldura.classList.contains("campo-entrada")) {
      moldura = document.createElement("span");
      moldura.className = "campo-senha";
      input.parentNode.insertBefore(moldura, input);
      moldura.appendChild(input);
    }
    moldura.classList.add("com-olho");

    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-ver-senha";
    botao.setAttribute("aria-label", "Mostrar " + nomeDoCampo(input));
    botao.setAttribute("aria-pressed", "false");
    botao.setAttribute("aria-controls", input.id);
    botao.title = "Mostrar " + nomeDoCampo(input);
    botao.innerHTML = OLHO;
    moldura.appendChild(botao);
  }

  function alternar(botao) {
    var input = document.getElementById(botao.getAttribute("aria-controls"));
    if (!input) { return; }
    var mostrar = input.type === "password";
    var inicio = input.selectionStart, fim = input.selectionEnd;
    input.type = mostrar ? "text" : "password";
    botao.setAttribute("aria-pressed", mostrar ? "true" : "false");
    botao.title = (mostrar ? "Ocultar " : "Mostrar ") + nomeDoCampo(input);
    botao.innerHTML = mostrar ? OLHO_FECHADO : OLHO;
    /* Troca de tipo apaga a posição do cursor em alguns navegadores. */
    try { if (inicio != null) { input.setSelectionRange(inicio, fim); } } catch (erro) { /* ignora */ }
  }

  /* Delegado no documento: continua funcionando se algum script recriar
     o campo (cópia sem ouvintes). */
  document.addEventListener("click", function (evento) {
    var botao = evento.target.closest && evento.target.closest(".botao-ver-senha");
    if (!botao) { return; }
    evento.preventDefault();
    alternar(botao);
  });
  /* O clique no olho não tira o foco do campo que está sendo digitado. */
  document.addEventListener("mousedown", function (evento) {
    if (evento.target.closest && evento.target.closest(".botao-ver-senha")) { evento.preventDefault(); }
  });

  /* Ao enviar, a senha volta a ficar escondida: o navegador não a guarda
     como texto comum e ninguém a vê na tela seguinte. */
  document.addEventListener("submit", function (evento) {
    Array.prototype.forEach.call(evento.target.querySelectorAll('input[data-senha][type="text"]'), function (input) {
      var botao = document.querySelector('.botao-ver-senha[aria-controls="' + input.id + '"]');
      if (botao) { alternar(botao); } else { input.type = "password"; }
    });
  }, true);

  function varrer(raiz) {
    Array.prototype.forEach.call((raiz || document).querySelectorAll('input[type="password"]:not([data-olho])'), equipar);
  }

  function iniciar() {
    varrer(document);
    new MutationObserver(function (mudancas) {
      for (var i = 0; i < mudancas.length; i += 1) {
        if (mudancas[i].addedNodes.length) { varrer(document); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) { iniciar(); } else { document.addEventListener("DOMContentLoaded", iniciar); }
})(window, document);
