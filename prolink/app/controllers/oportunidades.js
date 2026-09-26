/* ============================================================
   ProLink — controller: oportunidades abertas e salvas
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

  /* ---------------- Oportunidades (profissional) ---------------- */
  var listaOportunidades = document.querySelector(".lista-oportunidades");
  if (listaOportunidades && pagina === "oportunidades.html") {
    var icPredio = icone(".lista-oportunidades .meta svg");
    var metas = document.querySelectorAll(".lista-oportunidades article:first-child .meta svg");
    var icPino = metas[1] ? metas[1].outerHTML : "";
    var icRelogio = metas[2] ? metas[2].outerHTML : "";
    var icSalvar = icone(".lista-oportunidades .salvar svg");
    var API = window.ProLinkDemandas;
    var abertas = ProLinkModelos.demandas.listar().filter(function (d) { return d.situacao !== "Encerrada"; })
      .sort(function (a, b) { return paraData(b.publicadaEm) - paraData(a.publicadaEm); });

    listaOportunidades.innerHTML = abertas.map(function (d) {
      var compat = API ? API.compatibilidade(API.PROFISSIONAL, d).total : 0;
      return '<article class="oportunidade" data-demanda="' + esc(d.id) + '">' +
        '<span class="avatar avatar-empresa avatar-md ' + corDe(d.empresa) + '">' + esc(d.empresaIniciais) + "</span>" +
        '<div><span class="etiqueta ' + (CLASSE_TIPO[d.tipo] || "") + '">' + esc(d.tipo) + "</span>" +
        "<h3>" + esc(d.titulo) + "</h3><p>" + esc(d.resumo) + "</p>" +
        '<div class="meta-linha"><span class="meta">' + icPredio + " " + esc(d.empresa) + "</span>" +
        '<span class="meta">' + icPino + " " + esc(d.cidade + ", " + d.uf) + "</span>" +
        '<span class="meta">' + icRelogio + " Publicado " + relativo(d.publicadaEm) + "</span></div></div>" +
        '<div class="oportunidade-acoes"><button class="salvar" type="button" aria-label="Salvar oportunidade" aria-pressed="false">' +
        icSalvar + '</button><span class="compatibilidade">' + compat + '% compatível</span>' +
        '<a class="btn btn-sm" href="oportunidade.html?d=' + encodeURIComponent(d.id) + '">Ver detalhes</a></div></article>';
    }).join("");

    listaOportunidades.querySelectorAll(".salvar").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var salvo = botao.getAttribute("aria-pressed") === "true";
        botao.setAttribute("aria-pressed", salvo ? "false" : "true");
        botao.setAttribute("aria-label", salvo ? "Salvar oportunidade" : "Remover dos salvos");
      });
    });
    var contagem = document.querySelector(".secao-titulo .meta");
    if (contagem) { contagem.textContent = abertas.length + " demandas abertas na base"; }
    var sub = document.querySelector(".pagina-cabecalho p");
    if (sub) { sub.textContent = abertas.length + " demandas abertas lidas de dados/demandas.csv."; }
  }

})(window, document);

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

  /* ---------------- Oportunidades salvas ---------------- */
  if (pagina === "oportunidades.html") {
    var salvas = ProLinkModelos.salvos.listar({ usuarioId: sessao.id, tipo: "demanda" }).map(function (s) { return s.alvoId; });
    document.querySelectorAll(".lista-oportunidades article").forEach(function (artigo) {
      var id = artigo.dataset.demanda;
      var antigo = artigo.querySelector(".salvar");
      if (!antigo || !id) { return; }
      var botao = U.limparOuvintes(antigo);
      var marcar = function (salvo) {
        botao.setAttribute("aria-pressed", salvo ? "true" : "false");
        botao.setAttribute("aria-label", salvo ? "Remover dos salvos" : "Salvar oportunidade");
      };
      marcar(salvas.indexOf(id) !== -1);
      botao.addEventListener("click", function () {
        var salvo = botao.getAttribute("aria-pressed") === "true";
        if (salvo) { ProLinkModelos.salvos.excluirOnde({ usuarioId: sessao.id, tipo: "demanda", alvoId: id }); }
        else { ProLinkModelos.salvos.inserir({ usuarioId: sessao.id, tipo: "demanda", alvoId: id }); }
        marcar(!salvo);
        if (U.reaplicarAbas) { window.setTimeout(U.reaplicarAbas, 0); }
      });
    });
  }

})(window, document);
