/* ============================================================
   ProLink — telas ligadas por candidatura

   Renderiza as quatro telas que conectam os dois lados:
   detalhe da oportunidade, manifestação de interesse, minhas
   candidaturas e a fila de candidaturas de uma demanda.

   Tudo lê do mesmo armazenamento (ProLinkDemandas), então o
   interesse manifestado em uma aba aparece na outra.
   ============================================================ */
(function (window, document) {
  "use strict";

  var API = window.ProLinkDemandas;
  if (!API) { return; }

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function parametro(nome) {
    var busca = window.location.search.replace(/^\?/, "").split("&");
    for (var i = 0; i < busca.length; i += 1) {
      var par = busca[i].split("=");
      if (decodeURIComponent(par[0]) === nome) { return decodeURIComponent(par[1] || ""); }
    }
    return "";
  }

  var ROTULO_SITUACAO = {
    enviada: ["Interesse enviado", "etiqueta"],
    visualizada: ["Perfil visualizado", "etiqueta-roxa"],
    conversa: ["Em conversa", "etiqueta-verde"],
    recusada: ["Não selecionado", "etiqueta-neutra"]
  };

  function notaTexto(p) {
    if (!p || !p.avaliacoes) { return "Sem avaliações"; }
    return "Nota " + Number(p.nota || 0).toFixed(1).replace(".", ",") + " em " + p.avaliacoes +
      (p.avaliacoes === 1 ? " avaliação" : " avaliações");
  }

  function etiquetaSituacao(situacao) {
    var dado = ROTULO_SITUACAO[situacao] || ROTULO_SITUACAO.enviada;
    return '<span class="etiqueta ' + dado[1] + '">' + dado[0] + "</span>";
  }

  /* Tabela do porquê do percentual: o item 12.3 pede critério explicável. */
  function tabelaCriterios(criterios, total) {
    var linhas = criterios.map(function (c) {
      var largura = Math.round((c.pontos / c.peso) * 100) + "%";
      return '<li class="criterio">' +
        '<div class="criterio-topo"><span>' + escapar(c.rotulo) + "</span>" +
        "<strong>" + c.pontos + " de " + c.peso + "</strong></div>" +
        '<div class="barra-compat"><span style="width:' + largura + '"></span></div>' +
        '<span class="dica">' + escapar(c.detalhe) + "</span></li>";
    }).join("");

    return '<ul class="lista-criterios">' + linhas + "</ul>" +
      '<p class="criterio-total">Soma: <strong>' + total + " de 100</strong></p>";
  }

  // ==================================================================
  // Detalhe da oportunidade (lado profissional)
  // ==================================================================
  var alvoOportunidade = document.getElementById("detalhe-oportunidade");

  var demandaDaTela = alvoOportunidade ? API.porId(parametro("d")) : null;
  if (alvoOportunidade && !demandaDaTela) {
    alvoOportunidade.innerHTML = '<div class="cartao"><h2 style="margin-bottom:8px">Demanda não encontrada</h2>' +
      '<p class="dica" style="margin-bottom:16px">Ela pode ter sido encerrada ou o endereço está incompleto.</p>' +
      '<a class="btn btn-sm" href="oportunidades.html">Ver oportunidades abertas</a></div>';
  }
  if (alvoOportunidade && demandaDaTela) {
    var demanda = demandaDaTela;
    var calculo = API.compatibilidade(API.PROFISSIONAL, demanda);
    var candidatou = API.jaCandidatou(demanda.id);

    document.title = demanda.titulo + " · ProLink";

    var exigencias = demanda.exigencias.map(function (item) {
      return '<li class="etapa-analise"><span class="marca-etapa">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round"><path d="m4.5 12.5 5 5 10-11"/></svg></span>' +
        escapar(item) + "</li>";
    }).join("");

    alvoOportunidade.innerHTML =
      '<div class="pagina-cabecalho">' +
        "<div>" +
          '<span class="etiqueta">' + escapar(demanda.tipo) + "</span>" +
          "<h1 style='margin-top:10px'>" + escapar(demanda.titulo) + "</h1>" +
          "<p>" + escapar(demanda.empresa) + " · " + escapar(demanda.local) + "</p>" +
        "</div>" +
      "</div>" +

      '<div class="grade grade-principal">' +
        "<div>" +
          '<section class="cartao" style="margin-bottom:20px">' +
            "<h2 style='margin-bottom:10px'>O serviço</h2>" +
            "<p style='color:var(--tinta-2); max-width:70ch'>" + escapar(demanda.escopo) + "</p>" +
            '<div class="grade grade-2" style="margin-top:20px; gap:14px">' +
              linhaInfo("Prazo para propostas", demanda.prazo) +
              linhaInfo("Início previsto", demanda.inicio) +
              linhaInfo("Faixa de valor", demanda.faixa) +
              linhaInfo("Área exigida", demanda.areas.join(", ")) +
            "</div>" +
          "</section>" +

          '<section class="cartao">' +
            "<h2 style='margin-bottom:6px'>Por que você combina com esta demanda</h2>" +
            '<p class="dica" style="margin-bottom:18px">Quatro critérios com pesos fixos. ' +
              "Nenhum leva em conta idade, gênero, origem ou qualquer fator alheio à " +
              "capacidade técnica.</p>" +
            tabelaCriterios(calculo.criterios, calculo.total) +
          "</section>" +
        "</div>" +

        "<div>" +
          '<div class="cartao cartao-candidatura">' +
            '<span class="analise-valor">' + calculo.total + "%</span>" +
            '<span class="rotulo" style="margin-bottom:16px">de compatibilidade</span>' +
            (candidatou
              ? '<div class="faixa-verificado" style="margin-bottom:14px"><span>' +
                "<strong>Interesse já enviado</strong>" +
                "<span>A empresa recebeu sua candidatura.</span></span></div>" +
                '<a class="btn btn-secundario btn-bloco" href="candidaturas.html">' +
                "Ver minhas candidaturas</a>"
              : '<button class="btn btn-bloco" type="button" id="manifestar">' +
                "Manifestar interesse</button>" +
                '<p class="dica" style="margin-top:10px">Você escolhe quais ARTs e CATs ' +
                "anexar. Nada do seu acervo é enviado sem a sua seleção.</p>") +
          "</div>" +

          '<div class="cartao" style="margin-top:20px">' +
            "<h3 style='margin-bottom:12px'>O que a empresa exige</h3>" +
            "<ul>" + exigencias + "</ul>" +
          "</div>" +

          '<p class="aviso-lgpd" style="margin-top:20px">' +
            "Esta correspondência é apenas indicativa. Cabe às partes verificar " +
            "habilitação, atribuições profissionais, regularidade, escopo e contrato." +
          "</p>" +
        "</div>" +
      "</div>";

    var botaoManifestar = document.getElementById("manifestar");
    if (botaoManifestar) {
      botaoManifestar.addEventListener("click", function () { abrirInteresse(demanda); });
    }
  }

  function linhaInfo(rotulo, valor) {
    return '<div class="info-demanda"><span class="rotulo">' + escapar(rotulo) +
           "</span><strong>" + escapar(valor) + "</strong></div>";
  }

  // ==================================================================
  // Manifestar interesse
  // ==================================================================
  function abrirInteresse(demanda) {
    var opcoes = API.PROFISSIONAL.acervo.map(function (doc, indice) {
      var recomendado = demanda.areas.indexOf(doc.area) !== -1;
      return '<label class="opcao-filtro"><input type="checkbox" value="' + indice + '"' +
        (recomendado ? " checked" : "") + '><span>' +
        "<strong>" + doc.tipo + " " + escapar(doc.numero) + "</strong> " +
        '<span class="dica">' + escapar(doc.atividade) +
        (recomendado ? " · combina com a demanda" : "") + "</span></span></label>";
    }).join("");

    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa" role="dialog" aria-modal="true" aria-label="Manifestar interesse">' +
        "<h2>Manifestar interesse</h2>" +
        '<p class="dica" style="margin-bottom:18px">Demanda <strong>' +
          escapar(demanda.titulo) + "</strong>, de " + escapar(demanda.empresa) + ".</p>" +
        '<div class="campo">' +
          '<label for="msg-interesse">Mensagem para a empresa (opcional)</label>' +
          '<textarea id="msg-interesse" placeholder="Ex.: tenho subestação de porte semelhante no acervo."></textarea>' +
        "</div>" +
        '<div class="grupo-campo" style="margin-top:14px; padding-top:14px">' +
          "<h4>Acervo a anexar</h4>" +
          '<p class="dica" style="margin-bottom:10px">Já marcamos o que combina com a área ' +
            "da demanda. Desmarque o que não quiser enviar.</p>" +
          '<div class="acervo-opcoes">' + opcoes + "</div>" +
        "</div>" +
        '<div class="acoes-formulario" style="margin-top:18px">' +
          '<button class="btn btn-secundario" type="button" data-interesse="cancelar">Cancelar</button>' +
          '<button class="btn" type="button" data-interesse="enviar">Enviar interesse</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(fundo);
    fundo.querySelector("textarea").focus();

    function fechar() {
      fundo.remove();
      document.removeEventListener("keydown", aoTeclar);
    }
    function aoTeclar(evento) { if (evento.key === "Escape") { fechar(); } }

    fundo.querySelector('[data-interesse="cancelar"]').addEventListener("click", fechar);
    fundo.addEventListener("click", function (e) { if (e.target === fundo) { fechar(); } });
    document.addEventListener("keydown", aoTeclar);

    fundo.querySelector('[data-interesse="enviar"]').addEventListener("click", function () {
      var marcados = [];
      fundo.querySelectorAll('input[type="checkbox"]:checked').forEach(function (caixa) {
        marcados.push(API.PROFISSIONAL.acervo[Number(caixa.value)]);
      });
      var mensagem = fundo.querySelector("#msg-interesse").value.trim();
      API.candidatar(demanda.id, mensagem, marcados);

      fundo.querySelector(".denuncia-caixa").innerHTML =
        "<h2>Interesse enviado</h2>" +
        '<p class="dica" style="margin:10px 0 18px">A ' + escapar(demanda.empresa) +
        " recebeu sua candidatura com " + marcados.length +
        (marcados.length === 1 ? " documento anexado." : " documentos anexados.") +
        " Você acompanha a resposta em Minhas candidaturas.</p>" +
        '<div class="acoes-formulario"><span></span>' +
        '<a class="btn" href="candidaturas.html">Ver minhas candidaturas</a></div>';
    });
  }

  // ==================================================================
  // Minhas candidaturas (lado profissional)
  // ==================================================================
  var alvoMinhas = document.getElementById("lista-minhas-candidaturas");

  if (alvoMinhas) {
    var minhas = API.minhas();

    if (!minhas.length) {
      alvoMinhas.innerHTML =
        '<div class="cartao" style="text-align:center; padding:40px 24px">' +
          "<h3 style='margin-bottom:8px'>Você ainda não manifestou interesse</h3>" +
          '<p class="dica" style="margin-bottom:18px">Quando encontrar uma demanda ' +
            "compatível, o interesse enviado aparece aqui com a resposta da empresa.</p>" +
          '<a class="btn" href="oportunidades.html">Buscar oportunidades</a>' +
        "</div>";
    } else {
      alvoMinhas.innerHTML = minhas.map(function (c) {
        var anexos = c.acervo.length
          ? c.acervo.map(function (d) {
              return '<span class="etiqueta">' + d.tipo + " " + escapar(d.numero) + "</span>";
            }).join("")
          : '<span class="dica">Nenhum documento anexado.</span>';

        return '<article class="cartao candidatura-card">' +
          '<div class="demanda-topo">' +
            "<div>" +
              "<h3>" + escapar(c.demandaTitulo) + "</h3>" +
              '<span class="meta" style="margin-top:4px">' + escapar(c.empresa) +
                " · enviado em " + escapar(c.data) + "</span>" +
            "</div>" +
            "<div style='text-align:right'>" + etiquetaSituacao(c.situacao) +
              "<span class='dica' style='margin-top:6px'>" + c.compatibilidade +
              "% compatível</span></div>" +
          "</div>" +
          (c.mensagem
            ? '<p class="denuncia-motivo">' + escapar(c.mensagem) + "</p>"
            : "") +
          '<div class="competencias" style="margin-top:14px">' + anexos + "</div>" +
          '<div class="demanda-acoes">' +
            '<a class="btn btn-secundario btn-sm" href="oportunidade.html?d=' +
              encodeURIComponent(c.demandaId) + '">Ver demanda</a>' +
            '<a class="btn btn-fantasma btn-sm" href="mensagens.html">Abrir conversa</a>' +
          "</div>" +
        "</article>";
      }).join("");
    }

    var resumo = document.getElementById("resumo-candidaturas");
    if (resumo) {
      resumo.textContent = minhas.length
        ? minhas.length + (minhas.length === 1 ? " interesse enviado." : " interesses enviados.")
        : "Nenhum interesse enviado ainda.";
    }
  }

  // ==================================================================
  // Candidaturas de uma demanda (lado empresa)
  // ==================================================================
  var alvoEmpresa = document.getElementById("lista-candidaturas-empresa");

  if (alvoEmpresa) {
    var seletor = document.getElementById("seletor-demanda");
    var contagem = API.contarPorDemanda();

    /* Só as demandas desta empresa. */
    var eu = (window.ProLinkModelos && ProLinkModelos.sessao.atual()) || {};
    var daEmpresa = API.DEMANDAS.filter(function (d) { return d.empresaUsuarioId === eu.id; });
    if (!daEmpresa.length) {
      var tituloVazio = document.getElementById("titulo-fila");
      if (tituloVazio) { tituloVazio.textContent = "Nenhuma demanda aberta"; }
      if (seletor) { seletor.innerHTML = "<option>Nenhuma demanda aberta</option>"; seletor.disabled = true; }
      alvoEmpresa.innerHTML = '<div class="cartao"><p class="dica" style="margin-bottom:14px">As candidaturas chegam quando você ' +
        "publica uma demanda. Publique a primeira para começar.</p>" +
        '<a class="btn btn-sm" href="empresa-publicar.html">Publicar demanda</a></div>';
    }
    if (seletor && daEmpresa.length) {
      seletor.innerHTML = daEmpresa.map(function (d) {
        return '<option value="' + d.id + '">' + escapar(d.titulo) +
               " · " + (contagem[d.id] || 0) + " candidaturas</option>";
      }).join("");
      var inicial = parametro("d");
      if (inicial) { seletor.value = inicial; }
      seletor.addEventListener("change", function () { desenharFila(seletor.value); });
    }

    if (daEmpresa.length) { desenharFila((seletor && seletor.value) || parametro("d") || daEmpresa[0].id); }
  }

  function desenharFila(demandaId) {
    var lista = API.daDemanda(demandaId);
    var demanda = API.porId(demandaId);
    var titulo = document.getElementById("titulo-fila");

    if (titulo) {
      titulo.textContent = lista.length
        ? lista.length + (lista.length === 1 ? " candidatura para " : " candidaturas para ") +
          demanda.titulo
        : "Nenhuma candidatura ainda para " + demanda.titulo;
    }

    if (!lista.length) {
      alvoEmpresa.innerHTML =
        '<div class="cartao" style="text-align:center; padding:40px 24px">' +
          "<h3 style='margin-bottom:8px'>Ninguém se candidatou ainda</h3>" +
          '<p class="dica">Assim que um profissional manifestar interesse, ele aparece aqui ' +
            "com o registro já conferido pelo Crea.</p>" +
        "</div>";
      return;
    }

    alvoEmpresa.innerHTML = lista.map(function (c) {
      var p = c.profissional;
      var selo = p.verificado
        ? '<span class="etiqueta etiqueta-verde">Registro verificado</span>'
        : '<span class="etiqueta etiqueta-ambar">Registro não verificado</span>';

      var anexos = c.acervo.length
        ? c.acervo.map(function (d) {
            return '<span class="etiqueta">' + d.tipo + " " + escapar(d.numero) + "</span>";
          }).join("")
        : '<span class="dica">Sem acervo anexado à candidatura.</span>';

      var porques = c.criterios.map(function (cr) {
        return "<li><span>" + escapar(cr.rotulo) + "</span><strong>" +
               cr.pontos + "/" + cr.peso + "</strong></li>";
      }).join("");

      return '<article class="cartao candidatura-card" data-candidatura="' + c.id + '">' +
        '<div class="candidato-topo">' +
          '<span class="avatar avatar-md ' + (p.cor || "") + '">' + escapar(p.iniciais) + "</span>" +
          "<div style='flex:1; min-width:0'>" +
            "<h3>" + escapar(p.nome) + "</h3>" +
            '<span class="meta">' + escapar(p.titulo) + " · " + escapar(p.registro) + "</span>" +
          "</div>" +
          "<div style='text-align:right'>" +
            '<strong class="candidato-compat">' + c.compatibilidade + "%</strong>" +
            '<span class="rotulo">compatível</span>' +
          "</div>" +
        "</div>" +

        '<div class="meta-linha" style="margin:12px 0">' + selo +
          '<span class="meta">' + notaTexto(p) + "</span>" +
          '<span class="meta">Candidatou-se em ' + escapar(c.data) + "</span>" +
          etiquetaSituacao(c.situacao) +
        "</div>" +

        (c.mensagem ? '<p class="denuncia-motivo">' + escapar(c.mensagem) + "</p>" : "") +

        "<div style='margin-top:14px'>" +
          "<span class='rotulo' style='margin-bottom:8px'>Acervo anexado pelo profissional</span>" +
          '<div class="competencias">' + anexos + "</div>" +
        "</div>" +

        '<details class="porque-compat">' +
          "<summary>Por que " + c.compatibilidade + "%?</summary>" +
          "<ul>" + porques + "</ul>" +
          '<p class="dica">A correspondência é indicativa: cabe à empresa verificar habilitação e ' +
            "regularidade.</p>" +
        "</details>" +

        '<div class="demanda-acoes">' +
          '<a class="btn btn-sm" href="profissional.html?p=' + encodeURIComponent(c.profissionalId) +
            '&c=' + encodeURIComponent(c.id) + '">Ver perfil</a>' +
          '<a class="btn btn-secundario btn-sm" href="empresa-mensagens.html">Responder</a>' +
          '<button class="btn btn-fantasma btn-sm" type="button" data-recusar="' + c.id +
            '">Não selecionar</button>' +
        "</div>" +
      "</article>";
    }).join("");

    alvoEmpresa.querySelectorAll("[data-recusar]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        API.atualizarSituacao(botao.getAttribute("data-recusar"), "recusada");
        desenharFila(demandaId);
      });
    });
  }

  // ==================================================================
  // Perfil público do profissional (visto pela empresa)
  // ==================================================================
  var alvoPerfil = document.getElementById("perfil-publico");

  if (alvoPerfil) {
    var idCandidatura = parametro("c");
    var candidatura = API.todas().filter(function (c) { return c.id === idCandidatura; })[0];

    /* ?c= abre pela candidatura; ?p= abre o profissional do cartão clicado
       (busca, painel da empresa). Sem nenhum dos dois, o da sessão. */
    var base = API.profissionalPorId(candidatura ? candidatura.profissionalId : parametro("p")) ||
               (API.PROFISSIONAL.id ? API.PROFISSIONAL : null);
    if (!base) {
      alvoPerfil.innerHTML = '<div class="cartao"><h2 style="margin-bottom:8px">Perfil não encontrado</h2>' +
        '<p class="dica" style="margin-bottom:16px">O profissional pode ter saído da plataforma ou o endereço está incompleto.</p>' +
        '<a class="btn btn-sm" href="javascript:history.back()">Voltar</a></div>';
      return;
    }
    var pessoa = candidatura ? candidatura.profissional : {
      id: base.id, nome: base.nome, iniciais: base.iniciais, cor: base.cor || "",
      titulo: base.titulo, registro: base.registro,
      cidade: base.cidade, uf: base.uf,
      nota: base.nota, avaliacoes: base.avaliacoes,
      verificado: base.verificado !== false, competencias: base.competencias
    };

    /* O link de voltar acompanha de onde a pessoa veio. */
    var voltar = document.getElementById("voltar-perfil");
    if (voltar && !candidatura) {
      var origem = document.referrer ? document.referrer.split("/").pop().split("?")[0] : "";
      var rotulos = {
        "profissionais.html": "Voltar à busca de profissionais",
        "empresa-profissionais.html": "Voltar à busca de profissionais",
        "empresa-inicio.html": "Voltar ao painel",
        "buscar.html": "Voltar à busca"
      };
      if (rotulos[origem]) {
        voltar.href = origem;
        voltar.innerHTML = "&larr; " + rotulos[origem];
      }
    }

    /* Abrir o perfil conta como visualização — é o que fecha o cenário
       "profissional manifesta interesse e a empresa visualiza o perfil". */
    if (candidatura && candidatura.situacao === "enviada") {
      API.atualizarSituacao(candidatura.id, "visualizada");
    }

    document.title = pessoa.nome + " · ProLink";

    var acervoPublico = (candidatura && candidatura.acervo.length
      ? candidatura.acervo
      : (base.acervo || [])).map(function (d) {
        return '<li class="arquivo"><span><strong style="display:block; font-size:14px">' +
          d.tipo + " " + escapar(d.numero) + "</strong>" +
          '<span style="font-size:12.5px; color:var(--tinta-3)">' + escapar(d.atividade) +
          "</span></span>" +
          '<span class="etiqueta etiqueta-verde">Confirmada</span></li>';
      }).join("");

    var marcas = (pessoa.competencias || []).map(function (c) {
      return '<span class="etiqueta">' + escapar(c) + "</span>";
    }).join("");

    alvoPerfil.innerHTML =
      '<div class="perfil-capa"></div>' +
      '<div class="perfil-cabecalho">' +
        '<span class="avatar avatar-lg ' + (pessoa.cor || "") + '">' +
          escapar(pessoa.iniciais) + "</span>" +
        '<div class="perfil-identidade">' +
          "<h1>" + escapar(pessoa.nome) + "</h1>" +
          "<p style='color:var(--tinta-2)'>" + escapar(pessoa.titulo) + " · " +
            escapar(pessoa.registro) + "</p>" +
          '<div class="meta-linha" style="margin-top:10px">' +
            '<span class="meta">' + escapar(pessoa.cidade) + ", " + escapar(pessoa.uf) + "</span>" +
            '<span class="meta">' + notaTexto(pessoa) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="perfil-acoes">' +
          '<button class="btn btn-fantasma" type="button" data-denunciar="o perfil de ' +
            escapar(pessoa.nome) + '">Denunciar</button>' +
          '<a class="btn btn-secundario" href="' + (function () {
            var sessao = (window.ProLinkBanco && ProLinkModelos.sessao.atual()) || {};
            var pagina = sessao.tipoConta === "profissional" ? "mensagens.html" : "empresa-mensagens.html";
            return pagina + "?com=" + encodeURIComponent(pessoa.id || base.id);
          })() + '">Enviar mensagem</a>' +
          (candidatura
            ? '<a class="btn" href="empresa-candidaturas.html?d=' +
              encodeURIComponent(candidatura.demandaId) + '">Voltar às candidaturas</a>'
            : "") +
        "</div>" +
      "</div>" +

      '<div class="grade grade-principal" style="margin-top:24px">' +
        "<div>" +
          (candidatura && candidatura.mensagem
            ? '<div class="cartao" style="margin-bottom:20px">' +
              "<h2 style='margin-bottom:10px'>Mensagem enviada na candidatura</h2>" +
              '<p class="denuncia-motivo" style="margin-top:0">' +
              escapar(candidatura.mensagem) + "</p></div>"
            : "") +
          '<div class="cartao" style="margin-bottom:20px">' +
            "<h2 style='margin-bottom:12px'>Competências</h2>" +
            '<div class="competencias">' + marcas + "</div>" +
            '<p class="dica" style="margin-top:12px">Extraídas do acervo confirmado no Crea ' +
              "e do currículo enviado pelo profissional.</p>" +
          "</div>" +
          '<div class="cartao cartao-limpo">' +
            '<div class="cartao-cabecalho"><h2>Acervo técnico</h2>' +
              '<span class="dica">Confirmado na base do Crea</span></div>' +
            '<ul class="lista-arquivos" style="padding:16px 20px 20px">' + acervoPublico + "</ul>" +
          "</div>" +
        "</div>" +

        "<div>" +
          (candidatura
            ? '<div class="cartao" style="margin-bottom:20px">' +
              "<h3 style='margin-bottom:6px'>Candidatura</h3>" +
              '<p class="dica" style="margin-bottom:14px">Para a demanda ' +
                escapar(candidatura.demandaTitulo) + ".</p>" +
              '<span class="analise-valor">' + candidatura.compatibilidade + "%</span>" +
              '<span class="rotulo" style="margin-bottom:14px">de compatibilidade</span>' +
              tabelaCriterios(candidatura.criterios, candidatura.compatibilidade) +
              "</div>"
            : "") +

          '<div class="cartao">' +
            '<div class="faixa-verificado">' +
              "<span><strong>" +
              (pessoa.verificado ? "Registro verificado" : "Registro não verificado") +
              "</strong><span>" +
              (pessoa.verificado
                ? "Conferido na base do Crea-AM."
                : "O Crea ainda não confirmou este registro.") +
              "</span></span></div>" +
            '<p class="aviso-lgpd" style="margin-top:16px">' +
              "Só aparece aqui o que o profissional autorizou a exibir. Cabe à empresa " +
              "verificar habilitação, atribuições e regularidade antes de contratar.</p>" +
          "</div>" +
        "</div>" +
      "</div>";

    /* O botão de denunciar é criado agora, então precisa ser religado. */
    var botaoDenunciar = alvoPerfil.querySelector("[data-denunciar]");
    if (botaoDenunciar && window.ProLinkDenuncia) {
      botaoDenunciar.addEventListener("click", function () {
        window.ProLinkDenuncia(botaoDenunciar.getAttribute("data-denunciar"));
      });
    }
  }
})(window, document);
