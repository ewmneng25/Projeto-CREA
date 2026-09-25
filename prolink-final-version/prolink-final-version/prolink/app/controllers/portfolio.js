/* ============================================================
   ProLink — controller: projetos, documentos técnicos, currículo e certificados
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
     Validação de ART e CAT pela API do Crea

     Anexo I, item 8.4: a API consulta ART e CAT por RNP + número, e o RF03
     manda validar por meio dela. Por isso não há upload aqui — o que entra
     no acervo é a confirmação oficial, não um arquivo enviado por quem tem
     interesse no resultado.
     ----------------------------------------------------------------------- */
  document.querySelectorAll("[data-validar]").forEach(function (botao) {
    var tipo = botao.getAttribute("data-validar");      // "art" ou "cat"
    var rotulo = tipo.toUpperCase();
    var campoRnp = document.getElementById("rnp-" + tipo);
    var campoNumero = document.getElementById("numero-" + tipo);
    var retorno = document.getElementById("retorno-" + tipo);

    function escapar(texto) {
      return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function mostrar(classe, titulo, corpo) {
      retorno.className = "retorno-crea " + classe;
      retorno.innerHTML = "<strong>" + escapar(titulo) + "</strong>" + (corpo || "");
      retorno.hidden = false;
    }

    botao.addEventListener("click", function () {
      var rnp = campoRnp.value.trim();
      var numero = campoNumero.value.trim();

      if (!rnp || !numero) {
        mostrar("retorno-atencao",
                "Informe o RNP e o número da " + rotulo + " para consultar.", "");
        return;
      }

      botao.disabled = true;
      mostrar("retorno-carregando", "Verificando…", "");

      window.ProLinkCrea.consultar(tipo, { rnp: rnp, numero: numero }).then(function (resultado) {
        botao.disabled = false;

        if (!resultado.ok) {
          mostrar(resultado.modo === "demonstracao" ? "retorno-atencao" : "retorno-erro",
                  resultado.modo === "demonstracao"
                    ? "Consulta indisponível neste protótipo"
                    : "Não foi possível confirmar a " + rotulo,
                  "<p>" + escapar(resultado.mensagem) + "</p>");
          return;
        }

        var U = window.__ProLinkInterno;
        var novo = U && U.registrarDocumento ? U.registrarDocumento(tipo, rnp, numero, resultado.dados) : false;
        mostrar(novo ? "retorno-ok" : "retorno-atencao",
                novo ? rotulo + " confirmada no Crea" : rotulo + " já está no seu acervo",
                "<p>" + escapar(rotulo + " " + numero) + (novo
                  ? " entrou em Documentos técnicos e fica guardada no seu portfólio."
                  : " já estava na lista de Documentos técnicos.") + "</p>");
        campoNumero.value = "";
      });
    });
  });


})();

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

  /* ---------------- Portfólio: projetos e arquivos ---------------- */
  if (pagina === "portfolio.html") {
    var gradeProjetos = document.querySelector("section.secao .grade-3");
    var skyline = icone("section.secao .grade-3 .projeto-capa svg");
    var icPeriodo = icone("section.secao .grade-3 .projeto-rodape .meta svg");
    U.cartaoProjeto = function (p) {
      var artigo = document.createElement("article");
      artigo.className = "projeto";
      artigo.dataset.projetoId = p.id;
      artigo.innerHTML = '<div class="projeto-capa ' + esc(p.capa || "") + '">' + skyline + '<span class="etiqueta">' + esc(p.situacao) + "</span></div>" +
        '<div class="projeto-corpo"><h3>' + esc(p.nome) + "</h3><p>" + esc(p.descricao) + "</p>" +
        '<div class="projeto-rodape"><span class="meta">' + icPeriodo + " " + esc(p.periodo) + '</span><span class="meta">' + esc(p.area) + "</span></div>" +
        (function () {
          var anexos = window.ProLinkModelos.arquivos.listar({ categoria: "projeto", referenciaId: p.id });
          return anexos.length
            ? '<div class="obra-anexos"><span class="anexo-chip" title="' + esc(anexos.map(function (a) { return a.nome; }).join(", ")) + '">' +
              anexos.length + (anexos.length === 1 ? " arquivo anexado" : " arquivos anexados") + "</span></div>"
            : "";
        })() +
        '<button class="btn-texto" type="button" data-remover-projeto style="margin-top:10px">Remover projeto</button></div>';
      return artigo;
    };
    var projetos = ProLinkModelos.projetos.listar({ usuarioId: sessao.id })
      .sort(function (a, b) { return String(b.criadoEm).localeCompare(String(a.criadoEm)); });
    gradeProjetos.innerHTML = "";
    projetos.forEach(function (p) { gradeProjetos.appendChild(U.cartaoProjeto(p)); });
    if (!projetos.length) {
      gradeProjetos.innerHTML = '<p class="estado-vazio">Nenhum projeto no portfólio ainda. Use <strong>Adicionar projeto</strong>.</p>';
    }
    var resumoProj = document.querySelector("section.secao .secao-titulo .dica, section.secao .secao-titulo span");
    if (resumoProj) {
      var concl = projetos.filter(function (p) { return p.situacao === "Concluído"; }).length;
      resumoProj.textContent = projetos.length + " projetos · " + concl + " concluídos e " +
        projetos.filter(function (p) { return p.situacao === "Em andamento"; }).length + " em andamento";
    }

    var moldeArquivo = icone(".lista-arquivos .arquivo svg");
    U.itemArquivo = function (a) {
      var li = document.createElement("li");
      li.className = "arquivo";
      li.innerHTML = moldeArquivo + '<span><strong style="display:block; font-size:14px">' + esc(a.nome) +
        '</strong><span style="font-size:12.5px; color:var(--tinta-3)">' + esc(a.detalhe) + '</span></span><span class="tamanho">' + esc(a.tamanho) + "</span>";
      return li;
    };
    var listas = {};
    document.querySelectorAll(".cartao-limpo").forEach(function (c) {
      var h3 = c.querySelector(".cartao-cabecalho h3");
      if (!h3) { return; }
      var t = U.normalizar(h3.textContent);
      if (t === "curriculo") { listas.curriculo = c.querySelector("ul"); }
      if (t === "diplomas e certificados") { listas.certificado = c.querySelector("ul"); }
    });
    Object.keys(listas).forEach(function (categoria) {
      var itens = ProLinkModelos.arquivos.listar({ usuarioId: sessao.id, categoria: categoria })
        .sort(function (a, b) { return String(a.criadoEm).localeCompare(String(b.criadoEm)); });
      listas[categoria].innerHTML = "";
      itens.forEach(function (a) { listas[categoria].appendChild(U.itemArquivo(a)); });
      if (!itens.length) { listas[categoria].innerHTML = '<li class="dica">Nenhum arquivo enviado.</li>'; }
    });
    U.listasArquivos = listas;
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

  /* ---------------- Documentos técnicos do portfólio ---------------- */
  var cartaoDoc = document.querySelector("article.documento-card");
  if (cartaoDoc && pagina === "portfolio.html") {
    var gradeDocs = cartaoDoc.parentNode;
    var icConfirmado = svg(".projeto-rodape .meta svg", cartaoDoc);
    var resumoDocs = gradeDocs.parentNode.querySelector(".secao-titulo .dica, .secao-titulo span");

    U.cartaoDocumento = function (d) {
      var validada = d.situacao !== "Em consulta";
      var artigo = document.createElement("article");
      artigo.className = "projeto documento-card";
      artigo.dataset.documentoId = d.id;
      artigo.innerHTML = '<div class="documento-capa"><span class="documento-tipo">' + esc(d.tipo) + "</span>" +
        '<span class="documento-numero">' + esc(d.numero) + "</span>" +
        '<span class="etiqueta ' + (validada ? "etiqueta-verde" : "etiqueta-ambar") + '">' + esc(d.situacao) + "</span></div>" +
        '<div class="projeto-corpo"><h3>' + esc(d.titulo) + "</h3><p>" + esc(d.local || "") + "</p>" +
        '<div class="projeto-rodape"><span class="meta">' + icConfirmado + " " +
        (validada ? "Confirmada em " + esc(d.confirmadoEm) : "Aguardando retorno da consulta") +
        '</span><span class="meta">' + esc(d.origem || "Crea-AM") + "</span></div></div>";
      return artigo;
    };

    var desenharDocs = function () {
      var docs = ProLinkModelos.documentos.listar({ usuarioId: sessao.id })
        .sort(function (a, b) { return String(b.criadoEm).localeCompare(String(a.criadoEm)); });
      gradeDocs.innerHTML = "";
      docs.forEach(function (d) { gradeDocs.appendChild(U.cartaoDocumento(d)); });
      if (!docs.length) { gradeDocs.innerHTML = '<p class="estado-vazio">Nenhum documento vinculado ainda.</p>'; }
      if (resumoDocs) {
        var validados = docs.filter(function (d) { return d.situacao !== "Em consulta"; }).length;
        resumoDocs.textContent = docs.length + " documentos · " + validados + " validados e " + (docs.length - validados) + " em consulta";
      }
    };
    desenharDocs();

    /* Chamado pelo prolink.js quando a API confirma uma ART ou CAT. */
    U.registrarDocumento = function (tipo, rnp, numero, dados) {
      var rotulo = tipo === "cat" ? "CAT" : "ART";
      var repetido = ProLinkModelos.documentos.listar({ usuarioId: sessao.id }).some(function (d) {
        return d.tipo === rotulo && String(d.numero).toUpperCase() === String(numero).toUpperCase();
      });
      if (repetido) { return false; }
      var hoje = new Date();
      ProLinkModelos.documentos.inserir({
        usuarioId: sessao.id, tipo: rotulo, numero: String(numero).toUpperCase(), rnp: rnp,
        titulo: (dados && (dados.atividade || dados.obra)) || (rotulo + " confirmada no Crea"),
        local: (dados && (dados.obra || dados.contratante)) || "",
        situacao: "Validada", origem: "Crea-AM",
        confirmadoEm: String(hoje.getDate()).padStart(2, "0") + "/" + String(hoje.getMonth() + 1).padStart(2, "0") + "/" + hoje.getFullYear()
      });
      ProLinkModelos.auditoria.registrar("Vínculo de documento", rotulo + " " + numero);
      desenharDocs();
      if (U.reaplicarAbas) { U.reaplicarAbas(); }
      return true;
    };
  }

})(window, document);

