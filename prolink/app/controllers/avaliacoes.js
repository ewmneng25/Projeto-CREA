/* ============================================================
   ProLink — controller: avaliações recebidas, realizadas e pedidos
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

  /* ---------------- Avaliações ---------------- */
  if (pagina === "avaliacoes.html" || pagina === "empresa-avaliacoes.html") {
    var listaAv = document.querySelector("ul.lista-divisoria");
    var estrela = '<svg viewBox="0 0 24 24" fill="currentColor"%s aria-hidden="true"><path d="m12 3.6 2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.4l-5.38 2.84 1.03-6L3.3 10l6-.9z"/></svg>';
    var lado = pagina === "empresa-avaliacoes.html" ? "empresa" : "profissional";
    if (listaAv) {
      var daConta = ProLinkModelos.avaliacoes.listar({ usuarioId: sessao.id || "__nenhum__" });
      if (!daConta.length) {
        listaAv.innerHTML = '<li data-categoria="recebida"><p class="dica" style="padding:16px 0">Nenhuma avaliação recebida ainda. ' +
          "Só quem teve contrato registrado na plataforma pode avaliar.</p></li>" +
          '<li data-categoria="realizada"><p class="dica" style="padding:16px 0">Você ainda não avaliou ninguém.</p></li>';
      } else listaAv.innerHTML = daConta.map(function (a) {
        var cheias = Math.round(Number(a.nota) || 0), estrelas = "";
        for (var i = 0; i < 5; i += 1) { estrelas += estrela.replace("%s", i < cheias ? "" : ' class="vazia"'); }
        return '<li data-categoria="' + esc(a.sentido) + '"><div class="avaliacao-item">' +
          '<span class="avatar avatar-md' + (a.empresa ? " avatar-empresa " : " ") + corDe(a.autorNome) + '">' + esc(a.autorIniciais) + "</span>" +
          '<div><div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start">' +
          '<div><strong style="font-size:15px">' + esc(a.autorNome) + '</strong><span class="meta" style="margin-top:2px">' + esc(a.projeto) + "</span></div>" +
          '<div style="text-align:right"><span class="estrelas" role="img" aria-label="' + String(a.nota).replace(".", ",") + ' de 5">' + estrelas +
          '</span><span class="meta" style="justify-content:flex-end">' + esc(a.data) + "</span></div></div>" +
          "<p>" + esc(a.texto) + "</p></div></div></li>";
      }).join("");
    }
  }

})(window, document);

/* ==================================================================
   9. AVALIAÇÕES
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  if (!U) { return; }
  var pagina = U.paginaAtual();
  if (pagina !== "avaliacoes.html" && pagina !== "empresa-avaliacoes.html") { return; }
  var empresa = pagina === "empresa-avaliacoes.html";

  U.botaoPorTexto("Solicitar avaliação").forEach(function (botao) {
    botao.addEventListener("click", function () {
      /* Contratos registrados: demandas encerradas com contratação pela
         plataforma, em que esta conta foi a contratante ou a contratada. */
      var eu = U.sessao() || {};
      var fechadas = ProLinkModelos.demandas.listar().filter(function (d) { return d.situacao === "Encerrada" && d.contratadoId; });
      var contratos = empresa
        ? fechadas.filter(function (d) { return d.empresaUsuarioId === eu.id; }).map(function (d) {
            var p = ProLinkModelos.profissionais.buscar(d.contratadoId);
            return (p ? p.nome : "Profissional") + " — " + d.titulo;
          })
        : fechadas.filter(function (d) { return eu.profissionalId && d.contratadoId === eu.profissionalId; }).map(function (d) {
            return d.empresa + " — " + d.titulo;
          });
      if (!contratos.length) {
        U.dialogo({
          titulo: "Solicitar avaliação",
          texto: "Você ainda não tem contratos registrados na plataforma. O pedido de avaliação fica disponível " +
                 "quando uma demanda é encerrada com contratação pelo ProLink.",
          confirmar: "Entendi",
          cancelar: false
        });
        return;
      }
      U.dialogo({
        titulo: "Solicitar avaliação",
        texto: "Só quem teve contrato registrado na plataforma pode avaliar. Escolha o contrato e, " +
               "se quiser, deixe uma mensagem.",
        corpo: '<div class="campo"><label for="contrato-avaliacao">Contrato</label><select id="contrato-avaliacao">' +
               contratos.map(function (c) { return "<option>" + U.escapar(c) + "</option>"; }).join("") +
               '</select></div><div class="campo"><label for="mensagem-avaliacao">Mensagem (opcional)</label>' +
               '<textarea id="mensagem-avaliacao" placeholder="Ex.: Obrigado pela parceria! Sua avaliação ajuda outros contratantes."></textarea></div>',
        confirmar: "Enviar pedido",
        aoConfirmar: function (caixa) {
          var contrato = caixa.querySelector("#contrato-avaliacao").value;
          var usuarioId = U.sessao().id || "";
          if (ProLinkModelos.pedidos_avaliacao.listar({ usuarioId: usuarioId, contrato: contrato }).length) {
            caixa.erro("Você já pediu avaliação para este contrato. Aguarde a resposta.");
            return false;
          }
          ProLinkModelos.pedidos_avaliacao.inserir({
            usuarioId: usuarioId, contrato: contrato, mensagem: caixa.querySelector("#mensagem-avaliacao").value.trim()
          });
          U.avisar("Pedido enviado para " + U.escapar(contrato.split(" — ")[0]) +
                   ". O aviso chega na plataforma e por e-mail.", "ok");
        }
      });
    });
  });
})(window, document);
