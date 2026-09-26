/* ============================================================
   ProLink — controller: editar perfil, perfil da empresa e e-mail de contato
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
     Editar perfil (perfil.html): abre um modal simples, preenche com o que
     já está salvo (ou com o texto atual da tela) e grava de volta no mesmo
     cadastro em dados/usuarios.csv.
     ----------------------------------------------------------------------- */
  var modalPerfil = document.getElementById("modal-editar-perfil");
  if (modalPerfil) {
    var botaoAbrirEdicao = document.getElementById("abrir-editar-perfil");
    var botaoFecharEdicao = document.getElementById("fechar-editar-perfil");
    var botaoCancelarEdicao = document.getElementById("cancelar-editar-perfil");
    var botaoSalvarEdicao = document.getElementById("salvar-editar-perfil");

    var campoEditarNome = document.getElementById("editar-nome");
    var campoEditarTitulo = document.getElementById("editar-titulo");
    var campoEditarCidade = document.getElementById("editar-cidade");
    var campoEditarSobre = document.getElementById("editar-sobre");

    function textoAtualDoCampo(nomeCampo, alternativa) {
      var elemento = document.querySelector('[data-usuario-campo="' + nomeCampo + '"]');
      var texto = elemento ? elemento.textContent.trim() : "";
      return texto || alternativa || "";
    }

    function abrirModalPerfil() {
      var dados = lerUsuarioSalvo() || {};
      campoEditarNome.value = dados.nome || textoAtualDoCampo("nome", "");
      campoEditarTitulo.value = dados.titulo || textoAtualDoCampo("titulo", "");
      campoEditarCidade.value = dados.cidadeExibicao || dados.cidade || textoAtualDoCampo("cidade", "");
      campoEditarSobre.value = dados.sobre || textoAtualDoCampo("sobre", "");
      modalPerfil.hidden = false;
      campoEditarNome.focus();
    }

    function fecharModalPerfil() {
      modalPerfil.hidden = true;
    }

    if (botaoAbrirEdicao) { botaoAbrirEdicao.addEventListener("click", abrirModalPerfil); }
    if (botaoFecharEdicao) { botaoFecharEdicao.addEventListener("click", fecharModalPerfil); }
    if (botaoCancelarEdicao) { botaoCancelarEdicao.addEventListener("click", fecharModalPerfil); }

    modalPerfil.addEventListener("click", function (evento) {
      if (evento.target === modalPerfil) { fecharModalPerfil(); }
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && !modalPerfil.hidden) { fecharModalPerfil(); }
    });

    if (botaoSalvarEdicao) {
      botaoSalvarEdicao.addEventListener("click", function () {
        var novoNome = campoEditarNome.value.trim();
        if (!novoNome) {
          alert("O nome não pode ficar em branco.");
          campoEditarNome.focus();
          return;
        }

        var dados = lerUsuarioSalvo() || {};
        dados.nome = novoNome;
        dados.titulo = campoEditarTitulo.value.trim();
        dados.cidadeExibicao = campoEditarCidade.value.trim();
        dados.sobre = campoEditarSobre.value.trim();

        salvarUsuario(dados);
        aplicarUsuarioNaTela();
        fecharModalPerfil();
      });
    }
  }

})();

