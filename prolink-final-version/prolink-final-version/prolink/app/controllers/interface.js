/* ============================================================
   ProLink — controller: comportamentos gerais das telas (abas, anexos, listas)
   ============================================================ */
(function () {
  "use strict";
  var App = window.ProLink;
  var Banco = App.Banco;
  var irCom = App.irCom;
  var lerUsuarioSalvo = App.lerUsuarioSalvo;
  var salvarUsuario = App.salvarUsuario;
  var aplicarUsuarioNaTela = App.aplicarUsuarioNaTela;
  var hashDaSenha = App.hashDaSenha;

  /* -----------------------------------------------------------------------
     Abas e filtros

     Duas coisas diferentes, com marcação diferente:

     - Aba de verdade (role="tab" + aria-controls) alterna painéis.
     - Filtro de lista (aria-pressed) não tem painel: é um botão que liga e
       desliga. Marcar como "tab" faria o leitor de tela anunciar uma aba
       que não leva a lugar nenhum — item 12.1, uso por tecnologia assistiva.
     ----------------------------------------------------------------------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (lista) {
    var abas = lista.querySelectorAll('[role="tab"]');

    abas.forEach(function (aba) {
      aba.addEventListener("click", function () {
        abas.forEach(function (outra) {
          outra.setAttribute("aria-selected", "false");
          var alvo = outra.getAttribute("aria-controls");
          if (alvo && document.getElementById(alvo)) {
            document.getElementById(alvo).hidden = true;
          }
        });
        aba.setAttribute("aria-selected", "true");
        var painel = aba.getAttribute("aria-controls");
        if (painel && document.getElementById(painel)) {
          document.getElementById(painel).hidden = false;
        }
      });
    });
  });

  document.querySelectorAll(".abas").forEach(function (grupo) {
    var filtros = grupo.querySelectorAll(".aba-filtro");
    if (!filtros.length) { return; }

    filtros.forEach(function (filtro) {
      filtro.addEventListener("click", function () {
        filtros.forEach(function (outro) { outro.setAttribute("aria-pressed", "false"); });
        filtro.setAttribute("aria-pressed", "true");
      });
    });
  });

  /* Botão de salvar oportunidade. */
  document.querySelectorAll(".salvar").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var salvo = botao.getAttribute("aria-pressed") === "true";
      botao.setAttribute("aria-pressed", salvo ? "false" : "true");
      botao.setAttribute("aria-label", salvo ? "Salvar oportunidade" : "Remover dos salvos");
    });
  });

  /* Seleção de conversa na tela de mensagens. */
  var conversas = document.querySelectorAll(".conversa");
  conversas.forEach(function (item) {
    item.addEventListener("click", function () {
      conversas.forEach(function (outra) { outra.removeAttribute("aria-current"); });
      item.setAttribute("aria-current", "true");
      var contador = item.querySelector(".nao-lidas");
      if (contador) { contador.remove(); }
    });
  });

  /* Compositor de mensagem: adiciona o balão na conversa aberta. */
  var campoMensagem = document.getElementById("nova-mensagem");
  var corpoMensagens = document.querySelector(".mensagens-corpo");

  function enviarMensagem() {
    if (!campoMensagem || !campoMensagem.value.trim()) { return; }
    var balao = document.createElement("div");
    balao.className = "balao balao-enviado";
    balao.textContent = campoMensagem.value.trim();
    var hora = document.createElement("time");
    var agora = new Date();
    hora.textContent = String(agora.getHours()).padStart(2, "0") + ":" +
                       String(agora.getMinutes()).padStart(2, "0");
    balao.appendChild(hora);
    corpoMensagens.appendChild(balao);
    corpoMensagens.scrollTop = corpoMensagens.scrollHeight;
    campoMensagem.value = "";
  }

  if (campoMensagem) {
    campoMensagem.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); enviarMensagem(); }
    });
    var botaoEnviar = campoMensagem.parentElement.querySelector(".btn");
    if (botaoEnviar) { botaoEnviar.addEventListener("click", enviarMensagem); }
  }


  /* Anexos: lista os arquivos escolhidos (nada é enviado, não há back-end). */
  function formatarTamanho(bytes) {
    if (bytes < 1024) { return bytes + " B"; }
    if (bytes < 1048576) { return Math.round(bytes / 1024) + " KB"; }
    return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
  }

  document.querySelectorAll(".entrada-arquivo").forEach(function (entrada) {
    var lista = document.querySelector('[data-lista-de="' + entrada.id + '"]');
    if (!lista) { return; }

    entrada.addEventListener("change", function () {
      lista.innerHTML = "";
      Array.prototype.forEach.call(entrada.files, function (arquivo) {
        var item = document.createElement("li");
        item.className = "arquivo";
        item.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.8"/>' +
          '<path d="m8.4 12.2 2.5 2.5 4.7-5.2"/></svg>' +
          '<span class="nome"></span>' +
          '<span class="tamanho"></span>' +
          '<button type="button">Remover</button>';
        item.querySelector(".nome").textContent = arquivo.name;
        item.querySelector(".tamanho").textContent = formatarTamanho(arquivo.size);
        item.querySelector("button").addEventListener("click", function () {
          item.remove();
          if (!lista.children.length) { entrada.value = ""; }
        });
        lista.appendChild(item);
      });
    });
  });

})();
