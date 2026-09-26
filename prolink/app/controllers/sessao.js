/* ============================================================
   ProLink — controller: entrar, recuperar acesso, sair, visitante e tela certa para cada tipo de conta
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
     Contas da apresentação (dados/contas_apresentacao.py): dois
     profissionais, uma empresa e o suporte administrativo. As demais
     contas nascem no cadastro. Dados fictícios: o item 11.2 do edital
     proíbe dados reais de terceiros.
     ----------------------------------------------------------------------- */

  /* -----------------------------------------------------------------------
     Entrar: e-mail e senha conferidos na base CSV

     Para contas criadas no cadastro. Entra-se com o documento usado no
     cadastro (CPF ou CNPJ) ou o e-mail, e a senha: o e-mail é só dado de contato do
     perfil. O botão Entrar valida o formato, procura o documento em
     usuarios.csv, confere o hash da senha e leva para a tela do tipo de conta.
     ----------------------------------------------------------------------- */
  /* As contas vêm de dados/usuarios.csv. O destino sai do tipo de conta. */
  var DESTINO_POR_TIPO = {
    admin: "admin-inicio.html",
    empresa: "empresa-inicio.html",
    contratante: "empresa-inicio.html",
    profissional: "inicio.html"
  };


  /* -----------------------------------------------------------------------
     Cada tipo de conta nas suas telas

     O menu, a busca do topo e os painéis seguem o tipo da conta. Uma conta
     aberta na tela de outro tipo (link antigo, aba esquecida, voltar do
     navegador) veria um painel misturado — por exemplo, o de profissional
     com cara de empresa. Então a página confere e leva para o início certo.
     ----------------------------------------------------------------------- */
  var TELAS_SO_DO_PROFISSIONAL = ["inicio.html", "candidaturas.html", "portfolio.html", "perfil.html",
                                  "configuracoes.html", "mensagens.html", "avaliacoes.html"];
  (function manterNaTelaDoTipo() {
    var conta = lerUsuarioSalvo();
    if (!conta || conta.visitante) { return; }
    var pagina = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    var tipo = conta.tipoConta === "contratante" ? "empresa" : conta.tipoConta;
    var ladoDaTela = pagina.indexOf("admin-") === 0 ? "admin"
                   : pagina.indexOf("empresa-") === 0 ? "empresa"
                   : TELAS_SO_DO_PROFISSIONAL.indexOf(pagina) !== -1 ? "profissional" : "";
    if (!ladoDaTela || !DESTINO_POR_TIPO[tipo] || ladoDaTela === tipo) { return; }
    window.location.replace(DESTINO_POR_TIPO[tipo]);
  })();

  /* -----------------------------------------------------------------------
     Cada tipo de conta nas suas telas

     O menu, a busca do topo e os painéis seguem o tipo da conta. Uma conta
     aberta na tela de outro tipo (link antigo, aba esquecida, voltar do
     navegador) veria um painel misturado — por exemplo, o de profissional
     com cara de empresa. Então a página confere e leva para o início certo.
     ----------------------------------------------------------------------- */
  var TELAS_SO_DO_PROFISSIONAL = ["inicio.html", "candidaturas.html", "portfolio.html", "perfil.html",
                                  "configuracoes.html", "mensagens.html", "avaliacoes.html"];
  (function manterNaTelaDoTipo() {
    var conta = lerUsuarioSalvo();
    if (!conta || conta.visitante) { return; }
    var pagina = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    var tipo = conta.tipoConta === "contratante" ? "empresa" : conta.tipoConta;
    var ladoDaTela = pagina.indexOf("admin-") === 0 ? "admin"
                   : pagina.indexOf("empresa-") === 0 ? "empresa"
                   : TELAS_SO_DO_PROFISSIONAL.indexOf(pagina) !== -1 ? "profissional" : "";
    if (!ladoDaTela || !DESTINO_POR_TIPO[tipo] || ladoDaTela === tipo) { return; }
    window.location.replace(DESTINO_POR_TIPO[tipo]);
  })();

  var campoIdentificacao = document.getElementById("identificacao");
  var campoSenha = document.getElementById("senha");
  var botaoEntrar = document.getElementById("entrar-sessao");

  function erroNoCampo(campo, mensagem) {
    var aviso = document.getElementById("erro-" + campo.id);
    campo.setAttribute("aria-invalid", mensagem ? "true" : "false");
    if (aviso) { aviso.textContent = mensagem || ""; aviso.hidden = !mensagem; }
  }

  function entrar() {
    /* Entra com o documento ou com o e-mail: quem se cadastrou sem registro
       confirmado no Crea recebeu o e-mail como login. */
    var identificacao = campoIdentificacao.value.trim();
    var porEmail = identificacao.indexOf("@") !== -1;
    var documento = porEmail ? "" : identificacao.replace(/\D/g, "");
    var senha = campoSenha.value;
    erroNoCampo(campoIdentificacao, "");
    erroNoCampo(campoSenha, "");

    /* 1. Os campos em si */
    var valido = true;
    if (porEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificacao)) {
        erroNoCampo(campoIdentificacao, "E-mail inválido.");
        valido = false;
      }
    } else if (!documento) {
      erroNoCampo(campoIdentificacao, "Informe o CPF, o CNPJ ou o e-mail da conta.");
      valido = false;
    } else if (documento.length !== 11 && documento.length !== 14) {
      erroNoCampo(campoIdentificacao, "Documento incompleto: CPF tem 11 dígitos e CNPJ, 14.");
      valido = false;
    }
    if (!senha) {
      erroNoCampo(campoSenha, "Informe a senha.");
      valido = false;
    } else if (senha.length < 8) {
      erroNoCampo(campoSenha, "A senha tem pelo menos 8 caracteres.");
      valido = false;
    }
    if (!valido) {
      (campoIdentificacao.getAttribute("aria-invalid") === "true" ? campoIdentificacao : campoSenha).focus();
      return;
    }

    /* 2. A conta na base. Mesma mensagem para documento ou senha errados:
          dizer qual dos dois falhou entregaria quem tem conta. */
    var conta = Banco && (porEmail ? ProLinkModelos.usuarios.porEmail(identificacao)
                                   : ProLinkModelos.usuarios.porDocumento(documento));
    var recusar = function () {
      erroNoCampo(campoSenha, (porEmail ? "E-mail" : "Documento") + " ou senha incorretos.");
      campoSenha.focus();
      campoSenha.select();
    };
    if (!conta || !conta.senhaHash || !conta.senhaSal) { recusar(); return; }

    botaoEntrar.disabled = true;
    hashDaSenha(conta.senhaSal, senha).then(function (hash) {
      botaoEntrar.disabled = false;
      if (hash !== conta.senhaHash) { recusar(); return; }

      if (conta.situacaoConta === "Bloqueado") {
        erroNoCampo(campoIdentificacao, "Esta conta está bloqueada pela administração do Crea-AM.");
        return;
      }
      if (conta.situacaoConta === "Encerrada") {
        ProLinkModelos.usuarios.atualizar(conta.id, { situacaoConta: conta.situacaoAntesDoEncerramento || "Verificado" });
        ProLinkModelos.auditoria.registrar("Reativação de conta", conta.nome, conta.email);
      }

      var manter = document.getElementById("manter-conectado");
      ProLinkModelos.sessao.entrar(conta.id, manter ? manter.checked : true);
      ProLinkModelos.auditoria.registrar("Autenticação", conta.nome, conta.email);
      irCom("Entrando como " + conta.nome + "…", DESTINO_POR_TIPO[conta.tipoConta] || "inicio.html");
    }).catch(function () {
      botaoEntrar.disabled = false;
      erroNoCampo(campoSenha, "Não foi possível conferir a senha neste navegador.");
    });
  }

  if (botaoEntrar && campoIdentificacao && campoSenha) {
    botaoEntrar.addEventListener("click", entrar);
    [campoIdentificacao, campoSenha].forEach(function (campo) {
      campo.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") { evento.preventDefault(); entrar(); }
      });
      campo.addEventListener("input", function () { erroNoCampo(campo, ""); });
    });
  }

  /* -----------------------------------------------------------------------
     Recuperar acesso (RF01)

     Sem envio de código: a nova senha é criada conferindo o documento da
     conta e o e-mail de contato cadastrado nela. A resposta é a mesma
     quando o documento não existe ou o e-mail não confere.
     ----------------------------------------------------------------------- */
  var confirmarRec = document.getElementById("confirmar-recuperacao");
  if (confirmarRec) {
    var retornoRec = document.getElementById("retorno-recuperacao");
    var avisarRec = function (classe, titulo, texto) {
      retornoRec.className = "retorno-crea " + classe;
      retornoRec.innerHTML = "<strong>" + titulo + "</strong><p>" + texto + "</p>";
      retornoRec.hidden = false;
    };
    confirmarRec.addEventListener("click", function () {
      var documento = document.getElementById("documento-recuperar").value.replace(/\D/g, "");
      var email = document.getElementById("email-recuperar").value.trim().toLowerCase();
      var senha = document.getElementById("nova-senha").value;
      var conf = document.getElementById("nova-senha-conf").value;

      if (documento.length !== 11 && documento.length !== 14) { avisarRec("retorno-atencao", "Documento incompleto", "Informe o CPF (11 dígitos) ou o CNPJ (14 dígitos) da conta."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { avisarRec("retorno-atencao", "E-mail inválido", "Informe o e-mail de contato cadastrado na conta."); return; }
      if (senha.length < 8) { avisarRec("retorno-atencao", "Senha curta", "A nova senha precisa de pelo menos 8 caracteres."); return; }
      if (senha !== conf) { avisarRec("retorno-atencao", "Senhas diferentes", "A confirmação não é igual à nova senha."); return; }

      var conta = Banco && ProLinkModelos.usuarios.porDocumento(documento);
      if (!conta || !conta.senhaHash || String(conta.email || "").toLowerCase() !== email) {
        avisarRec("retorno-erro", "Não foi possível criar a nova senha", "Confira o documento e o e-mail de contato cadastrados na conta.");
        return;
      }
      var sal = Array.prototype.map.call(window.crypto.getRandomValues(new Uint8Array(12)), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
      confirmarRec.disabled = true;
      hashDaSenha(sal, senha).then(function (hash) {
        ProLinkModelos.usuarios.atualizar(conta.id, { senhaSal: sal, senhaHash: hash });
        ProLinkModelos.auditoria.registrar("Redefinição de senha", conta.nome, conta.email);
        return ProLinkModelos.base.aguardarGravacoes();
      }).then(function () {
        avisarRec("retorno-ok", "Senha alterada", "Use a nova senha para entrar. <a class='link' href='login.html'>Ir para a entrada</a>");
      });
    });
  }

  /* Sair: apaga a sessão e volta para a tela de entrada. As preferências da
     Miranda não são apagadas — são do navegador, não da conta. */
  var botaoSair = document.getElementById("sair-da-sessao");
  if (botaoSair) {
    if (lerUsuarioSalvo()) { botaoSair.hidden = false; }
    botaoSair.addEventListener("click", function () {
      var quem = lerUsuarioSalvo();
      if (Banco) {
        if (quem && !quem.visitante) { ProLinkModelos.auditoria.registrar("Encerramento de sessão", quem.nome, quem.email); }
        ProLinkModelos.sessao.sair();
      }
      irCom("Encerrando sua sessão…", "login.html");
    });
  }

  /* Preenche o RNP nos formulários que dependem dele (validação de ART e
     CAT), para a pessoa não digitar o número toda vez. */
  (function preencherRnp() {
    var camposRnp = document.querySelectorAll("[data-usuario-rnp]");
    if (!camposRnp.length) { return; }
    var dadosSessao = lerUsuarioSalvo();
    if (!dadosSessao || !dadosSessao.rnp) { return; }
    camposRnp.forEach(function (campo) { campo.value = dadosSessao.rnp; });
  })();

  /* -----------------------------------------------------------------------
     Modo visitante

     O edital valoriza o registro no Crea, então conta é para quem tem
     registro. Quem não tem entra como visitante: navega e vê os perfis,
     mas não publica demanda, não manda mensagem e não recebe proposta.
     Nenhum CPF fica atrelado a essa sessão.
     ----------------------------------------------------------------------- */
  function entrarComoVisitante() {
    salvarUsuario({
      tipoConta: "visitante",
      visitante: true,
      verificado: false,
      identidadeVerificada: false,
      nome: "Visitante",
      titulo: "Navegando sem conta",
      documento: "",
      registro: "",
      email: ""
    });
    irCom("Entrando como visitante…", "inicio.html");
  }

  ["entrar-visitante", "entrar-visitante-topo"].forEach(function (id) {
    var botao = document.getElementById(id);
    if (botao) { botao.addEventListener("click", entrarComoVisitante); }
  });

  /* Aviso permanente nas telas internas: o limite precisa estar visível,
     não escondido num clique. Vale para visitante e para contratante — o
     Anexo I pede que a distinção entre registrado e não registrado seja
     preservada, e ela precisa aparecer na tela, não só no banco. */
  (function avisarSemRegistro() {
    var pagina = document.querySelector("main.pagina");
    if (!pagina) { return; }

    var sessaoAtual = lerUsuarioSalvo();
    if (!sessaoAtual) { return; }

    var faixa = document.createElement("div");
    faixa.className = "faixa-visitante";

    function textoSeguro(valor) {
      return String(valor == null ? "" : valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    if (sessaoAtual.visitante) {
      faixa.innerHTML =
        '<div><strong>Você está navegando como visitante</strong>' +
        "<p>Dá para ver oportunidades e perfis, mas publicar demanda, enviar proposta e " +
        "conversar exigem uma conta.</p></div>" +
        '<a class="btn btn-sm" href="cadastro.html">Criar conta</a>';
    } else if (sessaoAtual.primeiroAcesso) {
      /* Cada perfil tem um primeiro passo diferente, então a acolhida
         também muda — mandar um administrador montar portfólio seria ruído. */
      var acolhida = {
        profissional: {
          texto: "Seu registro já está confirmado no Crea. O que falta agora é contar o que " +
                 "você faz: cada projeto e cada documento do acervo melhora sua posição nas buscas.",
          acao: "Montar meu portfólio",
          destino: "portfolio.html"
        },
        empresa: {
          texto: "O registro da empresa já está confirmado no Crea. Publique a primeira " +
                 "demanda para começar a receber candidaturas com registro conferido.",
          acao: "Publicar primeira demanda",
          destino: "empresa-publicar.html"
        },
        admin: {
          texto: "Seu perfil administrativo está ativo. Comece pela fila de denúncias — toda " +
                 "decisão que você tomar entra na trilha de auditoria com seu nome.",
          acao: "Ver a fila de denúncias",
          destino: "admin-denuncias.html"
        }
      };

      var texto = acolhida[sessaoAtual.tipoConta] || acolhida.profissional;

      faixa.className = "faixa-visitante faixa-boas-vindas";
      faixa.innerHTML =
        "<div><strong>Bem-vindo ao ProLink, " +
        textoSeguro(String(sessaoAtual.nome).split(/\s+/)[0]) + "</strong><p>" + texto.texto + "</p></div>" +
        '<a class="btn btn-sm" href="' + texto.destino + '">' + texto.acao + "</a>";

    } else if (sessaoAtual.tipoConta === "contratante") {
      /* O contratante usa as telas de quem contrata, mas não é empresa
         registrada: os rótulos do menu acompanham. */
      document.querySelectorAll(".nav-grupo-titulo").forEach(function (titulo) {
        if (titulo.textContent.trim() === "Minha empresa") { titulo.textContent = "Minha conta"; }
      });
      var itemPerfil = document.querySelector('.nav a[href="empresa-perfil.html"] span');
      if (itemPerfil) { itemPerfil.textContent = "Meu perfil"; }

      faixa.innerHTML =
        '<div><strong>Conta de contratante, sem registro no Crea</strong>' +
        "<p>Você publica demanda, procura profissionais e conversa. O selo de verificado e " +
        "a presença nas buscas são de quem presta serviço técnico e tem registro ativo.</p></div>" +
        '<a class="btn btn-secundario btn-sm" href="empresa-publicar.html">Publicar demanda</a>';
    } else {
      return;
    }

    pagina.insertBefore(faixa, pagina.firstChild);
  })();


})();