/* ==================================================================
   11. PERFIL DA EMPRESA: EDITAR
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var botao = document.getElementById("abrir-editar-empresa");
  if (!U || !botao) { return; }

  botao.addEventListener("click", function () {
    var dados = U.sessao();
    var sobreAtual = (document.querySelector('[data-usuario-campo="sobre"]') || {}).textContent || "";
    U.dialogo({
      titulo: "Editar perfil da empresa",
      texto: "Razão social, CNPJ e registro vêm do Crea e não se editam aqui.",
      corpo:
        '<div class="campo"><label for="ee-nome">Nome de exibição</label><input id="ee-nome" type="text" maxlength="80" value="' +
          U.escapar(dados.fantasia || dados.nome || "") + '"></div>' +
        '<div class="campo"><label for="ee-cidade">Cidade</label><input id="ee-cidade" type="text" maxlength="60" value="' +
          U.escapar(dados.cidadeExibicao || "Manaus, AM") + '"></div>' +
        '<div class="campo"><label for="ee-sobre">Sobre a empresa</label><textarea id="ee-sobre" maxlength="600">' +
          U.escapar(dados.sobre || sobreAtual.trim()) + "</textarea></div>",
      confirmar: "Salvar alterações",
      aoConfirmar: function (caixa) {
        var nome = caixa.querySelector("#ee-nome").value.trim();
        if (nome.length < 2) { caixa.erro("Informe o nome de exibição."); return false; }
        var atualizado = ProLinkModelos.usuarios.atualizar(U.sessao().id, {
          nome: nome,
          cidadeExibicao: caixa.querySelector("#ee-cidade").value.trim(),
          sobre: caixa.querySelector("#ee-sobre").value.trim()
        });
        if (!atualizado) { caixa.erro("Não foi possível gravar na base."); return false; }
        ProLinkModelos.auditoria.registrar("Alteração de perfil", atualizado.nome);
        var partes = nome.split(/\s+/);
        var iniciais = (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : "")).toUpperCase();
        document.querySelectorAll('[data-usuario-campo="nome"]').forEach(function (e) { e.textContent = nome; });
        document.querySelectorAll('[data-usuario-campo="iniciais"]').forEach(function (e) { e.textContent = iniciais; });
        document.querySelectorAll('[data-usuario-campo="sobre"]').forEach(function (e) { e.textContent = atualizado.sobre; });
        var cidade = document.querySelector(".perfil-identidade .meta");
        if (cidade && atualizado.cidadeExibicao) {
          cidade.lastChild.textContent = " " + atualizado.cidadeExibicao;
        }
        U.avisar("Perfil da empresa atualizado.", "ok");
      }
    });
  });
})(window, document);
/* ==================================================================
   12. E-MAIL DE CONTATO NO PERFIL
   O e-mail não é login nem recebe código: é informação do perfil.
   No perfil da própria conta ele sempre aparece, com o aviso de quem
   mais consegue vê-lo (Privacidade e dados decide o perfil público).
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var Banco = window.ProLinkBanco;
  var pagina = U ? U.paginaAtual() : "";
  if (!U || !Banco || (pagina !== "perfil.html" && pagina !== "empresa-perfil.html")) { return; }

  var usuario = ProLinkModelos.sessao.atual() || {};
  var colunas = document.querySelectorAll(".grade-principal > div");
  var lateral = colunas[colunas.length - 1];
  if (!lateral) { return; }

  var ehProfissional = pagina === "perfil.html";
  var privacidade = window.ProLinkDemandas && ehProfissional ? window.ProLinkDemandas.lerPrivacidade() : null;
  var visibilidade = !ehProfissional
    ? "Aparece no perfil público da empresa."
    : (privacidade && privacidade.email
        ? "Visível no seu perfil público."
        : "Oculto no perfil público. <a class='link' href='privacidade.html'>Mudar</a>");

  var cartao = document.createElement("div");
  cartao.className = "cartao";
  cartao.style.marginBottom = "20px";
  cartao.innerHTML = '<h3 style="margin-bottom:12px">Contato</h3>' +
    '<ul style="display:grid; gap:12px; font-size:14px"><li style="display:flex; justify-content:space-between; gap:12px">' +
    '<span style="color:var(--tinta-2)">E-mail</span><strong style="word-break:break-all">' +
    U.escapar(usuario.email || "Não informado") + "</strong></li></ul>" +
    '<p class="dica" style="margin-top:10px">' + visibilidade +
    ' <a class="link" href="' + (ehProfissional ? "configuracoes.html" : "empresa-configuracoes.html") + '#conta">Editar</a></p>';
  lateral.insertBefore(cartao, lateral.firstChild);
})(window, document);

/* ==================================================================
   PERFIL DA EMPRESA: logotipo, áreas de atuação, obras executadas e
   certificações e documentos — tudo lido e gravado nos models.
   ================================================================== */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  var M = window.ProLinkModelos;
  var App = window.ProLink;
  if (!U || !M || U.paginaAtual() !== "empresa-perfil.html") { return; }
  var esc = U.escapar;
  var conta = M.sessao.atual();
  if (!conta || conta.visitante) { return; }

  var CATEGORIAS_DOC = {
    certificacao: "Certificação (ISO, PBQP-H…)",
    apresentacao: "Apresentação institucional",
    estrutura: "Estrutura disponível (equipamentos, frota)",
    licenca: "Licença ou alvará da atividade"
  };

  function cartaoPorTitulo(texto) {
    return Array.prototype.filter.call(document.querySelectorAll(".cartao"), function (c) {
      var h2 = c.querySelector("h2");
      return h2 && U.normalizar(h2.textContent) === U.normalizar(texto);
    })[0];
  }

  function escolherArquivos(aceita, multiplo) {
    return new Promise(function (resolve) {
      var entrada = document.createElement("input");
      entrada.type = "file"; entrada.accept = aceita; entrada.multiple = !!multiplo; entrada.hidden = true;
      document.body.appendChild(entrada);
      entrada.addEventListener("change", function () {
        var lista = Array.prototype.slice.call(entrada.files).filter(function (a) { return a.size <= 10 * 1024 * 1024; });
        entrada.remove(); resolve(lista);
      });
      entrada.click();
    });
  }

  /* ---------------- logotipo ---------------- */
  function aplicarLogo() {
    var atual = M.usuarios.buscar(conta.id) || conta;
    if (!atual.logotipo) { return; }
    document.querySelectorAll(".perfil-cabecalho .avatar, .usuario-topbar .avatar").forEach(function (avatar) {
      avatar.innerHTML = '<img src="' + esc(atual.logotipo) + '" alt="Logotipo de ' + esc(atual.nome) + '">';
      avatar.classList.add("avatar-com-logo");
    });
  }
  aplicarLogo();
  var acoes = document.querySelector(".perfil-acoes");
  if (acoes) {
    var trocar = document.createElement("button");
    trocar.className = "btn btn-secundario"; trocar.type = "button"; trocar.textContent = "Trocar logotipo";
    acoes.insertBefore(trocar, acoes.firstChild);
    trocar.addEventListener("click", function () {
      escolherArquivos(".png,.jpg,.jpeg,.webp,.svg").then(function (lista) {
        if (!lista.length) { return; }
        App.imagemReduzida(lista[0], 160).then(function (dataUrl) {
          if (!dataUrl) { U.avisar("Imagem grande demais ou inválida.", "atencao"); return; }
          M.usuarios.atualizar(conta.id, { logotipo: dataUrl });
          M.auditoria.registrar("Alteração de perfil", conta.nome + " · logotipo");
          aplicarLogo();
          U.avisar("Logotipo atualizado.", "ok");
        });
      });
    });
  }

  /* ---------------- áreas de atuação ---------------- */
  var cartaoAreas = cartaoPorTitulo("Áreas em que costuma contratar");
  if (cartaoAreas) {
    var areas = (M.usuarios.buscar(conta.id) || {}).areasAtuacao || [];
    cartaoAreas.querySelector("h2").textContent = "Áreas de atuação";
    cartaoAreas.querySelector(".competencias").innerHTML = areas.length
      ? areas.map(function (a) { return '<span class="etiqueta">' + esc(a) + "</span>"; }).join("")
      : '<span class="dica">Nenhuma área informada. Use Editar perfil para completar.</span>';
  }

  /* ---------------- obras e serviços executados ---------------- */
  var cartaoObras = cartaoPorTitulo("Obras da empresa");
  function desenharObras() {
    var obras = M.obras.listar({ usuarioId: conta.id })
      .sort(function (a, b) { return String(b.criadoEm).localeCompare(String(a.criadoEm)); });
    var anexos = M.arquivos.listar({ usuarioId: conta.id });
    cartaoObras.innerHTML = '<div class="cartao-cabecalho"><h2>Obras e serviços executados</h2>' +
      '<button class="btn btn-secundario btn-sm" type="button" data-nova-obra>Adicionar obra</button></div>' +
      (obras.length ? '<ul class="lista-divisoria">' + obras.map(function (o) {
        var fotos = anexos.filter(function (a) { return a.referenciaId === o.id && a.categoria === "foto-obra"; });
        var atestados = anexos.filter(function (a) { return a.referenciaId === o.id && a.categoria === "atestado"; });
        return '<li class="obra-item" data-obra-id="' + esc(o.id) + '"><div class="obra-topo"><div><strong>' + esc(o.nome) + "</strong>" +
          '<span class="dica">' + esc([o.cliente, o.cidade, o.area, o.porte].filter(Boolean).join(" · ")) + "</span></div>" +
          '<span class="etiqueta ' + (o.situacao === "Em execução" ? "etiqueta-ambar" : "etiqueta-verde") + '">' + esc(o.situacao || "Concluída") +
          (o.periodo ? " · " + esc(o.periodo) : "") + "</span></div>" +
          (o.descricao ? "<p>" + esc(o.descricao) + "</p>" : "") +
          '<div class="obra-anexos">' +
          (fotos.length ? '<span class="anexo-chip" title="' + esc(fotos.map(function (f) { return f.nome; }).join(", ")) + '">' + fotos.length + (fotos.length === 1 ? " foto" : " fotos") + "</span>" : "") +
          atestados.map(function (a) { return '<span class="anexo-chip anexo-atestado" title="' + esc(a.nome) + '">Atestado de capacidade técnica</span>'; }).join("") +
          '<button class="btn-texto" type="button" data-anexar-obra="' + esc(o.id) + '">Anexar fotos ou atestado</button></div></li>';
      }).join("") + "</ul>"
      : '<p class="estado-vazio" style="margin:16px 20px 20px">Nenhuma obra cadastrada. Adicione a primeira para mostrar o que a empresa já executou.</p>');
  }
  if (cartaoObras) {
    desenharObras();
    cartaoObras.addEventListener("click", function (evento) {
      if (evento.target.closest("[data-nova-obra]")) {
        U.dialogo({
          titulo: "Adicionar obra ou serviço",
          texto: "Mostre o que a empresa já executou. Fotos e atestado você anexa depois de salvar, na própria obra.",
          corpo: '<div class="campo"><label for="no-nome">Nome da obra ou serviço</label><input id="no-nome" maxlength="90"></div>' +
            '<div class="grade-form"><div class="campo"><label for="no-cliente">Cliente</label><input id="no-cliente" maxlength="80" placeholder="ou cliente sob sigilo"></div>' +
            '<div class="campo"><label for="no-cidade">Cidade</label><input id="no-cidade" maxlength="60" placeholder="Manaus, AM"></div>' +
            '<div class="campo"><label for="no-periodo">Conclusão ou período</label><input id="no-periodo" maxlength="30" placeholder="02/2026"></div>' +
            '<div class="campo"><label for="no-porte">Porte</label><input id="no-porte" maxlength="40" placeholder="4.200 m²"></div></div>' +
            '<div class="grade-form"><div class="campo"><label for="no-area">Área</label><input id="no-area" maxlength="50" placeholder="Estrutura metálica"></div>' +
            '<div class="campo"><label for="no-situacao">Situação</label><select id="no-situacao"><option>Concluída</option><option>Em execução</option></select></div></div>' +
            '<div class="campo"><label for="no-descricao">O que a empresa executou</label><textarea id="no-descricao" maxlength="400"></textarea></div>',
          confirmar: "Salvar obra",
          aoConfirmar: function (caixa) {
            var v = function (id) { return caixa.querySelector("#" + id).value.trim(); };
            if (v("no-nome").length < 3) { caixa.erro("Informe o nome da obra ou serviço."); return false; }
            M.obras.inserir({ usuarioId: conta.id, nome: v("no-nome"), cliente: v("no-cliente"), cidade: v("no-cidade"),
              periodo: v("no-periodo"), area: v("no-area"), porte: v("no-porte"), descricao: v("no-descricao"), situacao: v("no-situacao") });
            M.auditoria.registrar("Obra adicionada", conta.nome + " · " + v("no-nome"));
            desenharObras();
            U.avisar("Obra adicionada ao perfil da empresa.", "ok");
          }
        });
      }
      var anexar = evento.target.closest("[data-anexar-obra]");
      if (anexar) {
        var obraId = anexar.getAttribute("data-anexar-obra");
        U.dialogo({
          titulo: "Anexar à obra",
          texto: "Fotos mostram o resultado; o atestado de capacidade técnica, emitido pelo cliente, comprova a execução.",
          corpo: '<div class="campo"><label for="an-tipo">O que vai anexar</label><select id="an-tipo">' +
            '<option value="foto-obra">Fotos da obra</option><option value="atestado">Atestado de capacidade técnica</option></select></div>',
          confirmar: "Escolher arquivos",
          aoConfirmar: function (caixa) {
            var tipo = caixa.querySelector("#an-tipo").value;
            window.setTimeout(function () {
              escolherArquivos(tipo === "atestado" ? ".pdf" : ".png,.jpg,.jpeg,.webp", tipo !== "atestado").then(function (lista) {
                lista.forEach(function (a) {
                  M.arquivos.inserir({ usuarioId: conta.id, categoria: tipo, referenciaId: obraId, nome: a.name,
                    detalhe: tipo === "atestado" ? "Atestado de capacidade técnica" : "Foto da obra", tamanho: App.tamanhoLegivel(a.size) });
                });
                if (lista.length) { desenharObras(); U.avisar(lista.length === 1 ? "Arquivo anexado." : lista.length + " arquivos anexados.", "ok"); }
              });
            }, 0);
          }
        });
      }
    });
  }

  /* ---------------- certificações e documentos ---------------- */
  if (cartaoObras) {
    var cartaoDocs = document.createElement("div");
    cartaoDocs.className = "cartao cartao-limpo";
    cartaoDocs.style.marginTop = "20px";
    cartaoObras.parentNode.insertBefore(cartaoDocs, cartaoObras.nextSibling);
    var desenharDocs = function () {
      var docs = M.arquivos.listar({ usuarioId: conta.id }).filter(function (a) { return a.categoria in CATEGORIAS_DOC; });
      cartaoDocs.innerHTML = '<div class="cartao-cabecalho"><h2>Certificações e documentos</h2>' +
        '<button class="btn btn-secundario btn-sm" type="button" data-novo-doc>Adicionar</button></div>' +
        (docs.length ? '<ul class="lista-arquivos" style="padding:14px 20px 20px">' + docs.map(function (d) {
          return '<li class="arquivo"><span><strong style="display:block; font-size:14px">' + esc(d.nome) +
            '</strong><span style="font-size:12.5px; color:var(--tinta-3)">' + esc(d.detalhe || CATEGORIAS_DOC[d.categoria]) +
            '</span></span><span class="tamanho">' + esc(d.tamanho || "") + "</span></li>";
        }).join("") + "</ul>"
        : '<p class="estado-vazio" style="margin:16px 20px 20px">Nenhuma certificação ou documento. Certificações ISO, PBQP-H e a apresentação institucional pesam na escolha de quem contrata.</p>');
    };
    desenharDocs();
    cartaoDocs.addEventListener("click", function (evento) {
      if (!evento.target.closest("[data-novo-doc]")) { return; }
      U.dialogo({
        titulo: "Adicionar certificação ou documento",
        texto: "Não envie contrato social nem documentos financeiros: eles expõem dados que o perfil não precisa.",
        corpo: '<div class="campo"><label for="nd-tipo">Tipo</label><select id="nd-tipo">' +
          Object.keys(CATEGORIAS_DOC).map(function (k) { return '<option value="' + k + '">' + CATEGORIAS_DOC[k] + "</option>"; }).join("") +
          '</select></div><div class="campo"><label for="nd-detalhe">Descrição ou validade (opcional)</label><input id="nd-detalhe" maxlength="80" placeholder="Ex.: ISO 9001 · válida até 08/2027"></div>',
        confirmar: "Escolher arquivo",
        aoConfirmar: function (caixa) {
          var tipo = caixa.querySelector("#nd-tipo").value;
          var detalhe = caixa.querySelector("#nd-detalhe").value.trim() || CATEGORIAS_DOC[tipo];
          window.setTimeout(function () {
            escolherArquivos(".pdf,.png,.jpg,.jpeg").then(function (lista) {
              if (!lista.length) { return; }
              M.arquivos.inserir({ usuarioId: conta.id, categoria: tipo, referenciaId: "", nome: lista[0].name, detalhe: detalhe, tamanho: App.tamanhoLegivel(lista[0].size) });
              M.auditoria.registrar("Documento da empresa", conta.nome + " · " + CATEGORIAS_DOC[tipo]);
              desenharDocs();
              U.avisar("Documento adicionado.", "ok");
            });
          }, 0);
        }
      });
    });
  }
})(window, document);
