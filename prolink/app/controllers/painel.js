/* ============================================================
   ProLink — controller: números dos painéis, contadores do menu e nova análise
   ============================================================ */
/* ==================================================================
   DADOS VIVOS: buscas de profissionais, documentos do portfólio,
   oportunidades salvas, contadores do menu e números dos painéis.
   Roda antes dos filtros, que trabalham sobre os cartões desenhados.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  if (!U || !Banco || !ProLinkModelos.base.disponivel()) { return; }
  var esc = U.escapar;
  var pagina = U.paginaAtual();
  var sessao = ProLinkModelos.sessao.atual() || {};
  var API = window.ProLinkDemandas;

  function svg(seletor, raiz) {
    var el = (raiz || document).querySelector(seletor);
    return el ? el.outerHTML : "";
  }

  /* ---------------- Contadores do menu e números dos painéis ---------------- */
  var demandas = ProLinkModelos.demandas.listar();
  var abertas = demandas.filter(function (d) { return d.situacao !== "Encerrada"; });
  var daEmpresa = demandas.filter(function (d) { return d.empresaUsuarioId === sessao.id; });
  var idsDaEmpresa = daEmpresa.map(function (d) { return d.id; });
  var candidaturasRecebidas = ProLinkModelos.candidaturas.listar().filter(function (c) { return idsDaEmpresa.indexOf(c.demandaId) !== -1; });
  var conversas = ProLinkModelos.conversas.listar({ usuarioId: sessao.id });
  var naoLidas = conversas.filter(function (c) { return (c.naoLidas || 0) > 0; }).length;
  var usuarios = ProLinkModelos.usuarios.listar();
  var naFila = ProLinkModelos.denuncias.listar({ situacao: "Na fila" }).length;

  var CONTADORES = {
    "oportunidades.html": abertas.length,
    "mensagens.html": naoLidas,
    "empresa-mensagens.html": naoLidas,
    "empresa-demandas.html": daEmpresa.filter(function (d) { return d.situacao !== "Encerrada"; }).length,
    "empresa-candidaturas.html": candidaturasRecebidas.length,
    "admin-denuncias.html": naFila,
    "candidaturas.html": ProLinkModelos.candidaturas.listar({ profissionalId: sessao.profissionalId || "__nenhum__" }).length
  };
  document.querySelectorAll(".nav a .nav-contador, nav a .nav-contador").forEach(function (badge) {
    var destino = (badge.closest("a").getAttribute("href") || "").split("?")[0];
    if (!(destino in CONTADORES)) { return; }
    badge.textContent = CONTADORES[destino];
    badge.hidden = !CONTADORES[destino];
  });

  var PAINEIS = {
    "inicio.html": {
      "Demandas abertas": abertas.length,
      "Parcerias ativas": conversas.length,
      "Avaliações recebidas": ProLinkModelos.avaliacoes.listar({ usuarioId: sessao.id, sentido: "recebida" }).length,
      "Documentos validados": ProLinkModelos.documentos.listar({ usuarioId: sessao.id }).filter(function (d) { return d.situacao !== "Em consulta"; }).length
    },
    "empresa-inicio.html": {
      "Demandas abertas": CONTADORES["empresa-demandas.html"],
      "Candidaturas recebidas": candidaturasRecebidas.length,
      "Em negociação": conversas.length,
      "Contratações concluídas": daEmpresa.filter(function (d) { return /pela plataforma/i.test(d.desfecho || ""); }).length
    },
    "admin-inicio.html": {
      "Usuários ativos": usuarios.filter(function (u) { return ["Bloqueado", "Encerrada"].indexOf(u.situacaoConta) === -1; }).length,
      "Registros verificados": usuarios.filter(function (u) { return u.verificado; }).length,
      "Denúncias na fila": naFila,
      "Demandas abertas": abertas.length
    }
  };
  var numeros = PAINEIS[pagina];
  if (numeros) {
    document.querySelectorAll(".estatistica").forEach(function (bloco) {
      var rotulo = bloco.querySelector(".rotulo");
      var valor = bloco.querySelector(".valor");
      if (rotulo && valor && rotulo.textContent.trim() in numeros) {
        valor.textContent = numeros[rotulo.textContent.trim()].toLocaleString("pt-BR");
      }
    });
  }
})(window, document);

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
     Refazer a análise (painel inicial)

     O painel abre com o resultado da última rodada, não com uma barra de
     progresso: ninguém precisa mandar analisar para saber como está. Refazer
     é decisão da pessoa — rodar sozinho a cada alteração no portfólio
     gastaria chamada de API e faria o número dançar na frente de quem edita.
     ----------------------------------------------------------------------- */
  var botaoNovaAnalise = document.getElementById("nova-analise");

  if (botaoNovaAnalise) {
    var estadoAnalise = document.getElementById("estado-analise");
    var baseAnalise = document.getElementById("base-analise");
    var marcaConcluida = estadoAnalise ? estadoAnalise.innerHTML : "";
    var textoBase = baseAnalise ? baseAnalise.textContent : "";

    botaoNovaAnalise.addEventListener("click", function () {
      botaoNovaAnalise.disabled = true;
      botaoNovaAnalise.textContent = "Analisando…";

      if (estadoAnalise) {
        estadoAnalise.className = "etiqueta";
        estadoAnalise.textContent = "Analisando seu portfólio…";
      }
      if (baseAnalise) {
        baseAnalise.textContent = "Cruzando o acervo do Crea, seus projetos e seu currículo " +
          "com as demandas abertas na região.";
      }

      setTimeout(function () {
        var agora = new Date();
        var data = String(agora.getDate()).padStart(2, "0") + "/" +
                   String(agora.getMonth() + 1).padStart(2, "0") + "/" + agora.getFullYear();
        var hora = String(agora.getHours()).padStart(2, "0") + ":" +
                   String(agora.getMinutes()).padStart(2, "0");

        if (estadoAnalise) {
          estadoAnalise.className = "etiqueta etiqueta-verde";
          estadoAnalise.innerHTML = marcaConcluida;
        }
        if (baseAnalise) {
          baseAnalise.textContent = textoBase.replace(
            /Última análise em [^,]+,/, "Última análise em " + data + " às " + hora + ",");
        }
        botaoNovaAnalise.disabled = false;
        botaoNovaAnalise.textContent = "Refazer análise";
      }, 2400);
    });
  }


})();
