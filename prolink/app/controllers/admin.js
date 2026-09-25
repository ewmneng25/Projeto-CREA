/* ============================================================
   ProLink — controller: usuários, trilha de auditoria e denúncias
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

  /* ---------------- Admin: usuários ---------------- */
  if (pagina === "admin-usuarios.html") {
    var corpoUsuarios = document.querySelector("table.tabela-admin tbody");
    var PERFIL = { profissional: "Profissional", empresa: "Empresa", contratante: "Terceiro", admin: "Administrador" };
    var CLASSE_CONTA = { "Verificado": "etiqueta-verde", "Não verificado": "etiqueta-ambar", "Bloqueado": "etiqueta-ambar",
                         "Sem registro": "etiqueta-neutra", "Encerrada": "etiqueta-neutra" };
    var usuarios = ProLinkModelos.usuarios.listar().filter(function (u) { return u.tipoConta !== "visitante"; });
    corpoUsuarios.innerHTML = usuarios.map(function (u) {
      var situacao = u.situacaoConta || (u.verificado ? "Verificado" : "Não verificado");
      var partes = String(u.nome || "").split(/\s+/);
      var iniciais = (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : "")).toUpperCase();
      var registro = u.registroExibicao || (u.registro ? "CREA-" + (u.ufRegistro || "AM") + " " + u.registro : "—");
      var cadastro = u.cadastroEm || (u.criadoEm ? u.criadoEm.slice(0, 10).split("-").reverse().join("/") : "—");
      return '<tr data-usuario-id="' + esc(u.id) + '"><td><span class="celula-pessoa"><span class="avatar avatar-sm ' +
        esc(u.corAvatar || (u.tipoConta === "profissional" ? "" : "avatar-empresa")) + '">' + esc(iniciais) + "</span>" +
        "<span><strong>" + esc(u.nome) + '</strong><span class="dica">' + esc(u.email) + "</span></span></span></td>" +
        "<td>" + esc(PERFIL[u.tipoConta] || u.tipoConta) + '</td><td><span class="etiqueta ' + (CLASSE_CONTA[situacao] || "") + '">' +
        esc(situacao) + "</span></td><td>" + esc(registro) + "</td><td>" + esc(cadastro) + "</td>" +
        '<td><button class="btn btn-secundario btn-sm" type="button">' + (situacao === "Bloqueado" ? "Desbloquear" : "Bloquear") +
        "</button></td></tr>";
    }).join("");
    var subUsuarios = document.querySelector(".pagina-cabecalho p");
    if (subUsuarios) {
      subUsuarios.textContent = usuarios.length + " contas em dados/usuarios.csv. Bloqueio é reversível e fica registrado na trilha de auditoria.";
    }
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

  /* ---------------- Admin: trilha de auditoria ---------------- */
  if (pagina === "admin-auditoria.html") {
    var corpoAud = document.querySelector("table.tabela-admin tbody");
    var CLASSE_ACAO = { "Bloqueio": "etiqueta-ambar", "Conteúdo removido": "etiqueta-ambar", "Encerramento de conta": "etiqueta-ambar",
                        "Desbloqueio": "etiqueta-verde", "Cadastro": "etiqueta-verde", "Denúncia mantida": "etiqueta-verde",
                        "Denúncia registrada": "etiqueta-roxa", "Publicação de demanda": "etiqueta-roxa" };
    corpoAud.innerHTML = ProLinkModelos.auditoria.listar()
      .sort(function (a, b) { return paraData(b.data) - paraData(a.data) || String(b.id).localeCompare(String(a.id)); })
      .map(function (r) {
        return "<tr><td>" + esc(r.data) + '</td><td><span class="etiqueta ' + (CLASSE_ACAO[r.acao] || "") + '">' + esc(r.acao) +
          "</span></td><td>" + esc(r.autor) + "</td><td>" + esc(r.alvo) + '</td><td><span class="dica">' + esc(r.origem) + "</span></td></tr>";
      }).join("");
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

  /* ---------------- Admin: denúncias ---------------- */
  if (pagina === "admin-denuncias.html") {
    var modelo = document.querySelector(".denuncia-card");
    var gradeDen = modelo.parentNode;
    var icAlvo = icone(".denuncia-card .meta svg");
    var denuncias = ProLinkModelos.denuncias.listar().sort(function (a, b) { return String(b.criadoEm).localeCompare(String(a.criadoEm)); });
    gradeDen.innerHTML = denuncias.map(function (d) {
      var resolvida = d.situacao !== "Na fila";
      return '<article class="cartao denuncia-card" data-denuncia-id="' + esc(d.id) + '"' + (resolvida ? ' data-categoria="resolvida"' : "") + ">" +
        '<div class="denuncia-topo"><div><span class="dica">Protocolo ' + esc(d.protocolo) + " · " + esc(d.recebida || "") + "</span>" +
        '<h3 style="margin:6px 0 4px">' + esc(d.titulo) + "</h3>" +
        '<span class="meta">' + icAlvo + " " + esc(d.alvo) + " · denunciado por " + esc(d.denunciante) + "</span></div>" +
        '<span class="etiqueta ' + (resolvida ? (d.decisao === "removido" ? "etiqueta-ambar" : "etiqueta-verde") : "etiqueta-neutra") + '">' +
        esc(resolvida ? d.situacao : "Na fila") + "</span></div>" +
        '<p class="denuncia-motivo">' + esc(d.motivo) + "</p>" +
        '<div class="denuncia-acoes">' + (resolvida
          ? '<span class="dica">Decidido em ' + esc(d.decididaEm || "") + ": " + esc(d.fundamento || "") + "</span>"
          : '<button class="btn btn-sm" type="button">Manter conteúdo</button>' +
            '<button class="btn btn-secundario btn-sm" type="button">Remover conteúdo</button>' +
            '<button class="btn btn-secundario btn-sm" type="button" data-bloquear-autor>Bloquear autor</button>') +
        '<a class="btn btn-fantasma btn-sm" href="admin-auditoria.html">Ver histórico</a></div></article>';
    }).join("");
  }

})(window, document);

