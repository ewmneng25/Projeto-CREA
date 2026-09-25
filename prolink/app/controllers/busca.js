/* ============================================================
   ProLink — controller: buscas de profissionais e filtros laterais
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

  /* ---------------- Cartões das buscas de profissionais ---------------- */
  var primeiro = document.querySelector("article.cartao.candidato");
  if (primeiro && ["profissionais.html", "empresa-profissionais.html", "buscar.html"].indexOf(pagina) !== -1) {
    var grade = primeiro.parentNode;
    var icSelo = svg(".meta-linha .etiqueta svg", primeiro);
    var icMeta = svg(".meta-linha .meta svg", primeiro);
    var icEstrela = pagina === "empresa-profissionais.html" ? icMeta : "";
    var icPino = svg("article.cartao.candidato .meta-linha .meta svg");
    var lado = pagina === "empresa-profissionais.html" ? "empresa" : (pagina === "buscar.html" ? "publico" : "profissional");
    var demandaReferencia = lado === "empresa"
      ? ProLinkModelos.demandas.listar({ empresaUsuarioId: sessao.id }).filter(function (d) { return d.situacao !== "Encerrada"; })[0]
      : null;

    var pessoas = ProLinkModelos.profissionais.listar()
      .filter(function (p) { return lado !== "profissional" || p.id !== sessao.profissionalId; })
      .sort(function (a, b) { return (b.nota || 0) - (a.nota || 0); });

    grade.innerHTML = pessoas.map(function (p) {
      var compat = demandaReferencia && API ? API.compatibilidade(p, demandaReferencia).total : null;
      var selo = p.verificado
        ? '<span class="etiqueta etiqueta-verde">' + icSelo + " Registro verificado</span>"
        : '<span class="etiqueta etiqueta-ambar">' + icSelo + " Registro não verificado</span>";
      var segundaMeta = lado === "empresa"
        ? '<span class="meta">' + icEstrela + " " + String(p.nota || 0).replace(".", ",") + " em " + (p.avaliacoes || 0) + " avaliações</span>"
        : '<span class="meta">' + icPino + " " + esc(p.cidade + ", " + p.uf) + "</span>";
      var acoes = lado === "publico"
        ? '<a class="btn btn-secundario btn-sm" href="profissional.html?p=' + esc(p.id) + '">Ver perfil</a>' +
          '<a class="btn btn-fantasma btn-sm" href="cadastro.html">Entrar em contato</a>'
        : '<a class="btn btn-sm" href="' + (lado === "empresa" ? "empresa-mensagens.html" : "mensagens.html") + "?com=" + esc(p.id) + '">Enviar mensagem</a>' +
          '<a class="btn btn-secundario btn-sm" href="profissional.html?p=' + esc(p.id) + '">Ver perfil</a>' +
          (lado === "empresa" ? '<button class="btn btn-fantasma btn-sm" type="button" data-denunciar="o perfil de ' + esc(p.nome) + '">Denunciar</button>' : "");
      return '<article class="cartao candidato" data-profissional="' + esc(p.id) + '"><div class="candidato-topo">' +
        '<span class="avatar avatar-md ' + esc(p.cor || "") + '">' + esc(p.iniciais) + "</span>" +
        '<div style="flex:1; min-width:0"><h3>' + esc(p.nome) + '</h3><span class="meta">' + esc([p.titulo, p.registro].filter(Boolean).join(" · ")) + "</span></div>" +
        (compat !== null ? '<div style="text-align:right"><strong class="candidato-compat">' + compat + '%</strong><span class="rotulo">compatível</span></div>' : "") +
        '</div><div class="meta-linha" style="margin:12px 0">' + selo + segundaMeta + "</div>" +
        '<p style="font-size:13.5px; color:var(--tinta-2)">' + esc(p.resumo || "") + "</p>" +
        '<div class="competencias" style="margin-top:12px">' + (p.competencias || []).map(function (c) {
          return '<span class="etiqueta">' + esc(c) + "</span>";
        }).join("") + '</div><div class="candidato-acoes">' + acoes + "</div></article>";
    }).join("");

    /* Denunciar dos cartões novos: o prolink.js já tinha ligado os antigos. */
    grade.addEventListener("click", function (evento) {
      var botao = evento.target.closest("[data-denunciar]");
      if (botao && window.ProLinkDenuncia) { window.ProLinkDenuncia(botao.getAttribute("data-denunciar")); }
    });
    var contagem = document.querySelector(".secao-titulo .meta");
    if (contagem) { contagem.textContent = pessoas.length + " profissionais encontrados"; }
  }

})(window, document);

