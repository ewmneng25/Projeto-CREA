/* ============================================================
   ProLink — controller: registrar denúncia
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
     Denunciar conteúdo

     A fila de denúncias do painel administrativo precisa de uma origem: é
     aqui que o usuário registra. Cenário mínimo do Anexo I, item 7.
     ----------------------------------------------------------------------- */
  function abrirDenuncia(alvo) {
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa" role="dialog" aria-modal="true" aria-label="Registrar denúncia">' +
        '<h2>Denunciar</h2>' +
        '<p class="dica" style="margin-bottom:18px">Você está denunciando <strong>' +
          alvo + "</strong>. A análise é feita pela equipe do Crea-AM e a decisão fica " +
          "registrada na trilha de auditoria.</p>" +
        '<div class="campo">' +
          '<label for="motivo-denuncia">Motivo</label>' +
          '<select id="motivo-denuncia">' +
            "<option>Informação profissional enganosa</option>" +
            "<option>Conta duplicada ou falsa</option>" +
            "<option>Exigência discriminatória</option>" +
            "<option>Uso indevido de dados</option>" +
            "<option>Conteúdo ofensivo</option>" +
            "<option>Outro</option>" +
          "</select>" +
        "</div>" +
        '<div class="campo">' +
          '<label for="detalhe-denuncia">O que aconteceu</label>' +
          '<textarea id="detalhe-denuncia" placeholder="Descreva o que motivou a denúncia."></textarea>' +
        "</div>" +
        '<p class="dica">Denúncia falsa ou de má-fé também é passível de sanção.</p>' +
        '<div class="acoes-formulario" style="margin-top:18px">' +
          '<button class="btn btn-secundario" type="button" data-denuncia="cancelar">Cancelar</button>' +
          '<button class="btn" type="button" data-denuncia="enviar">Enviar denúncia</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(fundo);
    fundo.querySelector("select").focus();

    function fechar() {
      fundo.remove();
      document.removeEventListener("keydown", aoTeclarModal);
    }
    function aoTeclarModal(evento) {
      if (evento.key === "Escape") { fechar(); }
    }

    fundo.querySelector('[data-denuncia="cancelar"]').addEventListener("click", fechar);
    fundo.querySelector('[data-denuncia="enviar"]').addEventListener("click", function () {
      var caixa = fundo.querySelector(".denuncia-caixa");
      var detalhe = fundo.querySelector("#detalhe-denuncia").value.trim();
      if (detalhe.length < 10) {
        alert("Descreva em poucas palavras o que motivou a denúncia.");
        return;
      }
      var quem = lerUsuarioSalvo() || {};
      var ano = new Date().getFullYear();
      var numeros = (Banco ? ProLinkModelos.denuncias.listar() : []).map(function (d) {
        return Number(String(d.protocolo || "").split("/")[1]) || 0;
      });
      var protocolo = ano + "/" + String(Math.max.apply(null, numeros.concat([341])) + 1).padStart(4, "0");
      var gravada = Banco && ProLinkModelos.denuncias.inserir({
        protocolo: protocolo,
        titulo: fundo.querySelector("#motivo-denuncia").value,
        alvo: alvo.replace(/^(o perfil de |este |esta )/i, ""),
        denunciante: quem.nome || "Visitante",
        motivo: detalhe,
        situacao: "Na fila",
        recebida: "recebida agora"
      });
      if (!gravada) {
        alert("Não foi possível gravar a denúncia na base de dados.");
        return;
      }
      ProLinkModelos.auditoria.registrar("Denúncia registrada", "Protocolo " + protocolo);
      caixa.innerHTML =
        '<h2>Denúncia registrada</h2>' +
        '<p class="dica" style="margin:10px 0 18px">Protocolo <strong>' + protocolo + '</strong>. ' +
        "A equipe do Crea-AM analisa em até 2 dias úteis e você recebe a resposta por e-mail.</p>" +
        '<div class="acoes-formulario"><span></span>' +
        '<button class="btn" type="button" data-denuncia="cancelar">Fechar</button></div>';
      caixa.querySelector('[data-denuncia="cancelar"]').addEventListener("click", fechar);
    });
    fundo.addEventListener("click", function (evento) {
      if (evento.target === fundo) { fechar(); }
    });
    document.addEventListener("keydown", aoTeclarModal);
  }

  /* Exposto para telas que criam conteúdo depois da carga. */
  window.ProLinkDenuncia = abrirDenuncia;

  document.querySelectorAll("[data-denunciar]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      abrirDenuncia(botao.getAttribute("data-denunciar") || "este conteúdo");
    });
  });

  /* Bloqueio no painel administrativo: confirma antes, porque a ação afeta o
     acesso de outra pessoa e entra na trilha. */
  document.querySelectorAll("[data-admin-bloquear]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      if (!window.confirm("Bloquear este usuário? A ação é reversível e fica registrada na " +
                          "trilha de auditoria com seu nome, data e hora.")) { return; }
      botao.textContent = "Desbloquear";
      botao.removeAttribute("data-admin-bloquear");
    });
  });


})();