/* ==================================================================
   8. PAINEL ADMINISTRATIVO
   Toda decisão tomada aqui entra na trilha de auditoria local, que a
   tela de auditoria mostra junto dos registros fixos.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  if (!U) { return; }
  var normalizar = U.normalizar;
  var pagina = U.paginaAtual();

  function tabelaDaPagina() { return document.querySelector("table.tabela-admin"); }
  function linhasVisiveis(tabela) {
    return Array.prototype.filter.call(tabela.querySelectorAll("tbody tr"), function (tr) {
      return !tr.hidden && !tr.classList.contains("linha-vazia");
    });
  }

  function mensagemVazia(tabela, vazia, texto) {
    var corpo = tabela.querySelector("tbody");
    var linha = corpo.querySelector(".linha-vazia");
    if (vazia && !linha) {
      linha = document.createElement("tr");
      linha.className = "linha-vazia";
      linha.innerHTML = '<td colspan="' + tabela.querySelectorAll("thead th").length +
                        '" class="dica" style="text-align:center; padding:22px">' + texto + "</td>";
      corpo.appendChild(linha);
    } else if (!vazia && linha) {
      linha.remove();
    }
  }

  /* ---------------- Usuários ---------------- */
  if (pagina === "admin-usuarios.html") {
    var tabelaUsuarios = tabelaDaPagina();
    var campoBusca = document.getElementById("busca-usuario");
    var filtroPerfil = document.getElementById("filtro-perfil");
    var filtroSituacao = document.getElementById("filtro-situacao");

    var filtrarUsuarios = function () {
      var termo = normalizar(campoBusca.value);
      var perfil = normalizar(filtroPerfil.value);
      var situacao = normalizar(filtroSituacao.value);
      var total = 0;
      tabelaUsuarios.querySelectorAll("tbody tr:not(.linha-vazia)").forEach(function (tr) {
        var celulas = tr.children;
        var ok = (!termo || normalizar(celulas[0].textContent).indexOf(termo) !== -1) &&
                 (perfil === "todos" || normalizar(celulas[1].textContent) === perfil) &&
                 (situacao === "todas" || normalizar(celulas[2].textContent) === situacao);
        tr.hidden = !ok;
        if (ok) { total += 1; }
      });
      mensagemVazia(tabelaUsuarios, !total, "Nenhum usuário com esses filtros.");
      return total;
    };

    U.botaoPorTexto("Filtrar").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var total = filtrarUsuarios();
        U.avisar(total + (total === 1 ? " usuário encontrado." : " usuários encontrados."));
      });
    });
    campoBusca.addEventListener("input", filtrarUsuarios);
    filtroPerfil.addEventListener("change", filtrarUsuarios);
    filtroSituacao.addEventListener("change", filtrarUsuarios);
    if (U.parametro("q")) { campoBusca.value = U.parametro("q"); filtrarUsuarios(); }

    /* Bloquear e desbloquear mudam a linha de verdade. O botão do prolink.js
       só trocava o texto; aqui ele é substituído. */
    var ligarAcao = function (botao) {
      botao.addEventListener("click", function () {
        var linha = botao.closest("tr");
        var usuarioId = linha.dataset.usuarioId;
        var nome = (linha.querySelector("strong") || {}).textContent || "usuário";
        var etiqueta = linha.children[2].querySelector(".etiqueta");
        var bloqueado = normalizar(etiqueta.textContent) === "bloqueado";

        U.dialogo({
          titulo: bloqueado ? "Desbloquear " + nome : "Bloquear " + nome,
          texto: bloqueado
            ? "A conta volta a acessar a plataforma. A decisão fica na trilha de auditoria."
            : "A conta perde o acesso até ser desbloqueada. A ação é reversível e fica na trilha de auditoria.",
          corpo: '<div class="campo"><label for="motivo-acao">Motivo</label>' +
                 '<textarea id="motivo-acao" placeholder="Registre o motivo da decisão."></textarea></div>',
          confirmar: bloqueado ? "Desbloquear" : "Bloquear",
          aoConfirmar: function (caixa) {
            var motivo = caixa.querySelector("#motivo-acao").value.trim();
            if (motivo.length < 5) { caixa.erro("Descreva o motivo em poucas palavras."); return false; }
            var registro = ProLinkModelos.usuarios.buscar(usuarioId) || {};
            if (bloqueado) {
              var anterior = registro.situacaoAntesDoBloqueio || (registro.verificado ? "Verificado" : "Não verificado");
              ProLinkModelos.usuarios.atualizar(usuarioId, { situacaoConta: anterior, motivoBloqueio: "" });
              etiqueta.textContent = anterior;
              etiqueta.className = "etiqueta " + (anterior === "Verificado" ? "etiqueta-verde" : "etiqueta-ambar");
              botao.textContent = "Bloquear";
              botao.className = "btn btn-fantasma btn-sm";
            } else {
              ProLinkModelos.usuarios.atualizar(usuarioId, {
                situacaoConta: "Bloqueado", situacaoAntesDoBloqueio: etiqueta.textContent.trim(), motivoBloqueio: motivo
              });
              etiqueta.textContent = "Bloqueado";
              etiqueta.className = "etiqueta etiqueta-ambar";
              botao.textContent = "Desbloquear";
              botao.className = "btn btn-secundario btn-sm";
            }
            U.registrarAuditoria(bloqueado ? "Desbloqueio" : "Bloqueio", nome + " · " + motivo);
            U.avisar((bloqueado ? "Conta desbloqueada: " : "Conta bloqueada: ") + U.escapar(nome) +
                     ". <a class='link' href='admin-auditoria.html'>Ver na trilha</a>", "ok");
            filtrarUsuarios();
          }
        });
      });
    };
    tabelaUsuarios.querySelectorAll("tbody td:last-child button").forEach(ligarAcao);

    U.botaoPorTexto("Exportar relatório").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var linhas = linhasVisiveis(tabelaUsuarios);
        U.baixar("prolink-usuarios.csv", U.tabelaParaCsv(tabelaUsuarios, linhas), "text/csv;charset=utf-8");
        U.registrarAuditoria("Exportação", "Relatório de usuários (" + linhas.length + " linhas)");
        U.avisar("Relatório exportado com " + linhas.length + " usuários (os filtrados na tela).", "ok");
      });
    });
  }

  /* ---------------- Trilha de auditoria ---------------- */
  if (pagina === "admin-auditoria.html") {
    var tabelaAud = tabelaDaPagina();
    var corpoAud = tabelaAud.querySelector("tbody");

    var paraData = function (texto) {
      var m = String(texto).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
    };
    var campos = ["aud-de", "aud-ate", "aud-acao", "aud-autor"].map(function (id) { return document.getElementById(id); });

    var filtrarAuditoria = function () {
      var de = campos[0].value, ate = campos[1].value;
      var acao = normalizar(campos[2].value), autor = normalizar(campos[3].value);
      var total = 0;
      corpoAud.querySelectorAll("tr:not(.linha-vazia)").forEach(function (tr) {
        var data = paraData(tr.children[0].textContent);
        var ok = (!de || data >= de) && (!ate || data <= ate) &&
                 (acao === "todas" || normalizar(tr.children[1].textContent) === acao) &&
                 (!autor || normalizar(tr.children[2].textContent).indexOf(autor) !== -1);
        tr.hidden = !ok;
        if (ok) { total += 1; }
      });
      mensagemVazia(tabelaAud, !total, "Nenhum registro no período e filtros escolhidos.");
    };
    campos.forEach(function (c) {
      if (!c) { return; }
      c.addEventListener("input", filtrarAuditoria);
      c.addEventListener("change", filtrarAuditoria);
    });

    U.botaoPorTexto("Exportar período").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var linhas = linhasVisiveis(tabelaAud);
        if (!linhas.length) { U.avisar("Não há registros para exportar com esses filtros.", "atencao"); return; }
        U.baixar("prolink-auditoria.csv", U.tabelaParaCsv(tabelaAud, linhas), "text/csv;charset=utf-8");
        U.avisar("Período exportado: " + linhas.length + " registros.", "ok");
      });
    });
  }

  /* ---------------- Denúncias ---------------- */
  if (pagina === "admin-denuncias.html") {
    var atualizarFila = function () {
      var naFila = ProLinkModelos.denuncias.listar({ situacao: "Na fila" }).length;
      var contadorFila = document.querySelector(".abas .aba-filtro .nav-contador");
      if (contadorFila) { contadorFila.textContent = naFila; contadorFila.hidden = !naFila; }
      var navDenuncias = document.querySelector('.nav a[href="admin-denuncias.html"] .nav-contador');
      if (navDenuncias) { navDenuncias.textContent = naFila; navDenuncias.hidden = !naFila; }
    };

    var decidir = function (card, manter) {
      var titulo = card.querySelector("h3").textContent.trim();
      var protocolo = (card.querySelector(".dica").textContent.match(/\d{4}\/\d{4}/) || [""])[0];
      U.dialogo({
        titulo: manter ? "Manter conteúdo" : "Remover conteúdo",
        texto: (manter
          ? "A denúncia é encerrada e o conteúdo continua publicado."
          : "O conteúdo sai do ar por exclusão lógica e pode ser restaurado.") +
          " A decisão fica registrada com seu nome, data e motivo.",
        corpo: '<div class="campo"><label for="motivo-decisao">Fundamento da decisão</label>' +
               '<textarea id="motivo-decisao" placeholder="Ex.: acervo conferido no Crea, informação procede."></textarea></div>',
        confirmar: manter ? "Manter e encerrar" : "Remover e encerrar",
        aoConfirmar: function (caixa) {
          var motivo = caixa.querySelector("#motivo-decisao").value.trim();
          if (motivo.length < 5) { caixa.erro("Registre o fundamento da decisão."); return false; }
          var etiqueta = card.querySelector(".denuncia-topo > .etiqueta");
          ProLinkModelos.denuncias.atualizar(card.dataset.denunciaId, {
            situacao: manter ? "Resolvida · conteúdo mantido" : "Resolvida · conteúdo removido",
            decisao: manter ? "mantido" : "removido", fundamento: motivo, decididaEm: U.agora()
          });
          etiqueta.textContent = manter ? "Resolvida · conteúdo mantido" : "Resolvida · conteúdo removido";
          etiqueta.className = "etiqueta " + (manter ? "etiqueta-verde" : "etiqueta-ambar");
          card.dataset.categoria = "resolvida";
          var acoes = card.querySelector(".denuncia-acoes");
          acoes.innerHTML = '<span class="dica">Decidido em ' + U.agora() + ": " + U.escapar(motivo) + "</span>" +
            '<a class="btn btn-fantasma btn-sm" href="admin-auditoria.html">Ver histórico</a>';
          U.registrarAuditoria(manter ? "Denúncia mantida" : "Conteúdo removido",
                               "Protocolo " + protocolo + " · " + titulo);
          atualizarFila();
          U.avisar("Denúncia " + protocolo + " resolvida. Ela agora aparece em Resolvidas.", "ok");
          if (U.reaplicarAbas) { U.reaplicarAbas(); }
        }
      });
    };

    document.querySelectorAll(".denuncia-card").forEach(function (card) {
      U.botaoPorTexto("Manter conteúdo", card).forEach(function (b) {
        b.addEventListener("click", function () { decidir(card, true); });
      });
      U.botaoPorTexto("Remover conteúdo", card).forEach(function (b) {
        b.addEventListener("click", function () { decidir(card, false); });
      });
      card.querySelectorAll("[data-bloquear-autor]").forEach(function (b) {
        b.addEventListener("click", function () {
          var den = ProLinkModelos.denuncias.buscar(card.dataset.denunciaId);
          var autor = ProLinkModelos.usuarios.listar().filter(function (u) {
            return U.normalizar(u.nome) === U.normalizar(den.alvo);
          })[0];
          if (!autor) {
            U.avisar("O alvo desta denúncia (" + U.escapar(den.alvo) + ") não é uma conta da base.", "atencao");
            return;
          }
          U.dialogo({
            titulo: "Bloquear " + autor.nome,
            texto: "A conta perde o acesso até ser desbloqueada em Usuários. A decisão fica na trilha de auditoria.",
            confirmar: "Bloquear conta",
            aoConfirmar: function () {
              ProLinkModelos.usuarios.atualizar(autor.id, {
                situacaoConta: "Bloqueado", situacaoAntesDoBloqueio: autor.situacaoConta || "",
                motivoBloqueio: "Denúncia " + den.protocolo
              });
              U.registrarAuditoria("Bloqueio", autor.nome + " · denúncia " + den.protocolo);
              b.disabled = true;
              b.textContent = "Autor bloqueado";
              U.avisar(U.escapar(autor.nome) + " bloqueado. <a class='link' href='admin-usuarios.html'>Ver em Usuários</a>", "ok");
            }
          });
        });
      });
    });
  }
})(window, document);