/* ==================================================================
   7. BUSCAS COM FILTROS LATERAIS
   Oportunidades, busca de profissionais (logada, da empresa e
   pública). Aplicar, limpar, carregar mais, salvar a busca e criar
   alerta. A busca da barra superior chega aqui por ?q=.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  if (!U) { return; }
  var normalizar = U.normalizar;

  var aside = Array.prototype.filter.call(document.querySelectorAll("aside.cartao"), function (a) {
    return U.botaoPorTexto("Aplicar filtros", a).length;
  })[0];
  if (!aside) { return; }

  var lista = document.querySelector(".lista-oportunidades") ||
              (document.querySelector("article.candidato") || {}).parentNode;
  if (!lista) { return; }
  var ehOportunidade = lista.classList.contains("lista-oportunidades");

  function cartoes() {
    return Array.prototype.filter.call(lista.children, function (c) { return c.matches("article"); });
  }

  /* Palavras que indicam cada área nos textos dos cartões. */
  var AREAS = {
    "civil": ["estrutur", "civil", "fundac", "laudo", "bim", "edifica", "obra", "concreto"],
    "estrutural": ["estrutur", "civil", "fundac", "laudo", "bim", "edifica", "concreto"],
    "eletrica": ["eletric", "spda", "subestac"],
    "hidraulica": ["hidraul", "sanit", "saneamento"],
    "ambiental": ["ambient", "licenciamento", "impacto", "outorga"],
    "mecanica": ["mecanic", "tubulac", "montagem industrial", "climatiz"],
    "agronomia": ["agron", "irrigac", "solo", "rural"],
    "geotecnia": ["geotec", "sondagem", "solo"]
  };
  /* Anos de atuação dos profissionais fictícios (não aparecem no cartão). */
  var ANOS = { "daniel silva do carmo": 7, "ana beatriz farias": 9, "lucas martins": 4,
               "rafael souza": 3, "paula menezes": 6 };

  function palavrasDaOpcao(texto) {
    var t = normalizar(texto);
    for (var chave in AREAS) {
      if (t.indexOf(chave) !== -1) { return AREAS[chave]; }
    }
    if (t.indexOf("registro ativo") !== -1) { return ["registro verificado"]; }
    if (t.indexOf("acervo") !== -1) { return ["registro verificado"]; }
    if (t.indexOf("empresa registrada") !== -1) { return ["empresa registrada"]; }
    if (t === "vaga fixa") { return ["vaga fixa"]; }
    return [t.replace(/s$/, "")];
  }

  function textoDe(cartao) {
    if (!cartao.dataset.textoBusca) { cartao.dataset.textoBusca = normalizar(cartao.textContent); }
    return cartao.dataset.textoBusca;
  }

  function nomeDe(cartao) {
    var h3 = cartao.querySelector("h3");
    return h3 ? normalizar(h3.textContent) : "";
  }

  /** Cada bloco de filtro vira uma regra (ou nenhuma, se não distingue nada). */
  function regras() {
    var lista = [];
    aside.querySelectorAll(".filtro-bloco").forEach(function (bloco) {
      var titulo = normalizar((bloco.querySelector("h4") || {}).textContent || "");

      var caixas = bloco.querySelectorAll('input[type="checkbox"]');
      if (caixas.length) {
        var todas = Array.prototype.map.call(caixas, function (c) {
          return palavrasDaOpcao(c.parentNode.textContent.replace(/\d+\s*$/, ""));
        });
        var marcadas = [];
        caixas.forEach(function (c, i) { if (c.checked) { marcadas.push(todas[i]); } });

        /* Bloco que nenhum cartão menciona (ex.: presencial/remoto) não filtra. */
        var distingue = cartoes().some(function (cartao) {
          var texto = textoDe(cartao);
          return todas.some(function (palavras) {
            return palavras.some(function (p) { return texto.indexOf(p) !== -1; });
          });
        });
        if (distingue && marcadas.length) {
          lista.push(function (cartao) {
            var texto = titulo.indexOf("tipo") !== -1
              ? normalizar((cartao.querySelector(".etiqueta") || {}).textContent || "")
              : textoDe(cartao);
            return marcadas.some(function (palavras) {
              return palavras.some(function (p) { return texto.indexOf(p) !== -1; });
            });
          });
        }
      }

      bloco.querySelectorAll("select").forEach(function (select) {
        var valor = normalizar(select.value);
        if (/qualquer|todo|brasil|regiao/.test(valor)) { return; }
        var anos = valor.match(/mais de (\d+)/);
        if (anos) {
          var minimo = Number(anos[1]);
          lista.push(function (cartao) { return (ANOS[nomeDe(cartao)] || 0) > minimo; });
          return;
        }
        var cidade = valor.split(",")[0];
        lista.push(function (cartao) { return textoDe(cartao).indexOf(cidade) !== -1; });
      });

      bloco.querySelectorAll('input[type="search"], input[type="text"]').forEach(function (campo) {
        var termo = normalizar(campo.value);
        if (!termo) { return; }
        lista.push(function (cartao) {
          return (titulo.indexOf("nome") !== -1 || /nome/.test(campo.id) ? nomeDe(cartao) : textoDe(cartao))
            .indexOf(termo) !== -1;
        });
      });
    });

    var termoGlobal = normalizar(U.parametro("q"));
    if (termoGlobal && !aside.querySelector('input[type="search"]')) {
      lista.push(function (cartao) {
        return termoGlobal.split(" ").every(function (p) { return textoDe(cartao).indexOf(p) !== -1; });
      });
    }
    return lista;
  }

  var contador = document.querySelector(".secao-titulo .meta");
  var textoOriginalContador = contador ? contador.textContent : "";

  function atualizarContador() {
    if (!contador) { return; }
    var visiveis = cartoes().filter(function (c) {
      return !c.classList.contains("oculto-filtro") && !c.classList.contains("oculto-aba") &&
             !c.classList.contains("oculto-pagina");
    }).length;
    contador.textContent = ehOportunidade
      ? visiveis + (visiveis === 1 ? " demanda encontrada" : " demandas encontradas")
      : visiveis + (visiveis === 1 ? " profissional encontrado" : " profissionais encontrados");
  }

  function aplicarFiltros(silencioso) {
    var todas = regras();
    var visiveis = 0;
    cartoes().forEach(function (cartao) {
      var ok = todas.every(function (regra) { return regra(cartao); });
      cartao.classList.toggle("oculto-filtro", !ok);
      if (ok && !cartao.classList.contains("oculto-aba")) { visiveis += 1; }
    });

    var vazio = lista.parentNode.querySelector(".estado-vazio[data-de-busca]");
    if (!visiveis) {
      if (!vazio) {
        vazio = document.createElement("div");
        vazio.className = "estado-vazio";
        vazio.setAttribute("data-de-busca", "1");
        vazio.innerHTML = "Nenhum resultado com esses filtros. " +
          '<button class="btn-texto" type="button">Limpar filtros</button>';
        vazio.querySelector("button").addEventListener("click", limparFiltros);
        lista.parentNode.insertBefore(vazio, lista.nextSibling);
      }
    } else if (vazio) {
      vazio.remove();
    }
    atualizarContador();
    if (!silencioso) {
      U.avisar(visiveis + (visiveis === 1 ? " resultado" : " resultados") + " com os filtros aplicados.");
    }
  }

  /* Deixa todos os campos no estado mais amplo (sem aplicar). */
  function zerarCampos() {
    aside.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    aside.querySelectorAll('input[type="search"], input[type="text"]').forEach(function (c) { c.value = ""; });
    aside.querySelectorAll("select").forEach(function (select) {
      var amplo = Array.prototype.filter.call(select.options, function (o) {
        return /qualquer|todo|brasil/i.test(normalizar(o.textContent));
      })[0];
      select.value = amplo ? amplo.value : select.options[0].value;
    });
  }

  function limparFiltros() {
    aside.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    aside.querySelectorAll('input[type="search"], input[type="text"]').forEach(function (c) { c.value = ""; });
    aside.querySelectorAll("select").forEach(function (select) {
      var amplo = Array.prototype.filter.call(select.options, function (o) {
        return /qualquer|todo|brasil/i.test(normalizar(o.textContent));
      })[0];
      select.value = amplo ? amplo.value : select.options[0].value;
    });
    if (U.parametro("q") || U.parametro("area") || U.parametro("busca")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    aplicarFiltros(true);
    U.avisar("Filtros limpos. Mostrando todos os resultados.");
  }

  /* --- estado da busca, para salvar e restaurar ------------------------ */
  function estado() {
    return {
      campos: Array.prototype.map.call(aside.querySelectorAll("input, select"), function (c) {
        return c.type === "checkbox" ? c.checked : c.value;
      }),
      q: U.parametro("q")
    };
  }

  function restaurar(salvo) {
    aside.querySelectorAll("input, select").forEach(function (c, i) {
      if (salvo.campos[i] === undefined) { return; }
      if (c.type === "checkbox") { c.checked = !!salvo.campos[i]; } else { c.value = salvo.campos[i]; }
    });
  }

  function resumoDaBusca() {
    var partes = [];
    aside.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
      partes.push(c.parentNode.querySelector("span").textContent.trim());
    });
    aside.querySelectorAll("select").forEach(function (s) { partes.push(s.value); });
    aside.querySelectorAll('input[type="search"]').forEach(function (c) { if (c.value) { partes.push("“" + c.value + "”"); } });
    if (U.parametro("q")) { partes.push("“" + U.parametro("q") + "”"); }
    return partes.join(" · ") || "Todos os resultados";
  }

  var botaoAplicar = U.botaoPorTexto("Aplicar filtros", aside)[0];
  var botaoLimpar = U.botaoPorTexto("Limpar", aside)[0];
  botaoAplicar.addEventListener("click", function () { aplicarFiltros(false); });
  if (botaoLimpar) { botaoLimpar.addEventListener("click", limparFiltros); }

  /* Enter no campo de nome aplica a busca. */
  aside.querySelectorAll('input[type="search"]').forEach(function (campo) {
    campo.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter") { evento.preventDefault(); aplicarFiltros(false); }
    });
  });

  /* Carregar mais: a massa de demonstração cabe numa página. */
  U.botaoPorTexto("Carregar mais").forEach(function (botao) {
    botao.addEventListener("click", function () {
      botao.disabled = true;
      botao.textContent = "Todos os resultados já estão na tela";
      U.avisar("Não há mais resultados para esta busca.");
    });
  });

  /* Salvar esta busca */
  var pagina = U.paginaAtual();
  U.botaoPorTexto("Salvar esta busca").forEach(function (botao) {
    botao.addEventListener("click", function () {
      U.dialogo({
        titulo: "Salvar esta busca",
        texto: "Guarda os filtros de agora para abrir de novo com um clique. As buscas salvas " +
               "ficam em Configurações.",
        corpo: '<div class="campo"><label for="nome-busca">Nome da busca</label>' +
               '<input id="nome-busca" type="text" maxlength="60" value="' +
               U.escapar(resumoDaBusca().slice(0, 60)) + '"></div>' +
               '<p class="dica">Filtros: ' + U.escapar(resumoDaBusca()) + "</p>",
        confirmar: "Salvar busca",
        aoConfirmar: function (caixa) {
          var nome = caixa.querySelector("#nome-busca").value.trim();
          if (!nome) { caixa.erro("Dê um nome para a busca."); return false; }
          var gravada = ProLinkModelos.buscas_salvas.inserir({
            usuarioId: U.sessao().id || "", tipo: "busca", nome: nome, pagina: pagina,
            resumo: resumoDaBusca(), estado: estado()
          });
          if (!gravada) { caixa.erro("Não foi possível gravar a busca na base."); return false; }
          var config = U.ladoAtual() === "empresa" ? "empresa-configuracoes.html" : "configuracoes.html";
          U.avisar("Busca “" + U.escapar(nome) + "” salva. <a class='link' href='" + config +
                   "#buscas'>Ver buscas salvas</a>", "ok");
        }
      });
    });
  });

  /* Criar alerta */
  U.botaoPorTexto("Criar alerta").forEach(function (botao) {
    botao.addEventListener("click", function () {
      U.dialogo({
        titulo: "Criar alerta",
        texto: "Avisamos quando surgir demanda nova que combine com estes filtros.",
        corpo: '<p class="dica" style="margin-bottom:14px">Filtros: ' + U.escapar(resumoDaBusca()) + "</p>" +
          '<div class="campo"><label for="alerta-frequencia">Com que frequência</label>' +
          '<select id="alerta-frequencia"><option>Assim que surgir</option><option>Resumo diário</option>' +
          "<option>Resumo semanal</option></select></div>" +
          '<div class="campo"><label for="alerta-canal">Onde avisar</label>' +
          '<select id="alerta-canal"><option>Na plataforma e por e-mail</option>' +
          "<option>Só na plataforma</option></select></div>",
        confirmar: "Criar alerta",
        aoConfirmar: function (caixa) {
          ProLinkModelos.buscas_salvas.inserir({
            usuarioId: U.sessao().id || "", tipo: "alerta", nome: "", pagina: pagina, resumo: resumoDaBusca(),
            estado: estado(), frequencia: caixa.querySelector("#alerta-frequencia").value,
            canal: caixa.querySelector("#alerta-canal").value
          });
          U.avisar("Alerta criado. <a class='link' href='configuracoes.html#buscas'>Gerenciar alertas</a>", "ok");
        }
      });
    });
  });

  /* Entradas pela URL: ?busca= (salva), ?area= (atalhos do painel), ?q= (barra superior). */
  var idBusca = U.parametro("busca");
  var area = normalizar(U.parametro("area"));
  var q = U.parametro("q");
  var nomeCampo = aside.querySelector('input[type="search"]');

  if (idBusca) {
    var salva = ProLinkModelos.buscas_salvas.buscar(idBusca);
    if (salva) { restaurar(salva.estado); aplicarFiltros(true); U.avisar("Busca salva aberta."); }
  } else if (area || q) {
    zerarCampos();
    if (area) {
      aside.querySelectorAll('input[type="checkbox"]').forEach(function (c) {
        if (normalizar(c.parentNode.textContent).indexOf(area.slice(0, 6)) !== -1) { c.checked = true; }
      });
    }
    if (q && nomeCampo) { nomeCampo.value = q; }
    aplicarFiltros(true);
  }

  document.addEventListener("prolink:filtrado", atualizarContador);
  if (contador && !idBusca && !area && !q) { contador.textContent = textoOriginalContador; }
})(window, document);
