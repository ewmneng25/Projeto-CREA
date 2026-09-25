/* ============================================================
   ProLink — tour guiado da Miranda

   A Miranda apresenta cada tela por partes: escurece tudo,
   ilumina só a área da vez e fala ao lado dela.

   Tudo daqui é texto fixo: nenhuma requisição, nenhuma chave de
   API, funciona offline. A conversa com IA é outra coisa, e fica
   em miranda.js.

   ------------------------------------------------------------
   COMO UM PASSO É DESCRITO
   ------------------------------------------------------------
     alvo    seletor CSS da área a destacar. Sem alvo, o passo
             aparece no centro, com a Miranda grande — é o
             formato das aberturas e das explicações conceituais,
             que não dependem de olhar nada específico.
     titulo  o nome da área
     texto   a fala, escrita letra a letra
     pontos  itens que aparecem depois da fala (opcional)
     lado    "auto" (padrão), "direita", "esquerda", "acima",
             "abaixo" — só para forçar quando o automático erra

   O balão se posiciona sozinho no espaço livre ao redor do
   destaque, e cai para o rodapé da tela quando não há espaço.

   Para mudar o que ela diz, edite ROTEIROS logo abaixo.
   ============================================================ */
(function () {
  "use strict";

  // ==================================================================
  // ROTEIROS
  // ==================================================================
  var ROTEIROS = {
    "inicio.html": [
      {
        titulo: "Prazer, eu sou a Miranda",
        texto: "Vou te mostrar esta tela por partes. A cada passo eu acendo uma área e " +
               "apago o resto, para você olhar uma coisa de cada vez."
      },
      {
        alvo: ".sidebar",
        titulo: "O menu",
        texto: "Tudo o que você faz no ProLink sai daqui.",
        pontos: [
          "Em cima, Trabalho: oportunidades, candidaturas, portfólio e mensagens.",
          "Embaixo, Minha carreira: perfil, avaliações e privacidade.",
          "No topo do menu, o atalho para conversar comigo."
        ]
      },
      {
        alvo: ".banner",
        titulo: "Os dois caminhos",
        texto: "Buscar trabalho ou melhorar seu portfólio. Tudo na plataforma gira em " +
               "torno desses dois."
      },
      {
        alvo: ".busca-painel",
        titulo: "Busca de parceiros",
        texto: "Obra multidisciplinar precisa de quem assine a disciplina que você não " +
               "assina. É aqui que você encontra com quem fazer parceria."
      },
      {
        alvo: ".grade-4",
        titulo: "Seus números",
        texto: "O resumo da sua situação: demandas abertas, parcerias ativas, avaliações " +
               "recebidas e documentos validados pelo Crea."
      },
      {
        alvo: ".analise-cabecalho",
        titulo: "Sua análise",
        texto: "Chega pronta: você não precisa mandar analisar para saber como está. O " +
               "percentual sai de quatro critérios com pesos fixos, e cada barra mostra " +
               "quanto cada um somou. Mexeu no portfólio? O botão refaz a conta."
      },
      {
        alvo: ".lista-oportunidades .oportunidade",
        titulo: "Oportunidades recomendadas",
        texto: "Demandas escolhidas pelo seu histórico, já com o percentual. À direita da " +
               "lista ficam a atividade recente e os prazos — fique de olho nas CATs perto " +
               "de vencer."
      }
    ],

    "oportunidades.html": [
      {
        titulo: "Demandas abertas",
        texto: "As oportunidades compatíveis com o seu registro. O percentual não é chute: " +
               "mede o quanto cada demanda combina com o histórico que o Crea já confirmou."
      },
      {
        alvo: ".grade-filtro > aside",
        titulo: "Os filtros",
        texto: "Estreite por tipo de demanda, área de atuação, cidade e modalidade. " +
               "Quanto mais específico, menos ruído."
      },
      {
        alvo: ".lista-oportunidades .oportunidade",
        titulo: "O cartão da demanda",
        texto: "Cada um traz o essencial para decidir se vale abrir.",
        pontos: [
          "A etiqueta do tipo: projeto, parceria ou serviço.",
          "Empresa, cidade e há quanto tempo foi publicada.",
          "O percentual de compatibilidade e o marcador para salvar."
        ]
      }
    ],

    "profissionais.html": [
      {
        titulo: "Buscar profissionais",
        texto: "Profissional também procura profissional: parceria em projeto " +
               "multidisciplinar, ou quem assine a disciplina que você não assina."
      },
      {
        alvo: ".grade-filtro > aside",
        titulo: "Os filtros",
        texto: "Especialidade, experiência, nome, situação no Crea e cidade."
      },
      {
        alvo: ".candidato",
        titulo: "O cartão do profissional",
        texto: "Repare no selo verde: quer dizer registro conferido na base do Crea, não " +
               "registro declarado pela pessoa. É a diferença que sustenta a plataforma."
      }
    ],

    "portfolio.html": [
      {
        titulo: "Meu portfólio",
        texto: "É daqui que sai a sua nota. Projetos e documentos técnicos ficam no mesmo " +
               "formato porque, para quem contrata, respondem à mesma pergunta: já fez isso antes?"
      },
      {
        alvo: ".grade-3",
        titulo: "Seus projetos",
        texto: "Cada cartão traz a área de atuação, o período e uma descrição curta. " +
               "Projeto ligado a uma CAT validada pesa mais na análise."
      },
      {
        titulo: "Por que ART e CAT não são anexadas",
        texto: "Você informa o número e a confirmação vem da base do Crea. Arquivo enviado " +
               "por quem tem interesse no resultado é declaração, não comprovação — e é " +
               "essa diferença que dá valor ao selo. O documento continua no Crea."
      },
      {
        alvo: ".vincular-manual",
        titulo: "Faltou alguma?",
        texto: "O vínculo pelo número consulta o Crea na hora e traz a resposta oficial " +
               "para o seu acervo."
      }
    ],

    "candidaturas.html": [
      {
        alvo: "#lista-minhas-candidaturas",
        titulo: "Minhas candidaturas",
        texto: "Aqui você acompanha o que enviou. Quando a empresa abre seu perfil, a " +
               "etiqueta muda de Interesse enviado para Perfil visualizado — você sabe que " +
               "foi visto, sem precisar perguntar."
      }
    ],

    "mensagens.html": [
      {
        titulo: "Caixa de entrada",
        texto: "Suas conversas com empresas e parceiros. Não me confunda com elas: eu fico " +
               "no botão da minha foto, no canto."
      },
      {
        alvo: ".coluna-conversas",
        titulo: "As conversas",
        texto: "A lista de quem falou com você, com o contador do que ainda não foi lido."
      },
      {
        alvo: ".coluna-contexto",
        titulo: "O contexto",
        texto: "A demanda ligada àquela conversa fica sempre à vista. Assim você não " +
               "precisa lembrar de cor sobre qual obra está falando."
      }
    ],

    "avaliacoes.html": [
      {
        titulo: "Sua reputação",
        texto: "Só avalia quem contratou pela plataforma, e cada nota fica ligada a um " +
               "contrato registrado. É o que separa reputação de opinião solta."
      },
      {
        alvo: ".resumo-nota",
        titulo: "Além da média",
        texto: "A distribuição por estrela mostra se a nota é consistente ou se tem altos " +
               "e baixos. Média sozinha esconde isso."
      }
    ],

    "perfil.html": [
      {
        alvo: ".perfil-cabecalho",
        titulo: "Seu perfil",
        texto: "É esta a página que as empresas abrem quando se interessam por você."
      },
      {
        alvo: ".faixa-verificado",
        titulo: "O selo",
        texto: "Registro e documentos conferidos junto ao Crea-AM. Perfil verificado " +
               "aparece antes nas buscas — e é o que o contratante procura primeiro."
      },
      {
        titulo: "O que se edita e onde",
        texto: "Resumo, cidade e contato mudam aqui. Nome, título, número do registro e " +
               "acervo vêm do Crea e só mudam lá — o ProLink reflete, não reescreve."
      }
    ],

    "privacidade.html": [
      {
        titulo: "Privacidade e dados",
        texto: "Aqui você decide o que a plataforma mostra sobre você. E tem uma regra que " +
               "eu acho justa: dado que você esconde também não conta a seu favor no cálculo."
      },
      {
        alvo: "#tela-privacidade .cartao",
        titulo: "Campo a campo",
        texto: "Cada chave liga ou desliga um dado do seu perfil público. As marcadas como " +
               "\u201centra no cálculo\u201d mudam a sua nota na hora."
      },
      {
        alvo: "#efeito-privacidade",
        titulo: "O efeito, ao vivo",
        texto: "Este número acompanha suas escolhas. Desligue o acervo e veja ele cair — " +
               "você enxerga a consequência antes de confirmar."
      }
    ],

    "miranda.html": [
      {
        alvo: ".declaracao-ia",
        titulo: "Antes de conversarmos",
        texto: "Sou inteligência artificial, e isso está declarado aqui: o que eu faço, o " +
               "que não faço e os riscos. Em uma frase: eu explico, mas não decido nada " +
               "sobre pessoas."
      },
      {
        alvo: ".miranda-compositor",
        titulo: "Pode perguntar",
        texto: "Dúvidas sobre as telas do ProLink, sobre ART, CAT, registro e anuidade. " +
               "Se eu não souber, digo que não consta em vez de inventar."
      }
    ],

    "empresa-inicio.html": [
      {
        titulo: "O ProLink de quem contrata",
        texto: "A diferença aqui é uma só, e é a que importa: toda candidatura chega com o " +
               "registro já conferido na base do Crea. Você não pede documento nem confere " +
               "número."
      },
      {
        alvo: ".sidebar",
        titulo: "O menu",
        texto: "Publicar demanda, ler candidaturas, buscar profissionais e conversar. " +
               "Embaixo, o perfil da empresa e as avaliações."
      },
      {
        alvo: ".grade-4",
        titulo: "Seus números",
        texto: "Demandas abertas, candidaturas recebidas, negociações em andamento e " +
               "contratações concluídas."
      },
      {
        alvo: ".candidato",
        titulo: "Profissionais recomendados",
        texto: "Ordenados por correspondência com as suas demandas. O percentual mede " +
               "acervo confirmado, não currículo bonito: quem nunca fez aquilo não sobe."
      }
    ],

    "empresa-demandas.html": [
      {
        titulo: "Minhas demandas",
        texto: "Cada demanda publicada vira uma fila de candidaturas já filtradas pelas " +
               "exigências técnicas que você marcou."
      },
      {
        alvo: ".demanda-card",
        titulo: "O cartão da demanda",
        texto: "Tudo o que você precisa para decidir o próximo passo.",
        pontos: [
          "O tipo à esquerda e a situação à direita: aberta, em análise ou encerrando.",
          "Cidade, prazo para propostas e número de candidaturas.",
          "Encerrar pede o desfecho — e é o que libera a avaliação do contratado."
        ]
      }
    ],

    "empresa-candidaturas.html": [
      {
        alvo: "#seletor-demanda",
        titulo: "Escolha a demanda",
        texto: "A fila muda conforme a demanda selecionada."
      },
      {
        alvo: ".candidatura-card .candidato-topo",
        titulo: "O candidato",
        texto: "Três coisas decidem quase tudo.",
        pontos: [
          "O selo de registro: verificado quer dizer conferido no Crea.",
          "O acervo anexado: o que o profissional escolheu mostrar para esta demanda.",
          "Por que esse percentual: abre a conta, critério por critério."
        ]
      }
    ],

    "empresa-profissionais.html": [
      {
        titulo: "Buscar profissionais",
        texto: "Aqui você procura em vez de esperar candidatura."
      },
      {
        alvo: ".grade-filtro > aside",
        titulo: "O filtro mais forte",
        texto: "Acervo comprovado. Ele separa quem já fez daquilo de quem diz que faz — " +
               "e é o que a situação no Crea sozinha não mostra."
      }
    ],

    "empresa-perfil.html": [
      {
        alvo: ".perfil-cabecalho",
        titulo: "Perfil da empresa",
        texto: "É esta a página que o profissional abre antes de decidir se responde à sua " +
               "demanda. Empresa verificada recebe mais resposta: a desconfiança existe nos " +
               "dois sentidos."
      }
    ],

    "admin-inicio.html": [
      {
        titulo: "Painel do Crea-AM",
        texto: "O quarto perfil da plataforma: quem a opera. Modera conteúdo, trata " +
               "denúncias, audita ações e configura integrações. Nenhuma decisão tomada " +
               "aqui é invisível."
      },
      {
        alvo: ".grade-4",
        titulo: "A saúde da plataforma",
        texto: "Usuários ativos, registros verificados, denúncias na fila e demandas abertas."
      },
      {
        alvo: ".grade-principal",
        titulo: "O que exige atenção",
        texto: "À esquerda, a distribuição por perfil e os indicadores do mês. À direita, " +
               "os últimos eventos da plataforma."
      }
    ],

    "admin-usuarios.html": [
      {
        alvo: ".tabela-admin",
        titulo: "Gestão de usuários",
        texto: "Bloquear não apaga ninguém: a exclusão aqui é lógica. O registro sai das " +
               "consultas e continua no banco, para auditoria e restauração."
      }
    ],

    "admin-denuncias.html": [
      {
        titulo: "Fila de denúncias",
        texto: "Cada denúncia tem protocolo, autor e prazo. Manter, remover ou bloquear — " +
               "as três decisões ficam registradas com seu nome, data e motivo."
      },
      {
        alvo: ".denuncia-card",
        titulo: "Um caso",
        texto: "O relato fica destacado em âmbar, e o histórico do usuário está a um clique."
      }
    ],

    "admin-auditoria.html": [
      {
        titulo: "Trilha de auditoria",
        texto: "Quem fez, o quê, quando e de onde. Esta tela é só leitura: não existe botão " +
               "de editar nem de apagar, porque registro de auditoria que pode ser alterado " +
               "não serve para nada."
      },
      {
        alvo: ".tabela-admin",
        titulo: "Um detalhe de privacidade",
        texto: "Repare na coluna de origem: os IPs aparecem mascarados. Consultar não exige " +
               "ver o dado inteiro — o valor completo fica no banco, sob requisição formal."
      }
    ],

    "buscar.html": [
      {
        titulo: "Busca pública",
        texto: "Esta tela é aberta: qualquer pessoa consulta, sem conta. Só aparece aqui " +
               "quem autorizou aparecer, e só o que autorizou mostrar."
      },
      {
        alvo: ".grade-filtro > aside",
        titulo: "Os filtros",
        texto: "Especialidade, experiência, nome, situação no Crea e cidade."
      }
    ],

    "recuperar.html": [
      {
        titulo: "Recuperar acesso",
        texto: "A resposta aqui é sempre a mesma, exista a conta ou não. Dizer \u201ceste " +
               "e-mail não está cadastrado\u201d entregaria de graça quem tem conta na " +
               "plataforma."
      }
    ]
  };

  /* Abertura trocada quando a sessão é de visitante: o limite precisa ser
     dito antes de qualquer explicação de funcionalidade. */
  var ABERTURA_VISITANTE = {
    titulo: "Bem-vindo como visitante",
    texto: "Eu sou a Miranda, assistente do ProLink. Você está navegando sem conta, então " +
           "pode ver tudo: oportunidades, perfis e como a plataforma funciona. O que " +
           "precisa de conta verificada pelo Crea — publicar demanda, enviar proposta e " +
           "conversar — fica bloqueado. Vou te mostrar o resto."
  };

  // ==================================================================
  // MEMÓRIA
  // Separada por modo: o tour do visitante não gasta o do usuário com
  // conta, nem o contrário.
  // ==================================================================
  /* Guardado em dados/configuracoes.csv (telasVistas e guiaDesligado).
     Visitante não tem conta: vale só nesta aba. */
  var Banco = window.ProLinkBanco;

  function preferencias() {
    return Banco ? ProLinkModelos.sessao.preferencias() : {};
  }

  function lerVistas() {
    var vistas = preferencias().telasVistas;
    return Array.isArray(vistas) ? vistas : [];
  }

  function marcarComoVista(pagina) {
    var vistas = lerVistas();
    if (vistas.indexOf(pagina) === -1 && Banco) {
      vistas.push(pagina);
      ProLinkModelos.sessao.salvarPreferencias({ telasVistas: vistas });
    }
  }

  function estaDesligado() {
    return preferencias().guiaDesligado === true;
  }

  function desligar(valor) {
    if (Banco) { ProLinkModelos.sessao.salvarPreferencias({ guiaDesligado: !!valor }); }
  }

  // ==================================================================
  // PREPARO
  // ==================================================================
  var botao = document.getElementById("miranda-flutuante");
  if (!botao) { return; }

  var alerta = document.getElementById("miranda-flutuante-alerta");
  var paginaAtual = (window.location.pathname.split("/").pop() || "inicio.html").toLowerCase();

  var roteiro = ROTEIROS[paginaAtual];

  if (!roteiro) {
    botao.setAttribute("aria-expanded", "false");
    botao.addEventListener("click", function () {
      window.location.href = "miranda.html";
    });
    return;
  }

  var sessaoGuia = Banco ? ProLinkModelos.sessao.atual() : null;
  if (sessaoGuia && sessaoGuia.visitante && paginaAtual === "inicio.html") {
    roteiro = [ABERTURA_VISITANTE].concat(roteiro.slice(1));
  }

  var jaVista = lerVistas().indexOf(paginaAtual) !== -1;
  var passo = 0;
  var caixa = null;
  var recorte = null;
  var bloqueio = null;
  var digitando = null;
  var reposicionar = null;

  var reduzirMovimento = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function atualizarAlerta() {
    if (!alerta) { return; }
    alerta.hidden = !(!jaVista && !caixa);
  }

  // ==================================================================
  // DIGITAÇÃO LETRA A LETRA
  // ==================================================================
  var VELOCIDADE = 14;
  var LETRAS_POR_TIQUE = 2;

  function digitar(elemento, texto, aoTerminar) {
    if (reduzirMovimento) {
      elemento.textContent = texto;
      if (aoTerminar) { aoTerminar(); }
      return { concluir: function () {} };
    }

    var indice = 0;
    elemento.textContent = "";
    elemento.classList.add("tut-digitando");

    function concluir() {
      window.clearInterval(temporizador);
      elemento.textContent = texto;
      elemento.classList.remove("tut-digitando");
      if (aoTerminar) { aoTerminar(); }
    }

    var temporizador = window.setInterval(function () {
      indice += LETRAS_POR_TIQUE;
      elemento.textContent = texto.slice(0, indice);
      if (indice >= texto.length) { concluir(); }
    }, VELOCIDADE);

    return { concluir: concluir };
  }

  // ==================================================================
  // DESTAQUE DA ÁREA
  // ==================================================================
  var FOLGA = 10;     // respiro entre o recorte e o conteúdo
  var DISTANCIA = 16; // distância do balão até o recorte

  function garantirCamadas() {
    if (!bloqueio) {
      // Engole cliques: durante o tour a página não responde, para
      // ninguém navegar sem querer no meio da explicação.
      bloqueio = document.createElement("div");
      bloqueio.className = "tut-bloqueio";
      document.body.appendChild(bloqueio);
    }
    if (!recorte) {
      recorte = document.createElement("div");
      recorte.className = "tut-recorte";
      document.body.appendChild(recorte);
    }
  }

  /** Posiciona o recorte sobre o elemento. A sombra gigante escurece o resto. */
  function destacar(elemento) {
    garantirCamadas();

    var area = elemento.getBoundingClientRect();

    recorte.style.top = Math.max(area.top - FOLGA, 4) + "px";
    recorte.style.left = Math.max(area.left - FOLGA, 4) + "px";
    recorte.style.width = Math.min(area.width + FOLGA * 2,
                                   window.innerWidth - 8) + "px";
    recorte.style.height = Math.min(area.height + FOLGA * 2,
                                    window.innerHeight - 8) + "px";
    recorte.classList.remove("tut-recorte-cheio");

    return recorte.getBoundingClientRect();
  }

  /** Sem alvo: escurece a tela inteira, sem furo nenhum. */
  function escurecerTudo() {
    garantirCamadas();
    recorte.classList.add("tut-recorte-cheio");
  }

  function limparCamadas() {
    if (recorte) { recorte.remove(); recorte = null; }
    if (bloqueio) { bloqueio.remove(); bloqueio = null; }
  }

  /** Área de sobreposição entre dois retângulos. Zero quer dizer que não se tocam. */
  function sobreposicao(a, b) {
    var largura = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var altura = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

    return largura > 0 && altura > 0 ? largura * altura : 0;
  }

  /**
   * Encaixa o balão num lugar que não cubra o destaque.
   *
   * Testa os quatro lados e, se nenhum couber, os quatro cantos. Escolhe
   * o primeiro candidato que fica inteiro na tela e não toca a área
   * iluminada. Sem nenhum assim — destaque que ocupa quase tudo —, fica
   * com o de menor sobreposição: melhor cobrir um pedaço do que ficar
   * fora da tela.
   */
  function posicionarBalao(area, lado) {
    var largura = caixa.offsetWidth;
    var altura = caixa.offsetHeight;
    var margem = 16;
    var limiteX = window.innerWidth - largura - margem;
    var limiteY = window.innerHeight - altura - margem;

    function prender(valor, minimo, maximo) {
      return Math.min(Math.max(valor, minimo), Math.max(maximo, minimo));
    }

    var centroX = prender(area.left + area.width / 2 - largura / 2, margem, limiteX);
    var centroY = prender(area.top + area.height / 2 - altura / 2, margem, limiteY);

    var candidatos = [
      { nome: "abaixo",   top: area.bottom + DISTANCIA,        left: centroX },
      { nome: "acima",    top: area.top - altura - DISTANCIA,  left: centroX },
      { nome: "direita",  top: centroY, left: area.right + DISTANCIA },
      { nome: "esquerda", top: centroY, left: area.left - largura - DISTANCIA },
      { nome: "canto-inferior-direito", top: limiteY, left: limiteX },
      { nome: "canto-inferior-esquerdo", top: limiteY, left: margem },
      { nome: "canto-superior-direito", top: margem, left: limiteX },
      { nome: "canto-superior-esquerdo", top: margem, left: margem }
    ];

    // Um lado forçado no roteiro entra na frente da fila.
    if (lado && lado !== "auto") {
      candidatos.sort(function (a, b) {
        return (a.nome === lado ? -1 : 0) - (b.nome === lado ? -1 : 0);
      });
    }

    var melhor = null;

    for (var i = 0; i < candidatos.length; i += 1) {
      var alvo = candidatos[i];
      var cabe = alvo.top >= margem && alvo.top <= limiteY &&
                 alvo.left >= margem && alvo.left <= limiteX;

      if (!cabe) { continue; }

      var retangulo = {
        top: alvo.top,
        left: alvo.left,
        right: alvo.left + largura,
        bottom: alvo.top + altura
      };
      var invasao = sobreposicao(retangulo, area);

      if (invasao === 0) { melhor = alvo; break; }
      if (!melhor || invasao < melhor.invasao) {
        melhor = alvo;
        melhor.invasao = invasao;
      }
    }

    if (!melhor) {
      melhor = { nome: "rodape", top: limiteY, left: centroX };
    }

    caixa.style.top = prender(melhor.top, margem, limiteY) + "px";
    caixa.style.left = prender(melhor.left, margem, limiteX) + "px";
    caixa.setAttribute("data-lado", melhor.nome);
  }

  // ==================================================================
  // DESENHO DOS PASSOS
  // ==================================================================
  function aoTeclar(evento) {
    if (evento.key === "Escape") { fechar(true); }
    if (evento.key === "ArrowRight") { irPara(passo + 1); }
    if (evento.key === "ArrowLeft" && passo > 0) { irPara(passo - 1); }
  }

  function fechar(marcar) {
    if (digitando) { digitando.concluir(); digitando = null; }
    if (caixa) { caixa.remove(); caixa = null; }
    limparCamadas();

    document.removeEventListener("keydown", aoTeclar);
    window.removeEventListener("resize", reposicionar);
    window.removeEventListener("scroll", reposicionar, true);

    botao.setAttribute("aria-expanded", "false");

    if (marcar) {
      jaVista = true;
      marcarComoVista(paginaAtual);
    }

    atualizarAlerta();
  }

  function irPara(indice) {
    if (indice >= roteiro.length) { fechar(true); return; }
    if (indice < 0) { return; }
    passo = indice;
    desenhar();
  }

  function desenhar() {
    var dado = roteiro[passo];
    var ultimo = passo === roteiro.length - 1;
    var elemento = dado.alvo ? document.querySelector(dado.alvo) : null;

    if (digitando) { digitando.concluir(); digitando = null; }
    if (caixa) { caixa.remove(); caixa = null; }

    /* Solta os ouvintes do passo anterior antes de criar os novos. Sem
       isso eles se acumulam, e o ajuste do passo antigo reposiciona o
       balão do passo atual — com o alvo errado. */
    if (reposicionar) {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
      reposicionar = null;
    }

    caixa = document.createElement("aside");
    caixa.className = "tut-balao" + (elemento ? "" : " tut-balao-centro");
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-live", "polite");
    caixa.setAttribute("aria-label", "Miranda: " + dado.titulo);

    var pontosPasso = roteiro.map(function (_, i) {
      return '<span class="tut-ponto' + (i === passo ? " tut-ponto-atual" : "") +
             (i < passo ? " tut-ponto-feito" : "") + '"></span>';
    }).join("");

    /* Com alvo, a Miranda aparece de perfil, pequena, ao lado da fala.
       Sem alvo, ela aparece inteira: o passo é sobre uma ideia, não
       sobre um canto da tela. */
    var retrato = elemento
      ? '<img class="tut-avatar" src="assets/img/miranda-avatar.png" ' +
        'alt="Miranda, a assistente do ProLink" width="46" height="46">'
      : '<img class="tut-foto" src="assets/img/miranda.png" ' +
        'alt="Miranda, a assistente do ProLink" width="260" height="294">';

    caixa.innerHTML =
      '<button class="tut-fechar" type="button" aria-label="Fechar o tour">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
      "</button>" +
      retrato +
      '<div class="tut-corpo">' +
        '<p class="tut-etiqueta">Miranda</p>' +
        '<h2 class="tut-titulo">' + dado.titulo + "</h2>" +
        '<p class="tut-texto"></p>' +
        '<ul class="tut-pontos" hidden></ul>' +
        '<div class="tut-rodape">' +
          '<div class="tut-passos" aria-hidden="true">' + pontosPasso + "</div>" +
          '<div class="tut-acoes">' +
            (ultimo ? "" : '<button class="btn btn-fantasma btn-sm" type="button" data-tut="pular">Pular</button>') +
            '<button class="btn btn-sm" type="button" data-tut="seguir">' +
              (ultimo ? "Entendi" : "Continuar") +
            "</button>" +
          "</div>" +
        "</div>" +
        (ultimo
          ? '<label class="tut-desligar"><input type="checkbox" data-tut="desligar"' +
            (estaDesligado() ? " checked" : "") + "> Não mostrar esses tours</label>"
          : "") +
      "</div>";

    document.body.appendChild(caixa);
    botao.setAttribute("aria-expanded", "true");
    atualizarAlerta();

    /* Traz a área para a tela antes de medir: recorte sobre elemento
       fora da vista não ilumina nada. */
    function ajustar() {
      if (elemento) {
        posicionarBalao(destacar(elemento), dado.lado);
      } else {
        escurecerTudo();
      }
    }

    if (elemento) {
      var area = elemento.getBoundingClientRect();
      var foraDaVista = area.top < 80 || area.bottom > window.innerHeight - 80;

      if (foraDaVista) {
        elemento.scrollIntoView({
          behavior: reduzirMovimento ? "auto" : "smooth",
          block: "center",
        });
        window.setTimeout(ajustar, reduzirMovimento ? 0 : 320);
      } else {
        ajustar();
      }
    } else {
      escurecerTudo();
    }

    reposicionar = ajustar;
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);

    var alvoTexto = caixa.querySelector(".tut-texto");
    var lista = caixa.querySelector(".tut-pontos");

    digitando = digitar(alvoTexto, dado.texto, function () {
      digitando = null;

      if (dado.pontos && dado.pontos.length) {
        lista.innerHTML = dado.pontos.map(function (ponto) {
          return "<li>" + ponto + "</li>";
        }).join("");
        lista.hidden = false;
      }

      /* O balão cresceu enquanto o texto era escrito: reposiciona com a
         altura final, senão a conta de encaixe foi feita com o tamanho errado. */
      ajustar();
    });

    /* Clicar no balão adianta a digitação: ninguém deve esperar a
       animação para ler o que já está escrito. */
    caixa.addEventListener("click", function (evento) {
      if (evento.target.closest("button, a, label, input")) { return; }
      if (digitando) { digitando.concluir(); digitando = null; }
    });

    caixa.querySelector(".tut-fechar").addEventListener("click", function () { fechar(true); });

    var pular = caixa.querySelector('[data-tut="pular"]');
    if (pular) { pular.addEventListener("click", function () { fechar(true); }); }

    caixa.querySelector('[data-tut="seguir"]').addEventListener("click", function () {
      irPara(passo + 1);
    });

    var caixaDesligar = caixa.querySelector('[data-tut="desligar"]');
    if (caixaDesligar) {
      caixaDesligar.addEventListener("change", function (evento) {
        desligar(evento.target.checked);
      });
    }

    document.addEventListener("keydown", aoTeclar);
  }

  // ==================================================================
  // ABERTURA
  // ==================================================================
  botao.setAttribute("aria-expanded", "false");

  botao.addEventListener("click", function () {
    if (caixa) { fechar(true); return; }
    passo = 0;
    desenhar();
  });

  atualizarAlerta();

  if (!jaVista && !estaDesligado()) {
    /* Um respiro antes, para não competir com o carregamento da página. */
    window.setTimeout(function () { desenhar(); }, 550);
  }
})();
