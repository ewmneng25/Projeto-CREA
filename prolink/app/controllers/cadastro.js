/* ============================================================
   ProLink — controller: cadastro linear com consulta ao Crea
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

  /* ---------------------------------------------------------------------
     Cadastro — fluxo linear, uma decisão por tela

     A ordem é fixa e o indicador do topo não é clicável: só se avança pelo
     botão Continuar. Não existe botão de consultar: a busca no Crea acontece
     quando a pessoa avança da primeira tela, e o resultado escolhe a segunda:

        Crea achou     ->  Tipo > Documento > Registro > Acesso > Experiência
        Crea não achou ->  Tipo > Documento > Seus dados > Acesso > Experiência

     Tipo: pessoa física (CPF) ou pessoa jurídica (CNPJ).

     Registro mostra os principais dados do Crea logo depois da busca.
     Acesso pede a senha e o e-mail de contato do perfil (a API do Crea não
     tem e-mail). Entra-se com o documento informado e a senha.
     Em Seus dados a pessoa digita o que a consulta não trouxe, e o perfil
     fica sem o selo de verificado.
     --------------------------------------------------------------------- */
  var formCadastro = document.getElementById("form-cadastro");

  if (formCadastro) {
    var campoDocumento = document.getElementById("documento");
    var retorno = document.getElementById("retorno-crea");
    var aceiteUsoDados = document.getElementById("aceite-uso-dados");
    var listaPassos = document.getElementById("passos");

    /* Estado do cadastro. */
    var dadosDoCrea = null;       // o que a API devolveu, se devolveu
    var tipoEscolhido = "";       // "pf" | "pj": escolhido na primeira tela

    /* Pessoa física que o Crea não encontrou: não tem registro, então o
       cadastro pede dados pessoais e de perfil, nada ligado ao Crea. */
    function pfSemRegistro() {
      return tipoEscolhido === "pf" && modoConsulta === "nao-encontrado";
    }

    /* Pessoa jurídica que o Crea não encontrou: perfil da empresa, sem
       nenhum campo do Crea. A conta é de contratante. */
    function pjSemRegistro() {
      return tipoEscolhido === "pj" && modoConsulta === "nao-encontrado";
    }

    /* Campos obrigatórios de cada perfil sem registro; o resto é opcional. */
    var OBRIGATORIOS_SEM_REGISTRO = {
      pf: [["sr-nome", "o seu nome completo"], ["sr-profissao", "sua profissão ou ocupação"],
           ["sr-cidade", "a cidade"], ["sr-uf", "o estado"], ["sr-telefone", "um telefone ou WhatsApp"]],
      pj: [["ser-razao", "a razão social"], ["ser-cidade", "a cidade"], ["ser-uf", "o estado"],
           ["ser-telefone", "um telefone ou WhatsApp"]]
    };

    /* Campo de e-mail da tela de dados, conforme o bloco que aparece. */
    function campoEmailDeclarado() {
      if (pfSemRegistro()) { return "sr-email"; }
      if (pjSemRegistro()) { return "ser-email"; }
      return tipoDetectado === "contratante" ? "con-email"
           : (tipoDetectado === "empresa" ? "emp-email" : "dec-email");
    }
    var tipoDetectado = null;     // "profissional" | "empresa"
    var motivoSemRegistro = "";   // por que caímos na etapa de dados declarados
    var documentoConsultado = ""; // evita repetir a consulta ao voltar e avançar
    var modoConsulta = "";        // "nao-encontrado", "demonstracao", "erro"…
    var acervoImportado = { arts: [], cats: [] };
    var dadosEmpresa = { quadro: [], artsOperacionais: [] };
    var consultando = false;
    var fluxo = [];
    var indiceAtual = 0;

    function escapar(texto) {
      return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function valorDe(id) {
      var campo = document.getElementById(id);
      return campo ? campo.value.trim() : "";
    }

    function mostrarRetorno(classe, titulo, corpo) {
      if (!retorno) { return; }
      retorno.className = "retorno-crea " + classe;
      retorno.innerHTML = "<strong>" + escapar(titulo) + "</strong>" + (corpo || "");
      retorno.hidden = false;
    }

    /* 11 dígitos é CPF (pessoa), 14 é CNPJ (empresa). O dígito verificador
       não é conferido aqui: quem diz se o registro existe é o Crea. */
    function identificarDocumento(valor) {
      var digitos = String(valor || "").replace(/\D/g, "");
      if (digitos.length === 11) { return { tipo: "profissional", chave: "cpf", digitos: digitos }; }
      if (digitos.length === 14) { return { tipo: "empresa", chave: "cnpj", digitos: digitos }; }
      return null;
    }

    /* ---------------------------------------------------------------
       Caminho do cadastro
       --------------------------------------------------------------- */
    function recalcularFluxo() {
      fluxo = ["passo-tipo", "passo-documento"];

      if (dadosDoCrea) {
        /* Com registro: os dados do Crea aparecem logo, depois vem a
           comprovação pelo documento e só então o e-mail e a senha. */
        fluxo.push("passo-confirmacao");
        fluxo.push("passo-acesso");
      } else {
        /* Sem registro confirmado: os dados (inclusive o e-mail, que não
           veio do Crea) vêm antes da senha. */
        fluxo.push("passo-dados");
        fluxo.push("passo-acesso");
      }

      /* Quem só contrata não tem acervo, currículo nem projeto para mostrar:
         a etapa de experiência é de quem presta o serviço. */
      if (tipoDetectado !== "contratante") { fluxo.push("passo-experiencia"); }
    }

    function desenharPassos() {
      if (!listaPassos) { return; }

      /* A ordem visual segue o caminho, não a ordem do HTML: dependendo da
         resposta do Crea, Senha vem antes ou depois de Seus dados. */
      fluxo.forEach(function (id) {
        var item = listaPassos.querySelector('[data-etapa="' + id + '"]');
        if (item) { listaPassos.appendChild(item); }
      });

      listaPassos.querySelectorAll(".passo").forEach(function (item) {
        var posicao = fluxo.indexOf(item.getAttribute("data-etapa"));
        item.hidden = posicao === -1;
        if (posicao === -1) { return; }

        item.querySelector(".passo-num").textContent = posicao + 1;
        item.classList.toggle("passo-atual", posicao === indiceAtual);
        item.classList.toggle("passo-concluido", posicao < indiceAtual);
        if (posicao === indiceAtual) {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
      });
      listaPassos.style.setProperty("--colunas-passos", fluxo.length);
      /* Com 5 colunas o subtítulo não cabe; o número e o nome bastam. */
      listaPassos.classList.toggle("passos-compactos", fluxo.length > 4);
    }

    function mostrarEtapa(indice) {
      if (indice < 0 || indice >= fluxo.length) { return; }
      indiceAtual = indice;

      formCadastro.querySelectorAll(".etapa-cadastro").forEach(function (secao) {
        secao.hidden = secao.id !== fluxo[indice];
      });

      /* A última etapa do caminho fecha o cadastro, seja ela qual for. */
      var ultima = indice === fluxo.length - 1;
      var avancar = formCadastro.querySelector("#" + fluxo[indice] + " [data-passo='proximo']");
      if (avancar) {
        /* Guarda o rótulo próprio da tela ("Confirmar código", "Confirmar e
           continuar") para não sobrescrever com um "Continuar" genérico. */
        if (!avancar.dataset.rotulo) { avancar.dataset.rotulo = avancar.textContent.trim(); }
        avancar.textContent = ultima ? "Criar conta" : avancar.dataset.rotulo;
      }

      desenharPassos();
      window.scrollTo({ top: 0, behavior: "smooth" });

      var primeiro = formCadastro.querySelector(
        "#" + fluxo[indice] + " input:not([type=hidden]):not([disabled])");
      if (primeiro && indice > 0) { primeiro.focus(); }
    }

    /* ---------------------------------------------------------------
       Tela de confirmação: desenha a ficha que veio do Crea
       --------------------------------------------------------------- */
    function prepararConfirmacao() {
      var ficha = document.getElementById("resumo-crea");
      var titulo = document.getElementById("titulo-confirmacao");
      if (!ficha || !dadosDoCrea) { return; }

      var ehEmpresa = dadosDoCrea.tipo === "empresa";
      if (titulo) {
        titulo.textContent = ehEmpresa ? "Encontramos a empresa no Crea" : "Encontramos seu registro no Crea";
      }

      /* Só o que a API tem (MER): nada de cidade, contato ou situação da empresa. */
      var linhas = ehEmpresa
        ? [["Razão social", dadosDoCrea.nome],
           ["Nome fantasia", dadosDoCrea.fantasia],
           ["CNPJ", formatarCnpj(dadosDoCrea.cnpj)],
           ["Registro no Crea", dadosDoCrea.registro],
           ["Registrada desde", dadosDoCrea.dataRegistro]]
        : [["Nome", dadosDoCrea.nome],
           ["RNP", dadosDoCrea.rnp],
           ["Registro no Crea", dadosDoCrea.registro],
           ["Título profissional", dadosDoCrea.titulo],
           ["Situação", dadosDoCrea.situacao]];

      var itens = linhas.filter(function (par) { return par[1]; })
        .map(function (par) {
          return "<li><span>" + par[0] + "</span><strong>" + escapar(par[1]) + "</strong></li>";
        }).join("");

      var atribuicoes = "";
      if (dadosDoCrea.atribuicoes && dadosDoCrea.atribuicoes.length) {
        atribuicoes = '<div class="ficha-atribuicoes"><span>Modalidades</span><div class="competencias">' +
          dadosDoCrea.atribuicoes.map(function (item) {
            return '<span class="etiqueta">' + escapar(item) + "</span>";
          }).join("") + "</div></div>";
      }

      ficha.innerHTML =
        '<div class="ficha-cabecalho">' +
          '<span class="etiqueta etiqueta-verde">Registro encontrado no Crea</span>' +
        "</div>" +
        '<ul class="retorno-lista">' + itens + "</ul>" + atribuicoes;

      desenharAcervo(null);
      if (ehEmpresa) {
        Promise.all([
          window.ProLinkCrea.quadroTecnico(dadosDoCrea.registro),
          window.ProLinkCrea.acervoOperacional(dadosDoCrea.registro)
        ]).then(function (respostas) { desenharEmpresa(respostas[0], respostas[1]); });
      } else {
        window.ProLinkCrea.listarAcervo(dadosDoCrea).then(desenharAcervo);
      }
    }

    function formatarCnpj(valor) {
      var d = String(valor || "").replace(/\D/g, "");
      return d.length === 14
        ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
        : d;
    }

    /* ---------------------------------------------------------------
       Empresa: quadro técnico e acervo operacional (CAO)
       --------------------------------------------------------------- */
    function desenharEmpresa(quadro, cao) {
      var caixa = document.getElementById("acervo-importado");
      if (!caixa) { return; }

      if (!quadro.ok && !cao.ok) {
        caixa.className = "acervo-importado acervo-falha";
        caixa.innerHTML = "<strong>Quadro técnico e acervo não carregados</strong><p>" +
          "Você pode atualizar depois.</p>";
        return;
      }

      dadosEmpresa = { quadro: quadro.itens || [], artsOperacionais: cao.arts || [] };

      var vinculos = dadosEmpresa.quadro.length
        ? "<ul class='acervo-lista'>" + dadosEmpresa.quadro.map(function (v) {
            var periodo = v.inicio ? (v.ativo ? "desde " + v.inicio : v.inicio + " a " + v.fim) : "";
            return "<li><div><strong>" + escapar(v.nome) + "</strong><span>" +
              escapar([v.funcao, v.rnp ? "RNP " + v.rnp : ""].filter(Boolean).join(" · ")) +
              "</span></div><span class='acervo-data'>" + escapar(periodo) + "</span></li>";
          }).join("") + "</ul>"
        : "<p class='dica'>" + escapar(quadro.ok ? "Nenhum profissional vinculado."
                                                 : (quadro.mensagem || "")) + "</p>";

      var arts = dadosEmpresa.artsOperacionais.length
        ? "<ul class='acervo-lista'>" + dadosEmpresa.artsOperacionais.map(function (a) {
            return "<li><div><strong>ART " + escapar(a.numero) + "</strong><span>" +
              escapar([a.obra, a.profissional].filter(Boolean).join(" · ")) +
              "</span></div><span class='acervo-data'>" + escapar(a.situacao || "") + "</span></li>";
          }).join("") + "</ul>"
        : "<p class='dica'>" + escapar(cao.ok ? "Nenhuma ART no acervo operacional."
                                              : (cao.mensagem || "")) + "</p>";

      caixa.className = "acervo-importado";
      caixa.innerHTML =
        "<div class='acervo-cabecalho'><span class='etiqueta etiqueta-verde'>Dados da empresa no Crea</span></div>" +
        "<div class='acervo-grupo'><h4>Quadro técnico <span>" + dadosEmpresa.quadro.length +
          "</span></h4>" + vinculos + "</div>" +
        "<div class='acervo-grupo'><h4>Acervo operacional (ARTs) <span>" +
          dadosEmpresa.artsOperacionais.length + "</span></h4>" + arts + "</div>";
    }


    /* ---------------------------------------------------------------
       Acervo técnico: importado, não digitado

       O profissional não informa números de ART e CAT. O sistema pede a
       lista ao Crea com o RNP que veio da consulta. Se a API não tiver
       endpoint de listagem, a conta é criada sem acervo — e nunca, em
       nenhuma hipótese, saindo por aí testando números para descobrir.
       --------------------------------------------------------------- */
    function desenharAcervo(resultado) {
      var caixa = document.getElementById("acervo-importado");
      if (!caixa) { return; }

      if (!resultado) {
        caixa.className = "acervo-importado acervo-carregando";
        caixa.innerHTML = "<strong>Buscando o acervo no Crea…</strong>";
        return;
      }

      if (!resultado.ok) {
        caixa.className = "acervo-importado acervo-falha";
        caixa.innerHTML = "<strong>Acervo não importado</strong><p>" +
          "Você pode importar depois, " +
          "na tela de documentos.</p>";
        return;
      }

      acervoImportado = { arts: resultado.arts || [], cats: resultado.cats || [] };

      function listar(titulo, itens, rotulo) {
        if (!itens.length) {
          return "<div class='acervo-grupo'><h4>" + titulo +
                 "</h4><p class='dica'>Nenhuma " + rotulo + " neste registro.</p></div>";
        }
        return "<div class='acervo-grupo'><h4>" + titulo + " <span>" + itens.length +
          "</span></h4><ul class='acervo-lista'>" + itens.map(function (item) {
            return "<li><div><strong>" + rotulo + " " + escapar(item.numero || "") + "</strong>" +
              "<span>" + escapar(item.atividade || "") +
              (item.obra ? " · " + escapar(item.obra) : "") + "</span></div>" +
              "<span class='acervo-data'>" + escapar(item.data || "") + "</span></li>";
          }).join("") + "</ul></div>";
      }

      caixa.className = "acervo-importado";
      caixa.innerHTML =
        "<div class='acervo-cabecalho'><span class='etiqueta etiqueta-verde'>Acervo importado do Crea</span>" +
        "</div>" +
        listar("ARTs", acervoImportado.arts, "ART") +
        listar("CATs", acervoImportado.cats, "CAT");
    }

    /* ---------------------------------------------------------------
       Tela de dados declarados: bloco certo e o motivo de ter aparecido
       --------------------------------------------------------------- */
    function prepararEtapaDados() {
      var titulo = document.getElementById("titulo-dados");
      var motivo = document.getElementById("motivo-dados");
      var escolha = document.getElementById("escolha-caminho");

      var bloco = {
        profissional: document.getElementById("dados-profissional"),
        empresa: document.getElementById("dados-empresa"),
        contratante: document.getElementById("dados-contratante"),
        semRegistro: document.getElementById("dados-sem-registro"),
        empresaSemRegistro: document.getElementById("dados-empresa-sem-registro")
      };

      /* Registro não encontrado: nunca houve registro no Crea, então só os
         dados que não dependem do Crea (nome, cidade, contato) e nenhuma
         escolha de caminho. Consulta indisponível ou comprovação adiada: a
         pessoa pode ter registro, e continua podendo declarar os dados. */
      var ehPf = tipoEscolhido === "pf";
      /* Pessoa física é sempre profissional: nunca vira contratante nem
         empresa, mesmo que o Crea não encontre o registro. */
      var semRegistro = modoConsulta === "nao-encontrado" && !ehPf;
      var ehCnpj = tipoEscolhido === "pj";
      var tipo = pfSemRegistro() ? "semRegistro"
               : pjSemRegistro() ? "empresaSemRegistro"
               : ehPf ? "profissional"
               : semRegistro || tipoDetectado === "contratante" ? "contratante"
               : (tipoDetectado === "empresa" ? "empresa" : "profissional");
      if (escolha) { escolha.hidden = semRegistro || ehPf; }


      var rotuloNome = document.querySelector('label[for="con-nome"]');
      var campoNome = document.getElementById("con-nome");
      if (rotuloNome && campoNome) {
        rotuloNome.textContent = semRegistro ? (ehCnpj ? "Razão social" : "Nome completo") : "Nome ou razão social";
        campoNome.placeholder = semRegistro
          ? (ehCnpj ? "Nome registrado da empresa" : "Seu nome completo")
          : "Como você quer aparecer para os profissionais";
        campoNome.setAttribute("autocomplete", semRegistro && !ehCnpj ? "name" : "organization");
      }

      Object.keys(bloco).forEach(function (chave) {
        if (bloco[chave]) { bloco[chave].hidden = chave !== tipo; }
      });

      if (escolha) {
        escolha.querySelectorAll("[data-caminho]").forEach(function (botao) {
          var atual = botao.getAttribute("data-caminho") === "contratante"
            ? tipo === "contratante"
            : tipo !== "contratante";
          if (atual) {
            botao.setAttribute("aria-current", "true");
          } else {
            botao.removeAttribute("aria-current");
          }
        });
      }

      if (titulo) {
        titulo.textContent = tipo === "semRegistro" ? "Seus dados e seu perfil"
                           : tipo === "empresaSemRegistro" ? "Dados e perfil da empresa"
                           : semRegistro ? (ehCnpj ? "Dados da empresa" : "Seus dados")
                           : tipo === "contratante" ? "Dados do contratante"
                           : tipo === "empresa" ? "Dados da empresa"
                           : "Seus dados profissionais";
      }

      if (motivo && ehPf && modoConsulta === "nao-encontrado") {
        motivo.innerHTML = "<strong>Registro não encontrado no Crea</strong>" +
          "<p>Sem problema: conte um pouco sobre você para criar seu perfil.</p>";
      } else if (motivo && ehPf) {
        motivo.innerHTML = "<strong>Não foi possível confirmar o registro agora</strong>" +
          "<p>Preencha seus dados abaixo.</p>";
      } else if (motivo && semRegistro) {
        motivo.innerHTML = "<strong>Registro não encontrado no Crea</strong>" +
          "<p>Sem problema: conte um pouco sobre a empresa para criar o perfil dela.</p>";
      } else if (motivo) {
        motivo.innerHTML = "<strong>" + (modoConsulta === "nao-encontrado"
            ? "Registro não encontrado no Crea" : "Não foi possível confirmar o registro agora") +
          "</strong><p>Preencha os dados abaixo.</p>";
      }
    }

    /* Trocar de caminho refaz o fluxo: contratante perde a etapa de
       experiência, e o rótulo do botão final muda junto. */
    document.querySelectorAll("[data-caminho]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var escolhido = botao.getAttribute("data-caminho");

        if (escolhido === "contratante" && tipoEscolhido !== "pf") {
          tipoDetectado = "contratante";
        } else {
          tipoDetectado = tipoEscolhido === "pj" ? "empresa" : "profissional";
        }

        recalcularFluxo();
        prepararEtapaDados();
        mostrarEtapa(fluxo.indexOf("passo-dados"));
      });
    });

    /* ---------------------------------------------------------------
       Tipo de conta: pessoa física ou jurídica

       Pessoa física (engenheiro ou profissional técnico) entra com o CPF
       (11 dígitos); pessoa jurídica (empresa), com o CNPJ (14 dígitos).
       A escolha limita o que o campo de documento aceita e onde a busca
       no Crea procura.
       --------------------------------------------------------------- */
    function prepararDocumento() {
      var ehPj = tipoEscolhido === "pj";
      var rotulo = document.querySelector('label[for="documento"]');
      var titulo = document.getElementById("titulo-documento");
      var dicaPasso = document.getElementById("passo-documento-dica");

      if (rotulo) { rotulo.textContent = ehPj ? "CNPJ" : "CPF"; }
      if (campoDocumento) {
        campoDocumento.placeholder = ehPj ? "CNPJ da empresa, somente números" : "Seu CPF, somente números";
        campoDocumento.setAttribute("inputmode", "numeric");
      }
      if (titulo) { titulo.textContent = ehPj ? "Qual é o documento da empresa?" : "Qual é o seu documento?"; }
      if (dicaPasso) { dicaPasso.textContent = ehPj ? "CNPJ" : "CPF"; }
    }

    function escolherTipoConta(tipo) {
      if (tipo === tipoEscolhido) { return; }
      var trocou = Boolean(tipoEscolhido);
      tipoEscolhido = tipo;

      formCadastro.querySelectorAll("[data-tipo-conta]").forEach(function (opcao) {
        var marcado = opcao.getAttribute("data-tipo-conta") === tipo;
        opcao.setAttribute("aria-checked", marcado ? "true" : "false");
        if (marcado) { opcao.setAttribute("aria-current", "true"); } else { opcao.removeAttribute("aria-current"); }
      });
      var erroTipo = document.getElementById("erro-tipo-conta");
      if (erroTipo) { erroTipo.hidden = true; }

      /* Trocou de PF para PJ (ou o contrário): o documento e a consulta
         anteriores não valem mais. */
      if (trocou) {
        if (campoDocumento) { campoDocumento.value = ""; }
        dadosDoCrea = null;
        documentoConsultado = "";
        motivoSemRegistro = "";
        modoConsulta = "";
        tipoDetectado = null;
        if (retorno) { retorno.hidden = true; }
      }
      tipoDetectado = tipoDetectado || (tipo === "pj" ? "empresa" : "profissional");
      prepararDocumento();
      recalcularFluxo();
      desenharPassos();
    }

    formCadastro.querySelectorAll("[data-tipo-conta]").forEach(function (opcao) {
      opcao.addEventListener("click", function () {
        escolherTipoConta(opcao.getAttribute("data-tipo-conta"));
      });
      /* Duplo clique escolhe e já segue para o documento. */
      opcao.addEventListener("dblclick", function () {
        escolherTipoConta(opcao.getAttribute("data-tipo-conta"));
        prepararDocumento();
        mostrarEtapa(fluxo.indexOf("passo-documento"));
      });
    });

    /* ---------------------------------------------------------------
       A consulta ao Crea: acontece ao avançar da primeira tela
       --------------------------------------------------------------- */
    function consultarEAvancar(botao) {
      var digitos = campoDocumento.value.replace(/\D/g, "");

      var ehPj = tipoEscolhido === "pj";
      /* Pessoa física entra só com CPF (11 dígitos); pessoa jurídica, só
         com CNPJ (14 dígitos). */
      if (!ehPj && digitos.length === 14) {
        mostrarRetorno("retorno-atencao", "Esse número é um CNPJ",
          "<p>Conta de pessoa física entra com o CPF. Se é uma empresa, volte e escolha pessoa jurídica.</p>");
        campoDocumento.focus();
        return;
      }
      if (ehPj && digitos.length === 11) {
        mostrarRetorno("retorno-atencao", "Esse número é um CPF",
          "<p>Conta de pessoa jurídica entra com o CNPJ. Se você é engenheiro(a), volte e escolha pessoa física.</p>");
        campoDocumento.focus();
        return;
      }
      if (digitos.length !== (ehPj ? 14 : 11)) {
        mostrarRetorno("retorno-atencao", ehPj ? "CNPJ incompleto" : "CPF incompleto",
          "<p>" + (ehPj ? "O CNPJ tem 14 dígitos." : "O CPF tem 11 dígitos.") + "</p>");
        campoDocumento.focus();
        return;
      }

      /* Já consultamos este mesmo número: segue sem repetir a chamada. */
      if (documentoConsultado === digitos) {
        avancarDoDocumento();
        return;
      }

      if (consultando) { return; }
      consultando = true;
      botao.disabled = true;
      mostrarRetorno("retorno-carregando", "Verificando…", "");

      window.ProLinkCrea.localizar(digitos, tipoEscolhido).then(function (resultado) {
        consultando = false;
        botao.disabled = false;
        documentoConsultado = digitos;
        modoConsulta = resultado.modo || "";

        if (resultado.ok) {
          dadosDoCrea = resultado.dados;
          tipoDetectado = dadosDoCrea.tipo || "profissional";
          motivoSemRegistro = "";
        } else {
          dadosDoCrea = null;
          /* O Crea respondeu que não há registro: é alguém que nunca se
             registrou, então a conta é de quem contrata e não pede nada do
             Crea. Consulta indisponível é outra história: a pessoa pode ter
             registro, e o tipo sai do formato do número. */
          tipoDetectado = tipoEscolhido === "pf" ? "profissional"
                        : (resultado.modo === "nao-encontrado" ? "contratante" : "empresa");
          motivoSemRegistro = resultado.mensagem;
        }

        if (retorno) { retorno.hidden = true; }
        recalcularFluxo();
        avancarDoDocumento();
      });
    }

    function avancarDoDocumento() {
      recalcularFluxo();
      /* Achou: os principais dados aparecem já na tela seguinte. */
      if (dadosDoCrea) { prepararConfirmacao(); } else { prepararEtapaDados(); }
      mostrarEtapa(fluxo.indexOf("passo-documento") + 1);
    }

    /* Documento novo depois de uma consulta: a resposta antiga não vale mais. */
    if (campoDocumento) {
      campoDocumento.addEventListener("input", function () {
        var digitos = campoDocumento.value.replace(/\D/g, "");
        if (digitos !== documentoConsultado) {
          dadosDoCrea = null;
          documentoConsultado = "";
          motivoSemRegistro = "";
          recalcularFluxo();
          desenharPassos();
        }
      });
    }

    if (aceiteUsoDados) {
      aceiteUsoDados.addEventListener("change", function () {
        var aviso = document.getElementById("aviso-confirmacao");
        if (aviso && aceiteUsoDados.checked) { aviso.remove(); }
      });
    }

    /* "Não sou eu": volta para trocar o documento. */
    var botaoCorrigir = document.getElementById("corrigir-documento");
    if (botaoCorrigir) {
      botaoCorrigir.addEventListener("click", function () {
        mostrarEtapa(fluxo.indexOf("passo-documento"));
        campoDocumento.focus();
        campoDocumento.select();
      });
    }

    /* ---------------------------------------------------------------
       Tela de acesso: e-mail e senha

       A API do Crea não tem e-mail, então quem tem registro informa o
       e-mail aqui. Quem não tem registro já informou na tela de dados.
       --------------------------------------------------------------- */
    function emailValido(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }

    function prepararAcesso() {
      var caixa = document.getElementById("login-do-crea");
      var blocoEmail = document.getElementById("bloco-email-cad");
      if (blocoEmail) { blocoEmail.hidden = !dadosDoCrea; }
      if (!caixa) { return; }

      if (dadosDoCrea) {
        caixa.className = "login-do-crea";
        caixa.innerHTML =
          "<strong>Registro confirmado no Crea</strong>" +
          "<p>Você vai entrar com o documento e a senha.</p>";
      } else {
        var declarado = valorDe(campoEmailDeclarado());
        caixa.className = "login-do-crea login-declarado";
        caixa.innerHTML =
          "<strong>Seu login será o e-mail que você informou</strong>" +
          "<p>" + (declarado ? escapar(declarado) : "Volte uma tela para informar o e-mail.") + "</p>";
      }
    }

    /* ---------------------------------------------------------------
       Botões Continuar / Voltar
       --------------------------------------------------------------- */
    function podeSairDaConfirmacao() {
      if (!aceiteUsoDados || !aceiteUsoDados.checked) {
        mostrarAvisoConfirmacao();
        aceiteUsoDados.focus();
        return false;
      }
      return true;
    }

    function mostrarAvisoConfirmacao() {
      var ficha = document.getElementById("resumo-crea");
      if (!ficha) { return; }
      var aviso = document.getElementById("aviso-confirmacao");
      if (!aviso) {
        aviso = document.createElement("p");
        aviso.id = "aviso-confirmacao";
        aviso.className = "erro-inline";
        ficha.parentNode.insertBefore(aviso, ficha.nextSibling);
      }
      aviso.textContent = "Confirme que os dados são seus para continuar.";
    }

    function podeSairDoAcesso() {
      if (dadosDoCrea && !emailValido(valorDe("email-cad"))) {
        alert("Informe um e-mail válido: ele será o seu login.");
        document.getElementById("email-cad").focus();
        return false;
      }

      var senha = valorDe("senha-cad");
      var confirmacao = valorDe("senha-conf");

      if (senha.length < 8) {
        alert("A senha precisa de pelo menos 8 caracteres.");
        document.getElementById("senha-cad").focus();
        return false;
      }
      if (senha !== confirmacao) {
        alert("As duas senhas não são iguais.");
        document.getElementById("senha-conf").focus();
        return false;
      }

      var aceiteTermos = document.getElementById("aceite-termos");
      if (!aceiteTermos || !aceiteTermos.checked) {
        alert("Para criar a conta é preciso aceitar os termos de uso e a política de privacidade.");
        if (aceiteTermos) { aceiteTermos.focus(); }
        return false;
      }
      return true;
    }

    /* Sem registro confirmado, o e-mail é digitado na tela de dados. */
    function podeSairDosDados() {
      var obrigatorios = pfSemRegistro() ? OBRIGATORIOS_SEM_REGISTRO.pf
                       : pjSemRegistro() ? OBRIGATORIOS_SEM_REGISTRO.pj : null;
      if (obrigatorios) {
        for (var k = 0; k < obrigatorios.length; k++) {
          var idCampo = obrigatorios[k][0];
          var valor = valorDe(idCampo);
          var curto = idCampo.indexOf("telefone") !== -1 ? valor.replace(/\D/g, "").length < 10 : valor.length < 2;
          if (curto) {
            alert("Informe " + obrigatorios[k][1] + ".");
            document.getElementById(idCampo).focus();
            return false;
          }
        }
      } else if (tipoDetectado === "profissional" && valorDe("dec-nome").length < 3) {
        alert("Informe o seu nome completo.");
        document.getElementById("dec-nome").focus();
        return false;
      }
      if (!obrigatorios && tipoDetectado === "contratante" && valorDe("con-nome").length < 3) {
        alert(document.querySelector('label[for="con-nome"]').textContent.trim() === "Razão social"
          ? "Informe a razão social da empresa."
          : "Informe o seu nome completo: é como você aparece para os profissionais.");
        document.getElementById("con-nome").focus();
        return false;
      }

      var campoEmail = campoEmailDeclarado();
      var email = valorDe(campoEmail);

      if (email.indexOf("@") === -1 || email.length < 5) {
        alert("Informe um e-mail válido: ele será o seu login.");
        document.getElementById(campoEmail).focus();
        return false;
      }
      return true;
    }

    formCadastro.querySelectorAll("[data-passo]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var etapa = fluxo[indiceAtual];

        if (botao.dataset.passo === "anterior") {
          mostrarEtapa(indiceAtual - 1);
          return;
        }

        /* Primeira tela: pessoa física ou jurídica. */
        if (etapa === "passo-tipo") {
          if (!tipoEscolhido) {
            var erroTipo = document.getElementById("erro-tipo-conta");
            if (erroTipo) { erroTipo.hidden = false; }
            var primeiraOpcao = formCadastro.querySelector("[data-tipo-conta]");
            if (primeiraOpcao) { primeiraOpcao.focus(); }
            return;
          }
          prepararDocumento();
          mostrarEtapa(fluxo.indexOf("passo-documento"));
          return;
        }

        /* Avançar da tela do documento É a consulta ao Crea. */
        if (etapa === "passo-documento") { consultarEAvancar(botao); return; }

        if (etapa === "passo-confirmacao" && !podeSairDaConfirmacao()) { return; }
        if (etapa === "passo-dados" && !podeSairDosDados()) { return; }
        if (etapa === "passo-acesso" && !podeSairDoAcesso()) { return; }

        if (indiceAtual === fluxo.length - 1) { finalizarCadastro(); return; }

        var proxima = fluxo[indiceAtual + 1];
        if (proxima === "passo-acesso") { prepararAcesso(); }
        if (proxima === "passo-experiencia") { prepararExperiencia(); }

        mostrarEtapa(indiceAtual + 1);
      });
    });

    /* Portfólio: duplica o bloco de projeto. */
    var addProjeto = document.getElementById("add-projeto");
    var listaProjetos = document.getElementById("lista-projetos");

    if (addProjeto && listaProjetos) {
      addProjeto.addEventListener("click", function () {
        var n = listaProjetos.children.length + 1;
        var modelo = listaProjetos.firstElementChild.cloneNode(true);

        modelo.querySelector("legend").textContent = "Projeto " + n;
        modelo.querySelectorAll("input, select, textarea").forEach(function (campo) {
          var novoId = campo.id.replace(/-\d+$/, "-" + n);
          var rotulo = modelo.querySelector('label[for="' + campo.id + '"]');
          if (rotulo) { rotulo.setAttribute("for", novoId); }
          campo.id = novoId;
          if (campo.tagName === "SELECT") { campo.selectedIndex = 0; } else { campo.value = ""; }
        });

        listaProjetos.appendChild(modelo);
        modelo.querySelector("input").focus();
      });
    }

    /* ---------------------------------------------------------------
       Criar conta: salva no navegador (sem servidor e sem banco).
       --------------------------------------------------------------- */
    function finalizarCadastro(pularExperiencia) {
        pularExperiencia = pularExperiencia === true;
        var aceiteTermos = document.getElementById("aceite-termos");

        if (!aceiteTermos || !aceiteTermos.checked) {
          alert("Para criar a conta é preciso aceitar os termos de uso e a política de privacidade.");
          mostrarEtapa(fluxo.indexOf("passo-acesso"));
          if (aceiteTermos) { aceiteTermos.focus(); }
          return;
        }

        var documento = valorDe("documento");

        /* Quem o Crea não confirmou entra com o que declarou na etapa 2. */
        var semRegistroPf = pfSemRegistro();
        var semRegistroPj = pjSemRegistro();
        var declarado = semRegistroPj
          ? { nome: valorDe("ser-razao"), registro: "", uf: valorDe("ser-uf"),
              cidade: valorDe("ser-cidade"), titulo: valorDe("ser-area") || "Empresa",
              rnp: "", situacao: "Sem registro" }
          : semRegistroPf
          ? { nome: valorDe("sr-nome"), registro: "", uf: valorDe("sr-uf"),
              cidade: valorDe("sr-cidade"), titulo: valorDe("sr-profissao"),
              rnp: "", situacao: "Sem registro" }
          : tipoDetectado === "contratante"
          ? { nome: valorDe("con-nome"), registro: "", uf: valorDe("con-uf"),
              cidade: valorDe("con-cidade"), titulo: "Contratante sem registro no Crea",
              rnp: "", situacao: "Sem registro" }
          : tipoDetectado === "empresa"
          ? { nome: valorDe("emp-nome"), registro: valorDe("emp-registro"),
              uf: valorDe("emp-uf"), cidade: valorDe("emp-cidade"),
              titulo: "Empresa registrada", rnp: "", situacao: "Declarada",
              responsavel: valorDe("emp-responsavel") }
          : { nome: valorDe("dec-nome"), registro: valorDe("dec-registro"),
              uf: valorDe("dec-uf"), cidade: valorDe("dec-cidade"),
              titulo: valorDe("dec-titulo"), rnp: valorDe("dec-rnp"),
              situacao: valorDe("dec-situacao") };

        function preferirCrea(campoCrea, campoDeclarado) {
          return (dadosDoCrea && dadosDoCrea[campoCrea]) || declarado[campoDeclarado] || "";
        }

        var emailCadastro = (dadosDoCrea
          ? valorDe("email-cad")
          : valorDe(campoEmailDeclarado())).toLowerCase();
        if (!Banco || !ProLinkModelos.base.disponivel()) {
          alert("A base de dados CSV não abriu neste navegador. Recarregue a página.");
          return;
        }
        var documentoLogin = String(documento || campoDocumento.value).replace(/\D/g, "");
        if (ProLinkModelos.usuarios.porDocumento(documentoLogin)) {
          alert("Já existe uma conta com esse documento. Entre por ela ou recupere a senha.");
          return;
        }
        /* O e-mail também serve de login, então não pode repetir. */
        if (emailCadastro && ProLinkModelos.usuarios.porEmail(emailCadastro)) {
          alert("Já existe uma conta com esse e-mail. Entre por ela ou use outro e-mail.");
          return;
        }

        var dadosDaConta = {
          /* A escolha da primeira tela manda: pessoa física é sempre profissional. */
          tipoConta: tipoEscolhido === "pf" ? "profissional" : (tipoDetectado || "empresa"),
          documentoLogin: documentoLogin,
          situacaoConta: dadosDoCrea ? "Verificado"
                         : (tipoDetectado === "contratante" || semRegistroPf ? "Sem registro" : "Não verificado"),
          cadastroEm: new Date().toLocaleDateString("pt-BR"),
          verificado: Boolean(dadosDoCrea),
          origemDados: dadosDoCrea ? "crea" : "declarado",
          nome: preferirCrea("nome", "nome") || "Perfil não verificado",
          documento: documento,
          rnp: preferirCrea("rnp", "rnp"),
          rne: (dadosDoCrea && dadosDoCrea.rne) || "",
          email: emailCadastro,
          /* E-mail de contato do perfil, informado pela pessoa; não é login. */
          cnpj: (dadosDoCrea && dadosDoCrea.cnpj) || "",
          fantasia: (dadosDoCrea && dadosDoCrea.fantasia) || (semRegistroPj ? valorDe("ser-fantasia") : ""),
          modalidades: (dadosDoCrea && dadosDoCrea.atribuicoes) || [],
          quadroTecnico: dadosEmpresa.quadro,
          acervoOperacional: dadosEmpresa.artsOperacionais,
          titulo: preferirCrea("titulo", "titulo"),
          registro: preferirCrea("registro", "registro"),
          ufRegistro: preferirCrea("uf", "uf") || "AM",
          situacao: preferirCrea("situacao", "situacao"),
          cidadeExibicao: preferirCrea("cidade", "cidade"),
          /* Pessoa física sem registro: perfil declarado, sem dado do Crea. */
          semRegistroCrea: semRegistroPf || semRegistroPj,
          sobre: semRegistroPf ? valorDe("sr-sobre") : (semRegistroPj ? valorDe("ser-sobre") : ""),
          telefone: semRegistroPf ? valorDe("sr-telefone") : (semRegistroPj ? valorDe("ser-telefone") : ""),
          porte: semRegistroPj ? valorDe("ser-porte") : "",
          areaAtuacao: semRegistroPj ? valorDe("ser-area") : "",
          site: semRegistroPj ? valorDe("ser-site") : "",
          formacao: semRegistroPf ? valorDe("sr-formacao") : "",
          nascimento: semRegistroPf ? valorDe("sr-nascimento") : "",
          habilidades: semRegistroPf
            ? valorDe("sr-habilidades").split(",").map(function (h) { return h.trim(); }).filter(Boolean)
            : [],
          arts: acervoImportado.arts,
          cats: acervoImportado.cats,
          consentimentos: {
            usoDadosCrea: !!(aceiteUsoDados || {}).checked,
            termos: true,
            visibilidade: !!(document.getElementById("aceite-visibilidade") || {}).checked,
            avisos: !!(document.getElementById("aceite-avisos") || {}).checked
          }
        };

        /* A senha vai para o CSV só como hash SHA-256 com sal próprio da conta. */
        var sal = Array.prototype.map.call(window.crypto.getRandomValues(new Uint8Array(12)), function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
        hashDaSenha(sal, valorDe("senha-cad")).then(function (hash) {
          dadosDaConta.senhaSal = sal;
          dadosDaConta.senhaHash = hash;
          var novaConta = ProLinkModelos.usuarios.inserir(dadosDaConta);
          if (!novaConta) {
            alert("Não foi possível gravar a conta na base de dados CSV.");
            return;
          }
          ProLinkModelos.sessao.entrar(novaConta.id);
          ProLinkModelos.auditoria.registrar("Cadastro", novaConta.nome + " (" + novaConta.tipoConta + ")", novaConta.email);
          if (novaConta.tipoConta === "profissional") { criarFichaNoDiretorio(novaConta); }

          /* Empresa e contratante entram pelo lado de quem contrata. */
          /* "Preencher depois": a conta nasce sem currículo e sem projetos;
             a pessoa completa em Meu portfólio (ou no perfil, se for empresa). */
          if (pularExperiencia) {
            ProLinkModelos.auditoria.registrar("Cadastro", "Experiência deixada para depois", novaConta.email);
          }
          (pularExperiencia ? Promise.resolve() : gravarExperiencia(novaConta)).then(function () {
            irCom("Criando sua conta…",
                  novaConta.tipoConta === "contratante" || novaConta.tipoConta === "empresa" ? "empresa-inicio.html" : "inicio.html");
          });
        });
    }

    /* ---------------------------------------------------------------
       Ficha no diretório de profissionais

       É ela que aparece nas buscas das empresas e entra no cálculo de
       compatibilidade. Áreas e acervo saem do título, das competências
       e das ARTs e CATs importadas do Crea; nota e avaliações começam
       zeradas, porque só contrato registrado gera avaliação.
       --------------------------------------------------------------- */
    var PALAVRAS_DA_AREA = {
      "Estrutural": ["civil", "estrutur", "concreto", "fundac", "laudo", "edifica", "metalic"],
      "Elétrica": ["eletric", "spda", "subestac", "fotovolt", "solar", "energia"],
      "Hidráulica": ["sanit", "hidraul", "saneamento", "drenagem", "agua", "esgoto"],
      "Ambiental": ["ambient", "licenciamento", "impacto", "residuo", "florest"],
      "Geotecnia": ["geolog", "geotec", "sondagem", "talude", "minas"],
      "Mecânica": ["mecanic", "climatiz", "tubulac", "caldeira", "vaso", "incendio"],
      "Agronomia": ["agron", "agric", "irrigac", "rural", "solo"],
      "BIM": ["bim", "revit", "compatibiliz", "orcamento"]
    };
    function semAcento(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    function areasDoTexto(texto) {
      var t = semAcento(texto);
      return Object.keys(PALAVRAS_DA_AREA).filter(function (area) {
        return PALAVRAS_DA_AREA[area].some(function (p) { return t.indexOf(p) !== -1; });
      });
    }
    function criarFichaNoDiretorio(conta) {
      var acervo = [];
      (conta.arts || []).forEach(function (a) { acervo.push({ tipo: "ART", numero: a.numero, atividade: a.atividade || "", area: areasDoTexto(a.atividade)[0] || "" }); });
      (conta.cats || []).forEach(function (c) { acervo.push({ tipo: "CAT", numero: c.numero, atividade: c.atividade || "", area: areasDoTexto(c.atividade)[0] || "" }); });
      var porArea = {};
      acervo.forEach(function (d) { if (d.area) { porArea[d.area] = (porArea[d.area] || 0) + 1; } });
      var competencias = (conta.habilidades || []).slice();
      var areas = areasDoTexto([conta.titulo, (conta.modalidades || []).join(" "), competencias.join(" ")].join(" "));
      Object.keys(porArea).forEach(function (a) { if (areas.indexOf(a) === -1) { areas.push(a); } });
      var partes = String(conta.nome || "").split(/\s+/).filter(function (p) { return p.length > 2; });
      var cidade = String(conta.cidadeExibicao || "").split(",")[0].trim();
      var ficha = ProLinkModelos.profissionais.inserir({
        nome: conta.nome,
        iniciais: partes.length ? (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() : "--",
        cor: "", titulo: conta.titulo || "",
        registro: conta.verificado && conta.registro ? "CREA-" + (conta.ufRegistro || "AM") + " " + conta.registro : "",
        rnp: conta.rnp || "", cidade: cidade, uf: valorDe("sr-uf") || valorDe("dec-uf") || conta.ufRegistro || "AM",
        nota: 0, avaliacoes: 0, verificado: !!conta.verificado, atendeEstado: false,
        areas: areas, acervoPorArea: porArea, competencias: competencias, acervo: acervo,
        resumo: conta.sobre || conta.titulo || ""
      });
      if (ficha) { ProLinkModelos.usuarios.atualizar(conta.id, { profissionalId: ficha.id }); }
    }

    /* ---------------------------------------------------------------
       Experiência: profissional mostra currículo e projetos; empresa
       mostra apresentação, áreas de atuação e obras executadas.
       --------------------------------------------------------------- */
    function prepararExperiencia() {
      var ehEmpresa = tipoDetectado === "empresa";
      var blocoProf = document.getElementById("experiencia-profissional");
      var blocoEmp = document.getElementById("experiencia-empresa");
      if (blocoProf) { blocoProf.hidden = ehEmpresa; }
      if (blocoEmp) { blocoEmp.hidden = !ehEmpresa; }
      var titulo = document.getElementById("titulo-experiencia");
      var dica = document.getElementById("dica-experiencia");
      if (titulo) { titulo.textContent = ehEmpresa ? "Sua empresa" : "Sua experiência"; }
      if (dica) {
        dica.textContent = ehEmpresa
          ? "Tudo nesta etapa é opcional."
          : "Tudo nesta etapa é opcional.";
      }
      var passo = document.querySelector('.passo[data-etapa="passo-experiencia"]');
      if (passo) {
        var nome = passo.querySelector("strong");
        var detalhe = passo.querySelector(".dica");
        if (nome) { nome.textContent = ehEmpresa ? "Sua empresa" : "Experiência"; }
        if (detalhe) { detalhe.textContent = ehEmpresa ? "Apresentação e obras"
                                         : (pfSemRegistro() ? "Currículo e projetos" : "Currículo, ARTs e projetos"); }
      }
      var textoDepois = document.getElementById("texto-preencher-depois");
      if (textoDepois) {
        textoDepois.innerHTML = ehEmpresa
          ? "Você pode completar depois, no <b>perfil da empresa</b>."
          : "Você pode completar depois, em <b>Meu portfólio</b>.";
      }
    }

    /** Diz se a pessoa já digitou ou anexou algo na etapa de experiência. */
    function experienciaTemConteudo() {
      var bloco = document.getElementById(tipoDetectado === "empresa" ? "experiencia-empresa" : "experiencia-profissional");
      if (!bloco) { return false; }
      return Array.prototype.some.call(bloco.querySelectorAll("input, textarea"), function (campo) {
        if (campo.type === "file") { return campo.files && campo.files.length > 0; }
        if (campo.type === "checkbox") { return campo.checked; }
        return String(campo.value || "").trim() !== "";
      });
    }

    function arquivosDe(id) {
      var entrada = document.getElementById(id);
      return entrada && entrada.files ? Array.prototype.slice.call(entrada.files) : [];
    }

    /** Grava na base o que foi anexado na etapa de experiência. Só o nome, o tamanho
        e a data de cada arquivo; o arquivo em si não sai do computador. */
    function gravarExperiencia(conta) {
      var App = window.ProLink;
      var registrarArquivo = function (categoria, arquivo, detalhe, referenciaId) {
        ProLinkModelos.arquivos.inserir({
          usuarioId: conta.id, categoria: categoria, referenciaId: referenciaId || "",
          nome: arquivo.name, detalhe: detalhe, tamanho: App.tamanhoLegivel(arquivo.size)
        });
      };
      var hoje = new Date().toLocaleDateString("pt-BR");

      if (tipoDetectado === "empresa") {
        var areas = Array.prototype.map.call(document.querySelectorAll('input[name="area-empresa"]:checked'), function (c) { return c.value; });
        var nomeObra = valorDe("obra-nome");
        var obra = nomeObra ? ProLinkModelos.obras.inserir({
          usuarioId: conta.id, nome: nomeObra, cliente: valorDe("obra-cliente"), cidade: valorDe("obra-cidade"),
          periodo: valorDe("obra-periodo"), area: valorDe("obra-area"), porte: valorDe("obra-porte"),
          descricao: valorDe("obra-descricao"), situacao: "Concluída"
        }) : null;
        arquivosDe("arq-obra-fotos").forEach(function (a) { registrarArquivo("foto-obra", a, "Foto da obra", obra && obra.id); });
        arquivosDe("arq-atestado").forEach(function (a) {
          registrarArquivo("atestado", a, "Atestado de capacidade técnica · enviado em " + hoje, obra && obra.id);
        });
        var logo = arquivosDe("arq-logo")[0];
        return App.imagemReduzida(logo, 160).catch(function () { return ""; }).then(function (dataUrl) {
          var campos = { sobre: valorDe("emp-apresentacao"), areasAtuacao: areas };
          if (dataUrl) { campos.logotipo = dataUrl; }
          ProLinkModelos.usuarios.atualizar(conta.id, campos);
        });
      }

      if (tipoDetectado !== "contratante") {
        var primeiroProjeto = null;
        document.querySelectorAll("#lista-projetos .projeto-form").forEach(function (form, i) {
          var campo = function (prefixo) {
            var el = form.querySelector('[id^="' + prefixo + '"]');
            return el ? String(el.value || "").trim() : "";
          };
          var nome = campo("proj-nome-");
          if (!nome) { return; }
          var projeto = ProLinkModelos.projetos.inserir({
            usuarioId: conta.id, nome: nome, descricao: campo("proj-desc-") || "Projeto informado no cadastro.",
            area: campo("proj-area-"), situacao: "Concluído", periodo: campo("proj-ano-") || "Sem data", capa: ""
          });
          if (i === 0 || !primeiroProjeto) { primeiroProjeto = primeiroProjeto || projeto; }
        });
        arquivosDe("arq-curriculo").slice(0, 1).forEach(function (a) { registrarArquivo("curriculo", a, "Enviado no cadastro em " + hoje); });
        arquivosDe("arq-certificados").forEach(function (a) { registrarArquivo("certificado", a, "Enviado no cadastro em " + hoje); });
        arquivosDe("arq-projetos").forEach(function (a) {
          registrarArquivo("projeto", a, "Arquivo do projeto", primeiroProjeto && primeiroProjeto.id);
        });
      }
      return Promise.resolve();
    }

    var botaoFinalizarCadastro = document.getElementById("finalizar-cadastro");
    if (botaoFinalizarCadastro) {
      botaoFinalizarCadastro.addEventListener("click", function () { finalizarCadastro(false); });
    }

    var botaoPreencherDepois = document.getElementById("preencher-depois");
    if (botaoPreencherDepois) {
      botaoPreencherDepois.addEventListener("click", function () {
        if (experienciaTemConteudo() &&
            !confirm("O que você já preencheu nesta etapa não será salvo agora. Você poderá adicionar tudo depois. Continuar?")) {
          return;
        }
        finalizarCadastro(true);
      });
    }

    /* Ponto de partida. */
    recalcularFluxo();
    mostrarEtapa(0);
  }


})();