/* ==================================================================
   10. PORTFÓLIO
   Projetos em dados/projetos.csv e arquivos em dados/arquivos.csv.
   Os cartões e as listas já vêm desenhados da base (seção acima).
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  if (!U || !Banco || U.paginaAtual() !== "portfolio.html" || !U.cartaoProjeto) { return; }

  var LIMITE = 10 * 1024 * 1024;
  var CAPAS = { "Concluído": "", "Em andamento": "capa-verde", "Arquivado": "capa-cinza" };
  var gradeProjetos = document.querySelector("section.secao .grade-3");
  var usuarioId = U.sessao().id || "";

  function formatarTamanho(bytes) {
    if (bytes < 1048576) { return Math.max(1, Math.round(bytes / 1024)) + " KB"; }
    return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
  }

  gradeProjetos.addEventListener("click", function (evento) {
    var botao = evento.target.closest("[data-remover-projeto]");
    if (!botao) { return; }
    var artigo = botao.closest("article");
    var nome = artigo.querySelector("h3").textContent;
    if (!window.confirm("Remover “" + nome + "” do portfólio?")) { return; }
    if (ProLinkModelos.projetos.excluir(artigo.dataset.projetoId)) {
      artigo.remove();
      U.avisar("Projeto removido de dados/projetos.csv.");
    }
  });

  U.botaoPorTexto("Adicionar projeto").forEach(function (botao) {
    botao.addEventListener("click", function () {
      U.dialogo({
        titulo: "Adicionar projeto",
        texto: "Projetos do portfólio reforçam o perfil, mas não recebem selo: o que o Crea confirma " +
               "fica em Documentos técnicos.",
        corpo:
          '<div class="campo"><label for="np-nome">Nome do projeto ou obra</label><input id="np-nome" type="text" maxlength="80" placeholder="Ex.: Reforço estrutural de passarela"></div>' +
          '<div class="grade-form"><div class="campo"><label for="np-area">Área</label><select id="np-area">' +
          ["Estrutural", "Elétrica", "Hidráulica", "Ambiental", "Geotecnia", "Mecânica", "BIM"]
            .map(function (a) { return "<option>" + a + "</option>"; }).join("") +
          '</select></div><div class="campo"><label for="np-situacao">Situação</label><select id="np-situacao">' +
          "<option>Concluído</option><option>Em andamento</option><option>Arquivado</option></select></div></div>" +
          '<div class="campo"><label for="np-periodo">Conclusão ou início</label><input id="np-periodo" type="month"></div>' +
          '<div class="campo"><label for="np-descricao">O que você fez</label><textarea id="np-descricao" maxlength="200" placeholder="Ex.: cálculo do reforço e acompanhamento da execução."></textarea></div>' +
          '<div class="campo"><label for="np-arquivos">Arquivos do projeto (opcional)</label><input id="np-arquivos" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.dwg"><span class="dica">Plantas, memoriais ou fotos. Guardamos só o nome de cada arquivo.</span></div>',
        confirmar: "Adicionar ao portfólio",
        aoConfirmar: function (caixa) {
          var nome = caixa.querySelector("#np-nome").value.trim();
          var descricao = caixa.querySelector("#np-descricao").value.trim();
          if (nome.length < 3) { caixa.erro("Informe o nome do projeto."); return false; }
          if (descricao.length < 10) { caixa.erro("Descreva em uma frase o que você fez no projeto."); return false; }
          var mes = caixa.querySelector("#np-periodo").value;
          var situacao = caixa.querySelector("#np-situacao").value;
          var projeto = ProLinkModelos.projetos.inserir({
            usuarioId: usuarioId, nome: nome, descricao: descricao,
            area: caixa.querySelector("#np-area").value, situacao: situacao, capa: CAPAS[situacao] || "",
            periodo: mes ? mes.split("-")[1] + "/" + mes.split("-")[0] : "Sem data"
          });
          if (!projeto) { caixa.erro("Não foi possível gravar o projeto na base."); return false; }
          var vazio = gradeProjetos.querySelector(".estado-vazio");
          if (vazio) { vazio.remove(); }
          Array.prototype.slice.call(caixa.querySelector("#np-arquivos").files || []).forEach(function (a) {
            window.ProLinkModelos.arquivos.inserir({ usuarioId: usuarioId, categoria: "projeto", referenciaId: projeto.id,
              nome: a.name, detalhe: "Arquivo do projeto", tamanho: window.ProLink.tamanhoLegivel(a.size) });
          });
          gradeProjetos.insertBefore(U.cartaoProjeto(projeto), gradeProjetos.firstChild);
          if (U.reaplicarAbas) { U.reaplicarAbas(); }
          U.avisar("Projeto “" + U.escapar(nome) + "” gravado em dados/projetos.csv.", "ok");
        }
      });
    });
  });

  /* --- Currículo e certificados -------------------------------------- */
  function escolherArquivos(aceita, multiplo, aoEscolher) {
    var entrada = document.createElement("input");
    entrada.type = "file";
    entrada.accept = aceita;
    entrada.multiple = !!multiplo;
    entrada.hidden = true;
    document.body.appendChild(entrada);
    entrada.addEventListener("change", function () {
      var arquivos = Array.prototype.slice.call(entrada.files);
      entrada.remove();
      var grandes = arquivos.filter(function (a) { return a.size > LIMITE; });
      if (grandes.length) { U.avisar("“" + U.escapar(grandes[0].name) + "” passa de 10 MB.", "atencao"); }
      arquivos = arquivos.filter(function (a) { return a.size <= LIMITE; });
      if (arquivos.length) { aoEscolher(arquivos); }
    });
    entrada.click();
  }

  function registrar(categoria, arquivo, detalhe) {
    return ProLinkModelos.arquivos.inserir({
      usuarioId: usuarioId, categoria: categoria, nome: arquivo.name,
      detalhe: detalhe, tamanho: formatarTamanho(arquivo.size)
    });
  }

  var listas = U.listasArquivos || {};
  function limparVazio(ul) {
    var vazio = ul.querySelector("li.dica");
    if (vazio) { vazio.remove(); }
  }

  if (listas.curriculo) {
    U.botaoPorTexto("Substituir", listas.curriculo.closest(".cartao-limpo")).forEach(function (botao) {
      botao.addEventListener("click", function () {
        escolherArquivos(".pdf,.doc,.docx", false, function (arquivos) {
          ProLinkModelos.arquivos.excluirOnde({ usuarioId: usuarioId, categoria: "curriculo" });
          var novo = registrar("curriculo", arquivos[0], "Enviado em " + U.agora().split(" ")[0] + " · aguardando nova análise");
          listas.curriculo.innerHTML = "";
          if (novo) { listas.curriculo.appendChild(U.itemArquivo(novo)); }
          U.avisar("Currículo substituído em dados/arquivos.csv. O arquivo em si não sai do seu computador.", "ok");
        });
      });
    });
  }

  if (listas.certificado) {
    U.botaoPorTexto("Adicionar", listas.certificado.closest(".cartao-limpo")).forEach(function (botao) {
      botao.addEventListener("click", function () {
        escolherArquivos(".pdf,.png,.jpg,.jpeg", true, function (arquivos) {
          limparVazio(listas.certificado);
          arquivos.forEach(function (a) {
            var novo = registrar("certificado", a, "Enviado em " + U.agora().split(" ")[0]);
            if (novo) { listas.certificado.appendChild(U.itemArquivo(novo)); }
          });
          U.avisar(arquivos.length === 1 ? "Certificado gravado na base." : arquivos.length + " certificados gravados na base.", "ok");
        });
      });
    });
  }
})(window, document);
