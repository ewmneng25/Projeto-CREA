/* ============================================================
   ProLink — controller: painel de notificações
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
     Notificações (RF07)

     A lista é o espelho dos eventos que o back-end dispararia por e-mail:
     cadastro, recuperação de senha, atualização de demanda e manifestação
     de interesse. Aqui é só a leitura na plataforma.
     ----------------------------------------------------------------------- */
  var botaoNotificacoes = document.getElementById("abrir-notificacoes");
  var painelNotificacoes = document.getElementById("painel-notificacoes");

  if (botaoNotificacoes && painelNotificacoes) {
    /* Notificações montadas a partir da base, conforme o tipo de conta. */
    var NOTIFICACOES = (function () {
      var B = window.ProLinkBanco;
      var eu = B ? ProLinkModelos.sessao.atual() : null;
      if (!B || !ProLinkModelos.base.disponivel() || !eu || eu.visitante) { return []; }
      var NOMES = {};
      ProLinkModelos.usuarios.listar().forEach(function (u) { NOMES[u.id] = u.nome; });
      ProLinkModelos.profissionais.listar().forEach(function (p) { NOMES[p.id] = p.nome; });
      var lista = [];
      ProLinkModelos.conversas.listar({ usuarioId: eu.id }).filter(function (c) { return c.naoLidas > 0; }).forEach(function (c) {
        lista.push({ icone: "balao", cor: "", titulo: "Mensagem de " + (NOMES[c.contato] || "contato"),
                     texto: c.naoLidas + (c.naoLidas === 1 ? " mensagem não lida" : " mensagens não lidas"), quando: c.quando || "", nova: true });
      });
      if (eu.tipoConta === "admin") {
        ProLinkModelos.denuncias.listar({ situacao: "Na fila" }).forEach(function (d) {
          lista.push({ icone: "relogio", cor: "icone-ambar", titulo: "Denúncia na fila", texto: d.titulo + " · " + d.protocolo, quando: d.recebida || "", nova: true });
        });
      } else if (eu.tipoConta === "empresa" || eu.tipoConta === "contratante") {
        var minhas = ProLinkModelos.demandas.listar({ empresaUsuarioId: eu.id });
        var ids = minhas.map(function (d) { return d.id; });
        ProLinkModelos.candidaturas.listar().filter(function (c) { return ids.indexOf(c.demandaId) !== -1; }).forEach(function (c) {
          lista.push({ icone: "equipe", cor: "icone-roxo", titulo: "Nova candidatura recebida",
                       texto: (c.profissional && c.profissional.nome ? c.profissional.nome + " · " : "") + c.demandaTitulo, quando: c.data || "", nova: c.situacao === "enviada" });
        });
        minhas.filter(function (d) { return d.situacao === "Encerrando"; }).forEach(function (d) {
          lista.push({ icone: "relogio", cor: "icone-ambar", titulo: "Prazo se aproximando", texto: d.titulo + " · até " + d.prazo, quando: "", nova: false });
        });
      } else {
        ProLinkModelos.candidaturas.listar({ profissionalId: eu.profissionalId || "__nenhum__" }).forEach(function (c) {
          lista.push({ icone: "equipe", cor: "icone-roxo", titulo: "Candidatura " + (c.situacao || "enviada"), texto: c.demandaTitulo, quando: c.data || "", nova: c.situacao === "visualizada" });
        });
        ProLinkModelos.documentos.listar({ usuarioId: eu.id }).slice(-2).forEach(function (d) {
          if (d.situacao !== "Em consulta") {
            lista.push({ icone: "checkcirculo", cor: "icone-verde", titulo: "Registro confirmado pelo Crea", texto: d.tipo + " " + d.numero + " no seu acervo", quando: d.confirmadoEm || "", nova: false });
          }
        });
        ProLinkModelos.avaliacoes.listar({ lado: "profissional", sentido: "recebida" }).slice(0, 1).forEach(function (a) {
          lista.push({ icone: "estrela", cor: "icone-ambar", titulo: "Nova avaliação recebida", texto: a.autorNome + " · " + String(a.nota).replace(".", ","), quando: a.data || "", nova: false });
        });
      }
      return lista.slice(0, 6);
    })();

    function textoNotificacao(valor) {
      return String(valor == null ? "" : valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    var ICONES_NOTIFICACAO = {
      equipe: '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.4a6.4 6.4 0 0 1 12.4 0"/>',
      checkcirculo: '<circle cx="12" cy="12" r="8.8"/><path d="m8.4 12.2 2.5 2.5 4.7-5.2"/>',
      balao: '<path d="M20.5 12c0 4.1-3.8 7.4-8.5 7.4-1 0-2-.15-2.9-.42L4 20.5l1.6-3.7C4.2 15.5 3.5 13.8 3.5 12 3.5 7.9 7.3 4.6 12 4.6s8.5 3.3 8.5 7.4z"/>',
      relogio: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.3l3.4 2"/>',
      estrela: '<path d="m12 4 2.5 5.1 5.6.8-4 4 .95 5.6L12 16.9 6.95 19.5 7.9 13.9l-4-4 5.6-.8z"/>'
    };

    painelNotificacoes.innerHTML =
      '<div class="notificacoes-topo"><strong>Notificações</strong>' +
        '<button class="btn-texto" type="button" id="marcar-lidas">Marcar todas como lidas</button></div>' +
      '<ul class="lista-notificacoes">' +
      (NOTIFICACOES.length ? "" : '<li class="dica" style="padding:16px">Nenhuma notificação por enquanto.</li>') +
      NOTIFICACOES.map(function (n) {
        return '<li class="' + (n.nova ? "notificacao-nova" : "") + '">' +
          '<span class="icone ' + n.cor + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round">' + ICONES_NOTIFICACAO[n.icone] +
            "</svg></span>" +
          "<span><strong>" + textoNotificacao(n.titulo) + "</strong><span>" + textoNotificacao(n.texto) + "</span></span>" +
          "<time>" + textoNotificacao(n.quando) + "</time></li>";
      }).join("") + "</ul>" +
      '<div class="notificacoes-rodape">' +
        '<span class="dica">Os mesmos eventos chegam por e-mail, conforme o que você ' +
        'autorizou.</span>' +
        '<a class="link" href="privacidade.html">Ajustar avisos</a></div>';

    botaoNotificacoes.addEventListener("click", function (evento) {
      evento.stopPropagation();
      var aberto = !painelNotificacoes.hidden;
      painelNotificacoes.hidden = aberto;
      botaoNotificacoes.setAttribute("aria-expanded", String(!aberto));
    });

    document.addEventListener("click", function (evento) {
      if (painelNotificacoes.hidden) { return; }
      if (painelNotificacoes.contains(evento.target)) { return; }
      painelNotificacoes.hidden = true;
      botaoNotificacoes.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && !painelNotificacoes.hidden) {
        painelNotificacoes.hidden = true;
        botaoNotificacoes.setAttribute("aria-expanded", "false");
        botaoNotificacoes.focus();
      }
    });

    var marcarLidas = document.getElementById("marcar-lidas");
    if (marcarLidas) {
      marcarLidas.addEventListener("click", function () {
        painelNotificacoes.querySelectorAll(".notificacao-nova").forEach(function (item) {
          item.classList.remove("notificacao-nova");
        });
        var ponto = botaoNotificacoes.querySelector(".ponto-alerta");
        if (ponto) { ponto.remove(); }
      });
    }
  }

})();
