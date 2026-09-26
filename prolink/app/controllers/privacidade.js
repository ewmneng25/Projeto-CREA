/* ============================================================
   ProLink — privacidade e dados

   A tela onde o titular decide o que a plataforma mostra sobre
   ele. Cobre o que o edital pede em quatro lugares diferentes:

     RF01 ..... gerenciamento de consentimentos
     11.3 ..... consentimento, correção, portabilidade,
                descarte e revogação de acesso
     3.2 ...... participação voluntária do profissional
     Anexo I,
     item 7 ... "usuário corrige ou restringe dados"

   O detalhe que importa: restringir aqui muda o cálculo de
   compatibilidade de verdade. Dado que a pessoa pediu para não
   exibir não pode continuar pesando a favor dela — seria usar a
   informação pelas costas do titular.
   ============================================================ */
(function (window, document) {
  "use strict";

  var alvo = document.getElementById("tela-privacidade");
  var API = window.ProLinkDemandas;
  if (!alvo || !API) { return; }

  var estado = API.lerPrivacidade();
  var U = { sessao: function () { return (window.ProLinkModelos && ProLinkModelos.sessao.atual()) || {}; } };

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ==================================================================
  // O que dá para mostrar ou esconder
  // ==================================================================
  /* "Maria Souza Lima" vira "Maria S. L.": o primeiro nome e as iniciais. */
  function nomeAbreviado() {
    var partes = String((U.sessao() || {}).nome || "").split(/\s+/).filter(Boolean);
    if (!partes.length) { return "seu primeiro nome"; }
    return [partes[0]].concat(partes.slice(1).filter(function (p) { return p.length > 2; }).map(function (p) {
      return p.charAt(0).toUpperCase() + ".";
    })).join(" ");
  }

  var CAMPOS = [
    { chave: "nomeCompleto", rotulo: "Nome completo",
      nota: "Desligado, seu perfil público aparece como <strong>" + escapar(nomeAbreviado()) + "</strong>" },
    { chave: "cidade", rotulo: "Cidade onde atua",
      nota: "Empresas filtram por região. Sem a cidade, você some dessas buscas." },
    { chave: "telefone", rotulo: "Telefone",
      nota: "Fica visível para qualquer pessoa que abrir seu perfil. Mensagem pela plataforma funciona sem isso." },
    { chave: "email", rotulo: "E-mail",
      nota: "Mesma coisa do telefone: só ligue se quiser contato fora da plataforma." },
    { chave: "acervo", rotulo: "Acervo técnico (ARTs e CATs)",
      nota: "É o critério de maior peso depois da área de atuação. Desligar derruba sua compatibilidade.",
      afetaCalculo: true },
    { chave: "avaliacoes", rotulo: "Avaliações recebidas",
      nota: "Vale 15 pontos no cálculo. Desligar esconde a nota e tira esses pontos.",
      afetaCalculo: true },
    { chave: "curriculo", rotulo: "Currículo",
      nota: "O arquivo em si nunca fica público; o que aparece é o resumo extraído dele." }
  ];

  var CONSENTIMENTOS = [
    { chave: "usoDadosCrea", rotulo: "Uso dos meus dados do Crea no perfil",
      nota: "Inclui a consulta de ARTs e CATs pelo RNP. Revogar apaga o selo de verificado." },
    { chave: "buscas", rotulo: "Aparecer nas buscas de empresas",
      nota: "Desligado, você continua podendo se candidatar — mas ninguém te encontra sozinho." },
    { chave: "avisos", rotulo: "Receber avisos de demandas por e-mail",
      nota: "Só avisos de demanda compatível. Nada de propaganda." }
  ];

  var DATA_CONSENTIMENTO = ((U.sessao() || {}).cadastroEm || "no dia") + ", ao criar a conta";

  // ==================================================================
  // Desenho
  // ==================================================================
  function chave(item, ligado) {
    return '<div class="linha-privacidade">' +
      '<label class="chave-privacidade">' +
        '<input type="checkbox" data-priv="' + item.chave + '"' + (ligado ? " checked" : "") + ">" +
        '<span class="chave-trilho" aria-hidden="true"></span>' +
        '<span class="chave-texto"><strong>' + escapar(item.rotulo) + "</strong>" +
        '<span class="dica">' + item.nota + "</span></span>" +
      "</label>" +
      (item.afetaCalculo
        ? '<span class="etiqueta etiqueta-ambar">Entra no cálculo</span>'
        : "") +
    "</div>";
  }

  function desenhar() {
    var media = API.mediaCompatibilidade();

    alvo.innerHTML =
      '<div class="pagina-cabecalho">' +
        "<div><h1>Privacidade e dados</h1>" +
        "<p>O que a plataforma mostra sobre você, e o que ela pode fazer com os seus dados. " +
        "Tudo aqui é reversível.</p></div>" +
      "</div>" +

      '<div class="grade grade-principal">' +
        "<div>" +
          /* 1. Visibilidade */
          '<section class="cartao" style="margin-bottom:20px">' +
            "<h2>O que aparece no seu perfil público</h2>" +
            '<p class="dica" style="margin:6px 0 18px">Cada chave vale só para quem vê seu ' +
              "perfil. O Crea continua com os seus dados de qualquer jeito — isto aqui é o " +
              "ProLink, não o registro.</p>" +
            CAMPOS.map(function (c) { return chave(c, estado[c.chave]); }).join("") +
          "</section>" +

          /* 2. Consentimentos */
          '<section class="cartao" style="margin-bottom:20px">' +
            "<h2>Consentimentos</h2>" +
            '<p class="dica" style="margin:6px 0 6px">Dados em ' + DATA_CONSENTIMENTO +
              ". Revogar vale a partir de agora e fica registrado na trilha de auditoria.</p>" +
            '<p class="dica" style="margin-bottom:18px">Revogar não apaga o que já aconteceu: ' +
              "candidaturas enviadas continuam com a empresa que as recebeu.</p>" +
            CONSENTIMENTOS.map(function (c) { return chave(c, estado[c.chave]); }).join("") +
          "</section>" +

          /* 3. Correção */
          '<section class="cartao" style="margin-bottom:20px">' +
            "<h2>Corrigir seus dados</h2>" +
            '<p class="dica" style="margin:6px 0 16px">Dados do registro são corrigidos no Crea.</p>' +
            '<div class="grade grade-2" style="gap:14px">' +
              '<div class="info-demanda"><span class="rotulo">Muda no ProLink</span>' +
                "<strong>Resumo profissional, cidade de atendimento, contato, projetos, " +
                "currículo e certificados</strong></div>" +
              '<div class="info-demanda"><span class="rotulo">Só muda no Crea</span>' +
                "<strong>Nome, título profissional, número do registro, RNP, situação e " +
                "acervo de ARTs e CATs</strong></div>" +
            "</div>" +
            '<div class="demanda-acoes">' +
              '<a class="btn btn-secundario btn-sm" href="perfil.html">Editar meu perfil</a>' +
              '<a class="btn btn-fantasma btn-sm" href="portfolio.html">Ver meu portfólio</a>' +
            "</div>" +
          "</section>" +

          /* 4 e 5. Portabilidade e descarte */
          '<section class="cartao">' +
            "<h2>Levar ou encerrar</h2>" +
            '<p class="dica" style="margin:6px 0 16px">Os dois direitos que mais costumam ' +
              "ficar de fora de uma plataforma.</p>" +
            '<div class="grade grade-2" style="gap:14px; align-items:start">' +
              '<div class="info-demanda"><span class="rotulo">Portabilidade</span>' +
                "<strong>Baixar meus dados</strong>" +
                '<p class="dica" style="margin-top:8px">Um arquivo JSON com perfil, ' +
                  "consentimentos, candidaturas e acervo vinculado. Formato aberto, para " +
                  "você levar para onde quiser.</p>" +
                '<button class="btn btn-secundario btn-sm" type="button" id="baixar-dados" ' +
                  'style="margin-top:12px">Baixar JSON</button></div>' +
              '<div class="info-demanda"><span class="rotulo">Descarte</span>' +
                "<strong>Encerrar minha conta</strong>" +
                '<p class="dica" style="margin-top:8px">O perfil sai das buscas e das ' +
                  "recomendações na hora. A trilha de auditoria é preservada por obrigação " +
                  "legal, sem os seus dados de perfil.</p>" +
                '<button class="btn btn-secundario btn-sm" type="button" id="encerrar-conta" ' +
                  'style="margin-top:12px">Encerrar conta</button></div>' +
            "</div>" +
          "</section>" +
        "</div>" +

        /* Coluna lateral: o efeito das escolhas, ao vivo */
        "<div>" +
          '<div class="cartao cartao-candidatura" id="efeito-privacidade">' +
            '<span class="rotulo">Sua compatibilidade média</span>' +
            '<span class="analise-valor">' + media + "%</span>" +
            '<span class="rotulo" style="margin-bottom:14px">nas 4 demandas abertas</span>' +
            '<p class="dica" id="nota-efeito"></p>' +
          "</div>" +

          '<div class="cartao" style="margin-top:20px">' +
            "<h3 style='margin-bottom:10px'>Por que restringir muda a nota</h3>" +
            '<p class="dica">Dados ocultos não entram no cálculo. Você vê o efeito antes de confirmar.</p>' +
          "</div>" +

          '<p class="aviso-lgpd" style="margin-top:20px">' +
            "Base legal: consentimento do titular, revogável a qualquer momento, conforme a " +
            "Lei nº 13.709/2018. O ProLink não vende dados, não faz perfilamento para " +
            "publicidade e não compartilha nada além do que você autorizou aqui." +
          "</p>" +
        "</div>" +
      "</div>";

    ligarEventos();
    atualizarEfeito();
  }

  // ==================================================================
  // Comportamento
  // ==================================================================
  function atualizarEfeito() {
    var caixa = document.getElementById("efeito-privacidade");
    var nota = document.getElementById("nota-efeito");
    if (!caixa || !nota) { return; }

    var media = API.mediaCompatibilidade();
    caixa.querySelector(".analise-valor").textContent = media + "%";

    var restritos = [];
    if (!estado.acervo) { restritos.push("o acervo"); }
    if (!estado.avaliacoes) { restritos.push("as avaliações"); }

    if (restritos.length) {
      caixa.classList.add("efeito-reduzido");
      nota.innerHTML = "Você restringiu " + restritos.join(" e ") +
        ", então esses pontos saíram do cálculo. É a sua escolha — só não dá para " +
        "esconder o dado e continuar pontuando com ele.";
    } else {
      caixa.classList.remove("efeito-reduzido");
      nota.textContent = "Nada restrito no momento. Todos os critérios estão contando.";
    }

    if (!estado.buscas) {
      nota.innerHTML += "<br><br>Fora das buscas: empresas não te encontram sozinhas, " +
        "mas você continua podendo se candidatar.";
    }
  }

  function ligarEventos() {
    alvo.querySelectorAll("[data-priv]").forEach(function (entrada) {
      entrada.addEventListener("change", function () {
        var campo = entrada.getAttribute("data-priv");

        /* Revogar o uso dos dados do Crea derruba o que depende deles. */
        if (campo === "usoDadosCrea" && !entrada.checked) {
          if (!window.confirm("Revogar o uso dos dados do Crea remove o selo de verificado " +
                              "e esconde o seu acervo. Continuar?")) {
            entrada.checked = true;
            return;
          }
          estado.acervo = false;
          var caixaAcervo = alvo.querySelector('[data-priv="acervo"]');
          if (caixaAcervo) { caixaAcervo.checked = false; }
        }

        estado[campo] = entrada.checked;
        API.gravarPrivacidade(estado);
        atualizarEfeito();
      });
    });

    var baixar = document.getElementById("baixar-dados");
    if (baixar) { baixar.addEventListener("click", exportarDados); }

    var encerrar = document.getElementById("encerrar-conta");
    if (encerrar) { encerrar.addEventListener("click", confirmarDescarte); }
  }

  /** Portabilidade: formato aberto, sem depender do ProLink para ler. */
  function exportarDados() {
    var usuario = window.ProLinkBanco ? ProLinkModelos.sessao.atual() : null;

    var pacote = {
      geradoEm: new Date().toISOString(),
      origem: "ProLink — protótipo do Desafio Crea Pro-Link",
      observacao: "Dados fictícios de demonstração.",
      perfil: usuario,
      privacidade: estado,
      candidaturas: API.minhas(),
      acervoVinculado: API.PROFISSIONAL.acervo
    };

    var conteudo = JSON.stringify(pacote, null, 2);
    var blob = new Blob([conteudo], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "prolink-meus-dados.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function confirmarDescarte() {
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa" role="dialog" aria-modal="true" aria-label="Encerrar conta">' +
        "<h2>Encerrar sua conta</h2>" +
        '<p class="dica" style="margin:10px 0 16px">Antes de confirmar, o que acontece:</p>' +
        "<ul class='lista-descarte'>" +
          "<li>Seu perfil sai das buscas e das recomendações imediatamente.</li>" +
          "<li>As candidaturas já enviadas continuam com as empresas que as receberam.</li>" +
          "<li>O registro recebe exclusão lógica: some das consultas, mas fica recuperável " +
            "por 30 dias, se você mudar de ideia.</li>" +
          "<li>A trilha de auditoria é preservada por obrigação legal, sem os seus dados de perfil.</li>" +
          "<li>Seu registro no Crea não é afetado. Isto aqui é o ProLink.</li>" +
        "</ul>" +
        '<label class="aceite" style="margin-top:14px"><input type="checkbox" id="confirma-descarte">' +
          "<span>Entendi e quero encerrar minha conta</span></label>" +
        '<div class="acoes-formulario" style="margin-top:18px">' +
          '<button class="btn btn-secundario" type="button" data-descarte="cancelar">Cancelar</button>' +
          '<button class="btn btn-perigo" type="button" data-descarte="confirmar">Encerrar conta</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(fundo);

    function fechar() { fundo.remove(); }
    fundo.querySelector('[data-descarte="cancelar"]').addEventListener("click", fechar);
    fundo.addEventListener("click", function (e) { if (e.target === fundo) { fechar(); } });

    fundo.querySelector('[data-descarte="confirmar"]').addEventListener("click", function () {
      if (!document.getElementById("confirma-descarte").checked) {
        window.alert("Marque a confirmação para encerrar a conta.");
        return;
      }
      /* Exclusão lógica: a linha fica em usuarios.csv marcada como encerrada,
         recuperável por 30 dias; as escolhas de privacidade saem da base. */
      var Banco = window.ProLinkBanco;
      var usuario = Banco && ProLinkModelos.sessao.atual();
      if (Banco && usuario && !usuario.visitante) {
        ProLinkModelos.usuarios.atualizar(usuario.id, {
          situacaoConta: "Encerrada",
          situacaoAntesDoEncerramento: usuario.situacaoConta || "",
          encerradaEm: new Date().toISOString()
        });
        ProLinkModelos.privacidade.excluirOnde({ usuarioId: usuario.id });
        ProLinkModelos.auditoria.registrar("Encerramento de conta", usuario.nome, usuario.email);
        ProLinkModelos.sessao.sair();
      }

      fundo.querySelector(".denuncia-caixa").innerHTML =
        "<h2>Conta encerrada</h2>" +
        '<p class="dica" style="margin:10px 0 18px">Seu perfil saiu das buscas. Se mudar de ' +
        "ideia nos próximos 30 dias, dá para recuperar entrando com o mesmo e-mail.</p>" +
        '<div class="acoes-formulario"><span></span>' +
        '<a class="btn" href="index.html">Voltar ao início</a></div>';
    });
  }

  desenhar();
})(window, document);
