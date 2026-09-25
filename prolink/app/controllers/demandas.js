/* ============================================================
   ProLink — controller: minhas demandas, publicar e encerrar (empresa)
   ============================================================ */
/* ==================================================================
   TELAS MONTADAS A PARTIR DA BASE CSV
   Oportunidades, demandas da empresa, usuários, auditoria, denúncias,
   avaliações e portfólio saem dos arquivos de dados/, e não mais do
   HTML fixo. Roda antes dos filtros e ações abaixo, que trabalham
   sobre o que foi desenhado aqui.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  if (!U || !Banco || !ProLinkModelos.base.disponivel()) { return; }
  var esc = U.escapar;
  var pagina = U.paginaAtual();
  var sessao = ProLinkModelos.sessao.atual() || {};

  /** Reaproveita o ícone SVG que já está na tela (mantém o visual). */
  function icone(seletor) {
    var el = document.querySelector(seletor);
    return el ? el.outerHTML : "";
  }

  function paraData(texto) {
    var m = String(texto || "").match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (m) { return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
    var iso = String(texto || "").replace(" ", "T");
    var d = new Date(iso);
    return isNaN(d) ? new Date(0) : d;
  }

  function relativo(texto) {
    var minutos = Math.round((Date.now() - paraData(texto).getTime()) / 60000);
    if (minutos < 60) { return "há " + Math.max(1, minutos) + " min"; }
    var horas = Math.round(minutos / 60);
    if (horas < 24) { return "há " + horas + " h"; }
    var dias = Math.round(horas / 24);
    return dias === 1 ? "ontem" : "há " + dias + " dias";
  }

  var CLASSE_TIPO = { "Projeto": "", "Parceria": "etiqueta-verde", "Serviço": "etiqueta-roxa", "Vaga fixa": "etiqueta-ambar" };
  var CORES = ["", "avatar-verde", "avatar-ambar", "avatar-roxo"];
  function corDe(texto) {
    var soma = 0;
    String(texto).split("").forEach(function (c) { soma += c.charCodeAt(0); });
    return CORES[soma % CORES.length];
  }

  U.base = { relativo: relativo, paraData: paraData, corDe: corDe, CLASSE_TIPO: CLASSE_TIPO };

  /* ---------------- Minhas demandas (empresa) ---------------- */
  var cartaoDemanda = document.querySelector("article.demanda-card");
  if (cartaoDemanda && pagina === "empresa-demandas.html") {
    var gradeDemandas = cartaoDemanda.parentNode;
    var ics = cartaoDemanda.querySelectorAll(".meta svg");
    var icLocal = ics[0] ? ics[0].outerHTML : "", icPrazo = ics[1] ? ics[1].outerHTML : "", icEquipe = ics[2] ? ics[2].outerHTML : "";
    var CLASSE_SITUACAO = { "Aberta": "etiqueta-verde", "Em análise": "etiqueta-ambar", "Encerrando": "etiqueta-ambar", "Encerrada": "etiqueta-neutra" };

    var desenharDemandas = function () {
      var candidaturas = ProLinkModelos.candidaturas.listar();
      var minhas = ProLinkModelos.demandas.listar({ empresaUsuarioId: sessao.id })
        .sort(function (a, b) { return paraData(b.publicadaEm) - paraData(a.publicadaEm); });
      gradeDemandas.innerHTML = minhas.map(function (d) {
        var total = candidaturas.filter(function (c) { return c.demandaId === d.id; }).length;
        return '<article class="cartao demanda-card" data-demanda="' + esc(d.id) + '"><div class="demanda-topo"><div>' +
          '<span class="etiqueta ' + (CLASSE_TIPO[d.tipo] || "") + '">' + esc(d.tipo) + "</span>" +
          '<h3 style="margin:8px 0 6px">' + esc(d.titulo) + "</h3>" +
          '<p style="font-size:13.5px; color:var(--tinta-2); max-width:70ch">' + esc(d.resumo) + "</p></div>" +
          '<span class="etiqueta ' + (CLASSE_SITUACAO[d.situacao] || "") + '">' + esc(d.situacao) + "</span></div>" +
          '<div class="meta-linha" style="margin-top:14px"><span class="meta">' + icLocal + " " + esc(d.local || d.cidade) + "</span>" +
          '<span class="meta">' + icPrazo + " Propostas até " + esc(d.prazo || "—") + "</span>" +
          '<span class="meta">' + icEquipe + " " + total + (total === 1 ? " candidatura" : " candidaturas") + "</span></div>" +
          '<div class="demanda-acoes"><a class="btn btn-sm" href="empresa-candidaturas.html?d=' + encodeURIComponent(d.id) + '">Ver candidaturas</a>' +
          (d.situacao !== "Encerrada"
            ? '<button class="btn btn-fantasma btn-sm" type="button" data-encerrar-id="' + esc(d.id) + '">Encerrar demanda</button>'
            : '<span class="dica">Encerrada</span>') +
          "</div></article>";
      }).join("") || '<p class="estado-vazio">Nenhuma demanda publicada por esta conta. ' +
        '<a class="link" href="empresa-publicar.html">Publicar a primeira</a></p>';
      var sub2 = document.querySelector(".pagina-cabecalho p");
      if (sub2) {
        var abertasEmp = minhas.filter(function (d) { return d.situacao !== "Encerrada"; }).length;
        sub2.textContent = abertasEmp + (abertasEmp === 1 ? " demanda aberta" : " demandas abertas") + " desta conta.";
      }
    };
    desenharDemandas();

    gradeDemandas.addEventListener("click", function (evento) {
      var botao = evento.target.closest("[data-encerrar-id]");
      if (!botao) { return; }
      var demanda = ProLinkModelos.demandas.buscar(botao.dataset.encerrarId);
      U.dialogo({
        titulo: "Encerrar demanda",
        texto: "<strong>" + esc(demanda.titulo) + "</strong>. Ao encerrar, ela sai das buscas e ninguém mais pode se candidatar.",
        corpo: '<div class="campo"><label for="desfecho">Como terminou?</label><select id="desfecho">' +
               "<option>Contratei um profissional pela plataforma</option><option>Contratei por fora</option>" +
               "<option>Desisti do serviço</option></select></div>" +
               (function () {
                 /* Quem pode ter sido contratado: quem se candidatou a esta demanda. */
                 var candidatos = ProLinkModelos.candidaturas.listar({ demandaId: demanda.id });
                 if (!candidatos.length) { return ""; }
                 return '<div class="campo" id="campo-contratado"><label for="contratado">Quem foi contratado</label>' +
                   '<select id="contratado">' + candidatos.map(function (c) {
                     return '<option value="' + esc(c.profissionalId) + '">' + esc((c.profissional && c.profissional.nome) || c.profissionalId) + "</option>";
                   }).join("") + '</select><span class="dica">Só quem foi contratado pode avaliar você, e ser avaliado.</span></div>';
               })(),
        confirmar: "Encerrar demanda",
        aoConfirmar: function (caixa) {
          var desfecho = caixa.querySelector("#desfecho");
          var contratado = caixa.querySelector("#contratado");
          ProLinkModelos.demandas.atualizar(demanda.id, {
            situacao: "Encerrada", desfecho: desfecho.value,
            contratadoId: desfecho.selectedIndex === 0 && contratado ? contratado.value : ""
          });
          ProLinkModelos.auditoria.registrar("Encerramento de demanda", demanda.titulo);
          desenharDemandas();
          if (U.reaplicarAbas) { U.reaplicarAbas(); }
          U.avisar("Demanda encerrada e gravada em dados/demandas.csv.", "ok");
        }
      });
    });
  }

})(window, document);

