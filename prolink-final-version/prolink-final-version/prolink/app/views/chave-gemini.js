/* ============================================================
   ProLink — chave da API do Gemini, inserida pela tela inicial

   A chave não fica em nenhum arquivo do projeto (assim ela pode ir
   para o GitHub sem ser exposta). Na tela inicial, Ctrl + Espaço abre
   uma caixinha para colar a chave. O atalho funciona em qualquer tela
   (inclusive na da Miranda). Se o sistema operacional capturar o
   Ctrl + Espaço (no macOS ele troca o idioma do teclado), abra
   index.html#chave ou use Ctrl + Shift + Espaço. Ela fica no sessionStorage: vale em
   todas as telas enquanto o site estiver aberto e some quando a aba ou
   o navegador é fechado. A Miranda lê a chave dali a cada pergunta.
   ============================================================ */
(function (window, document) {
  "use strict";

  var CHAVE = "prolink_chave_gemini";

  function lerChave() {
    try { return window.sessionStorage.getItem(CHAVE) || ""; } catch (erro) { return ""; }
  }
  function gravarChave(valor) {
    try {
      if (valor) { window.sessionStorage.setItem(CHAVE, valor); }
      else { window.sessionStorage.removeItem(CHAVE); }
      return true;
    } catch (erro) { return false; }
  }

  var aberta = null;

  function fechar() {
    if (!aberta) { return; }
    aberta.remove();
    aberta = null;
  }

  function abrir() {
    if (aberta) { fechar(); return; }
    var atual = lerChave();
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa caixa-chave-gemini" role="dialog" aria-modal="true" aria-labelledby="titulo-chave-gemini">' +
        '<h2 id="titulo-chave-gemini">Chave da API do Gemini</h2>' +
        '<p class="dica" style="margin:6px 0 16px">' +
          (atual ? "Há uma chave ativa nesta sessão. Cole outra para trocar, ou remova." :
                   "Cole a chave para ativar a conversa com a Miranda. Ela vale só enquanto o site estiver aberto.") +
        "</p>" +
        '<div class="campo"><label for="campo-chave-gemini">Chave</label>' +
          '<input id="campo-chave-gemini" type="password" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave do Google AI Studio"></div>' +
        '<p class="erro-inline" id="erro-chave-gemini" hidden></p>' +
        '<div class="acoes-formulario" style="margin-top:18px">' +
          (atual ? '<button class="btn btn-fantasma" type="button" data-chave="remover">Remover chave</button>'
                 : '<button class="btn btn-secundario" type="button" data-chave="cancelar">Cancelar</button>') +
          '<button class="btn" type="button" data-chave="salvar">Usar esta chave</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(fundo);
    aberta = fundo;

    var campo = fundo.querySelector("#campo-chave-gemini");
    var erro = fundo.querySelector("#erro-chave-gemini");
    campo.focus();

    function avisar(texto) {
      var aviso = document.createElement("div");
      aviso.className = "aviso-chave-gemini";
      aviso.setAttribute("role", "status");
      aviso.textContent = texto;
      document.body.appendChild(aviso);
      window.setTimeout(function () { aviso.remove(); }, 2600);
    }

    function salvar() {
      var valor = campo.value.trim().replace(/\s+/g, "");
      if (valor.length < 20) {
        erro.textContent = "Essa chave parece incompleta. Confira e cole de novo.";
        erro.hidden = false;
        campo.focus();
        return;
      }
      if (!gravarChave(valor)) {
        erro.textContent = "O navegador bloqueou o armazenamento da sessão. Tente numa janela comum.";
        erro.hidden = false;
        return;
      }
      fechar();
      avisar("Chave ativada. A Miranda já pode conversar.");
    }

    fundo.querySelector('[data-chave="salvar"]').addEventListener("click", salvar);
    var cancelar = fundo.querySelector('[data-chave="cancelar"]');
    if (cancelar) { cancelar.addEventListener("click", fechar); }
    var remover = fundo.querySelector('[data-chave="remover"]');
    if (remover) {
      remover.addEventListener("click", function () {
        gravarChave("");
        fechar();
        avisar("Chave removida desta sessão.");
      });
    }
    campo.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter") { evento.preventDefault(); salvar(); }
    });
    fundo.addEventListener("click", function (evento) { if (evento.target === fundo) { fechar(); } });
  }

  /* Fase de captura: nenhum outro script da tela consegue engolir o atalho. */
  window.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && aberta) { fechar(); return; }
    var espaco = evento.code === "Space" || evento.key === " " || evento.key === "Spacebar";
    if (evento.ctrlKey && espaco && !evento.altKey && !evento.metaKey) {
      evento.preventDefault();
      evento.stopPropagation();
      abrir();
    }
  }, true);

  /* Alternativa ao atalho: abrir a página com #chave no endereço. */
  function abrirPeloEndereco() {
    if (window.location.hash === "#chave") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      abrir();
    }
  }
  window.addEventListener("hashchange", abrirPeloEndereco);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", abrirPeloEndereco);
  } else {
    abrirPeloEndereco();
  }
})(window, document);
