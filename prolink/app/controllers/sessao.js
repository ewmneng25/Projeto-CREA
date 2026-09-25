/* ============================================================
   ProLink — controller: entrar, modo de demonstração, recuperar acesso, sair e visitante
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
     Contas de demonstração
     A base inicial tem só os três perfis de demonstração (u-prof-demo,
     u-emp-demo e u-admin-demo), usados pelo botão "Usar modo de demonstração". Contas de verdade nascem
     no cadastro. Dados fictícios: o item 11.2 do edital proíbe dados reais.
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
     Modo de demonstração

     Não é login: ninguém cria conta. A pessoa lê o aviso de que os dados
     são fictícios, escolhe o perfil (profissional, empresa ou
     administrativo), informa o nome e entra nas telas daquele perfil,
     com o nome dela e o tutorial da Miranda como num primeiro acesso.
     Os três perfis ficam em usuarios.csv, sem senha.
     ----------------------------------------------------------------------- */
  var PERFIS_DEMONSTRACAO = {
    profissional: {
      id: "u-prof-demo", profissionalId: "prof-001", destino: "inicio.html",
      titulo: "Profissional", sigla: "PF",
      descricao: "Engenheiro com registro no Crea: oportunidades, candidaturas, portfólio e acervo.",
      pergunta: "Como você se chama?", rotulo: "Seu nome", exemplo: "Ex.: Maria Souza",
      explicacao: "O nome aparece nas telas no lugar do profissional fictício."
    },
    empresa: {
      id: "u-emp-demo", destino: "empresa-inicio.html",
      titulo: "Empresa", sigla: "PJ",
      descricao: "Empresa registrada: publica demandas, recebe candidaturas e busca profissionais.",
      pergunta: "Qual o nome da empresa?", rotulo: "Nome da empresa", exemplo: "Ex.: Souza Engenharia",
      explicacao: "Nas telas de empresa, quem aparece é a empresa: o nome dela entra no lugar da fictícia."
    },
    admin: {
      id: "u-admin-demo", destino: "admin-inicio.html",
      titulo: "Administrativo", sigla: "ADM",
      descricao: "Equipe do Crea-AM: usuários, denúncias e trilha de auditoria.",
      pergunta: "Como você se chama?", rotulo: "Seu nome", exemplo: "Ex.: Maria Souza",
      explicacao: "O nome aparece nas telas e nas decisões registradas na trilha de auditoria."
    }
  };

  function iniciaisDoNome(nome) {
    var partes = String(nome).trim().split(/\s+/);
    return (partes[0].charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : "")).toUpperCase();
  }

  function comecarDemonstracao(tipo, nome) {
    /* A demonstração usa a base fictícia, separada da base real. */
    ProLinkModelos.base.usarBase("demonstracao").then(function () {
      if (!ProLinkModelos.usuarios.buscar(PERFIS_DEMONSTRACAO[tipo].id)) {
        ProLinkModelos.base.usarBase("real");
        alert("A base de demonstração não está disponível neste navegador.");
        return;
      }
      prepararDemonstracao(tipo, nome);
    });
  }

  function prepararDemonstracao(tipo, nome) {
    var perfil = PERFIS_DEMONSTRACAO[tipo];
    var anterior = (ProLinkModelos.usuarios.buscar(perfil.id) || {}).nome || "";
    var sobreAtual = (ProLinkModelos.usuarios.buscar(perfil.id) || {}).sobre || "";
    ProLinkModelos.usuarios.atualizar(perfil.id, {
      nome: nome, primeiroAcesso: true, modoDemonstracao: true,
      sobre: anterior ? sobreAtual.split(anterior).join(nome) : sobreAtual
    });
    if (perfil.profissionalId) {
      ProLinkModelos.profissionais.atualizar(perfil.profissionalId, { nome: nome, iniciais: iniciaisDoNome(nome) });
    }
    /* Na demonstração de empresa, as demandas da empresa levam o nome digitado. */
    var idsDemandas = [];
    ProLinkModelos.demandas.listar({ empresaUsuarioId: perfil.id }).forEach(function (d) {
      idsDemandas.push(d.id);
      ProLinkModelos.demandas.atualizar(d.id, { empresa: nome, empresaIniciais: iniciaisDoNome(nome) });
    });
    ProLinkModelos.candidaturas.listar().forEach(function (c) {
      if (idsDemandas.indexOf(c.demandaId) !== -1) { ProLinkModelos.candidaturas.atualizar(c.id, { empresa: nome }); }
    });
    /* Primeira vez de verdade: tutorial do começo e nada da visita anterior. */
    ["configuracoes", "privacidade", "miranda_mensagens"].forEach(function (tabela) {
      ProLinkModelos[tabela].excluirOnde({ usuarioId: perfil.id });
    });
    ProLinkModelos.sessao.entrar(perfil.id);
    ProLinkModelos.auditoria.registrar("Modo de demonstração", perfil.titulo + " · " + nome, "demonstracao");
    irCom("Preparando a demonstração…", perfil.destino);
  }

  function pedirNomeDaDemonstracao(tipo) {
    var I = window.ProLinkInteracoes;
    var perfil = PERFIS_DEMONSTRACAO[tipo];
    I.dialogo({
      titulo: perfil.pergunta,
      texto: perfil.explicacao,
      corpo: '<div class="campo"><label for="nome-demonstracao">' + perfil.rotulo + "</label>" +
             '<input id="nome-demonstracao" type="text" maxlength="60" autocomplete="' +
             (tipo === "empresa" ? "organization" : "name") + '" placeholder="' + perfil.exemplo + '"></div>',
      cancelar: "Voltar",
      confirmar: "Começar demonstração",
      aoConfirmar: function (caixa) {
        var nome = caixa.querySelector("#nome-demonstracao").value.trim().replace(/\s+/g, " ");
        if (nome.length < 2) {
          caixa.erro(tipo === "empresa" ? "Informe o nome da empresa para começar." : "Informe o seu nome para começar.");
          return false;
        }
        var permitido = tipo === "empresa" ? /^[0-9A-Za-zÀ-ÖØ-öø-ÿ' .&-]+$/ : /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/;
        if (!permitido.test(nome)) {
          caixa.erro(tipo === "empresa" ? "Use letras, números, espaço, ponto, hífen ou &." : "Use só letras no nome.");
          return false;
        }
        if (!Banco || !ProLinkModelos.base.disponivel()) {
          caixa.erro("A base de demonstração não está disponível neste navegador.");
          return false;
        }
        comecarDemonstracao(tipo, nome);
      }
    });
    var campo = document.getElementById("nome-demonstracao");
    if (campo) {
      campo.focus();
      campo.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") {
          evento.preventDefault();
          campo.closest(".denuncia-caixa").querySelector('[data-dialogo="confirmar"]').click();
        }
      });
    }
  }

  function escolherPerfilDaDemonstracao() {
    var I = window.ProLinkInteracoes;
    var escolhido = "";
    var caixa = I.dialogo({
      titulo: "Qual perfil você quer conhecer?",
      texto: "Cada perfil mostra as telas de um tipo de usuário do ProLink.",
      corpo: '<div class="perfis-demonstracao" role="radiogroup" aria-label="Perfil da demonstração">' +
        Object.keys(PERFIS_DEMONSTRACAO).map(function (tipo) {
          var p = PERFIS_DEMONSTRACAO[tipo];
          return '<button class="opcao-caminho" type="button" role="radio" aria-checked="false" data-perfil-demo="' + tipo + '">' +
            '<span class="sigla-perfil">' + p.sigla + "</span><strong>" + p.titulo + "</strong><span>" + p.descricao + "</span></button>";
        }).join("") + "</div>",
      cancelar: "Voltar",
      confirmar: "Continuar",
      aoConfirmar: function (dialogo) {
        if (!escolhido) { dialogo.erro("Escolha um dos perfis para continuar."); return false; }
        window.setTimeout(function () { pedirNomeDaDemonstracao(escolhido); }, 0);
      }
    });
    caixa.querySelectorAll("[data-perfil-demo]").forEach(function (opcao) {
      opcao.addEventListener("click", function () {
        escolhido = opcao.getAttribute("data-perfil-demo");
        caixa.erro("");
        caixa.querySelectorAll("[data-perfil-demo]").forEach(function (outra) {
          var marcada = outra === opcao;
          outra.setAttribute("aria-checked", marcada ? "true" : "false");
          if (marcada) { outra.setAttribute("aria-current", "true"); } else { outra.removeAttribute("aria-current"); }
        });
      });
      opcao.addEventListener("dblclick", function () {
        caixa.querySelector('[data-dialogo="confirmar"]').click();
      });
    });
  }

  function abrirDemonstracao() {
    var I = window.ProLinkInteracoes;
    if (!I) { return; }
    I.dialogo({
      titulo: "Modo de demonstração",
      texto: "Antes de começar, um aviso importante.",
      corpo:
        '<div class="aviso-demonstrativo">' +
        "<p><strong>Tudo o que você vai ver é demonstrativo.</strong> Os profissionais, as empresas, " +
        "os registros, as ARTs e CATs, os documentos, as mensagens, as avaliações e as denúncias que " +
        "aparecem nas telas são fictícios.</p>" +
        "<p>Não foram criadas contas para essas pessoas e empresas: são dados estáticos, que servem " +
        "apenas para mostrar como o ProLink funciona.</p>" +
        "<p>O que você fizer durante a demonstração fica guardado só neste navegador e não é enviado " +
        "a ninguém.</p></div>",
      cancelar: "Voltar",
      confirmar: "Entendi, continuar",
      aoConfirmar: function () {
        window.setTimeout(escolherPerfilDaDemonstracao, 0);
      }
    });
  }

  document.querySelectorAll("#entrar-demonstracao").forEach(function (botao) {
    botao.addEventListener("click", abrirDemonstracao);
  });

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

    if (sessaoAtual.modoDemonstracao) {
      faixa.className = "faixa-visitante faixa-boas-vindas faixa-demonstracao";
      faixa.innerHTML =
        "<div><strong>Modo de demonstração · Olá, " + textoSeguro(String(sessaoAtual.nome).split(/\s+/)[0]) +
        "</strong><p>Profissionais, empresas, documentos e dados desta tela são fictícios e servem só para " +
        "mostrar como o ProLink funciona.</p></div>" +
        '<button class="btn btn-sm btn-secundario" type="button" data-sair-demonstracao>Sair da demonstração</button>';
      faixa.querySelector("[data-sair-demonstracao]").addEventListener("click", function () {
        var sair = document.getElementById("sair-da-sessao");
        if (sair) { sair.click(); } else { ProLinkModelos.sessao.sair(); window.location.href = "login.html"; }
      });
    } else if (sessaoAtual.visitante) {
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
