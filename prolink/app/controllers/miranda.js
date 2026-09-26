/* ============================================================
   ProLink — Miranda (assistente virtual)

   Conversa direta com a API do Gemini (Google), sem PHP, sem
   back-end e sem bibliotecas externas — o mesmo esquema usado
   no aplicativo BiblIA.

   - A chave da API NÃO fica no projeto: é digitada na tela inicial
     (Ctrl + Espaço) e vale só enquanto o site estiver aberto
     (sessionStorage). Sem ela, a Miranda avisa que a conversa está
     indisponível; o tour guiado continua funcionando.
   - manual-prolink.txt é o que a Miranda sabe sobre o sistema. Para
     ensinar algo novo, basta editar esse arquivo.
   ============================================================ */
(function () {
  "use strict";

  // ==================================================================
  // 🔑 CHAVE DA API E MANUAL DO SISTEMA
  // A chave vem da sessão do navegador; o manual, de um arquivo na
  // raiz do projeto, guardado em memória depois da primeira leitura.
  // ==================================================================
  var ARQUIVO_DO_MANUAL = "manual-prolink.txt";

  /**
   * Modelos do Gemini, em ordem de tentativa.
   *
   * A Miranda tenta o primeiro; se ele responder que está sobrecarregado
   * (429 ou 503), cai para o seguinte. São todos da família Flash-Lite e
   * Flash, feitos para alto volume e baixa latência — a conversa aqui é
   * curta e objetiva, não precisa do modelo mais caro.
   *
   * Por que uma lista, e não um modelo só: numa demonstração ao vivo, um
   * pico de demanda de dez segundos no provedor não pode derrubar a
   * assistente na frente da banca.
   */
  var MODELOS_GEMINI = [
    "gemini-3.5-flash-lite",   // mais recente da linha Lite, alto volume
    "gemini-3.1-flash-lite",   // o anterior, ainda estável
    "gemini-3-flash-preview"   // tem camada gratuita na API do Gemini
  ];

  /* Quantas vezes insistir no mesmo modelo antes de trocar. */
  var TENTATIVAS_POR_MODELO = 2;
  var ESPERA_ENTRE_TENTATIVAS = 900;

  var chaveApiCarregada = null;

  /* O que a Miranda diz quando a conversa com a IA não está disponível
     (sem chave, ou chave recusada pelo Google). O detalhe técnico fica
     só no console. */
  var MENSAGEM_INDISPONIVEL =
    "Desculpe, a minha conversa está indisponível no momento. 😕 " +
    "Assim que ela voltar, respondo tudo por aqui. Enquanto isso, o botão com o meu " +
    "rosto, no canto da tela, mostra um tour explicando cada parte do ProLink.";
  var manualCarregado = null;

  /**
   * Lê um arquivo de texto da pasta do projeto e devolve o conteúdo
   * já sem espaços sobrando no começo e no fim.
   * @param {string} caminho
   * @returns {Promise<string>} texto do arquivo, ou "" se falhar
   */
  function lerArquivoDeTexto(caminho) {
    /* cache: "no-store" e o carimbo na URL impedem o navegador de
       devolver uma cópia antiga do arquivo (foi o que fez o projeto
       continuar usando a chave anterior depois da troca). */
    var semCache = caminho + (caminho.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
    return fetch(semCache, { cache: "no-store" })
      .then(function (resposta) {
        if (!resposta.ok) {
          console.error(
            '[Miranda] O arquivo "' + caminho + '" respondeu com status ' +
            resposta.status + ". Confira se ele está na mesma pasta do " +
            "miranda.html e se o nome está exatamente igual (sem .txt.txt, " +
            "sem espaços)."
          );
          return "";
        }
        return resposta.text();
      })
      .then(function (texto) {
        return (texto || "").trim();
      })
      .catch(function (erro) {
        // Acontece quando a página foi aberta com duplo clique
        // (endereço "file://..."): o navegador bloqueia o fetch de
        // arquivos locais por segurança.
        console.error(
          '[Miranda] Não foi possível buscar "' + caminho + '". Se você abriu ' +
          "o arquivo não está na pasta do ProLink ou falta rodar o build.py. " +
          "Erro original:",
          erro
        );
        return "";
      });
  }

  /** Identifica a chave sem expor o valor inteiro no console. */
  function descreverChave(chave) {
    chave = String(chave || "");
    if (!chave) { return "(vazia)"; }
    return chave.length + " caracteres, " + chave.slice(0, 8) + "…" + chave.slice(-4);
  }

  /* A chave do Gemini não fica em arquivo nenhum do projeto: é digitada
     na tela inicial (Ctrl + Espaço) e guardada no sessionStorage, que o
     navegador apaga quando o site é fechado. Relida a cada pergunta, para
     valer na hora se alguém inserir a chave com a Miranda aberta. */
  var CHAVE_DA_SESSAO = "prolink_chave_gemini";

  function carregarChaveApi() {
    var chave = "";
    try { chave = String(window.sessionStorage.getItem(CHAVE_DA_SESSAO) || "").trim(); }
    catch (erro) { chave = ""; }
    if (chave && chave !== chaveApiCarregada) {
      console.log("[Miranda] Chave em uso: " + descreverChave(chave) + " (inserida na tela inicial).");
    }
    chaveApiCarregada = chave;
    return Promise.resolve(chave);
  }

  function carregarManual() {
    if (manualCarregado !== null) {
      return Promise.resolve(manualCarregado);
    }
    return lerArquivoDeTexto(ARQUIVO_DO_MANUAL).then(function (texto) {
      manualCarregado = texto;
      return manualCarregado;
    });
  }

  // ==================================================================
  // PERSONA
  // Instruções de comportamento. O manual entra logo abaixo delas,
  // montando a primeira mensagem enviada em toda conversa.
  // ==================================================================
  var PERSONA =
    "Você é a Miranda, assistente virtual do ProLink — plataforma que conecta " +
    "profissionais técnicos (engenheiros, agrônomos, geocientistas) a empresas, " +
    "obras e oportunidades.\n\n" +
    "Seu papel é duplo:\n" +
    "1. Explicar o ProLink: onde fica cada tela, o que cada uma faz, como " +
    "cadastrar, anexar documento, editar perfil, entender a triagem.\n" +
    "2. Tirar dúvidas de engenharia e do Sistema Confea/Crea: ART, CAT, acervo " +
    "técnico, registro profissional, anuidade, responsabilidade técnica, " +
    "atribuições, normas técnicas e temas próximos.\n\n" +
    "Como responder:\n" +
    "- Português do Brasil, tom profissional e direto, de colega de trabalho " +
    "que explica bem. Sem formalidade excessiva e sem entusiasmo artificial.\n" +
    "- Vá direto ao ponto. Respostas curtas para perguntas simples; só se " +
    "estenda quando o assunto realmente exigir.\n" +
    "- Sobre o ProLink, responda apenas com base no manual abaixo. Se a " +
    "informação não estiver lá, diga que não consta no manual do sistema em " +
    "vez de supor. Nunca invente telas, botões, prazos ou números.\n" +
    "- Ao indicar um caminho no sistema, cite o nome exato do menu ou do botão.\n" +
    "- Sobre Crea, ART e CAT, use seu conhecimento técnico, mas lembre que " +
    "regras, prazos e taxas variam por estado e mudam com o tempo: quando a " +
    "resposta depender disso, oriente a confirmar no Crea da região.\n" +
    "- Sobre engenharia, seja tecnicamente correto. Cálculo, dimensionamento e " +
    "decisão de projeto são responsabilidade do profissional habilitado: " +
    "oriente o raciocínio e a norma aplicável, não substitua a análise dele.\n" +
    "- Se a pergunta fugir totalmente de engenharia, do Crea e do ProLink, " +
    "diga com naturalidade que não é o seu assunto e volte ao que você faz.\n" +
    "- Você não acessa o cadastro, os documentos nem as mensagens de ninguém, " +
    "e não consulta a base do Crea em tempo real. Deixe isso claro se " +
    "pedirem algo assim.\n" +
    "- Pode usar **negrito** e listas quando ajudar a leitura. Não use " +
    "títulos com # nem tabelas.";

  /**
   * Monta o par de mensagens que abre toda conversa: a instrução com o
   * manual e a confirmação da Miranda. Fica invisível para o usuário,
   * mas é o que dá contexto ao modelo em cada requisição.
   * @param {string} manual
   * @returns {Array}
   */
  function turnosDeContexto(manual) {
    var texto = PERSONA + "\n\n" +
      "=== MANUAL DO PROLINK (fonte oficial sobre o sistema) ===\n" +
      (manual || "(manual indisponível — avise que você não conseguiu carregar o manual do sistema)") +
      "\n=== FIM DO MANUAL ===";

    return [
      { role: "user", parts: [{ text: texto }] },
      {
        role: "model",
        parts: [{
          text: "Entendido. Sou a Miranda e vou responder com base no manual do " +
                "ProLink e no meu conhecimento de engenharia e do Sistema Confea/Crea."
        }]
      }
    ];
  }

  /**
   * Diagnóstico, para rodar no console do navegador:
   *
   *     MirandaDiagnostico()
   *
   * Pergunta ao Google quais modelos a chave deste projeto consegue usar
   * e quais deles aceitam generateContent. Serve para responder, em dez
   * segundos, a pergunta que mais custa tempo: "a chave está errada ou o
   * modelo é que não existe para ela?".
   */
  window.MirandaDiagnostico = function () {
    return carregarChaveApi().then(function (chave) {
      if (!chave) {
        console.error("[Miranda] Nenhuma chave inserida. Na tela inicial, aperte Ctrl + Espaço para inserir.");
        return null;
      }

      console.log("[Miranda] Chave em uso: " + descreverChave(chave) +
                  " | origem: inserida na tela inicial. Consultando modelos…");

      return fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + chave)
        .then(function (resposta) {
          return resposta.json().then(function (dados) {
            if (!resposta.ok) {
              console.error("[Miranda] A API recusou a listagem:", resposta.status, dados);
              return null;
            }

            var suportados = (dados.models || []).filter(function (m) {
              return (m.supportedGenerationMethods || []).indexOf("generateContent") !== -1;
            }).map(function (m) { return m.name.replace("models/", ""); });

            console.log("[Miranda] Modelos disponíveis para esta chave (" +
                        suportados.length + "):");
            suportados.forEach(function (nome) { console.log("   " + nome); });

            var configurados = MODELOS_GEMINI.filter(function (nome) {
              return suportados.indexOf(nome) !== -1;
            });

            if (configurados.length) {
              console.log("[Miranda] Dos configurados no projeto, funcionam: " +
                          configurados.join(", "));
            } else {
              console.warn("[Miranda] NENHUM dos modelos configurados está disponível " +
                           "para esta chave. Troque MODELOS_GEMINI por algum da lista acima.");
            }

            return suportados;
          });
        })
        .catch(function (erro) {
          console.error("[Miranda] Não foi possível consultar a lista de modelos:", erro);
          return null;
        });
    });
  };

  // ==================================================================
  // HISTÓRICO DA CONVERSA
  // Guardado em dados/miranda_mensagens.csv para a conversa continuar de onde parou
  // quando o usuário sai da tela e volta.
  // ==================================================================
  var LIMITE_DE_TURNOS = 30; // últimos 30 turnos enviados à API

  var conversa = []; // [{ autor: "usuario" | "miranda", texto: "...", hora }]

  /* A conversa fica em dados/miranda_mensagens.csv, uma linha por fala,
     ligada ao usuário da sessão. Visitante conversa só em memória. */
  var Banco = window.ProLinkBanco;
  var sessaoMiranda = Banco ? ProLinkModelos.sessao.atual() : null;
  var donoConversa = sessaoMiranda && !sessaoMiranda.visitante ? sessaoMiranda.id : "";
  var falasGravadas = 0;

  function lerConversaSalva() {
    if (!Banco || !donoConversa) { return []; }
    var linhas = ProLinkModelos.miranda_mensagens.listar({ usuarioId: donoConversa })
      .sort(function (a, b) { return String(a.criadoEm).localeCompare(String(b.criadoEm)) || String(a.id).localeCompare(String(b.id)); });
    falasGravadas = linhas.length;
    return linhas.map(function (l) { return { autor: l.autor, texto: l.texto, hora: l.hora }; });
  }

  /* Grava só as falas novas; conversa zerada apaga as linhas do usuário. */
  function salvarConversa() {
    if (!Banco || !donoConversa) { return; }
    if (!conversa.length) {
      ProLinkModelos.miranda_mensagens.excluirOnde({ usuarioId: donoConversa });
      falasGravadas = 0;
      return;
    }
    for (var i = falasGravadas; i < conversa.length; i += 1) {
      var fala = conversa[i];
      var agora = new Date();
      ProLinkModelos.miranda_mensagens.inserir({
        usuarioId: donoConversa, autor: fala.autor, texto: fala.texto, hora: fala.hora || "",
        criadoEm: agora.toISOString().replace("T", " ").slice(0, 19) + "." + String(i).padStart(4, "0")
      });
    }
    falasGravadas = conversa.length;
  }

  // ==================================================================
  // TELA
  // ==================================================================
  var listaMensagens = document.getElementById("miranda-mensagens");
  if (!listaMensagens) { return; } // não estamos na página da Miranda

  var formulario = document.getElementById("miranda-form");
  var campo = document.getElementById("miranda-campo");
  var botaoEnviar = document.getElementById("miranda-enviar");
  var botaoLimpar = document.getElementById("miranda-limpar");
  var telaVazia = document.getElementById("miranda-vazio");

  var aguardandoResposta = false;

  /** Escapa HTML antes de qualquer coisa: o texto vem de fora. */
  function escaparHtml(texto) {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Converte o Markdown simples que o modelo costuma usar em HTML:
   * negrito, itálico, código e listas. Nada além disso é interpretado.
   * @param {string} texto
   * @returns {string} HTML seguro
   */
  function formatarResposta(texto) {
    var linhas = escaparHtml(texto).split("\n");
    var html = "";
    var listaAberta = null; // "ul" | "ol" | null

    function fecharLista() {
      if (listaAberta) {
        html += "</" + listaAberta + ">";
        listaAberta = null;
      }
    }

    function enfase(trecho) {
      return trecho
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        // O itálico exige texto colado aos asteriscos, para não confundir
        // com multiplicação ("2 * 3 * 4" continua sendo multiplicação).
        .replace(/(^|[\s(])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?=[\s.,;:)!?]|$)/g, "$1<em>$2</em>")
        .replace(/`([^`\n]+)`/g, "<code>$1</code>");
    }

    linhas.forEach(function (linha) {
      var bruta = linha.trim();

      if (!bruta) { fecharLista(); return; }

      var itemNumerado = bruta.match(/^(\d+)[.)]\s+(.*)$/);
      var itemMarcado = bruta.match(/^[-*•]\s+(.*)$/);

      if (itemNumerado) {
        if (listaAberta !== "ol") { fecharLista(); html += "<ol>"; listaAberta = "ol"; }
        html += "<li>" + enfase(itemNumerado[2]) + "</li>";
      } else if (itemMarcado) {
        if (listaAberta !== "ul") { fecharLista(); html += "<ul>"; listaAberta = "ul"; }
        html += "<li>" + enfase(itemMarcado[1]) + "</li>";
      } else {
        fecharLista();
        html += "<p>" + enfase(bruta.replace(/^#{1,6}\s+/, "")) + "</p>";
      }
    });

    fecharLista();
    return html;
  }

  function rolarParaOFim() {
    listaMensagens.scrollTop = listaMensagens.scrollHeight;
  }

  /** Verdadeiro se a pessoa está acompanhando o fim da conversa. */
  function estaNoFim() {
    var distancia = listaMensagens.scrollHeight - listaMensagens.scrollTop -
                    listaMensagens.clientHeight;
    return distancia < 90;
  }

  // ==================================================================
  // ESCRITA PROGRESSIVA
  // A resposta aparece letra por letra, como nas IAs generativas.
  // Quem preferir menos movimento (prefers-reduced-motion) recebe o
  // texto de uma vez, e um clique na conversa também revela tudo.
  // ==================================================================
  var VELOCIDADE_BASE = 130;   // caracteres por segundo
  var DURACAO_MAXIMA = 4.5;    // segundos: textos longos aceleram
  var revelacaoEmCurso = null;

  function preferemMenosMovimento() {
    return window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Revela o texto aos poucos dentro do elemento.
   * @param {HTMLElement} destino
   * @param {string} texto
   * @param {function} aoTerminar
   */
  function escreverProgressivamente(destino, texto, aoTerminar) {
    if (preferemMenosMovimento() || texto.length < 2) {
      destino.innerHTML = formatarResposta(texto);
      aoTerminar();
      return;
    }

    /* Enquanto a resposta é escrita, a conversa fica "ocupada": o leitor
       de tela espera o texto final em vez de ler cada letra. */
    listaMensagens.setAttribute("aria-busy", "true");
    var porSegundo = Math.max(VELOCIDADE_BASE, texto.length / DURACAO_MAXIMA);
    var reveladas = 0;
    var instanteAnterior = null;

    destino.classList.add("escrevendo");

    function concluir() {
      revelacaoEmCurso = null;
      listaMensagens.removeAttribute("aria-busy");
      destino.classList.remove("escrevendo");
      destino.innerHTML = formatarResposta(texto);
      if (estaNoFim()) { rolarParaOFim(); }
      aoTerminar();
    }

    function passo(instante) {
      if (revelacaoEmCurso !== concluir) { return; } // foi interrompida

      if (instanteAnterior === null) { instanteAnterior = instante; }
      reveladas += ((instante - instanteAnterior) / 1000) * porSegundo;
      instanteAnterior = instante;

      if (reveladas >= texto.length) { concluir(); return; }

      var acompanhando = estaNoFim();
      destino.innerHTML = formatarResposta(texto.slice(0, Math.floor(reveladas)));
      if (acompanhando) { rolarParaOFim(); }

      window.requestAnimationFrame(passo);
    }

    revelacaoEmCurso = concluir;
    window.requestAnimationFrame(passo);
  }

  /** Corta a animação e mostra a resposta inteira. */
  function revelarTudoAgora() {
    if (revelacaoEmCurso) { revelacaoEmCurso(); }
  }

  listaMensagens.addEventListener("click", function (evento) {
    // Clicar em um link ou botão dentro da conversa não deve virar
    // "pular a animação".
    if (revelacaoEmCurso && !evento.target.closest("a, button")) {
      revelarTudoAgora();
    }
  });

  function horaAgora() {
    var agora = new Date();
    return String(agora.getHours()).padStart(2, "0") + ":" +
           String(agora.getMinutes()).padStart(2, "0");
  }

  /**
   * Desenha uma mensagem na tela.
   * @param {"usuario"|"miranda"} autor
   * @param {string} texto
   * @param {{erro?: boolean}} [opcoes]
   * @returns {HTMLElement} o elemento criado
   */
  function desenharMensagem(autor, texto, opcoes) {
    opcoes = opcoes || {};
    var ehMiranda = autor === "miranda";
    var item = document.createElement("article");
    item.className = "fala fala-" + (ehMiranda ? "miranda" : "usuario");

    var avatar;
    if (ehMiranda) {
      avatar = document.createElement("img");
      avatar.className = "fala-avatar rosto-miranda";
      avatar.src = "assets/img/miranda-avatar.png";
      avatar.alt = "";
      avatar.width = 34;
      avatar.height = 34;
    } else {
      avatar = document.createElement("span");
      avatar.className = "fala-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "V";
    }

    var corpo = document.createElement("div");
    corpo.className = "fala-corpo" + (opcoes.erro ? " fala-erro" : "");

    var autoria = document.createElement("span");
    autoria.className = "fala-autoria";
    autoria.textContent = (ehMiranda ? "Miranda" : "Você") + " · " + (opcoes.hora || horaAgora());

    var conteudo = document.createElement("div");
    conteudo.className = "fala-texto";
    if (!ehMiranda) {
      conteudo.textContent = texto;
    } else if (opcoes.animar) {
      escreverProgressivamente(conteudo, texto, opcoes.aoTerminar || function () {});
    } else {
      conteudo.innerHTML = formatarResposta(texto);
    }

    corpo.appendChild(autoria);
    corpo.appendChild(conteudo);
    item.appendChild(avatar);
    item.appendChild(corpo);
    listaMensagens.appendChild(item);

    if (telaVazia) { telaVazia.hidden = true; }
    rolarParaOFim();
    return item;
  }

  /** Três pontinhos enquanto a resposta não chega. */
  function desenharDigitando() {
    var item = document.createElement("article");
    item.className = "fala fala-miranda";
    item.id = "miranda-digitando";
    item.innerHTML =
      '<img class="fala-avatar rosto-miranda" src="assets/img/miranda-avatar.png" ' +
      'alt="" width="34" height="34">' +
      '<div class="fala-corpo">' +
      '<span class="fala-autoria">Miranda está escrevendo</span>' +
      '<span class="pontinhos" role="status" aria-label="Miranda está escrevendo">' +
      "<span></span><span></span><span></span></span></div>";
    listaMensagens.appendChild(item);
    rolarParaOFim();
    return item;
  }

  function bloquearEnvio(bloquear) {
    aguardandoResposta = bloquear;
    if (botaoEnviar) { botaoEnviar.disabled = bloquear; }
    if (campo) { campo.disabled = bloquear; }
    if (!bloquear && campo) { campo.focus(); }
  }

  /** Faz a caixa de texto crescer conforme o usuário digita. */
  function ajustarAlturaDoCampo() {
    campo.style.height = "auto";
    campo.style.height = Math.min(campo.scrollHeight, 180) + "px";
  }

  // ==================================================================
  // CHAMADA À API
  // ==================================================================

  /**
   * Explica, em português, por que a API respondeu sem nenhum texto.
   * @param {object|null} dados
   * @returns {string}
   */
  function descreverRespostaVazia(dados) {
    var motivoBloqueio = dados && dados.promptFeedback && dados.promptFeedback.blockReason;
    if (motivoBloqueio) {
      return "A pergunta foi bloqueada pelos filtros de segurança do Gemini " +
             "(motivo informado: " + motivoBloqueio + "). Tente reformular com outras palavras.";
    }

    var candidato = dados && dados.candidates && dados.candidates[0];
    var motivoParada = candidato && candidato.finishReason;

    if (motivoParada === "SAFETY") {
      return "A resposta foi bloqueada pelos filtros de segurança do Gemini. " +
             "Tente reformular a pergunta com outras palavras.";
    }
    if (motivoParada === "MAX_TOKENS") {
      return "A resposta passou do limite de tamanho antes de ser gerada. " +
             "Tente uma pergunta mais específica.";
    }
    if (dados && dados.error && dados.error.message) {
      return "A API recusou a requisição: " + dados.error.message;
    }

    return "O Gemini respondeu, mas não enviou nenhum texto" +
           (motivoParada ? " (motivo informado: " + motivoParada + ")" : "") +
           ". Tente perguntar de novo.";
  }

  /**
   * Envia a conversa inteira (contexto + histórico) e devolve o texto
   * da resposta.
   * @returns {Promise<{texto: string, erro: boolean}>}
   */
  function perguntarAoGemini() {
    return Promise.all([carregarChaveApi(), carregarManual()]).then(function (valores) {
      var API_KEY = valores[0];
      var manual = valores[1];

      if (!API_KEY) {
        console.warn("[Miranda] Sem chave da API: a conversa fica indisponível.");
        return { erro: true, texto: MENSAGEM_INDISPONIVEL };
      }

      // Contexto fixo + últimos turnos da conversa. O recorte precisa
      // começar por uma fala do usuário: o contexto termina com uma fala
      // da Miranda, e a API espera que os papéis se alternem.
      var recorte = conversa.slice(-LIMITE_DE_TURNOS);
      while (recorte.length && recorte[0].autor !== "usuario") {
        recorte.shift();
      }

      var recentes = recorte.map(function (fala) {
        return {
          role: fala.autor === "usuario" ? "user" : "model",
          parts: [{ text: fala.texto }]
        };
      });

      var corpo = {
        contents: turnosDeContexto(manual).concat(recentes),
        /* Só o que todo modelo aceita.
           temperature, top_p e top_k foram descontinuados na API do Gemini.
           thinkingBudget saiu junto: nos modelos Gemini 3 o controle passou
           a ser thinkingLevel ("minimal", "low", "medium", "high"), e mandar
           o campo antigo devolve INVALID_ARGUMENT. */
        generationConfig: {
          maxOutputTokens: 900,
          thinkingLevel: "minimal"
        }
      };

      /* Corpo de reserva, sem nenhum ajuste opcional. Serve para o caso de
         um modelo recusar até o thinkingLevel: responder mais devagar é
         melhor do que não responder. */
      var corpoSimples = {
        contents: corpo.contents,
        generationConfig: { maxOutputTokens: 900 }
      };

      /* Uma tentativa contra um modelo. Devolve o texto, ou um aviso de
         que vale tentar outro. */
      function tentar(modelo, corpoEnviado) {
        return fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          modelo + ":generateContent?key=" + API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpoEnviado || corpo)
          }
        ).then(function (resposta) {
          /* 429 é cota ou fila; 503 é o modelo sobrecarregado. Nos dois
             casos o problema é capacidade, não a pergunta — insistir ou
             trocar de modelo costuma resolver. */
          if (resposta.status === 429 || resposta.status === 503) {
            return { sobrecarregado: true, status: resposta.status };
          }

          return resposta.json().catch(function () { return null; }).then(function (dados) {
            /* Erro do Google vem com código, status e mensagem. Mostrar isso
               poupa horas de adivinhação: "modelo não existe para esta chave"
               e "requisições deste domínio estão bloqueadas" são problemas
               completamente diferentes, e o texto genérico esconde os dois. */
            if (!resposta.ok) {
              var erroApi = dados && dados.error;
              var detalhe = erroApi
                ? erroApi.message + " (" + (erroApi.status || resposta.status) + ")"
                : "HTTP " + resposta.status;

              console.error("[Miranda] " + modelo + " recusou:", resposta.status, dados);

              /* Chave inválida, expirada ou sem permissão: não é algo que a
                 pessoa do outro lado resolva, então a mensagem é gentil. */
              var textoErro = JSON.stringify(dados || {});
              if (resposta.status === 401 || resposta.status === 403 ||
                  /API_KEY_INVALID|API key|PERMISSION_DENIED/i.test(textoErro)) {
                return { erro: true, httpStatus: 401, chaveRecusada: true, texto: MENSAGEM_INDISPONIVEL };
              }

              return {
                erro: true,
                httpStatus: resposta.status,
                texto: "A API recusou a requisição no modelo " + modelo + ": " + detalhe
              };
            }

            var candidato = dados && dados.candidates && dados.candidates[0];
            var parte = candidato && candidato.content && candidato.content.parts &&
                        candidato.content.parts[0];
            var texto = parte && parte.text;

            if (!texto) {
              console.warn("[Miranda] A API não retornou texto. Resposta:", dados);
              return { erro: true, texto: descreverRespostaVazia(dados) };
            }

            return { erro: false, texto: texto.trim(), modelo: modelo };
          });
        });
      }

      function esperar(ms) {
        return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
      }

      /* Percorre a lista de modelos; dentro de cada um, insiste algumas
         vezes antes de desistir. */
      function tentarEmSequencia(indice, tentativa, simplificado) {
        if (indice >= MODELOS_GEMINI.length) {
          return Promise.resolve({
            erro: true,
            sobrecarga: true,
            texto: "Os modelos estão congestionados neste momento — isso costuma passar " +
                   "em alguns instantes. Enquanto isso, posso responder pelo manual do " +
                   "ProLink: pergunte de novo e eu busco lá."
          });
        }

        var modelo = MODELOS_GEMINI[indice];

        return tentar(modelo, simplificado ? corpoSimples : corpo).then(function (resultado) {
          /* INVALID_ARGUMENT quer dizer que o modelo não aceitou algum campo
             do corpo. Repetir sem os ajustes opcionais resolve, e é melhor
             do que desistir por causa de um parâmetro. */
          if (resultado.httpStatus === 400 && !simplificado) {
            console.warn("[Miranda] " + modelo + " recusou um campo do corpo. " +
                         "Repetindo sem os ajustes opcionais.");
            return tentarEmSequencia(indice, 1, true);
          }

          /* Modelo que não existe para esta chave devolve 404. Não adianta
             insistir: o próximo da lista pode existir. */
          if (resultado.httpStatus === 404 && indice + 1 < MODELOS_GEMINI.length) {
            console.warn("[Miranda] " + modelo + " não está disponível para esta chave. " +
                         "Tentando o próximo.");
            return tentarEmSequencia(indice + 1, 1, false);
          }

          if (!resultado.sobrecarregado) { return resultado; }

          console.warn("[Miranda] " + modelo + " respondeu " + resultado.status +
                       " (sobrecarga). Tentativa " + tentativa + ".");

          if (tentativa < TENTATIVAS_POR_MODELO) {
            return esperar(ESPERA_ENTRE_TENTATIVAS)
              .then(function () {
                return tentarEmSequencia(indice, tentativa + 1, simplificado);
              });
          }

          return tentarEmSequencia(indice + 1, 1, false);
        });
      }

      return tentarEmSequencia(0, 1, false)
        .catch(function (erro) {
          console.error("[Miranda] Erro ao consultar a API:", erro);
          return {
            erro: true,
            texto: erro instanceof TypeError
              ? "Não consegui falar com a API agora. Verifique sua conexão e tente de novo."
              : "Ocorreu um erro inesperado: " + (erro.message || String(erro))
          };
        });
    });
  }

  /**
   * Fluxo completo de uma pergunta: desenha, chama a API, responde.
   * @param {string} pergunta
   */
  function enviarPergunta(pergunta) {
    if (aguardandoResposta || !pergunta) { return; }

    desenharMensagem("usuario", pergunta);
    conversa.push({ autor: "usuario", texto: pergunta, hora: horaAgora() });
    salvarConversa();

    campo.value = "";
    ajustarAlturaDoCampo();
    bloquearEnvio(true);

    var digitando = desenharDigitando();

    perguntarAoGemini().then(function (resultado) {
      digitando.remove();

      if (resultado.erro) {
        // Aviso de erro aparece de imediato, sem animação, e não entra
        // no histórico: não é fala da Miranda e só atrapalharia o
        // contexto da próxima pergunta.
        desenharMensagem("miranda", resultado.texto, { erro: true });
        bloquearEnvio(false);
        return;
      }

      conversa.push({ autor: "miranda", texto: resultado.texto, hora: horaAgora() });
      salvarConversa();

      desenharMensagem("miranda", resultado.texto, {
        animar: true,
        aoTerminar: function () { bloquearEnvio(false); }
      });
    });
  }

  // ==================================================================
  // EVENTOS
  // ==================================================================
  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    enviarPergunta(campo.value.trim());
  });

  // Enter envia, Shift+Enter quebra a linha.
  campo.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      formulario.requestSubmit();
    }
  });

  campo.addEventListener("input", ajustarAlturaDoCampo);

  // Sugestões da tela inicial.
  document.querySelectorAll("[data-sugestao]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      enviarPergunta(botao.dataset.sugestao);
    });
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", function () {
      if (aguardandoResposta) { return; }
      conversa = [];
      salvarConversa();
      listaMensagens.querySelectorAll(".fala").forEach(function (item) { item.remove(); });
      if (telaVazia) { telaVazia.hidden = false; }
      campo.focus();
    });
  }

  // ==================================================================
  // ABERTURA
  // ==================================================================
  conversa = lerConversaSalva();
  conversa.forEach(function (fala) {
    desenharMensagem(fala.autor, fala.texto, { hora: fala.hora });
  });
  if (conversa.length && telaVazia) { telaVazia.hidden = true; }

  ajustarAlturaDoCampo();
  campo.focus();

  // Carrega chave e manual assim que a tela abre, para a primeira
  // resposta não esperar por leitura de arquivo.
  carregarChaveApi();
  carregarManual();
})();
