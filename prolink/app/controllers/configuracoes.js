/* ============================================================
   ProLink — Configurações (engrenagem da barra superior)

   Uma tela para os três lados, desenhada conforme o perfil:
   conta e senha, notificações, buscas salvas e alertas,
   acessibilidade e sessão. Tudo é gravado na base CSV:
   dados/configuracoes.csv, dados/buscas_salvas.csv e o e-mail
   em dados/usuarios.csv.

   Privacidade (o que o perfil mostra e os consentimentos) tem
   tela própria e só é linkada daqui, para não haver dois lugares
   decidindo a mesma coisa.
   ============================================================ */
(function (window, document) {
  "use strict";

  var alvo = document.getElementById("tela-configuracoes");
  var U = window.__ProLinkInterno;
  if (!alvo || !U) { return; }

  var lado = alvo.getAttribute("data-lado") || "profissional";
  var Banco = window.ProLinkBanco;
  var escapar = U.escapar;

  var EVENTOS = {
    profissional: [
      ["oportunidades", "Oportunidades compatíveis", "Demanda nova que combina com o seu registro e acervo."],
      ["candidaturas", "Andamento das candidaturas", "Quando a empresa visualiza seu perfil ou responde."],
      ["mensagens", "Mensagens", "Conversa nova ou resposta de empresa e parceiro."],
      ["avaliacoes", "Avaliações", "Avaliação recebida depois de um contrato."],
      ["crea", "Confirmações do Crea", "ART ou CAT confirmada e incluída no acervo."]
    ],
    empresa: [
      ["candidaturas", "Candidaturas recebidas", "Profissional manifestou interesse em uma demanda."],
      ["mensagens", "Mensagens", "Conversa nova ou resposta de profissional."],
      ["prazos", "Prazos das demandas", "Demanda perto de encerrar o recebimento de propostas."],
      ["avaliacoes", "Avaliações", "Avaliação recebida ou pedido de avaliação."]
    ],
    admin: [
      ["denuncias", "Denúncias novas", "Entrada na fila de moderação."],
      ["prazos", "Prazo de resposta", "Denúncia perto de passar de 2 dias úteis."],
      ["bloqueios", "Bloqueios e desbloqueios", "Decisão tomada por outro administrador."],
      ["integracoes", "Falha nas integrações", "API do Crea ou envio de e-mail fora do ar."]
    ]
  }[lado];

  function padrao() {
    var eventos = {};
    EVENTOS.forEach(function (e) { eventos[e[0]] = { plataforma: true, email: e[0] !== "avaliacoes" }; });
    return { eventos: eventos, frequencia: "Assim que acontecer", textoMaior: false, reduzirMovimento: false };
  }

  function ler() {
    var salvo = Banco ? ProLinkModelos.sessao.preferencias() : {};
    var base = padrao();
    return Object.assign(base, salvo, {
      eventos: Object.assign(base.eventos, salvo.eventos || {}),
      frequencia: salvo.frequencia || base.frequencia
    });
  }

  function gravar(dados) {
    if (Banco) {
      ProLinkModelos.sessao.salvarPreferencias({
        eventos: dados.eventos, frequencia: dados.frequencia,
        textoMaior: !!dados.textoMaior, reduzirMovimento: !!dados.reduzirMovimento
      });
    }
    document.documentElement.classList.toggle("pl-texto-maior", !!dados.textoMaior);
    document.documentElement.classList.toggle("pl-sem-animacao", !!dados.reduzirMovimento);
  }

  function chave(id, rotulo, nota, ligado) {
    return '<div class="linha-privacidade"><label class="chave-privacidade">' +
      '<input type="checkbox" id="' + id + '"' + (ligado ? " checked" : "") + ">" +
      '<span class="chave-trilho" aria-hidden="true"></span>' +
      '<span class="chave-texto"><strong>' + escapar(rotulo) + '</strong><span class="dica">' + nota +
      "</span></span></label></div>";
  }

  var PAGINAS = {
    "oportunidades.html": "Oportunidades", "profissionais.html": "Buscar profissionais",
    "empresa-profissionais.html": "Buscar profissionais"
  };

  function listaBuscas() {
    var todas = Banco ? ProLinkModelos.buscas_salvas.listar({ usuarioId: U.sessao().id || "" }) : [];
    var buscas = todas.filter(function (b) { return b.tipo === "busca"; });
    var alertas = todas.filter(function (b) { return b.tipo === "alerta"; });
    if (!buscas.length && !alertas.length) {
      return '<p class="estado-vazio" style="margin:0">Nenhuma busca salva nem alerta. Use ' +
        "<strong>Salvar esta busca</strong> ou <strong>Criar alerta</strong> na tela de " +
        (lado === "empresa" ? '<a class="link" href="empresa-profissionais.html">busca de profissionais</a>'
                            : '<a class="link" href="oportunidades.html">oportunidades</a>') + ".</p>";
    }
    function item(b, tipo) {
      return '<li class="item-configuracao"><div><strong>' + escapar(b.nome || "Alerta de " + (PAGINAS[b.pagina] || "busca")) +
        '</strong><span class="dica">' + escapar(tipo === "alerta" ? b.frequencia + " · " + b.canal : PAGINAS[b.pagina] || b.pagina) +
        " · " + escapar(b.resumo) + "</span></div>" +
        '<div class="item-configuracao-acoes"><a class="btn btn-secundario btn-sm" href="' + escapar(b.pagina) +
        "?busca=" + escapar(b.id) + '">Abrir</a>' +
        '<button class="btn btn-fantasma btn-sm" type="button" data-excluir="' + tipo + '" data-id="' + escapar(b.id) +
        '">Excluir</button></div></li>';
    }
    return '<ul class="lista-configuracao">' +
      buscas.map(function (b) { return item(b, "busca"); }).join("") +
      alertas.map(function (a) { return item(a, "alerta"); }).join("") + "</ul>";
  }

  function desenhar() {
    var dados = ler();
    var usuario = U.sessao();
    var privacidade = lado === "profissional"
      ? '<a class="btn btn-secundario btn-sm" href="privacidade.html">Privacidade e dados</a>' : "";

    alvo.innerHTML =
      '<div class="pagina-cabecalho"><div><h1>Configurações</h1>' +
        "<p>Conta, avisos e exibição. " +
        (lado === "profissional"
          ? 'O que o seu perfil mostra fica em <a class="link" href="privacidade.html">Privacidade e dados</a>.'
          : "As mudanças valem para este navegador.") + "</p></div></div>" +

      '<div class="grade grade-principal">' + "<div>" +

      /* Conta */
      '<section class="cartao" id="conta" style="margin-bottom:20px">' +
        '<h2 style="margin-bottom:4px">Conta</h2>' +
        '<p class="dica" style="margin-bottom:18px">Nome e registro vêm do Crea e não se alteram aqui.</p>' +
        '<div class="grade-form">' +
          '<div class="campo"><label for="cfg-nome">Nome</label><input id="cfg-nome" type="text" value="' +
            escapar(usuario.nome || "") + '" disabled></div>' +
          '<div class="campo"><label for="cfg-email">E-mail de contato</label><input id="cfg-email" type="email" value="' +
            escapar(usuario.email || "") + '" autocomplete="email"></div>' +
        "</div>" +
        '<div class="acoes-formulario" style="margin-top:16px"><span></span>' +
          '<button class="btn btn-secundario" type="button" id="cfg-salvar-email">Salvar e-mail</button></div>' +
        '<div class="grupo-campo"><h4>Alterar senha</h4>' +
          '<div class="grade-form" style="margin-top:12px">' +
            '<div class="campo campo-largo"><label for="cfg-senha-atual">Senha atual</label>' +
              '<input id="cfg-senha-atual" type="password" autocomplete="current-password"></div>' +
            '<div class="campo"><label for="cfg-senha-nova">Nova senha</label>' +
              '<input id="cfg-senha-nova" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></div>' +
            '<div class="campo"><label for="cfg-senha-conf">Confirmar nova senha</label>' +
              '<input id="cfg-senha-conf" type="password" autocomplete="new-password"></div>' +
          "</div>" +
          '<p class="erro-inline" id="cfg-senha-erro" hidden></p>' +
          '<div class="acoes-formulario" style="margin-top:16px"><span></span>' +
            '<button class="btn" type="button" id="cfg-salvar-senha">Alterar senha</button></div>' +
        "</div>" +
      "</section>" +

      /* Notificações */
      '<section class="cartao" id="notificacoes" style="margin-bottom:20px">' +
        '<h2 style="margin-bottom:4px">Notificações</h2>' +
        '<p class="dica" style="margin-bottom:14px">Escolha onde cada aviso chega. O sino da barra ' +
          "superior mostra os avisos da plataforma.</p>" +
        '<div class="tabela-rolagem"><table class="tabela-admin tabela-avisos"><thead><tr><th>Aviso</th>' +
          "<th>Na plataforma</th><th>Por e-mail</th></tr></thead><tbody>" +
          EVENTOS.map(function (e) {
            var v = dados.eventos[e[0]];
            return "<tr><td><strong style='display:block'>" + escapar(e[1]) + "</strong><span class='dica'>" +
              escapar(e[2]) + "</span></td>" +
              '<td><input type="checkbox" aria-label="' + escapar(e[1]) + ' na plataforma" data-evento="' + e[0] +
                '" data-canal="plataforma"' + (v.plataforma ? " checked" : "") + "></td>" +
              '<td><input type="checkbox" aria-label="' + escapar(e[1]) + ' por e-mail" data-evento="' + e[0] +
                '" data-canal="email"' + (v.email ? " checked" : "") + "></td></tr>";
          }).join("") +
        "</tbody></table></div>" +
        '<div class="campo" style="margin-top:16px; max-width:320px"><label for="cfg-frequencia">E-mails</label>' +
          '<select id="cfg-frequencia">' +
          ["Assim que acontecer", "Resumo diário", "Resumo semanal"].map(function (f) {
            return "<option" + (dados.frequencia === f ? " selected" : "") + ">" + f + "</option>";
          }).join("") + "</select></div>" +
      "</section>" +

      /* Buscas salvas */
      (lado !== "admin"
        ? '<section class="cartao" id="buscas" style="margin-bottom:20px">' +
          '<h2 style="margin-bottom:4px">Buscas salvas e alertas</h2>' +
          '<p class="dica" style="margin-bottom:14px">Abra de novo com os mesmos filtros ou exclua o que não usa mais.</p>' +
          '<div id="cfg-lista-buscas">' + listaBuscas() + "</div></section>"
        : "") +

      "</div><div>" +

      /* Acessibilidade */
      '<section class="cartao" id="exibicao" style="margin-bottom:20px">' +
        '<h2 style="margin-bottom:10px">Acessibilidade e exibição</h2>' +
        chave("cfg-texto-maior", "Aumentar o tamanho do texto", "Amplia a interface em cerca de 10%.", dados.textoMaior) +
        chave("cfg-movimento", "Reduzir animações", "Tira transições e a abertura animada.", dados.reduzirMovimento) +
        chave("cfg-tour", "Dicas da Miranda nas telas", "Apresentação guiada na primeira visita a cada tela.",
              ler().guiaDesligado !== true) +
        '<button class="btn btn-secundario btn-sm" type="button" id="cfg-rever-tour" style="margin-top:14px">' +
          "Rever as dicas de todas as telas</button>" +
      "</section>" +

      /* Sessão */
      '<section class="cartao" id="sessao">' +
        '<h2 style="margin-bottom:10px">Sessão</h2>' +
        '<ul class="retorno-lista" style="margin-top:0">' +
          "<li><span>Perfil</span><strong>" + escapar({ profissional: "Profissional", empresa: usuario.tipoConta === "contratante" ? "Contratante" : "Empresa", admin: "Administrador" }[lado]) + "</strong></li>" +
          "<li><span>Navegador</span><strong>" + escapar(nomeNavegador()) + "</strong></li>" +
          "<li><span>Dados guardados</span><strong>Base CSV (pasta dados/)</strong></li>" +
        "</ul>" +
        '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px">' + privacidade +
          '<button class="btn btn-fantasma btn-sm" type="button" id="cfg-sair">Encerrar sessão</button></div>' +
      "</section>" +
      (lado === "admin"
        ? '<section class="cartao" id="base" style="margin-top:20px"><h2 style="margin-bottom:6px">Base de dados CSV</h2>' +
          '<p class="dica" style="margin-bottom:14px">Cada tabela é um arquivo CSV guardado dentro do navegador. ' +
          "Baixe para abrir no Excel ou restaure a base inicial (os CSV da pasta <code>dados/</code> do projeto).</p>" +
          '<ul class="lista-configuracao">' + (Banco ? ProLinkModelos.base.tabelas() : []).map(function (t) {
            return '<li class="item-configuracao"><div><strong>' + t + '.csv</strong><span class="dica">' +
              ProLinkModelos[t].listar().length + " registros</span></div>" +
              '<div class="item-configuracao-acoes"><button class="btn btn-secundario btn-sm" type="button" data-baixar-csv="' + t +
              '">Baixar</button></div></li>';
          }).join("") + "</ul>" +
          '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px">' +
          '<button class="btn btn-secundario btn-sm" type="button" id="cfg-baixar-todas">Baixar todas</button>' +
          '<button class="btn btn-fantasma btn-sm" type="button" id="cfg-restaurar">Restaurar base inicial</button></div></section>'
        : "") +

      "</div></div>";

    ligar();
  }

  function nomeNavegador() {
    var ua = navigator.userAgent;
    if (/Edg\//.test(ua)) { return "Microsoft Edge"; }
    if (/Chrome\//.test(ua)) { return "Google Chrome"; }
    if (/Firefox\//.test(ua)) { return "Mozilla Firefox"; }
    if (/Safari\//.test(ua)) { return "Safari"; }
    return "Navegador";
  }

  function ligar() {
    /* E-mail */
    document.getElementById("cfg-salvar-email").addEventListener("click", function () {
      var campo = document.getElementById("cfg-email");
      var email = campo.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        U.avisar("Informe um e-mail válido.", "atencao");
        campo.focus();
        return;
      }
      var usuario = U.sessao();
      var dono = Banco && ProLinkModelos.usuarios.porEmail(email);
      if (dono && dono.id !== usuario.id) {
        U.avisar("Esse e-mail já pertence a outra conta da base.", "atencao");
        return;
      }
      if (!Banco || !ProLinkModelos.usuarios.atualizar(usuario.id, { email: email.toLowerCase() })) {
        U.avisar("Não foi possível gravar o e-mail na base.", "atencao");
        return;
      }
      ProLinkModelos.auditoria.registrar("Alteração de perfil", usuario.nome + " · e-mail de login");
      U.avisar("E-mail de contato atualizado. Ele aparece no perfil conforme Privacidade e dados.", "ok");
    });

    /* Senha: sem servidor não há o que conferir; valida as regras e avisa. */
    document.getElementById("cfg-salvar-senha").addEventListener("click", function () {
      var erro = document.getElementById("cfg-senha-erro");
      var atual = document.getElementById("cfg-senha-atual").value;
      var nova = document.getElementById("cfg-senha-nova").value;
      var conf = document.getElementById("cfg-senha-conf").value;
      var problema = !atual ? "Informe a senha atual."
        : nova.length < 8 ? "A nova senha precisa de pelo menos 8 caracteres."
        : !(/[a-z]/i.test(nova) && /\d/.test(nova)) ? "Use letras e números na nova senha."
        : nova === atual ? "A nova senha precisa ser diferente da atual."
        : nova !== conf ? "A confirmação não é igual à nova senha." : "";
      erro.textContent = problema;
      erro.hidden = !problema;
      if (problema) { return; }
      ["cfg-senha-atual", "cfg-senha-nova", "cfg-senha-conf"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      U.avisar("Senha alterada. Neste protótipo sem servidor, a troca vale só como demonstração.", "ok");
    });

    /* Notificações */
    alvo.querySelectorAll("[data-evento]").forEach(function (caixa) {
      caixa.addEventListener("change", function () {
        var dados = ler();
        dados.eventos[caixa.dataset.evento][caixa.dataset.canal] = caixa.checked;
        gravar(dados);
        U.avisar("Preferência de aviso salva.");
      });
    });
    document.getElementById("cfg-frequencia").addEventListener("change", function (e) {
      var dados = ler();
      dados.frequencia = e.target.value;
      gravar(dados);
      U.avisar("Frequência dos e-mails: " + U.escapar(e.target.value) + ".");
    });

    /* Acessibilidade */
    document.getElementById("cfg-texto-maior").addEventListener("change", function (e) {
      var dados = ler(); dados.textoMaior = e.target.checked; gravar(dados);
    });
    document.getElementById("cfg-movimento").addEventListener("change", function (e) {
      var dados = ler(); dados.reduzirMovimento = e.target.checked; gravar(dados);
    });
    document.getElementById("cfg-tour").addEventListener("change", function (e) {
      if (Banco) { ProLinkModelos.sessao.salvarPreferencias({ guiaDesligado: !e.target.checked }); }
      U.avisar(e.target.checked ? "Dicas da Miranda ligadas." : "Dicas da Miranda desligadas.");
    });
    document.getElementById("cfg-rever-tour").addEventListener("click", function () {
      if (Banco) { ProLinkModelos.sessao.salvarPreferencias({ telasVistas: [], guiaDesligado: false }); }
      document.getElementById("cfg-tour").checked = true;
      U.avisar("Pronto: a Miranda volta a apresentar cada tela na próxima visita.", "ok");
    });

    /* Buscas salvas */
    var caixaBuscas = document.getElementById("cfg-lista-buscas");
    if (caixaBuscas) {
      caixaBuscas.addEventListener("click", function (evento) {
        var botao = evento.target.closest("[data-excluir]");
        if (!botao) { return; }
        if (Banco) { ProLinkModelos.buscas_salvas.excluir(botao.dataset.id); }
        caixaBuscas.innerHTML = listaBuscas();
        U.avisar(botao.dataset.excluir === "alerta" ? "Alerta excluído." : "Busca excluída.");
      });
    }

    function baixarCsv(tabela) {
      var blob = new Blob([ProLinkModelos.base.csvDaTabela(tabela)], { type: "text/csv;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = tabela + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }
    alvo.querySelectorAll("[data-baixar-csv]").forEach(function (botao) {
      botao.addEventListener("click", function () { baixarCsv(botao.dataset.baixarCsv); });
    });
    var baixarTodas = document.getElementById("cfg-baixar-todas");
    if (baixarTodas) {
      baixarTodas.addEventListener("click", function () {
        ProLinkModelos.base.tabelas().forEach(function (t, i) { window.setTimeout(function () { baixarCsv(t); }, i * 250); });
        U.avisar("Baixando " + ProLinkModelos.base.tabelas().length + " arquivos CSV. Se o navegador perguntar, permita vários downloads.", "ok");
      });
    }

    var restaurar = document.getElementById("cfg-restaurar");
    if (restaurar) {
      restaurar.addEventListener("click", function () {
        if (!window.confirm("Restaurar todos os CSV à base inicial do projeto? O que foi criado depois será apagado.")) { return; }
        restaurar.disabled = true;
        ProLinkModelos.base.restaurar().then(function () {
          U.avisar("Base restaurada. Recarregando…", "ok");
          window.setTimeout(function () { window.location.reload(); }, 800);
        }).catch(function (erro) {
          restaurar.disabled = false;
          U.avisar("Não foi possível restaurar: " + U.escapar(erro.message || erro), "atencao");
        });
      });
    }

    /* Sair: usa o mesmo botão da barra superior, que já tem a transição. */
    document.getElementById("cfg-sair").addEventListener("click", function () {
      var sair = document.getElementById("sair-da-sessao");
      if (sair) { sair.click(); } else { window.location.href = "login.html"; }
    });
  }

  desenhar();

  /* Chegando por #notificacoes ou #buscas, rola até a seção. */
  if (window.location.hash) {
    var secao = document.querySelector(window.location.hash);
    if (secao) { window.setTimeout(function () { secao.scrollIntoView({ block: "start" }); }, 80); }
  }
})(window, document);