/* ==================================================================
   TELAS MONTADAS A PARTIR DA BASE CSV
   Oportunidades, demandas da empresa, usuários, auditoria, denúncias,
   avaliações e portfólio saem dos arquivos de dados/, e não mais do
   HTML fixo. Roda antes dos filtros e ações abaixo, que trabalham
   sobre o que foi desenhado aqui.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  if (!U || !Banco || !ProLinkModelos.base.disponivel()) { return; }
  var esc = U.escapar;
  var pagina = U.paginaAtual();
  var sessao = ProLinkModelos.sessao.atual() || {};

  /** Reaproveita o ícone SVG que já está na tela (mantém o visual). */
  function icone(seletor) {
    var el = document.querySelector(seletor);
    return el ? el.outerHTML : "";
  }

  function paraData(texto) {
    var m = String(texto || "").match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (m) { return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
    var iso = String(texto || "").replace(" ", "T");
    var d = new Date(iso);
    return isNaN(d) ? new Date(0) : d;
  }

  function relativo(texto) {
    var minutos = Math.round((Date.now() - paraData(texto).getTime()) / 60000);
    if (minutos < 60) { return "há " + Math.max(1, minutos) + " min"; }
    var horas = Math.round(minutos / 60);
    if (horas < 24) { return "há " + horas + " h"; }
    var dias = Math.round(horas / 24);
    return dias === 1 ? "ontem" : "há " + dias + " dias";
  }

  var CLASSE_TIPO = { "Projeto": "", "Parceria": "etiqueta-verde", "Serviço": "etiqueta-roxa", "Vaga fixa": "etiqueta-ambar" };
  var CORES = ["", "avatar-verde", "avatar-ambar", "avatar-roxo"];
  function corDe(texto) {
    var soma = 0;
    String(texto).split("").forEach(function (c) { soma += c.charCodeAt(0); });
    return CORES[soma % CORES.length];
  }

  U.base = { relativo: relativo, paraData: paraData, corDe: corDe, CLASSE_TIPO: CLASSE_TIPO };

  /* ---------------- Publicar demanda (empresa) ---------------- */
  if (pagina === "empresa-publicar.html") {
    var publicar = U.botaoPorTexto("Publicar demanda", document.querySelector("form"))[0];
    if (publicar) {
      publicar.addEventListener("click", function (evento) {
        evento.preventDefault();
        var valor = function (id) { return (document.getElementById(id) || {}).value || ""; };
        var marcados = function (titulo) {
          var grupo = Array.prototype.filter.call(document.querySelectorAll(".grupo-campo"), function (g) {
            return U.normalizar((g.querySelector("h4") || {}).textContent || "").indexOf(titulo) === 0;
          })[0];
          return grupo ? Array.prototype.filter.call(grupo.querySelectorAll("input:checked"), function () { return true; })
            .map(function (c) { return c.parentNode.textContent.trim(); }) : [];
        };
        var titulo = valor("titulo-demanda").trim(), descricao = valor("descricao").trim(), cidade = valor("cidade-obra").trim();
        var faltando = [];
        if (titulo.length < 5) { faltando.push("título"); }
        if (descricao.length < 20) { faltando.push("descrição (pelo menos uma frase)"); }
        if (!cidade) { faltando.push("cidade da obra"); }
        if (!marcados("area").length) { faltando.push("área de atuação"); }
        if (faltando.length) { U.avisar("Preencha: " + faltando.join(", ") + ".", "atencao"); return; }

        var numeros = ProLinkModelos.demandas.listar().map(function (d) { return Number(String(d.id).split("-")[1]) || 0; });
        var ano = new Date().getFullYear();
        var nome = sessao.nome || "Empresa";
        var partes = nome.split(/\s+/);
        var dataBr = function (iso) { return iso ? iso.split("-").reverse().join("/") : ""; };
        var nova = ProLinkModelos.demandas.inserir({
          id: ano + "-" + (Math.max.apply(null, numeros.concat([100])) + 1),
          titulo: titulo, tipo: valor("tipo-demanda"), modalidade: valor("modalidade"),
          empresa: nome, empresaIniciais: (partes[0].charAt(0) + (partes[1] || "").charAt(0)).toUpperCase(),
          empresaUsuarioId: sessao.id || "", cidade: cidade, uf: valor("uf-obra"), local: cidade + ", " + valor("uf-obra"),
          prazo: dataBr(valor("prazo-propostas")), inicio: dataBr(valor("inicio-obra")), faixa: valor("faixa-valor"),
          areas: marcados("area").map(function (a) { return a.replace(" e sanitária", "").replace(" / compatibilização", ""); }),
          exigencias: marcados("exigencias"), resumo: descricao.length > 140 ? descricao.slice(0, 137) + "…" : descricao,
          escopo: descricao, situacao: "Aberta",
          publicadaEm: new Date().toISOString().slice(0, 16).replace("T", " ")
        });
        if (!nova) { U.avisar("Não foi possível gravar a demanda na base.", "atencao"); return; }
        ProLinkModelos.auditoria.registrar("Publicação de demanda", nova.id + " · " + nova.titulo);
        U.avisar("Demanda publicada e gravada em dados/demandas.csv.", "ok");
        ProLinkModelos.base.aguardarGravacoes().then(function () {
          window.setTimeout(function () { window.location.href = "empresa-demandas.html"; }, 500);
        });
      });
    }
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
     Encerrar demanda (RF04)

     Encerrar não é apagar: a demanda sai das buscas, os candidatos são
     avisados e, se houve contratação, o profissional escolhido passa a
     poder ser avaliado — que é o que dá lastro à reputação.
     ----------------------------------------------------------------------- */
  document.querySelectorAll("[data-encerrar]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var titulo = botao.getAttribute("data-encerrar") || "esta demanda";
      var fundo = document.createElement("div");
      fundo.className = "denuncia-fundo";
      fundo.innerHTML =
        '<div class="denuncia-caixa" role="dialog" aria-modal="true" aria-label="Encerrar demanda">' +
          "<h2>Encerrar demanda</h2>" +
          '<p class="dica" style="margin:10px 0 18px"><strong>' + titulo + "</strong>. " +
            "Ao encerrar, ela sai das buscas e ninguém mais pode se candidatar. " +
            "Quem já se candidatou é avisado.</p>" +
          '<div class="campo">' +
            '<label for="desfecho">Como terminou?</label>' +
            '<select id="desfecho">' +
              "<option>Contratei um profissional pela plataforma</option>" +
              "<option>Contratei por fora da plataforma</option>" +
              "<option>Encerrei sem contratar</option>" +
            "</select>" +
          "</div>" +
          '<div class="campo" id="campo-contratado">' +
            '<label for="contratado">Quem foi contratado</label>' +
            '<select id="contratado">' +
              "<option>Daniel Silva do Carmo</option>" +
              "<option>Ana Beatriz Farias</option>" +
              "<option>Lucas Martins</option>" +
            "</select>" +
            '<span class="dica">Só quem foi contratado pode avaliar você, e ser avaliado.</span>' +
          "</div>" +
          '<div class="acoes-formulario" style="margin-top:18px">' +
            '<button class="btn btn-secundario" type="button" data-fechar-encerrar>Cancelar</button>' +
            '<button class="btn" type="button" data-confirmar-encerrar>Encerrar demanda</button>' +
          "</div>" +
        "</div>";

      document.body.appendChild(fundo);

      var desfecho = fundo.querySelector("#desfecho");
      var campoContratado = fundo.querySelector("#campo-contratado");
      desfecho.addEventListener("change", function () {
        campoContratado.hidden = desfecho.selectedIndex !== 0;
      });

      function fechar() { fundo.remove(); }
      fundo.querySelector("[data-fechar-encerrar]").addEventListener("click", fechar);
      fundo.addEventListener("click", function (e) { if (e.target === fundo) { fechar(); } });

      fundo.querySelector("[data-confirmar-encerrar]").addEventListener("click", function () {
        var contratou = desfecho.selectedIndex === 0;
        fundo.querySelector(".denuncia-caixa").innerHTML =
          "<h2>Demanda encerrada</h2>" +
          '<p class="dica" style="margin:10px 0 18px">' +
          (contratou
            ? "Os demais candidatos foram avisados, e você já pode avaliar o profissional " +
              "contratado. A avaliação fica ligada a este contrato."
            : "Os candidatos foram avisados de que a demanda foi encerrada.") +
          " O registro não some: fica no histórico com exclusão lógica.</p>" +
          '<div class="acoes-formulario"><span></span>' +
          '<button class="btn" type="button" data-fechar-encerrar>Fechar</button></div>';
        fundo.querySelector("[data-fechar-encerrar]").addEventListener("click", function () {
          fechar();
          botao.textContent = "Encerrada";
          botao.disabled = true;
        });
      });
    });
  });

  var corpoMensagens = document.querySelector(".mensagens-corpo");
  if (corpoMensagens) { corpoMensagens.scrollTop = corpoMensagens.scrollHeight; }
})();
