/* ============================================================
   ProLink — controller: telas montadas com os dados da conta

   Painéis, perfis, avaliações, cartão da lateral e contagens das
   buscas saem da base em uso (real ou de demonstração), sempre da
   conta que está na sessão. Sem dado, a tela diz que ainda não há —
   nunca mostra número ou texto de outra pessoa.
   ============================================================ */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  if (!U || !Banco || !ProLinkModelos.base.disponivel()) { return; }

  var M = ProLinkModelos;
  var pagina = U.paginaAtual();
  var eu = M.sessao.atual() || {};
  var API = window.ProLinkDemandas;
  var ICONES = window.PROLINK_ICONES || {};
  var ehEmpresa = eu.tipoConta === "empresa" || eu.tipoConta === "contratante";

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ico(nome) { return ICONES[nome] || ""; }
  function $(seletor) { return document.querySelector(seletor); }
  function todos(seletor) { return Array.prototype.slice.call(document.querySelectorAll(seletor)); }
  function preencher(chave, html, comoTexto) {
    todos('[data-conta="' + chave + '"]').forEach(function (el) {
      if (comoTexto) { el.textContent = html; } else { el.innerHTML = html; }
    });
  }
  function virgula(n, casas) { return Number(n || 0).toFixed(casas == null ? 1 : casas).replace(".", ","); }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
  function vazio(texto) { return '<p class="dica" style="padding:6px 0">' + esc(texto) + "</p>"; }
  function liVazio(texto) { return '<li><p class="dica" style="padding:10px 0">' + esc(texto) + "</p></li>"; }

  function paraData(texto) {
    var m = String(texto || "").match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (m) { return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
    var d = new Date(String(texto || "").replace(" ", "T"));
    return isNaN(d) ? new Date(0) : d;
  }
  function relativo(texto) {
    var data = paraData(texto);
    if (!data.getTime()) { return ""; }
    var minutos = Math.round((Date.now() - data.getTime()) / 60000);
    if (minutos < 1) { return "agora"; }
    if (minutos < 60) { return "há " + minutos + " min"; }
    var horas = Math.round(minutos / 60);
    if (horas < 24) { return "há " + horas + " h"; }
    var dias = Math.round(horas / 24);
    if (dias === 1) { return "ontem"; }
    if (dias < 30) { return "há " + dias + " dias"; }
    return String(data.getDate()).padStart(2, "0") + "/" + String(data.getMonth() + 1).padStart(2, "0");
  }
  function hojePorExtenso() {
    var d = new Date();
    var dia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  }
  var CORES = ["", "avatar-verde", "avatar-ambar", "avatar-roxo"];
  function corDe(texto) {
    var soma = 0;
    String(texto).split("").forEach(function (c) { soma += c.charCodeAt(0); });
    return CORES[soma % CORES.length];
  }
  function estrelas(nota) {
    var cheias = Math.round(Number(nota) || 0), html = "";
    for (var i = 0; i < 5; i += 1) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor"' + (i < cheias ? "" : ' class="vazia"') +
        ' aria-hidden="true"><path d="m12 3.6 2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.4l-5.38 2.84 1.03-6L3.3 10l6-.9z"/></svg>';
    }
    return '<span class="estrelas" role="img" aria-label="' + virgula(nota) + ' de 5">' + html + "</span>";
  }
  function atividadeLi(icone, cor, titulo, desc, quando) {
    return '<li><div class="item-atividade"><span class="icone' + (cor ? " " + cor : "") + '">' + ico(icone) + "</span>" +
      "<span><strong>" + esc(titulo) + "</strong><span>" + esc(desc) + "</span></span>" +
      "<time>" + esc(quando) + "</time></div></li>";
  }
  function barra(rotulo, valor, proporcao) {
    return '<div><div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:6px">' +
      "<span>" + esc(rotulo) + "</span><strong>" + esc(valor) + "</strong></div>" +
      '<div class="barra-compat"><span style="width:' + Math.round(Math.max(0, Math.min(1, proporcao)) * 100) + '%"></span></div></div>';
  }

  // ------------------------------------------------------------------
  // Dados da conta
  // ------------------------------------------------------------------
  var meuProf = API && API.PROFISSIONAL && API.PROFISSIONAL.id ? API.PROFISSIONAL : null;
  var demandas = M.demandas.listar();
  var abertas = demandas.filter(function (d) { return d.situacao !== "Encerrada"; });
  var candidaturas = M.candidaturas.listar();
  var minhasCand = eu.profissionalId
    ? candidaturas.filter(function (c) { return c.profissionalId === eu.profissionalId; }) : [];
  var minhasDemandas = demandas.filter(function (d) { return d.empresaUsuarioId === eu.id; });
  var minhasAbertas = minhasDemandas.filter(function (d) { return d.situacao !== "Encerrada"; });
  var idsMinhas = minhasDemandas.map(function (d) { return d.id; });
  var recebidas = candidaturas.filter(function (c) { return idsMinhas.indexOf(c.demandaId) !== -1; });
  var avRecebidas = M.avaliacoes.listar({ usuarioId: eu.id, sentido: "recebida" });
  var avRealizadas = M.avaliacoes.listar({ usuarioId: eu.id, sentido: "realizada" });
  var documentos = M.documentos.listar({ usuarioId: eu.id });
  var validados = documentos.filter(function (d) { return d.situacao !== "Em consulta"; });
  var projetos = M.projetos.listar({ usuarioId: eu.id });
  var arquivos = M.arquivos.listar({ usuarioId: eu.id });
  var temCurriculo = arquivos.some(function (a) { return a.categoria === "curriculo"; });
  var competencias = (meuProf && meuProf.competencias && meuProf.competencias.length)
    ? meuProf.competencias : (eu.habilidades || []);
  var areas = (meuProf && meuProf.areas) || [];

  var mediaRecebida = avRecebidas.length
    ? avRecebidas.reduce(function (s, a) { return s + (Number(a.nota) || 0); }, 0) / avRecebidas.length : 0;

  function compat(prof, demanda) { return API ? API.compatibilidade(prof, demanda).total : 0; }

  // ------------------------------------------------------------------
  // Cartão da lateral
  // ------------------------------------------------------------------
  var lateral = $("#cartao-lateral");
  if (lateral) {
    var tituloL = lateral.querySelector('[data-lateral="titulo"]');
    var textoL = lateral.querySelector('[data-lateral="texto"]');
    var botaoL = lateral.querySelector('[data-lateral="botao"]');
    if (!eu.id || eu.visitante) {
      lateral.hidden = true;
    } else if (ehEmpresa) {
      var aguardando = recebidas.filter(function (c) { return c.situacao === "enviada" || c.situacao === "visualizada"; }).length;
      if (!minhasAbertas.length) {
        tituloL.textContent = "Nenhuma demanda aberta";
        textoL.textContent = "Publique uma demanda para receber candidaturas de profissionais com registro conferido.";
        botaoL.textContent = "Publicar demanda";
        botaoL.href = "empresa-publicar.html";
      } else {
        tituloL.textContent = plural(minhasAbertas.length, "demanda aberta", "demandas abertas");
        textoL.textContent = aguardando
          ? plural(aguardando, "candidatura aguarda", "candidaturas aguardam") + " a sua resposta."
          : "Nenhuma candidatura aguardando resposta agora.";
        botaoL.textContent = "Ver candidaturas";
        botaoL.href = "empresa-candidaturas.html";
      }
    } else {
      var passos = [
        { ok: !!String(eu.sobre || "").trim(), dica: "Escreva um texto sobre você em Meu perfil.", link: "perfil.html" },
        { ok: competencias.length > 0, dica: "Informe suas competências.", link: "perfil.html" },
        { ok: validados.length > 0, dica: "Vincule uma ART ou CAT pelo número.", link: "portfolio.html" },
        { ok: projetos.length > 0, dica: "Adicione um projeto ao portfólio.", link: "portfolio.html" },
        { ok: temCurriculo, dica: "Envie o seu currículo.", link: "portfolio.html" },
        { ok: !!(eu.cidadeExibicao || eu.cidade), dica: "Informe a cidade onde você atua.", link: "perfil.html" }
      ];
      var feitos = passos.filter(function (p) { return p.ok; }).length;
      var pct = Math.round(feitos / passos.length * 100);
      var falta = passos.filter(function (p) { return !p.ok; })[0];
      tituloL.textContent = "Perfil " + pct + "% completo";
      textoL.textContent = falta ? falta.dica : "Perfil completo. Mantenha o portfólio em dia.";
      botaoL.textContent = falta ? "Completar perfil" : "Ver portfólio";
      botaoL.href = falta ? falta.link : "portfolio.html";
    }
  }

  // ------------------------------------------------------------------
  // Cartões de oportunidade e de profissional
  // ------------------------------------------------------------------
  var CLASSE_TIPO = { "Projeto": "", "Parceria": "etiqueta-verde", "Serviço": "etiqueta-roxa", "Vaga fixa": "etiqueta-ambar" };
  function cartaoOportunidade(d, pct) {
    return '<article class="oportunidade" data-demanda="' + esc(d.id) + '">' +
      '<span class="avatar avatar-empresa avatar-md ' + corDe(d.empresa) + '">' + esc(d.empresaIniciais) + "</span>" +
      '<div><span class="etiqueta ' + (CLASSE_TIPO[d.tipo] || "") + '">' + esc(d.tipo) + "</span>" +
      "<h3>" + esc(d.titulo) + "</h3><p>" + esc(d.resumo) + "</p>" +
      '<div class="meta-linha"><span class="meta">' + ico("predio") + " " + esc(d.empresa) + "</span>" +
      '<span class="meta">' + ico("pino") + " " + esc(d.cidade + ", " + d.uf) + "</span>" +
      '<span class="meta">' + ico("relogio") + " Publicado " + relativo(d.publicadaEm) + "</span></div></div>" +
      '<div class="oportunidade-acoes"><span class="compatibilidade">' + pct + "% compatível</span>" +
      '<a class="btn btn-sm" href="oportunidade.html?d=' + encodeURIComponent(d.id) + '">Ver detalhes</a></div></article>';
  }
  function cartaoProfissional(p, pct) {
    var selo = p.verificado
      ? '<span class="etiqueta etiqueta-verde">' + ico("escudo") + " Registro verificado</span>"
      : '<span class="etiqueta etiqueta-ambar">Registro não verificado</span>';
    return '<article class="cartao candidato"><div class="candidato-topo">' +
      '<span class="avatar avatar-md ' + esc(p.cor || "") + '">' + esc(p.iniciais) + "</span>" +
      '<div style="flex:1; min-width:0"><h3>' + esc(p.nome) + '</h3><span class="meta">' +
      esc([p.titulo, p.registro].filter(Boolean).join(" · ")) + "</span></div>" +
      '<div style="text-align:right"><strong class="candidato-compat">' + pct + '%</strong><span class="rotulo">compatível</span></div></div>' +
      '<div class="meta-linha" style="margin:12px 0">' + selo +
      '<span class="meta">' + ico("estrela") + " " + (p.avaliacoes ? virgula(p.nota) + " em " + p.avaliacoes + " avaliações" : "Sem avaliações") + "</span></div>" +
      '<p style="font-size:13.5px; color:var(--tinta-2)">' + esc(p.resumo || "") + "</p>" +
      '<div class="competencias" style="margin-top:12px">' + (p.competencias || []).slice(0, 4).map(function (c) {
        return '<span class="etiqueta">' + esc(c) + "</span>";
      }).join("") + "</div>" +
      '<div class="candidato-acoes"><a class="btn btn-sm" href="empresa-mensagens.html?com=' + encodeURIComponent(p.id) + '">Enviar mensagem</a>' +
      '<a class="btn btn-secundario btn-sm" href="profissional.html?p=' + encodeURIComponent(p.id) + '">Ver perfil</a></div></article>';
  }

  // ------------------------------------------------------------------
  // Painel do profissional
  // ------------------------------------------------------------------
  if (pagina === "inicio.html") {
    var andamento = minhasCand.filter(function (c) { return c.situacao !== "recusada"; }).length;
    var sub = $("#subtitulo-painel");
    if (sub) {
      sub.textContent = hojePorExtenso() + " · " + (andamento
        ? "você tem " + plural(andamento, "candidatura em andamento", "candidaturas em andamento") + "."
        : "nenhuma candidatura em andamento.");
    }

    var ranking = meuProf ? abertas.map(function (d) { return { d: d, pct: compat(meuProf, d) }; })
      .sort(function (a, b) { return b.pct - a.pct; }) : [];
    var compativeis = ranking.filter(function (r) { return r.pct >= 60; });
    var melhores = ranking.slice(0, 3);
    var media = melhores.length ? Math.round(melhores.reduce(function (s, r) { return s + r.pct; }, 0) / melhores.length) : 0;
    var agora = new Date();
    var quando = String(agora.getDate()).padStart(2, "0") + "/" + String(agora.getMonth() + 1).padStart(2, "0") + "/" +
      agora.getFullYear() + " às " + String(agora.getHours()).padStart(2, "0") + ":" + String(agora.getMinutes()).padStart(2, "0");

    var tituloA = $("#titulo-analise"), baseA = $("#base-analise"), valorA = $("#valor-analise");
    if (tituloA) {
      tituloA.textContent = !abertas.length ? "Ainda não há demandas abertas para comparar"
        : "Seu perfil está " + media + "% compatível com as demandas abertas";
    }
    if (valorA) { valorA.textContent = abertas.length ? media + "%" : "–"; }
    if (baseA) {
      baseA.textContent = "Última análise em " + quando + ", sobre " +
        plural(validados.length, "documento do Crea", "documentos do Crea") + ", " +
        plural(projetos.length, "projeto", "projetos") + " e " + (temCurriculo ? "1 currículo" : "nenhum currículo") + ". " +
        plural(compativeis.length, "oportunidade compatível encontrada", "oportunidades compatíveis encontradas") + ".";
    }
    var compA = $("#competencias-analise");
    if (compA) {
      compA.innerHTML = competencias.length
        ? competencias.map(function (c) { return '<span class="etiqueta">' + esc(c) + "</span>"; }).join("")
        : vazio("Nenhuma competência informada ainda. Complete o perfil e o portfólio.");
    }
    var forca = $("#forca-analise");
    if (forca) {
      forca.innerHTML =
        barra("Acervo do Crea", plural(validados.length, "documento", "documentos"), validados.length / 3) +
        barra("Projetos descritos", plural(projetos.length, "projeto", "projetos"), projetos.length / 3) +
        barra("Currículo", temCurriculo ? "Enviado" : "Não enviado", temCurriculo ? 1 : 0) +
        barra("Áreas de atuação", plural(areas.length, "área", "áreas"), areas.length / 2);
    }
    var linkC = $("#link-compativeis");
    if (linkC) { linkC.textContent = compativeis.length ? "Ver as " + plural(compativeis.length, "oportunidade compatível", "oportunidades compatíveis") : "Ver oportunidades"; }

    var ops = $("#ops-recomendadas");
    if (ops) {
      ops.innerHTML = melhores.length
        ? melhores.map(function (r) { return cartaoOportunidade(r.d, r.pct); }).join("")
        : '<div class="cartao">' + vazio("Nenhuma demanda aberta no momento. Quando uma empresa publicar, ela aparece aqui.") + "</div>";
    }

    var eventos = [];
    minhasCand.forEach(function (c) {
      eventos.push({ data: paraData(c.data), html: atividadeLi("enviar", "icone-roxo", "Interesse enviado", c.demandaTitulo, c.data) });
    });
    validados.forEach(function (d) {
      eventos.push({ data: paraData(d.confirmadoEm || d.criadoEm), html: atividadeLi("checkcirculo", "icone-verde", "Documento validado", d.tipo + " nº " + d.numero, d.confirmadoEm || "") });
    });
    avRecebidas.forEach(function (a) {
      eventos.push({ data: paraData(a.data), html: atividadeLi("estrela", "icone-ambar", "Avaliação recebida", a.autorNome + " · " + virgula(a.nota), a.data) });
    });
    eventos.sort(function (a, b) { return b.data - a.data; });
    var ativ = $("#atividade-recente");
    if (ativ) { ativ.innerHTML = eventos.length ? eventos.slice(0, 4).map(function (e) { return e.html; }).join("") : liVazio("Nenhuma atividade ainda."); }

    var prazos = $("#proximos-prazos");
    if (prazos) {
      var lista = minhasCand.map(function (c) { return demandas.filter(function (d) { return d.id === c.demandaId; })[0]; })
        .filter(function (d) { return d && d.situacao !== "Encerrada" && d.prazo; })
        .sort(function (a, b) { return paraData(a.prazo) - paraData(b.prazo); }).slice(0, 3);
      prazos.innerHTML = lista.length
        ? lista.map(function (d) {
            return '<li class="etapa-analise pendente"><span class="marca-etapa">' + ico("check") + "</span>" +
              esc(d.titulo) + " · propostas até " + esc(d.prazo) + "</li>";
          }).join("")
        : liVazio("Nenhum prazo próximo.");
    }
  }

  // ------------------------------------------------------------------
  // Painel da empresa
  // ------------------------------------------------------------------
  if (pagina === "empresa-inicio.html") {
    var aguardam = recebidas.filter(function (c) { return c.situacao === "enviada" || c.situacao === "visualizada"; }).length;
    var subE = $("#subtitulo-painel");
    if (subE) {
      subE.textContent = hojePorExtenso() + " · " + (aguardam
        ? plural(aguardam, "candidatura aguardando", "candidaturas aguardando") + " a sua resposta."
        : "nenhuma candidatura aguardando resposta.");
    }
    var rec = $("#recomendados-empresa");
    if (rec) {
      if (!minhasAbertas.length) {
        rec.innerHTML = '<div class="cartao">' + vazio("Publique uma demanda para ver aqui os profissionais mais compatíveis com ela.") +
          '<a class="btn btn-sm" href="empresa-publicar.html">Publicar demanda</a></div>';
      } else {
        var melhoresProf = M.profissionais.listar().map(function (p) {
          var melhor = 0;
          minhasAbertas.forEach(function (d) { melhor = Math.max(melhor, compat(p, d)); });
          return { p: p, pct: melhor };
        }).filter(function (r) { return r.pct > 0; }).sort(function (a, b) { return b.pct - a.pct; }).slice(0, 3);
        rec.innerHTML = melhoresProf.length
          ? melhoresProf.map(function (r) { return cartaoProfissional(r.p, r.pct); }).join("")
          : '<div class="cartao">' + vazio("Ainda não há profissionais cadastrados compatíveis com as suas demandas.") + "</div>";
      }
    }
    var ativE = $("#atividade-recente");
    if (ativE) {
      var evE = recebidas.map(function (c) {
        return { data: paraData(c.data), html: atividadeLi("equipe", "icone-roxo", "Candidatura recebida",
          ((c.profissional && c.profissional.nome) || "Profissional") + " · " + c.demandaTitulo, c.data) };
      }).concat(minhasDemandas.map(function (d) {
        return { data: paraData(d.publicadaEm), html: atividadeLi("documento", "", "Demanda publicada", d.titulo, relativo(d.publicadaEm)) };
      })).sort(function (a, b) { return b.data - a.data; });
      ativE.innerHTML = evE.length ? evE.slice(0, 4).map(function (e) { return e.html; }).join("") : liVazio("Nenhuma atividade ainda.");
    }
    var resumo = $("#demandas-abertas-resumo");
    if (resumo) {
      resumo.innerHTML = minhasAbertas.length
        ? minhasAbertas.slice(0, 5).map(function (d) {
            var n = recebidas.filter(function (c) { return c.demandaId === d.id; }).length;
            return '<li class="linha-demanda"><span>' + esc(d.titulo) + "</span><strong>" + n + "</strong></li>";
          }).join("")
        : liVazio("Nenhuma demanda aberta.");
    }
  }

  // ------------------------------------------------------------------
  // Meu perfil (profissional) e perfil da empresa
  // ------------------------------------------------------------------
  if (pagina === "perfil.html" || pagina === "empresa-perfil.html") {
    var textoSobre = String(eu.sobre || "").trim();
    todos('[data-conta="sobre"]').forEach(function (el) {
      if (!textoSobre) {
        el.textContent = pagina === "perfil.html"
          ? "Você ainda não escreveu uma apresentação. Use Editar perfil."
          : "A empresa ainda não escreveu uma apresentação. Use Editar perfil.";
      }
    });
    preencher("resumo-avaliacoes", avRecebidas.length
      ? virgula(mediaRecebida) + " em " + plural(avRecebidas.length, "avaliação", "avaliações") : "Sem avaliações", true);
    preencher("nota", avRecebidas.length ? virgula(mediaRecebida) : "–", true);
    var verificado = !!eu.verificado;
    preencher("verificado-titulo", verificado
      ? (pagina === "perfil.html" ? "Perfil verificado" : "Empresa verificada")
      : (eu.tipoConta === "contratante" ? "Contratante sem registro no Crea" : "Registro não verificado"), true);
    preencher("verificado-texto", verificado
      ? (pagina === "perfil.html" ? "Registro conferido junto ao Crea" : "CNPJ e registro conferidos junto ao Crea")
      : "Sem confirmação do Crea, o perfil não recebe o selo de verificado.", true);
    todos('[data-conta="faixa-verificado"]').forEach(function (el) { el.classList.toggle("faixa-pendente", !verificado); });
    var situacao = eu.situacao || (verificado ? "Ativo" : (eu.tipoConta === "contratante" ? "Sem registro" : "Não verificado"));
    todos('[data-conta="situacao"]').forEach(function (el) {
      el.textContent = situacao;
      el.className = "etiqueta " + (/ativ/i.test(situacao) ? "etiqueta-verde" : "etiqueta-ambar");
    });
  }

  if (pagina === "perfil.html") {
    preencher("titulo", eu.titulo || "Não informado", true);
    preencher("especialidades", competencias.length
      ? competencias.map(function (c) { return '<span class="etiqueta">' + esc(c) + "</span>"; }).join("")
      : vazio("Nenhuma especialidade informada ainda."));
    preencher("n-documentos", String(validados.length), true);
    preencher("n-projetos", String(projetos.length), true);
    preencher("projetos", projetos.length
      ? projetos.slice(0, 4).map(function (p) {
          return '<li><div class="item-atividade"><span class="icone">' + ico("predio") + "</span><span>" +
            "<strong>" + esc(p.nome) + "</strong><span>" + esc([p.area, p.situacao, p.periodo].filter(Boolean).join(" · ")) + "</span>" +
            '<p style="font-size:13.5px; color:var(--tinta-2); margin-top:6px">' + esc(p.descricao || "") + "</p></span></div></li>";
        }).join("")
      : liVazio("Nenhum projeto no portfólio ainda."));
    var cidade = eu.cidadeExibicao || [eu.cidade, eu.uf].filter(Boolean).join(", ");
    var itens = [];
    if (cidade) { itens.push("Atende " + cidade); }
    if (meuProf && meuProf.atendeEstado) { itens.push("Atende todo o estado"); }
    preencher("atendimento", itens.length
      ? itens.map(function (t) { return '<li class="etapa-analise"><span class="marca-etapa">' + ico("check") + "</span>" + esc(t) + "</li>"; }).join("")
      : liVazio("Informe a cidade onde atua em Editar perfil."));
  }

  if (pagina === "empresa-perfil.html") {
    var contratacoes = minhasDemandas.filter(function (d) { return /pela plataforma/i.test(d.desfecho || ""); }).length;
    preencher("resumo-contratacoes", contratacoes ? plural(contratacoes, "contratação pelo ProLink", "contratações pelo ProLink") : "Nenhuma contratação ainda", true);
    preencher("n-contratacoes", String(contratacoes), true);
    preencher("n-demandas", String(minhasAbertas.length), true);
    var areasEmp = eu.areasAtuacao || [];
    preencher("atividade-empresa", (areasEmp.length ? areasEmp.slice(0, 2).join(" e ") : (eu.areaAtuacao || "")) + (eu.registro || eu.verificado ? " · " : ""), true);
    preencher("cnpj", eu.documento || "–", true);
    var resp = eu.responsavelTecnico;
    preencher("responsavel", resp
      ? '<div style="display:flex; align-items:center; gap:12px"><span class="avatar avatar-md">' +
        esc(resp.split(/\s+/).map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase()) +
        '</span><div><strong style="display:block">' + esc(resp) + "</strong></div></div>"
      : vazio(eu.tipoConta === "contratante" ? "Contratante sem registro não tem responsável técnico." : "Responsável técnico não informado."));
  }

  // ------------------------------------------------------------------
  // Avaliações
  // ------------------------------------------------------------------
  if (pagina === "avaliacoes.html" || pagina === "empresa-avaliacoes.html") {
    preencher("nota", avRecebidas.length ? virgula(mediaRecebida) : "–", true);
    preencher("estrelas", estrelas(mediaRecebida));
    preencher("base-nota", avRecebidas.length ? "Baseado em " + plural(avRecebidas.length, "avaliação", "avaliações") : "Nenhuma avaliação ainda", true);
    preencher("verificadas", avRecebidas.length ? plural(avRecebidas.length, "avaliação verificada", "avaliações verificadas") : "Nenhuma avaliação ainda", true);
    var dist = [5, 4, 3, 2, 1].map(function (n) {
      var qtd = avRecebidas.filter(function (a) { return Math.round(Number(a.nota)) === n; }).length;
      var pct = avRecebidas.length ? Math.round(qtd / avRecebidas.length * 100) : 0;
      return '<div class="linha-distribuicao"><span>' + n + (n === 1 ? " estrela" : " estrelas") +
        '</span><span class="barra-dist"><span style="width:' + pct + '%"></span></span><span>' + qtd + "</span></div>";
    }).join("");
    preencher("distribuicao", dist);
    var somas = {}, contagem = {}, ordem = [];
    avRecebidas.forEach(function (a) {
      (a.criterios || []).forEach(function (c) {
        if (!(c.rotulo in somas)) { somas[c.rotulo] = 0; contagem[c.rotulo] = 0; ordem.push(c.rotulo); }
        somas[c.rotulo] += Number(c.nota) || 0;
        contagem[c.rotulo] += 1;
      });
    });
    preencher("criterios", ordem.length
      ? ordem.map(function (r) { var m = somas[r] / contagem[r]; return barra(r, virgula(m), m / 5); }).join("")
      : vazio("As notas por critério aparecem depois da primeira avaliação recebida."));
  }

  // ------------------------------------------------------------------
  // Painel administrativo
  // ------------------------------------------------------------------
  if (pagina === "admin-inicio.html") {
    var usuarios = M.usuarios.listar();
    var perfisTab = $("#admin-perfis");
    if (perfisTab) {
      var grupos = [["profissional", "Profissional"], ["empresa", "Empresa registrada"],
                    ["contratante", "Contratante sem registro"], ["admin", "Administrador"]];
      perfisTab.innerHTML = '<div class="tabela-rolagem"><table class="tabela-admin"><thead><tr><th>Perfil</th><th>Usuários</th>' +
        "<th>Verificados</th><th>Bloqueados</th></tr></thead><tbody>" + grupos.map(function (g) {
          var doGrupo = usuarios.filter(function (u) { return u.tipoConta === g[0]; });
          return "<tr><td>" + g[1] + "</td><td>" + doGrupo.length + "</td><td>" +
            doGrupo.filter(function (u) { return u.verificado; }).length + "</td><td>" +
            doGrupo.filter(function (u) { return u.situacaoConta === "Bloqueado"; }).length + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    var hoje = new Date();
    var mes = hoje.getMonth(), ano = hoje.getFullYear();
    function doMes(texto) { var d = paraData(texto); return d.getMonth() === mes && d.getFullYear() === ano; }
    var periodo = $("#admin-periodo");
    if (periodo) {
      periodo.textContent = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, function (c) { return c.toUpperCase(); }) +
        ", até o dia " + hoje.getDate() + ".";
    }
    var novos = usuarios.filter(function (u) { return doMes(u.criadoEm); });
    var novosVerif = novos.filter(function (u) { return u.verificado; }).length;
    var publicadas = demandas.filter(function (d) { return doMes(d.publicadaEm); });
    var cands = candidaturas.filter(function (c) { return publicadas.some(function (d) { return d.id === c.demandaId; }); }).length;
    var den = M.denuncias.listar();
    var resolvidas = den.filter(function (d) { return d.situacao !== "Na fila"; }).length;
    var ind = $("#admin-indicadores");
    if (ind) {
      ind.innerHTML = [
        barra("Cadastros novos", String(novos.length), usuarios.length ? novos.length / usuarios.length : 0),
        barra("Registros verificados no mês", String(novosVerif), novos.length ? novosVerif / novos.length : 0),
        barra("Demandas publicadas", String(publicadas.length), demandas.length ? publicadas.length / demandas.length : 0),
        barra("Denúncias resolvidas", resolvidas + " de " + den.length, den.length ? resolvidas / den.length : 0)
      ].join("") + '<p class="dica" style="grid-column:1/-1">' + (publicadas.length
        ? "Média de " + virgula(cands / publicadas.length) + " candidaturas por demanda publicada no mês." : "Nenhuma demanda publicada no mês.") + "</p>";
    }
    var evAdm = $("#admin-eventos");
    if (evAdm) {
      var ultimos = M.auditoria.listar().sort(function (a, b) { return paraData(b.data) - paraData(a.data); }).slice(0, 5);
      evAdm.innerHTML = ultimos.length ? ultimos.map(function (a) {
        return atividadeLi(/den[uú]ncia/i.test(a.acao) ? "sino" : (/bloqueio/i.test(a.acao) ? "equipe" : "documento"),
          /den[uú]ncia/i.test(a.acao) ? "icone-ambar" : "", a.acao, a.alvo, relativo(a.data));
      }).join("") : liVazio("Nenhum evento registrado ainda.");
    }
  }

  // ------------------------------------------------------------------
  // Contagens das buscas
  // ------------------------------------------------------------------
  if (pagina === "empresa-profissionais.html") {
    var subB = $("#subtitulo-busca");
    var total = M.profissionais.listar().length;
    var ativos = M.profissionais.listar().filter(function (p) { return p.verificado; }).length;
    if (subB) {
      subB.textContent = total
        ? plural(total, "profissional cadastrado", "profissionais cadastrados") + ", " + plural(ativos, "com registro verificado", "com registro verificado") + "."
        : "Ainda não há profissionais cadastrados na plataforma.";
    }
  }
})(window, document);
