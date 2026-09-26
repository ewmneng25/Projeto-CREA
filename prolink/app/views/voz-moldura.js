/* ============================================================
   ProLink — moldura de voz (modo de acessibilidade)

   acessivel.html mostra o ProLink inteiro dentro de um quadro e
   mantém, fora dele, uma conversa de áudio contínua com a Miranda
   pela Gemini Live API (bate-papo por voz em tempo real, disponível
   no nível gratuito da API). Como a conversa mora na moldura, ela
   não cai quando a pessoa troca de tela.

   Fluxo:
     microfone → PCM 16 kHz → WebSocket (Live API) → áudio 24 kHz → alto-falante
     a Miranda pede ações (ler a tela, clicar, preencher, navegar,
     pesquisar) → a moldura repassa ao agente da tela (voz-agente.js)
     por postMessage → o resultado volta para a Miranda.

   Modelos: todos do nível gratuito da Live API, em ordem de tentativa.
   ============================================================ */
(function (window, document) {
  "use strict";

  var MODELOS_LIVE = ["gemini-3.8-live", "gemini-3.1-flash-live-preview"];
  var ENDERECO_LIVE = "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=";
  var VOZ = "Kore";

  /* De onde vem a chave do Gemini nesta versão do projeto. */
  var ORIGEM_DA_CHAVE = "interface";
  var ARQUIVO_DA_CHAVE = "chave_api_gemini.txt";
  var CHAVE_DA_SESSAO = "prolink_chave_gemini";

  var CHAVE_MODO = "prolink_modo_voz";
  var CHAVE_RETOMADA = "prolink_voz_retomada";
  var CHAVE_JA_APRESENTOU = "prolink_voz_apresentou";
  var MARCA = "prolink-voz";

  var MENSAGEM_INDISPONIVEL = "O assistente de voz não está funcionando no momento. " +
    "Você pode continuar usando o ProLink normalmente pelo teclado e pelo leitor de tela.";

  // ==================================================================
  // ELEMENTOS
  // A moldura se monta sozinha: em acessivel.html (aberta direto ou
  // depois de um F5) e também na própria tela em que a pessoa clicou
  // em "Ativar" — aí não há troca de página, e o clique continua
  // valendo para o navegador liberar o som.
  // ==================================================================
  var MICROFONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/>' +
    '<path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path class="voz-risco" d="M4 4l16 16"/></svg>';

  function montarMoldura() {
    if (document.getElementById("quadro-prolink")) { return; }
    document.documentElement.classList.remove("splash-pendente", "com-splash");
    document.body.className = "moldura-voz";
    document.body.innerHTML =
      '<main class="moldura-principal">' +
        '<h1 class="sr-apenas">ProLink no modo de acessibilidade, com a assistente de voz Miranda</h1>' +
        '<iframe id="quadro-prolink" class="quadro-prolink" title="Tela do ProLink"></iframe>' +
      "</main>" +
      '<section id="painel-voz" class="painel-voz" aria-label="Assistente de voz Miranda" data-estado="desligado">' +
        '<div id="voz-transcricao" class="voz-gaveta" hidden>' +
          '<h2 class="voz-gaveta-titulo">Transcrição da conversa</h2>' +
          '<ol id="voz-historico" class="voz-historico" tabindex="0" aria-label="Histórico da conversa por voz"></ol>' +
          '<div class="voz-escolha-microfone">' +
            '<label for="voz-lista-microfones">Microfone</label>' +
            '<select id="voz-lista-microfones"><option value="">Padrão do sistema</option></select>' +
          "</div>" +
          '<form id="voz-form-texto" class="voz-form-texto">' +
            '<label class="sr-apenas" for="voz-campo-texto">Escrever para a Miranda</label>' +
            '<input id="voz-campo-texto" type="text" autocomplete="off" placeholder="Escreva para a Miranda e aperte Enter">' +
            '<button class="btn btn-sm" type="submit">Enviar</button>' +
          "</form>" +
        "</div>" +
        '<div class="voz-barra">' +
          '<span id="voz-indicador" class="voz-indicador" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
          '<span class="voz-nivel" title="Nível do seu microfone" aria-hidden="true"><span id="voz-nivel-barra"></span></span>' +
          '<div class="voz-textos">' +
            '<p id="voz-estado" class="voz-estado">Assistente de voz desligado</p>' +
            '<p id="voz-legenda" class="voz-legenda" aria-hidden="true"></p>' +
          "</div>" +
          '<div class="voz-acoes">' +
            '<button id="voz-iniciar" class="btn btn-sm" type="button" hidden>Iniciar assistente de voz</button>' +
            '<button id="voz-microfone" class="btn btn-sm btn-secundario voz-microfone" type="button" aria-pressed="false" ' +
              'aria-keyshortcuts="Alt+M">' + MICROFONE + '<span class="voz-botao-texto">Silenciar microfone</span>' +
              '<kbd class="voz-atalho" aria-hidden="true">Alt+M</kbd></button>' +
            '<button id="voz-abrir-transcricao" class="btn btn-sm btn-secundario" type="button" aria-expanded="false" ' +
              'aria-controls="voz-transcricao">Transcrição</button>' +
            '<button id="voz-desativar" class="btn btn-sm btn-fantasma" type="button">Desativar modo</button>' +
          "</div>" +
        "</div>" +
      "</section>" +
      '<div id="voz-anuncio" class="sr-apenas" role="status" aria-live="polite"></div>';
  }
  montarMoldura();

  var quadro = document.getElementById("quadro-prolink");
  var painel = document.getElementById("painel-voz");
  var indicador = document.getElementById("voz-indicador");
  var textoEstado = document.getElementById("voz-estado");
  var legenda = document.getElementById("voz-legenda");
  var botaoMicrofone = document.getElementById("voz-microfone");
  var botaoTranscricao = document.getElementById("voz-abrir-transcricao");
  var botaoDesativar = document.getElementById("voz-desativar");
  var botaoIniciar = document.getElementById("voz-iniciar");
  var gaveta = document.getElementById("voz-transcricao");
  var historico = document.getElementById("voz-historico");
  var formTexto = document.getElementById("voz-form-texto");
  var campoTexto = document.getElementById("voz-campo-texto");
  var anuncio = document.getElementById("voz-anuncio");

  function ler(armazenamento, chave) {
    try { return window[armazenamento].getItem(chave); } catch (erro) { return null; }
  }
  function gravar(armazenamento, chave, valor) {
    try {
      if (valor == null) { window[armazenamento].removeItem(chave); }
      else { window[armazenamento].setItem(chave, valor); }
    } catch (erro) { /* sem armazenamento */ }
  }

  // ==================================================================
  // A TELA DENTRO DO QUADRO
  // ==================================================================
  function parametro(nome) {
    var partes = window.location.search.replace(/^\?/, "").split("&");
    for (var i = 0; i < partes.length; i += 1) {
      var par = partes[i].split("=");
      if (decodeURIComponent(par[0]) === nome) { return decodeURIComponent((par[1] || "").replace(/\+/g, " ")); }
    }
    return "";
  }

  function enderecoSeguro(endereco) {
    endereco = String(endereco || "").replace(/^\.?\//, "");
    /* Só páginas do próprio ProLink, pelo nome do arquivo. */
    if (!/^[a-z0-9-]+\.html([?#].*)?$/i.test(endereco) || /^acessivel\.html/i.test(endereco)) { return "index.html"; }
    return endereco;
  }

  var paginaAtual = enderecoSeguro(window.PROLINK_VOZ_PAGINA_INICIAL || parametro("p") || "index.html");
  var geracao = 0;             // sobe a cada tela nova pronta
  var saindo = false;          // a tela avisou que está saindo
  var esperandoPronta = [];

  quadro.src = paginaAtual;

  /* Reforço do atalho: além do aviso do agente da tela, a moldura escuta o
     teclado dentro do quadro sempre que o navegador deixa (mesma origem).
     Vale mesmo numa tela em que o agente não carregou. */
  var ultimoAtalho = 0;
  function atalhoMicrofone(evento) {
    if (!evento.altKey || evento.ctrlKey || evento.metaKey) { return false; }
    if (evento.code !== "KeyM" && String(evento.key).toLowerCase() !== "m") { return false; }
    evento.preventDefault();
    if (evento.__prolinkAtalho) { return true; }       // já tratado
    evento.__prolinkAtalho = true;
    var agora = Date.now();
    if (agora - ultimoAtalho < 250) { return true; }  // o mesmo toque chegou por dois caminhos
    ultimoAtalho = agora;
    if (!conectado) { iniciarPeloGesto(); } else { alternarMicrofone(); }
    return true;
  }
  function escutarTecladoDoQuadro() {
    try {
      var janela = quadro.contentWindow;
      if (!janela || janela.__prolinkAtalhoLigado) { return; }
      janela.__prolinkAtalhoLigado = true;
      janela.addEventListener("keydown", atalhoMicrofone, true);
    } catch (erro) { /* outra origem (arquivo aberto direto): o agente da tela avisa */ }
  }
  quadro.addEventListener("load", escutarTecladoDoQuadro);

  function aoFicarPronta(msg) {
    geracao += 1;
    saindo = false;
    paginaAtual = enderecoSeguro(msg.endereco);
    document.title = (msg.titulo || "ProLink") + " · modo de acessibilidade";
    quadro.setAttribute("title", "Tela do ProLink: " + (msg.titulo || ""));
    try {
      window.history.replaceState(null, "", "acessivel.html?p=" + encodeURIComponent(paginaAtual));
    } catch (erro) { /* file:// pode recusar: sem prejuízo */ }
    var fila = esperandoPronta;
    esperandoPronta = [];
    fila.forEach(function (f) { f(); });
    /* Quem usa teclado continua dentro da tela nova. */
    if (document.activeElement === document.body || document.activeElement === quadro) {
      try { quadro.focus(); } catch (erro) { /* ignora */ }
    }
  }

  function esperarTelaNova(limite) {
    return new Promise(function (ok) {
      var feito = false;
      function fim(valor) { if (!feito) { feito = true; ok(valor); } }
      esperandoPronta.push(function () { fim(true); });
      window.setTimeout(function () { fim(false); }, limite || 10000);
    });
  }

  var pendentes = {};
  var proximoPedido = 1;

  function pedirATela(acao, args, limite) {
    return new Promise(function (ok) {
      var id = proximoPedido++;
      var tempo = window.setTimeout(function () {
        delete pendentes[id];
        ok({ erro: "A tela não respondeu (ela pode estar carregando). Tente de novo em instantes." });
      }, limite || 8000);
      pendentes[id] = function (resultado) { window.clearTimeout(tempo); ok(resultado); };
      try {
        quadro.contentWindow.postMessage({ marca: MARCA, tipo: "pedido", id: id, acao: acao, args: args || {} }, "*");
      } catch (erro) {
        window.clearTimeout(tempo);
        delete pendentes[id];
        ok({ erro: "Não consegui falar com a tela." });
      }
    });
  }

  window.addEventListener("message", function (evento) {
    if (evento.source !== quadro.contentWindow) { return; }
    var msg = evento.data;
    if (!msg || msg.marca !== MARCA) { return; }
    if (msg.tipo === "resposta" && pendentes[msg.id]) {
      var f = pendentes[msg.id];
      delete pendentes[msg.id];
      f(msg.resultado);
    } else if (msg.tipo === "pronta") {
      aoFicarPronta(msg);
    } else if (msg.tipo === "saindo") {
      saindo = true;
    } else if (msg.tipo === "atalho-microfone") {
      var agora = Date.now();
      if (agora - ultimoAtalho < 250) { return; }     // já tratado pela escuta direta
      ultimoAtalho = agora;
      if (!conectado) { iniciarPeloGesto(); } else { alternarMicrofone(); }
    } else if (msg.tipo === "focar-quadro") {
      try { quadro.focus(); } catch (erro) { /* ignora */ }
    } else if (msg.tipo === "interacao") {
      aoInteragir(null);
    } else if (msg.tipo === "chave-gemini") {
      aoMudarChave();
    }
  });

  // ==================================================================
  // ESTADO VISÍVEL (e anúncios curtos para o leitor de tela)
  // ==================================================================
  var ROTULOS = {
    desligado: "Assistente de voz desligado",
    conectando: "Conectando a Miranda…",
    ouvindo: "Miranda está ouvindo",
    falando: "Miranda está falando",
    agindo: "Miranda está mexendo na tela…",
    silenciado: "Microfone silenciado",
    aguardando: "Miranda pronta: aperte qualquer tecla para ouvir a voz dela",
    indisponivel: "Assistente de voz indisponível no momento",
    sem_chave: "Falta a chave do Gemini"
  };
  var estado = "desligado";

  function definirEstado(novo) {
    if (estado === novo) { return; }
    var anterior = estado;
    estado = novo;
    painel.setAttribute("data-estado", novo);
    textoEstado.textContent = ROTULOS[novo] || novo;
    /* Só anuncia o que a pessoa não ouviria de outro jeito: problemas e
       mudanças do microfone. A fala da Miranda já é o retorno. */
    if (/silenciado|indisponivel|sem_chave|aguardando/.test(novo) ||
        (novo === "ouvindo" && anterior === "silenciado")) {
      anunciar(ROTULOS[novo]);
    }
    /* Rótulo fixo e estado em aria-pressed: o leitor diz "Silenciar
       microfone, botão, pressionado" quando o microfone está mudo. */
    botaoMicrofone.setAttribute("aria-pressed", novo === "silenciado" ? "true" : "false");
  }

  function anunciar(texto) {
    anuncio.textContent = "";
    window.setTimeout(function () { anuncio.textContent = texto; }, 60);
  }

  var falaAtual = null;
  var usuarioAtual = null;

  function registrarNoHistorico(autor, texto, continuar) {
    texto = String(texto || "");
    if (!texto) { return; }
    var alvo = autor === "Miranda" ? falaAtual : usuarioAtual;
    if (!continuar || !alvo) {
      var item = document.createElement("li");
      item.className = "voz-fala voz-fala-" + (autor === "Miranda" ? "miranda" : autor === "Você" ? "voce" : "sistema");
      item.innerHTML = '<strong class="voz-autor"></strong> <span class="voz-texto"></span>';
      item.querySelector(".voz-autor").textContent = autor + ":";
      historico.appendChild(item);
      while (historico.children.length > 120) { historico.removeChild(historico.firstChild); }
      alvo = item;
      if (autor === "Miranda") { falaAtual = item; } else if (autor === "Você") { usuarioAtual = item; }
    }
    var span = alvo.querySelector(".voz-texto");
    span.textContent = (continuar ? span.textContent : "") + texto;
    historico.scrollTop = historico.scrollHeight;
    if (autor === "Miranda") { legenda.textContent = limitarLegenda(span.textContent); }
  }

  function limitarLegenda(texto) {
    texto = texto.replace(/\s+/g, " ").trim();
    return texto.length > 180 ? "…" + texto.slice(-178) : texto;
  }

  // ==================================================================
  // ÁUDIO: captura (16 kHz) e reprodução (24 kHz)
  // ==================================================================
  var audio = null;           // AudioContext único
  var fluxoMicrofone = null;
  var noCaptura = null;
  var microfoneLigado = true; // a pessoa não silenciou
  var proximoInicio = 0;
  var fontesTocando = [];
  var descartarResto = false; // interrompida: ignora o resto do turno
  var FOLGA_APOS_FALA = 0.35; // segundos sem captar depois que a Miranda para (eco)

  var CODIGO_CAPTURA =
    "class Captura extends AudioWorkletProcessor {" +
    "  constructor(){ super(); this.razao = sampleRate / 16000; this.acum = 0; this.soma = 0; this.n = 0;" +
    "    this.saida = new Int16Array(1600); this.pos = 0; }" +
    "  process(entradas){ var canal = entradas[0] && entradas[0][0]; if (!canal) return true;" +
    "    for (var i = 0; i < canal.length; i++) { this.soma += canal[i]; this.n++; this.acum += 1;" +
    "      if (this.acum >= this.razao) { this.acum -= this.razao; var v = this.soma / this.n; this.soma = 0; this.n = 0;" +
    "        v = Math.max(-1, Math.min(1, v)); this.saida[this.pos++] = v < 0 ? v * 32768 : v * 32767;" +
    "        if (this.pos === this.saida.length) { this.port.postMessage(this.saida.buffer.slice(0)); this.pos = 0; } } }" +
    "    return true; } }" +
    "registerProcessor('prolink-captura', Captura);";

  function prepararAudio() {
    if (!audio) {
      var Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) { return Promise.reject(new Error("Este navegador não toca áudio pela Web Audio API.")); }
      /* Ativado na própria tela: o contexto de áudio foi criado no clique. */
      audio = window.ProLinkAudioPreparado || new Contexto();
    }
    if (!audio.__vigiado) {
      audio.__vigiado = true;
      /* O som do navegador parou (fone trocado, sistema suspendeu): o que
         estava na fila não vai terminar; limpa e tenta retomar. */
      audio.addEventListener("statechange", function () {
        if (audio.state !== "running") {
          pararFala();
          if (conectado && estado !== "silenciado") { audio.resume().catch(function () { /* espera um toque */ }); }
        }
      });
    }
    if (audio.state !== "suspended") { return Promise.resolve(); }
    /* Sem gesto da pessoa, o resume() fica pendente para sempre: espera
       um instante e segue; quem chamou confere se o som foi liberado. */
    return Promise.race([
      audio.resume().catch(function () { /* precisa de gesto */ }),
      new Promise(function (ok) { window.setTimeout(ok, 350); })
    ]);
  }

  function audioLiberado() { return audio && audio.state === "running"; }

  function base64DeBytes(buffer) {
    var bytes = new Uint8Array(buffer), texto = "", PASSO = 0x8000;
    for (var i = 0; i < bytes.length; i += PASSO) {
      texto += String.fromCharCode.apply(null, bytes.subarray(i, i + PASSO));
    }
    return window.btoa(texto);
  }

  function bytesDeBase64(texto) {
    var bin = window.atob(texto), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) { bytes[i] = bin.charCodeAt(i); }
    return bytes;
  }

  var fimDaFala = 0;           // relógio de parede: quando a última fala terminou
  var LIMITE_FALA_MS = 90000;  // nenhuma fala trava o microfone mais que isso

  function mirandaFalando() {
    var agora = Date.now();
    if (modoAlternativo && (alt.falando || alt.processando)) { return true; }
    if (fontesTocando.length) {
      /* Trava de segurança: se o som do navegador congelar (troca de fone,
         suspensão), as falas nunca "terminam" e o microfone ficaria mudo
         para sempre. */
      if (agora - inicioDaFala > LIMITE_FALA_MS) { pararFala(); return false; }
      return true;
    }
    return agora < fimDaFala + FOLGA_APOS_FALA * 1000;
  }
  var inicioDaFala = 0;

  // ------------------------------------------------------------------
  // O que o microfone está captando
  // ------------------------------------------------------------------
  var ultimoSom = 0, inicioMicrofone = 0, nivelRecente = 0, silencioAvisado = false;
  var microfonesTentados = {};
  var barraNivel = null;

  function medirNivel(buffer) {
    var nivel = rms(buffer);
    nivelRecente = Math.max(nivel, nivelRecente * 0.9);
    /* Silêncio "digital" (zeros exatos) é microfone mudo ou errado; o
       ruído mais baixo de um microfone de verdade já passa disso. */
    if (nivel > 0.00005) { ultimoSom = Date.now(); if (silencioAvisado) { silencioAvisado = false; salvarMicrofoneQueFunciona(); } }
    barraNivel = barraNivel || document.getElementById("voz-nivel-barra");
    if (barraNivel) { barraNivel.style.width = Math.min(100, Math.round(Math.sqrt(nivel) * 260)) + "%"; }
    return nivel;
  }

  function aoCapturar(buffer) {
    var nivel = medirNivel(buffer);
    if (modoAlternativo) { vadAlternativo(buffer); return; }
    if (!microfoneLigado || !conectado || mirandaFalando()) { vadLocal(null); return; }
    diag.blocosEnviados += 1;
    enviar({ realtimeInput: { audio: { data: base64DeBytes(buffer), mimeType: "audio/pcm;rate=16000" } } });
    vadLocal(buffer, nivel);
  }

  /* Detecção de fala feita aqui mesmo, na voz ao vivo: se a pessoa falou e
     o servidor não reagiu (nem transcreveu), a fala guardada vai pelo modo
     compatível — ela não precisa repetir. */
  var vl = { gravando: false, blocos: [], antes: [], fala: 0, silencio: 0, ruido: 0.004, inicio: 0, pendente: null };
  var ultimaReacao = 0;

  function vadLocal(buffer, nivel) {
    if (!buffer) { vl.gravando = false; vl.blocos = []; vl.antes = []; vl.fala = 0; return; }
    var limiar = Math.max(0.018, vl.ruido * 3.5);
    if (!vl.gravando) {
      vl.antes.push(buffer);
      if (vl.antes.length > 3) { vl.antes.shift(); }
      if (nivel > limiar) {
        vl.fala += 1;
        if (vl.fala >= 2) { vl.gravando = true; vl.blocos = vl.antes.slice(); vl.antes = []; vl.silencio = 0; vl.inicio = Date.now() - 300; }
      } else { vl.fala = 0; vl.ruido = vl.ruido * 0.95 + nivel * 0.05; }
      return;
    }
    vl.blocos.push(buffer);
    vl.silencio = nivel > limiar * 0.7 ? 0 : vl.silencio + 1;
    if (vl.silencio >= 8 || vl.blocos.length >= 150) {
      if (vl.blocos.length >= 8) {
        /* Falou de novo sem resposta: junta as falas e mantém o prazo da primeira. */
        if (vl.pendente) { vl.pendente.blocos = vl.pendente.blocos.concat(vl.blocos).slice(-300); }
        else { vl.pendente = { blocos: vl.blocos, inicio: vl.inicio, fim: Date.now() }; }
      }
      vl.gravando = false; vl.blocos = []; vl.fala = 0;
    }
  }

  function conferirMicrofoneESilencio() {
    var agora = Date.now();
    /* 1. A pessoa falou e a voz ao vivo não deu sinal nenhum. */
    if (vl.pendente && !modoAlternativo) {
      if (ultimaReacao >= vl.pendente.inicio) { vl.pendente = null; }
      else if (agora - vl.pendente.fim > 7000 && conectado) {
        var blocos = vl.pendente.blocos;
        vl.pendente = null;
        falhaDaVozAoVivo("a voz ao vivo não reagiu à sua fala");
        if (modoAlternativo) { perguntarAlternativo(null, blocos); }
      }
    }
    /* 2. O microfone só entrega silêncio absoluto. */
    medirPeloAnalisador();
    cuidarDaEscutaDoNavegador();
    if (!fluxoMicrofone || !microfoneLigado || !conectado || estado === "aguardando" || silencioAvisado || escutaNavegador) { return; }
    if (ctxCaptura && ctxCaptura.state !== "running") { ctxCaptura.resume().catch(function () { /* espera um toque */ }); return; }
    var semSomPrincipal = agora - Math.max(ultimoSom, inicioMicrofone);
    var semSomMedidor = agora - Math.max(ultimoSomMedidor, inicioMicrofone);
    /* 2a. O som existe, só o jeito de captar falhou. */
    if (semSomPrincipal > 4000 && semSomMedidor < 2000 && !trocouMetodo) {
      trocouMetodo = true;
      trocarMetodoDeCaptura();
      return;
    }
    if (semSomPrincipal < 9000 || semSomMedidor < 9000) { return; }
    silencioAvisado = true;
    tentarOutroMicrofone();
  }
  window.setInterval(conferirMicrofoneESilencio, 1000);

  var ctxCaptura = null;     // motor de áudio só da captura
  var analisador = null, fonteCaptura = null, metodoCaptura = "", ultimoSomMedidor = 0, nivelMedidor = 0;
  var trocouMetodo = false;

  function medirPeloAnalisador() {
    if (!analisador) { return 0; }
    var dados = new Float32Array(analisador.fftSize);
    analisador.getFloatTimeDomainData(dados);
    var soma = 0;
    for (var i = 0; i < dados.length; i += 1) { soma += dados[i] * dados[i]; }
    var nivel = Math.sqrt(soma / dados.length);
    nivelMedidor = Math.max(nivel, nivelMedidor * 0.9);
    if (nivel > 0.00005) { ultimoSomMedidor = Date.now(); }
    return nivel;
  }

  /* O medidor ouve, mas o caminho principal só devolve silêncio: troca o
     jeito de captar (módulo de áudio <-> ScriptProcessor). */
  function trocarMetodoDeCaptura() {
    if (!fonteCaptura || !ctxCaptura) { return; }
    try { if (noCaptura) { noCaptura.disconnect(); } } catch (erro) { /* ignora */ }
    try { fonteCaptura.disconnect(); fonteCaptura.connect(analisador); } catch (erro) { /* ignora */ }
    noCaptura = null;
    if (metodoCaptura === "worklet") {
      metodoCaptura = "script";
      capturarComScriptProcessor(ctxCaptura, fonteCaptura);
    } else if (ctxCaptura.audioWorklet && window.AudioWorkletNode) {
      metodoCaptura = "worklet";
      ctxCaptura.audioWorklet.addModule("data:application/javascript;charset=utf-8," + encodeURIComponent(CODIGO_CAPTURA))
        .catch(function () { /* já carregado */ }).then(function () {
          noCaptura = new window.AudioWorkletNode(ctxCaptura, "prolink-captura");
          noCaptura.port.onmessage = function (e) { aoCapturar(e.data); };
          fonteCaptura.connect(noCaptura);
        }).catch(function () { metodoCaptura = "script"; capturarComScriptProcessor(ctxCaptura, fonteCaptura); });
    }
    diag.quedas.push(new Date().toLocaleTimeString() + " captura trocada para " + metodoCaptura);
  }
  var erroMicrofone = "";

  function explicarErroMicrofone(erro) {
    var nome = erro && erro.name || "";
    if (/NotAllowed|Security|Permission/i.test(nome)) {
      return "O microfone está bloqueado. Clique no cadeado ao lado do endereço e permita o microfone. No Windows, " +
             "confira também Configurações > Privacidade > Microfone > \"Permitir que aplicativos da área de trabalho acessem o microfone\".";
    }
    if (/NotFound|DevicesNotFound|Overconstrained/i.test(nome)) {
      return "Não encontrei nenhum microfone ligado a este computador.";
    }
    if (/NotReadable|TrackStart|Abort/i.test(nome)) {
      return "O microfone está ocupado por outro programa (Teams, Discord, Zoom, gravador) ou foi desligado pelo Windows. " +
             "Feche o outro programa e aperte Alt + M.";
    }
    return "Não consegui usar o microfone (" + (nome || erro) + ").";
  }

  var CHAVE_MICROFONE = "prolink_voz_microfone";
  var microfoneDesejado = ler("localStorage", CHAVE_MICROFONE) || "";

  function pedirMicrofone() {
    diag.pedidosMicrofone = (diag.pedidosMicrofone || 0) + 1;
    var ideal = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (microfoneDesejado) { ideal.deviceId = { exact: microfoneDesejado }; }
    /* Alguns drivers recusam as opções de áudio: tenta o pedido mais
       simples. Microfone escolhido que sumiu: volta para o padrão. */
    return navigator.mediaDevices.getUserMedia({ audio: ideal }).catch(function (erro) {
      if (/NotAllowed|Security/i.test(erro && erro.name)) { throw erro; }
      if (microfoneDesejado) {
        microfoneDesejado = "";
        gravar("localStorage", CHAVE_MICROFONE, null);
        return pedirMicrofone();
      }
      return navigator.mediaDevices.getUserMedia({ audio: true });
    });
  }

  function idDoMicrofoneAtual() {
    var t = fluxoMicrofone && fluxoMicrofone.getAudioTracks()[0];
    return t && t.getSettings ? (t.getSettings().deviceId || "") : "";
  }
  function nomeDoMicrofoneAtual() {
    var t = fluxoMicrofone && fluxoMicrofone.getAudioTracks()[0];
    return t ? (t.label || "microfone padrão") : "";
  }

  function listarMicrofones() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { return Promise.resolve([]); }
    return navigator.mediaDevices.enumerateDevices().then(function (lista) {
      return lista.filter(function (d) { return d.kind === "audioinput" && d.deviceId; });
    }).catch(function () { return []; });
  }

  function preencherListaMicrofones() {
    var campo = document.getElementById("voz-lista-microfones");
    if (!campo) { return; }
    listarMicrofones().then(function (lista) {
      var atual = idDoMicrofoneAtual();
      campo.innerHTML = '<option value="">Padrão do sistema</option>' + lista.filter(function (d) {
        return d.deviceId !== "default" && d.deviceId !== "communications";
      }).map(function (d, i) {
        var nome = (d.label || "Microfone " + (i + 1)).replace(/[<>&"]/g, "");
        return '<option value="' + d.deviceId.replace(/"/g, "") + '">' + nome + "</option>";
      }).join("");
      campo.value = microfoneDesejado && lista.some(function (d) { return d.deviceId === microfoneDesejado; }) ? microfoneDesejado :
        (lista.some(function (d) { return d.deviceId === atual && atual !== "default"; }) && microfoneDesejado ? atual : "");
    });
  }

  function trocarMicrofone(id, motivo) {
    microfoneDesejado = id || "";
    desligarMicrofone();
    silencioAvisado = false;
    if (motivo) { registrarNoHistorico("Aviso", motivo); }
    return ligarMicrofone(true).then(function () {
      registrarNoHistorico("Aviso", "Usando o microfone: " + nomeDoMicrofoneAtual() + ".");
    }).catch(function (erro) {
      var texto = erroMicrofone || explicarErroMicrofone(erro);
      registrarNoHistorico("Aviso", texto);
      legenda.textContent = texto;
    });
  }

  function salvarMicrofoneQueFunciona() {
    var id = idDoMicrofoneAtual();
    if (microfoneDesejado && id) { gravar("localStorage", CHAVE_MICROFONE, microfoneDesejado); }
  }

  /* Microfone que só manda silêncio absoluto: tenta os outros sozinho. */
  function tentarOutroMicrofone() {
    var atual = idDoMicrofoneAtual();
    var nomeAtual = nomeDoMicrofoneAtual();
    microfonesTentados[atual || "padrao"] = true;
    Promise.all([listarMicrofones(), permissaoGuardada()]).then(function (r) {
      var lista = r[1] ? r[0] : [];   // sem permissão guardada, não troca sozinho
      var proximo = lista.filter(function (d) {
        return d.deviceId !== "default" && d.deviceId !== "communications" && d.deviceId !== atual &&
          !microfonesTentados[d.deviceId];
      })[0];
      /* No máximo dois outros microfones: depois, a escuta do navegador. */
      if (proximo && Object.keys(microfonesTentados).length <= 2) {
        microfonesTentados[proximo.deviceId] = true;
        trocarMicrofone(proximo.deviceId, "O microfone \"" + nomeAtual + "\" não está captando nenhum som. Tentando \"" +
          (proximo.label || "outro microfone") + "\"…");
        return;
      }
      if (ativarEscutaDoNavegador()) { return; }
      var texto = (window.location.protocol === "file:" ? "Dica: aberto como arquivo, o navegador não guarda a permissão do " +
        "microfone; pelo Live Server ou pelo Abrir ProLink.bat a Miranda consegue testar os outros microfones sozinha. " : "") +
        "Não estou captando nenhum som do microfone (\"" + nomeAtual + "\"). Confira se ele não está mudo no " +
        "Windows (Configurações > Sistema > Som > Entrada) e escolha o microfone certo em Transcrição > Microfone.";
      registrarNoHistorico("Aviso", texto);
      legenda.textContent = texto;
      anunciar(texto);
      falarAvisoLocal("Não estou captando som do seu microfone. Confira se ele não está mudo e escolha o microfone certo na transcrição.");
    });
  }

  // ------------------------------------------------------------------
  // Escuta do navegador (reconhecimento de voz do Chrome e do Edge): usa a
  // captura do próprio navegador, sem passar pelo processamento de áudio da
  // página. Último recurso quando a página só recebe silêncio.
  // ------------------------------------------------------------------
  var escutaNavegador = false, reconhecedor = null, falhasEscuta = 0;

  var permissaoParaEscuta = false;
  permissaoGuardada().then(function (g) { permissaoParaEscuta = g; });
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "microphone" }).then(function (r) {
      r.onchange = function () { permissaoGuardada().then(function (g) { permissaoParaEscuta = g; }); };
    }).catch(function () { /* ignora */ });
  }

  function ativarEscutaDoNavegador() {
    var Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconhecedor || escutaNavegador || !permissaoParaEscuta) { return false; }
    escutaNavegador = true;
    diag.quedas.push(new Date().toLocaleTimeString() + " usando a escuta do navegador");
    registrarNoHistorico("Aviso", "O som do microfone não chega pela página neste computador. A Miranda passou a ouvir " +
      "pelo reconhecimento de voz do próprio navegador. Pode falar.");
    legenda.textContent = "Ouvindo pelo reconhecimento de voz do navegador. Pode falar.";
    iniciarEscuta();
    return true;
  }

  function iniciarEscuta() {
    var Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!escutaNavegador || reconhecedor || !Reconhecedor) { return; }
    if (!microfoneLigado || mirandaFalando() || estado === "aguardando" || !conectado) { return; }
    var r = new Reconhecedor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = function (evento) {
      falhasEscuta = 0;
      for (var i = evento.resultIndex; i < evento.results.length; i += 1) {
        var texto = evento.results[i][0].transcript.trim();
        if (!texto) { continue; }
        if (evento.results[i].isFinal) {
          registrarNoHistorico("Você", texto);
          usuarioAtual = null;
          legenda.textContent = limitarLegenda("Você: " + texto);
          falarPorTexto(texto);
        } else {
          legenda.textContent = limitarLegenda("Você: " + texto + "…");
        }
      }
    };
    r.onerror = function (evento) {
      var erro = evento && evento.error || "";
      if (/not-allowed|service-not-allowed|audio-capture/.test(erro)) {
        escutaNavegador = false;
        var texto = "O Windows ou o navegador não está entregando o som do microfone (" + erro + "). Confira: " +
          "1) Configurações > Privacidade e segurança > Microfone: \"Acesso ao microfone\" e \"Permitir que aplicativos da área " +
          "de trabalho acessem o microfone\" ligados; 2) Configurações > Sistema > Som > Entrada: o microfone certo, com volume " +
          "acima de zero; 3) no cadeado ao lado do endereço, Microfone permitido. Enquanto isso, dá para escrever na transcrição.";
        registrarNoHistorico("Aviso", texto);
        legenda.textContent = texto;
        falarAvisoLocal("Não consigo ouvir o seu microfone. As instruções estão na transcrição.");
      } else if (erro === "network") {
        falhasEscuta += 1;
      }
    };
    r.onend = function () {
      reconhecedor = null;
      if (falhasEscuta > 5) { escutaNavegador = false; return; }
    };
    try { r.start(); reconhecedor = r; } catch (erro) { reconhecedor = null; }
  }

  /* Meia-duplex também aqui: não escuta enquanto a Miranda fala. */
  function cuidarDaEscutaDoNavegador() {
    if (!escutaNavegador) { return; }
    if (reconhecedor && (mirandaFalando() || !microfoneLigado)) {
      try { reconhecedor.abort(); } catch (erro) { /* ignora */ }
      reconhecedor = null;
      return;
    }
    if (!reconhecedor) { iniciarEscuta(); }
  }

  function falarPorTexto(texto) {
    if (modoAlternativo) { perguntarAlternativo(texto); return; }
    enviar({ realtimeInput: { text: texto } });
    aguardarResposta();
  }

  // ------------------------------------------------------------------
  // Permissão do microfone: pedida UMA vez. Aberto como arquivo (F5 do
  // VS Code, duplo clique), o Chrome não guarda a permissão e pergunta de
  // novo a cada pedido — por isso nada aqui pede o microfone sozinho de
  // novo, a não ser que o navegador já tenha guardado a permissão.
  // ------------------------------------------------------------------
  var microfoneNegado = false;
  var pedindoMicrofone = null;

  function permissaoGuardada() {
    if (!navigator.permissions || !navigator.permissions.query) { return Promise.resolve(false); }
    return navigator.permissions.query({ name: "microphone" })
      .then(function (r) { return r.state === "granted" && window.location.protocol !== "file:"; })
      .catch(function () { return false; });
  }

  function ligarMicrofone(pelaPessoa) {
    if (fluxoMicrofone) { return Promise.resolve(); }
    if (pedindoMicrofone) { return pedindoMicrofone; }
    /* A pessoa recusou: só pergunta de novo se ela pedir (botão do microfone ou Alt + M). */
    if (microfoneNegado && !pelaPessoa) { return Promise.reject(new Error(erroMicrofone || "Microfone não permitido.")); }
    pedindoMicrofone = ligarMicrofoneDeFato().then(function (r) { pedindoMicrofone = null; return r; },
      function (erro) { pedindoMicrofone = null; throw erro; });
    return pedindoMicrofone;
  }

  function ligarMicrofoneDeFato() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      erroMicrofone = "Este navegador não dá acesso ao microfone nesta página.";
      return Promise.reject(new Error(erroMicrofone));
    }
    return pedirMicrofone().then(function (fluxo) {
      fluxoMicrofone = fluxo;
      erroMicrofone = "";
      microfoneNegado = false;
      inicioMicrofone = Date.now();
      window.setTimeout(preencherListaMicrofones, 200);
      /* Fone desconectado, microfone trocado ou desligado pelo sistema:
         religa com o microfone disponível. */
      fluxo.getAudioTracks().forEach(function (t) {
        t.addEventListener("ended", function () {
          if (fluxoMicrofone !== fluxo) { return; }
          desligarMicrofone();
          registrarNoHistorico("Aviso", "O microfone foi desconectado. Tentando usar o microfone disponível…");
          window.setTimeout(function () {
            if (conectado) {
              permissaoGuardada().then(function (guardada) {
                if (!guardada) {
                  anunciar("O microfone foi desconectado. Aperte o botão do microfone ou Alt + M para ligá-lo de novo.");
                  return Promise.reject(new Error("sem permissão guardada"));
                }
                return ligarMicrofone();
              }).catch(function () {
                anunciar("Não encontrei um microfone. Você pode escrever para a Miranda na transcrição.");
              });
            }
          }, 800);
        });
      });
      /* A captura tem um motor de áudio só dela, criado DEPOIS de o
         microfone abrir. O de reprodução nasce antes (no clique), e em
         alguns PCs — fone Bluetooth que muda de modo quando o microfone
         liga, placa de som que troca de dispositivo — ele passa a receber
         só silêncio do microfone. */
      var Contexto = window.AudioContext || window.webkitAudioContext;
      var fonte;
      try {
        ctxCaptura = new Contexto();
        fonte = ctxCaptura.createMediaStreamSource(fluxo);
      } catch (erro) {
        /* Firefox: o microfone numa taxa diferente da saída de som. */
        try { if (ctxCaptura) { ctxCaptura.close(); } } catch (e2) { /* ignora */ }
        var trilha = fluxo.getAudioTracks()[0];
        var taxa = trilha && trilha.getSettings ? trilha.getSettings().sampleRate : undefined;
        ctxCaptura = taxa ? new Contexto({ sampleRate: taxa }) : new Contexto();
        fonte = ctxCaptura.createMediaStreamSource(fluxo);
      }
      if (ctxCaptura.state === "suspended") { ctxCaptura.resume().catch(function () { /* espera um toque */ }); }
      var cap = ctxCaptura;
      fonteCaptura = fonte;
      /* Medidor independente (sem módulo de áudio): confirma se o som
         existe mesmo quando o caminho principal só devolve silêncio. */
      analisador = cap.createAnalyser();
      analisador.fftSize = 2048;
      fonte.connect(analisador);
      metodoCaptura = "worklet";
      /* Três caminhos, do melhor para o mais compatível. Aberto como
         arquivo (duplo clique, F5 do VS Code), o navegador recusa o
         módulo de áudio vindo de blob: tenta data: e, se não der, o
         ScriptProcessor, que funciona em qualquer origem. */
      function comWorklet(url) {
        return cap.audioWorklet.addModule(url).then(function () {
          noCaptura = new window.AudioWorkletNode(cap, "prolink-captura");
          noCaptura.port.onmessage = function (e) { aoCapturar(e.data); };
          fonte.connect(noCaptura);
        });
      }
      if (!cap.audioWorklet || !window.AudioWorkletNode) {
        metodoCaptura = "script";
        capturarComScriptProcessor(cap, fonte);
        return;
      }
      return comWorklet(URL.createObjectURL(new Blob([CODIGO_CAPTURA], { type: "application/javascript" })))
        .catch(function () { return comWorklet("data:application/javascript;charset=utf-8," + encodeURIComponent(CODIGO_CAPTURA)); })
        .catch(function () { metodoCaptura = "script"; capturarComScriptProcessor(cap, fonte); });
    }, function (erro) {
      erroMicrofone = explicarErroMicrofone(erro);
      /* Qualquer falha (recusa, microfone ocupado, ausente): não pede de novo
         sozinho — cada pedido pode virar outra pergunta do navegador. */
      microfoneNegado = true;
      erroMicrofone += " Para tentar de novo, aperte o botão do microfone ou Alt + M.";
      throw erro;
    });
  }

  function capturarComScriptProcessor(cap, fonte) {
    var proc = cap.createScriptProcessor(4096, 1, 1);
    var razao = cap.sampleRate / 16000;
    var bloco = new Int16Array(1600), pos = 0, acum = 0, soma = 0, n = 0;
    proc.onaudioprocess = function (e) {
      var canal = e.inputBuffer.getChannelData(0);
      for (var i = 0; i < canal.length; i += 1) {
        soma += canal[i]; n += 1; acum += 1;
        if (acum >= razao) {
          acum -= razao;
          var v = Math.max(-1, Math.min(1, soma / n)); soma = 0; n = 0;
          bloco[pos++] = v < 0 ? v * 32768 : v * 32767;
          if (pos === bloco.length) { aoCapturar(bloco.buffer.slice(0)); pos = 0; }
        }
      }
      /* Saída em silêncio: o nó precisa estar ligado ao destino para rodar. */
      e.outputBuffer.getChannelData(0).fill(0);
    };
    fonte.connect(proc);
    proc.connect(cap.destination);
    noCaptura = proc;
  }

  function desligarMicrofone() {
    var fluxo = fluxoMicrofone;
    fluxoMicrofone = null;          // antes de parar: o aviso de "desconectado" ignora esta parada
    if (fluxo) { fluxo.getTracks().forEach(function (t) { t.stop(); }); }
    if (noCaptura) { try { noCaptura.disconnect(); } catch (erro) { /* ignora */ } }
    noCaptura = null;
    if (ctxCaptura && ctxCaptura !== audio) { try { ctxCaptura.close(); } catch (erro) { /* ignora */ } }
    ctxCaptura = null;
    analisador = null;
    fonteCaptura = null;
  }

  function tocar(base64, mime) {
    if (!audio || descartarResto) { return; }
    var taxa = 24000;
    var m = /rate=(\d+)/.exec(mime || "");
    if (m) { taxa = Number(m[1]); }
    var bytes = bytesDeBase64(base64);
    var amostras = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    if (!amostras.length) { return; }
    var buffer = audio.createBuffer(1, amostras.length, taxa);
    var canal = buffer.getChannelData(0);
    for (var i = 0; i < amostras.length; i += 1) { canal[i] = amostras[i] / 32768; }
    var fonte = audio.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(audio.destination);
    proximoInicio = Math.max(proximoInicio, audio.currentTime + 0.04);
    fonte.start(proximoInicio);
    proximoInicio += buffer.duration;
    if (!fontesTocando.length) { inicioDaFala = Date.now(); }
    fontesTocando.push(fonte);
    fonte.onended = function () {
      fontesTocando = fontesTocando.filter(function (f) { return f !== fonte; });
      if (!fontesTocando.length) { fimDaFala = Date.now(); }
      if (!fontesTocando.length && estado === "falando") {
        window.setTimeout(function () {
          if (!fontesTocando.length && estado === "falando") { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); }
        }, FOLGA_APOS_FALA * 1000);
      }
    };
    if (estado !== "agindo") { definirEstado("falando"); }
  }

  function pararFala() {
    var lista = fontesTocando;
    fontesTocando = [];
    lista.forEach(function (f) { f.onended = null; try { f.stop(); } catch (erro) { /* já parou */ } });
    fimDaFala = Date.now();
    if (audio) { proximoInicio = audio.currentTime; }
  }

  // ==================================================================
  // GEMINI LIVE API
  // ==================================================================
  var ws = null;
  var conectado = false;
  var indiceModelo = 0;
  var tentativas = 0;
  var encerrando = false;
  var alcancouSetup = false;
  var alvoReconexao = null;

  function lerArquivo(nome) {
    var empacotado = String((window.PROLINK_ARQUIVOS_LOCAIS || {})[nome] || "").trim();
    if (window.location.protocol === "file:" || !window.fetch) { return Promise.resolve(empacotado); }
    return window.fetch(nome + "?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : empacotado; })
      .then(function (t) { return String(t || "").trim() || empacotado; })
      .catch(function () { return empacotado; });
  }

  function obterChave() {
    if (ORIGEM_DA_CHAVE === "interface") {
      return Promise.resolve(String(ler("sessionStorage", CHAVE_DA_SESSAO) || "").trim());
    }
    return lerArquivo(ARQUIVO_DA_CHAVE);
  }

  function enviarTexto(obj) {
    var texto = obj.realtimeInput.text;
    if (modoAlternativo) { perguntarAlternativo(texto); return; }
    enviar(obj);
  }

  function enviar(obj) {
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); }
  }

  function instrucoes(manual) {
    var mapa = (window.ProLinkVozAgente && window.ProLinkVozAgente.paginas) || {};
    var paginas = Object.keys(mapa).map(function (p) { return "- " + p + ": " + mapa[p]; }).join("\n");
    return [
      "Você é a Miranda, assistente de voz do ProLink, no MODO DE ACESSIBILIDADE. A pessoa do outro lado pode ter " +
      "deficiência visual: ela depende da sua voz para usar o sistema inteiro, sem precisar enxergar a tela.",
      "",
      "COMO FALAR",
      "- Fale sempre em português do Brasil, com frases curtas, calorosas e objetivas.",
      "- Nada de markdown, listas com símbolos, links ou emojis: tudo vira fala. Leia no máximo 5 itens de cada vez e pergunte se quer ouvir mais.",
      "- Diga números e datas de forma natural. Nunca repita senhas em voz alta.",
      "- Quando a pessoa pedir algo, faça. Não explique como ela faria sozinha; use as ferramentas e conte o resultado.",
      "",
      "COMO AGIR NO SISTEMA",
      "- Antes de mexer numa tela, chame ler_tela para saber o que há nela. Cada elemento vem com um número (ref); use esse número em clicar, preencher e focar. Depois de trocar de tela, leia de novo.",
      "- Para abrir uma tela, use navegar com o nome do arquivo. Para perguntas sobre oportunidades, profissionais ou empresas, prefira pesquisar: é mais rápido e não tira a pessoa da tela.",
      "- Formulários: pergunte o que falta, preencha campo por campo com preencher e, antes de enviar, leia um resumo do que foi preenchido.",
      "- CONFIRMAÇÃO: antes de qualquer ação que publica, envia, salva, exclui, manifesta interesse, cria conta ou muda dados, diga o que vai acontecer e pergunte se a pessoa confirma. Só chame clicar com confirmado=true depois de um sim claro. Se a ferramenta responder precisa_confirmar, faça essa pergunta.",
      "- Arquivos (anexar projeto, currículo, documento): o navegador exige que a própria pessoa escolha o arquivo. Use focar no campo de arquivo e diga para ela apertar Enter e escolher o arquivo na janela do sistema.",
      "- Se aparecer um aviso de erro depois de uma ação, leia o aviso e ajude a corrigir.",
      "- Se houver um diálogo aberto (por exemplo o tour de apresentação), resolva-o primeiro: pergunte se a pessoa quer ouvir ou pular.",
      "- Entrar na conta: pergunte o CPF, CNPJ ou e-mail e a senha, preencha e clique em Entrar. Para conhecer o sistema sem conta, ofereça entrar como visitante.",
      "- A pessoa pode desativar o modo de acessibilidade quando quiser: use desativar_modo_acessibilidade depois de confirmar. O atalho Alt + M silencia ou liga o microfone e interrompe a sua fala, em qualquer tela; o botão Silenciar microfone, na barra de voz embaixo, faz o mesmo.",
      "- Ao abrir, uma caixinha pergunta se a pessoa quer continuar com a voz ou desativar. Enquanto ela estiver aberta, a resposta da pessoa vai para responder_pergunta_da_voz.",
      "",
      "TELAS DO PROLINK",
      paginas,
      "",
      "Não invente dados: tudo o que disser sobre a conta, oportunidades, profissionais ou empresas deve vir das ferramentas. " +
      "Se algo não for possível, diga com gentileza e ofereça uma alternativa.",
      "",
      "MANUAL DO PROLINK (sua base de conhecimento)",
      manual || "(manual indisponível)"
    ].join("\n");
  }

  var FERRAMENTAS = [
    { name: "ler_tela",
      description: "Lê a tela aberta agora: página, título, conta, diálogo aberto, avisos, texto principal e a lista numerada de elementos interativos (ref).",
      parameters: { type: "OBJECT", properties: {} } },
    { name: "navegar",
      description: "Abre uma tela do ProLink pelo nome do arquivo, por exemplo oportunidades.html, perfil.html, empresa-publicar.html ou oportunidade.html?d=ID.",
      parameters: { type: "OBJECT", properties: { destino: { type: "STRING", description: "Arquivo da tela, com parâmetros se houver." } }, required: ["destino"] } },
    { name: "voltar",
      description: "Volta para a tela anterior.",
      parameters: { type: "OBJECT", properties: {} } },
    { name: "clicar",
      description: "Clica num elemento da tela pelo número ref de ler_tela. Ações que mudam dados exigem confirmado=true, depois de a pessoa confirmar em voz.",
      parameters: { type: "OBJECT", properties: {
        ref: { type: "INTEGER", description: "Número do elemento em ler_tela." },
        confirmado: { type: "BOOLEAN", description: "true só depois de a pessoa confirmar a ação." } }, required: ["ref"] } },
    { name: "preencher",
      description: "Preenche um campo (texto, e-mail, senha, lista de opções, caixa de marcar) pelo número ref. Em caixas de marcar use sim ou não.",
      parameters: { type: "OBJECT", properties: {
        ref: { type: "INTEGER" }, valor: { type: "STRING" } }, required: ["ref", "valor"] } },
    { name: "focar",
      description: "Põe o foco do teclado num elemento (usado para campos de arquivo, que a pessoa precisa acionar com Enter).",
      parameters: { type: "OBJECT", properties: { ref: { type: "INTEGER" } }, required: ["ref"] } },
    { name: "rolar",
      description: "Rola a tela para baixo ou para cima.",
      parameters: { type: "OBJECT", properties: { direcao: { type: "STRING", "enum": ["baixo", "cima"] } } } },
    { name: "pesquisar",
      description: "Pesquisa direto na base do ProLink: oportunidades abertas, profissionais ou empresas. Devolve os resultados e a tela para abrir cada um.",
      parameters: { type: "OBJECT", properties: {
        tipo: { type: "STRING", "enum": ["oportunidades", "profissionais", "empresas"] },
        termo: { type: "STRING", description: "Palavras da busca: área, especialidade, nome, tipo de obra." },
        cidade: { type: "STRING" },
        limite: { type: "INTEGER" } }, required: ["tipo"] } },
    { name: "resumo_da_conta",
      description: "Resume a conta de quem está usando: nome, tipo, candidaturas ou demandas, projetos e mensagens não lidas.",
      parameters: { type: "OBJECT", properties: {} } },
    { name: "ler_notificacoes",
      description: "Lê as notificações da conta.",
      parameters: { type: "OBJECT", properties: {} } },
    { name: "responder_pergunta_da_voz",
      description: "Registra a resposta da pessoa à pergunta inicial (continuar usando a voz ou desativar). Use só enquanto " +
        "essa pergunta estiver aberta; a resposta dela já é a confirmação.",
      parameters: { type: "OBJECT", properties: { escolha: { type: "STRING", "enum": ["continuar", "desativar"] } }, required: ["escolha"] } },
    { name: "desativar_modo_acessibilidade",
      description: "Desliga o modo de acessibilidade e a conversa por voz. Só depois de a pessoa confirmar.",
      parameters: { type: "OBJECT", properties: { confirmado: { type: "BOOLEAN" } }, required: ["confirmado"] } }
  ];

  function montarSetup(modelo, manual) {
    var declaracoes = FERRAMENTAS.map(function (f) {
      var copia = { name: f.name, description: f.description, parameters: f.parameters };
      /* No gemini-3.8-live as chamadas são assíncronas por padrão; aqui a
         Miranda precisa do resultado antes de continuar falando. */
      if (modelo === "gemini-3.8-live") { copia.behavior = "BLOCKING"; }
      return copia;
    });
    var retomada = ler("sessionStorage", CHAVE_RETOMADA);
    var setup = {
      model: "models/" + modelo,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } } }
      },
      systemInstruction: { parts: [{ text: instrucoes(manual) }] },
      tools: [{ functionDeclarations: declaracoes }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: retomada ? { handle: retomada } : {}
    };
    return { setup: setup };
  }

  var manualCache = null;
  function obterManual() {
    if (manualCache !== null) { return Promise.resolve(manualCache); }
    return lerArquivo("manual-prolink.txt").then(function (t) { manualCache = t || ""; return manualCache; });
  }

  function falarAvisoLocal(texto) {
    /* Sem a Live API, a voz do próprio navegador dá o recado. */
    try {
      if (!window.speechSynthesis) { return; }
      var fala = new window.SpeechSynthesisUtterance(texto);
      fala.lang = "pt-BR";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(fala);
    } catch (erro) { /* sem síntese de voz */ }
  }

  function indisponivel(detalhe) {
    conectado = false;
    definirEstado("indisponivel");
    registrarNoHistorico("Aviso", MENSAGEM_INDISPONIVEL);
    legenda.textContent = MENSAGEM_INDISPONIVEL;
    falarAvisoLocal(MENSAGEM_INDISPONIVEL);
    if (detalhe && window.console) { window.console.warn("[Voz] " + detalhe); }
    botaoIniciar.hidden = false;
    botaoIniciar.textContent = "Tentar conectar de novo";
  }

  function conectar() {
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) { return; }
    encerrando = false;
    definirEstado("conectando");
    Promise.all([obterChave(), obterManual()]).then(function (r) {
      var chave = r[0], manual = r[1];
      if (!chave) {
        if (ORIGEM_DA_CHAVE === "interface" && window.ProLinkChaveGemini) {
          definirEstado("sem_chave");
          legenda.textContent = "Cole a chave da API do Gemini para a Miranda poder falar com você.";
          falarAvisoLocal("Para ativar a voz da Miranda, cole a chave da API do Gemini e aperte Enter.");
          window.ProLinkChaveGemini.abrir();
        } else {
          indisponivel("Nenhuma chave do Gemini encontrada em " + ARQUIVO_DA_CHAVE + ".");
        }
        return;
      }
      chaveAtual = chave;
      manualAtual = manual;
      if (ler("sessionStorage", CHAVE_ALTERNATIVO) === "1") { return ativarModoAlternativo(null); }
      abrirSocket(chave, manual);
    });
  }

  function abrirSocket(chave, manual) {
    var modelo = MODELOS_LIVE[indiceModelo];
    alcancouSetup = false;
    try {
      ws = new window.WebSocket(ENDERECO_LIVE + encodeURIComponent(chave));
    } catch (erro) {
      falhaDaVozAoVivo("O navegador não abriu a conexão ao vivo: " + erro);
      return;
    }
    var este = ws;
    /* Rede, antivírus ou extensão que segura a conexão sem responder. */
    var prazoAbertura = window.setTimeout(function () {
      if (este === ws && !alcancouSetup) {
        diag.quedas.push(new Date().toLocaleTimeString() + " a conexão ao vivo não abriu em 12 s");
        ws = null;
        try { este.close(); } catch (erro) { /* ignora */ }
        falhaDaVozAoVivo("A conexão ao vivo não abriu (rede, antivírus ou extensão do navegador podem estar bloqueando).");
      }
    }, 12000);
    ws.onopen = function () { enviar(montarSetup(modelo, manual)); };
    ws.onmessage = function (evento) {
      if (este !== ws) { return; }
      var dado = evento.data;
      (typeof dado === "string" ? Promise.resolve(dado) :
        (dado && dado.text ? dado.text() : (window.Blob && dado instanceof window.Blob ?
          new Promise(function (ok) { var l = new FileReader(); l.onload = function () { ok(l.result); }; l.readAsText(dado); }) :
          Promise.resolve(new TextDecoder().decode(dado)))))
        .then(function (texto) {
          var msg;
          try { msg = JSON.parse(texto); } catch (erro) { return; }
          tratarMensagem(msg, modelo);
        });
    };
    ws.onclose = function (evento) {
      window.clearTimeout(prazoAbertura);
      if (este !== ws) { return; }
      conectado = false;
      ws = null;
      if (encerrando) { return; }
      var motivo = String(evento.reason || "");
      respondeu();
      diag.ultimoErro = evento.code + " " + motivo;
      diag.quedas.push(new Date().toLocaleTimeString() + " código " + evento.code + (motivo ? ": " + motivo : ""));
      if (window.console) { window.console.warn("[Voz] Conexão fechada:", evento.code, motivo); }
      if (/quota|exhausted|rate limit|too many/i.test(motivo)) {
        return falhaDaVozAoVivo("Limite da voz ao vivo atingido: " + motivo);
      }
      if (!alcancouSetup) {
        /* Retomada vencida ou recusada: tenta uma sessão nova, do zero. */
        if (ler("sessionStorage", CHAVE_RETOMADA) && !/api key|api_key|permission|unauthenticated/i.test(motivo)) {
          gravar("sessionStorage", CHAVE_RETOMADA, null);
          return abrirSocket(chave, manual);
        }
        if (/api key|api_key|permission|unauthenticated/i.test(motivo)) {
          return indisponivel("A API recusou a chave: " + motivo);
        }
        /* Modelo indisponível ou sem cota: o próximo da lista. */
        if (indiceModelo < MODELOS_LIVE.length - 1) {
          indiceModelo += 1;
          return abrirSocket(chave, manual);
        }
        indiceModelo = 0;
        return falhaDaVozAoVivo("Nenhum modelo da voz ao vivo respondeu (código " + evento.code + (motivo ? ": " + motivo : "") + ").");
      }
      /* Caiu no meio da conversa: reconecta retomando a sessão. */
      if (evento.code !== 4000) {
        registrarNoHistorico("Aviso", "A conexão com a Miranda caiu (código " + evento.code + "). Reconectando…");
        pedirRepeticao = pedirRepeticao || turnoEmAndamento || !!vigia;
      }
      reconectar(chave, manual);
    };
    ws.onerror = function () { /* o onclose trata */ };
  }

  function limiteAtingido(motivo) {
    conectado = false;
    var texto = "A Miranda atingiu o limite de uso gratuito da API do Gemini por agora. " +
      "Espere alguns minutos e clique em \"Tentar conectar de novo\". O ProLink continua funcionando pelo teclado.";
    definirEstado("indisponivel");
    registrarNoHistorico("Aviso", texto);
    legenda.textContent = texto;
    falarAvisoLocal(texto);
    botaoIniciar.hidden = false;
    botaoIniciar.textContent = "Tentar conectar de novo";
    if (window.console) { window.console.warn("[Voz] Limite da API: " + motivo); }
  }

  function reconectar(chave, manual) {
    tentativas += 1;
    if (tentativas > 3) { tentativas = 0; return falhaDaVozAoVivo("A conexão ao vivo caiu várias vezes seguidas."); }
    definirEstado("conectando");
    window.clearTimeout(alvoReconexao);
    alvoReconexao = window.setTimeout(function () { abrirSocket(chave, manual); }, Math.min(800 * tentativas, 5000));
  }

  // ------------------------------------------------------------------
  // Vigia: a pessoa falou e nada volta. Refaz a conexão (retomando a
  // sessão) e pede para ela repetir, em vez de ficar em silêncio.
  // ------------------------------------------------------------------
  var turnoEmAndamento = false;
  var vigia = null;
  var PRAZO_RESPOSTA_MS = 20000;
  var pedirRepeticao = false;
  var diag = { modelo: "", ultimaMensagem: 0, blocosEnviados: 0, quedas: [], ultimoErro: "" };

  function aguardarResposta() {
    window.clearTimeout(vigia);
    vigia = window.setTimeout(function () {
      if (!conectado || !ws) { return; }
      semRespostaSeguidas += 1;
      if (semRespostaSeguidas >= 2) {
        var velho = ws; ws = null; conectado = false;
        try { velho.close(); } catch (erro) { /* ignora */ }
        falhaDaVozAoVivo("A voz ao vivo parou de responder duas vezes seguidas.");
        return;
      }
      registrarNoHistorico("Aviso", "A Miranda não respondeu. Refazendo a conexão…");
      diag.quedas.push(new Date().toLocaleTimeString() + " sem resposta em " + (PRAZO_RESPOSTA_MS / 1000) + " s");
      pedirRepeticao = true;
      try { ws.close(4000, "sem resposta"); } catch (erro) { /* o onclose trata */ }
    }, PRAZO_RESPOSTA_MS);
  }
  var ultimaAtividadeModelo = 0, inicioFalaUsuario = 0;
  var semRespostaSeguidas = 0;
  function respondeu() { semRespostaSeguidas = vigia ? 0 : semRespostaSeguidas; ultimaAtividadeModelo = Date.now(); window.clearTimeout(vigia); vigia = null; }

  window.VozDiagnostico = function (silencioso) {
    var r = {
      modelo: diag.modelo, estado: estado, conectado: conectado,
      websocket: ws ? ["abrindo", "aberto", "fechando", "fechado"][ws.readyState] : "nenhum",
      som: audio ? audio.state : "sem AudioContext",
      microfone: fluxoMicrofone ? fluxoMicrofone.getAudioTracks().map(function (t) { return t.readyState + (t.muted ? " (mudo no sistema)" : ""); }).join(", ") : "desligado",
      microfone_ligado_no_painel: microfoneLigado,
      blocos_de_audio_enviados: diag.blocosEnviados,
      segundos_desde_a_ultima_mensagem_da_api: diag.ultimaMensagem ? Math.round((Date.now() - diag.ultimaMensagem) / 1000) : null,
      miranda_falando: fontesTocando.length > 0,
      quedas: diag.quedas.slice(-8),
      ultimo_erro: diag.ultimoErro,
      modo: modoAlternativo ? "alternativo (compatível)" : "voz ao vivo",
      erro_do_microfone: erroMicrofone,
      microfone_em_uso: nomeDoMicrofoneAtual(),
      nivel_do_microfone: Number(nivelRecente.toFixed(4)),
      nivel_no_medidor_independente: Number(nivelMedidor.toFixed(4)),
      metodo_de_captura: metodoCaptura,
      motor_da_captura: ctxCaptura ? ctxCaptura.state + " " + ctxCaptura.sampleRate + " Hz" : "nenhum",
      escuta_do_navegador: escutaNavegador,
      pedidos_de_microfone: diag.pedidosMicrofone || 0,
      microfone_recusado: microfoneNegado,
      segundos_sem_nenhum_som: fluxoMicrofone ? Math.round((Date.now() - Math.max(ultimoSom, inicioMicrofone)) / 1000) : null,
      taxa_do_som: audio ? audio.sampleRate : null,
      taxa_da_captura: ctxCaptura ? ctxCaptura.sampleRate : null,
      voz_do_sistema_em_portugues: vozPortugues() ? vozPortugues().name : "nenhuma (instale a voz pt-BR do Windows)",
      endereco: window.location.protocol,
      navegador: navigator.userAgent
    };
    if (!silencioso && window.console) { window.console.table ? window.console.table(r) : window.console.log(r); }
    return r;
  };

  function tratarMensagem(msg, modelo) {
    diag.ultimaMensagem = Date.now();
    var sc = msg.serverContent;
    if (msg.toolCall || (sc && (sc.inputTranscription || sc.modelTurn || sc.outputTranscription || sc.interrupted))) {
      ultimaReacao = Date.now();
    }
    if (msg.setupComplete) {
      alcancouSetup = true;
      conectado = true;
      tentativas = 0;
      if (window.console) { window.console.log("[Voz] Conectada ao modelo " + modelo + "."); }
      diag.modelo = modelo;
      comecarConversa();
      if (pedirRepeticao) {
        pedirRepeticao = false;
        enviarTexto({ realtimeInput: { text: "[Aviso do sistema, não é fala da pessoa] A conexão caiu e foi refeita. Diga em uma " +
          "frase curta que a ligação falhou e peça para a pessoa repetir o último pedido." } });
      }
      return;
    }
    if (msg.sessionResumptionUpdate) {
      var u = msg.sessionResumptionUpdate;
      if (u.resumable !== false && u.newHandle) { gravar("sessionStorage", CHAVE_RETOMADA, u.newHandle); }
      return;
    }
    if (msg.goAway) {
      /* O servidor vai fechar em breve: reconecta já, retomando a sessão. */
      if (ws) { var velho = ws; ws = null; conectado = false; try { velho.close(); } catch (erro) { /* ignora */ } }
      Promise.all([obterChave(), obterManual()]).then(function (r) { abrirSocket(r[0], r[1]); });
      return;
    }
    if (msg.toolCall && msg.toolCall.functionCalls) {
      respondeu();
      executarFerramentas(msg.toolCall.functionCalls);
      return;
    }
    var c = msg.serverContent;
    if (!c) { return; }
    if (c.interrupted) {
      pararFala();
      descartarResto = false;
      falaAtual = null;
    }
    if (c.inputTranscription && c.inputTranscription.text) {
      if (!usuarioAtual) { inicioFalaUsuario = Date.now(); }
      registrarNoHistorico("Você", c.inputTranscription.text, true);
      if (!fontesTocando.length && usuarioAtual) {
        legenda.textContent = limitarLegenda(usuarioAtual.textContent.replace(/^Você:\s*/, "Você: "));
      }
      /* A transcrição pode chegar atrasada, depois da resposta: só vigia
         se a Miranda ainda não reagiu a esta fala. */
      if (ultimaAtividadeModelo < inicioFalaUsuario && usuarioAtual &&
          usuarioAtual.textContent.replace(/\s+/g, "").length > 6) { aguardarResposta(); }
    }
    if (c.outputTranscription && c.outputTranscription.text) {
      if (!descartarResto) { registrarNoHistorico("Miranda", c.outputTranscription.text, true); }
    }
    if (c.modelTurn || c.outputTranscription || msg.toolCall) { respondeu(); }
    if (c.modelTurn && c.modelTurn.parts) {
      turnoEmAndamento = true;
      usuarioAtual = null;
      c.modelTurn.parts.forEach(function (parte) {
        if (parte.inlineData && /^audio\//.test(parte.inlineData.mimeType || "")) {
          tocar(parte.inlineData.data, parte.inlineData.mimeType);
        }
      });
    }
    if (c.turnComplete || c.generationComplete) { turnoEmAndamento = false; respondeu(); }
    if (c.turnComplete) {
      descartarResto = false;
      falaAtual = null;
      usuarioAtual = null;
    }
  }

  var recarregou = !!ler("sessionStorage", CHAVE_JA_APRESENTOU);  // F5 ou tela aberta direto
  var saudacaoPendente = true;

  function comecarConversa() {
    ligarMicrofone().catch(function (erro) {
      var texto = (erroMicrofone || explicarErroMicrofone(erro)) + " Enquanto isso, dá para escrever para a Miranda na transcrição.";
      registrarNoHistorico("Aviso", texto);
      legenda.textContent = texto;
      anunciar(texto);
      if (window.console) { window.console.warn("[Voz] Microfone:", erro); }
    });
    if (audioLiberado()) {
      botaoIniciar.hidden = true;
      definirEstado(microfoneLigado ? "ouvindo" : "silenciado");
      saudar();
    } else {
      /* Conectada, mas o navegador ainda não deixou tocar som (a página
         abriu sem clique: F5, duplo clique no arquivo, atalho). O
         primeiro toque em qualquer tecla ou lugar libera. */
      pedirGesto();
    }
  }

  // ------------------------------------------------------------------
  // O ProLink começa com a voz ligada. Uma vez por sessão, a caixinha
  // pergunta se a pessoa quer continuar com a voz ou desativar — e a
  // Miranda faz a mesma pergunta em voz alta. Dá para responder
  // clicando ou falando.
  // ------------------------------------------------------------------
  var CHAVE_PERGUNTADA = "prolink_voz_perguntada";
  var CHAVE_RECUSADA = "prolink_voz_recusada";
  var caixaPergunta = null;
  var perguntouPorVoz = false;

  function mostrarPergunta() {
    if (caixaPergunta || ler("sessionStorage", CHAVE_PERGUNTADA) === "1") { return; }
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo pergunta-voz-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa pergunta-voz-caixa" role="dialog" aria-modal="true" ' +
          'aria-labelledby="pergunta-voz-titulo" aria-describedby="pergunta-voz-texto">' +
        '<div class="pergunta-voz-icone" aria-hidden="true">' + MICROFONE + "</div>" +
        '<h2 id="pergunta-voz-titulo">A assistente de voz está ligada</h2>' +
        '<div id="pergunta-voz-texto">' +
          "<p>Boas-vindas ao ProLink! O <strong>modo de acessibilidade</strong> já começou ligado: a Miranda conversa " +
          "com você por voz e ajuda a usar todo o sistema — ela lê as telas, pesquisa, preenche formulários e abre o que você pedir.</p>" +
          "<p><strong>Quer continuar usando a voz ou prefere desativar?</strong> Você pode responder clicando ou falando.</p>" +
        "</div>" +
        '<p class="dica pergunta-voz-dica">O navegador pode pedir permissão para usar o microfone. ' +
          "Atalho em qualquer tela: <kbd>Alt</kbd> + <kbd>M</kbd> silencia o microfone e interrompe a Miranda.</p>" +
        '<div class="acoes-formulario pergunta-voz-acoes">' +
          '<button class="btn btn-secundario" type="button" data-pergunta-voz="desativar">Desativar a voz</button>' +
          '<button class="btn" type="button" data-pergunta-voz="continuar" data-foco-inicial>Continuar com a voz</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(fundo);
    caixaPergunta = fundo;
    fundo.querySelector('[data-pergunta-voz="continuar"]').addEventListener("click", function () { responderPergunta("continuar", "caixinha"); });
    fundo.querySelector('[data-pergunta-voz="desativar"]').addEventListener("click", function () { responderPergunta("desativar", "caixinha"); });
    fundo.addEventListener("keydown", function (evento) {
      /* Esc fecha como "continuar": a voz já está ligada. */
      if (evento.key === "Escape") { evento.preventDefault(); responderPergunta("continuar", "caixinha"); }
    });
    window.setTimeout(function () {
      var botao = fundo.querySelector("[data-foco-inicial]");
      if (botao && !fundo.contains(document.activeElement)) { botao.focus(); }
    }, 80);
  }

  function perguntaAberta() { return !!caixaPergunta; }

  function responderPergunta(escolha, origem) {
    if (!caixaPergunta) { return { erro: "Não há pergunta aberta." }; }
    caixaPergunta.remove();
    caixaPergunta = null;
    gravar("sessionStorage", CHAVE_PERGUNTADA, "1");
    registrarNoHistorico("Aviso", escolha === "desativar" ? "Você escolheu desativar a voz." : "Você escolheu continuar com a voz.");
    if (escolha === "desativar") {
      gravar("sessionStorage", CHAVE_RECUSADA, "1");
      if (origem === "voz") { window.setTimeout(desativar, 2500); }   // tempo de a Miranda se despedir
      else { desativar(); }
      return { ok: true, observacao: "A voz será desligada em instantes. Despeça-se em uma frase curta." };
    }
    try { quadro.focus(); } catch (erro) { /* ignora */ }
    if (origem === "caixinha") {
      if (!conectado) { indiceModelo = 0; tentativas = 0; conectar(); }
      else if (perguntouPorVoz) {
        enviarTexto({ realtimeInput: { text: "[Aviso do sistema, não é fala da pessoa] A pessoa respondeu pela caixinha que " +
          "quer continuar com a voz. Confirme em uma frase curta e pergunte o que ela quer fazer." } });
      }
    }
    return { ok: true, observacao: "A voz continua ligada. Confirme em uma frase e pergunte o que a pessoa quer fazer." };
  }

  function saudar() {
    if (!saudacaoPendente || !conectado) { return; }
    /* Um instante: se o toque que liberou o som foi num botão da caixinha,
       a resposta chega antes e a Miranda não pergunta o que já foi respondido. */
    if (perguntaAberta() && !saudar.esperou) {
      saudar.esperou = true;
      window.setTimeout(saudar, 350);
      return;
    }
    saudacaoPendente = false;
    if (perguntaAberta()) {
      perguntouPorVoz = true;
      gravar("sessionStorage", CHAVE_JA_APRESENTOU, "1");
      enviarTexto({ realtimeInput: { text:
        "[Aviso do sistema, não é fala da pessoa] O ProLink acabou de abrir com o modo de acessibilidade ligado, e uma " +
        "caixinha na tela pergunta se a pessoa quer continuar usando a voz ou desativar. Dê as boas-vindas em uma frase, " +
        "diga que a assistente de voz está ligada e faça essa mesma pergunta: quer continuar usando a voz ou prefere " +
        "desativar? Quando ela responder, chame responder_pergunta_da_voz com a escolha (continuar ou desativar). " +
        "Mencione que o atalho Alt + M silencia o microfone." } });
      return;
    }
    if (recarregou) {
      enviarTexto({ realtimeInput: { text:
        "[Aviso do sistema, não é fala da pessoa] A página acabou de ser recarregada e a conversa continua. Diga em uma " +
        "frase curta que você continua aqui, ouvindo, e em que tela a pessoa está (use ler_tela)." } });
      return;
    }
    /* Primeira conexão da sessão: a Miranda se apresenta. */
    if (!ler("sessionStorage", CHAVE_JA_APRESENTOU)) {
      gravar("sessionStorage", CHAVE_JA_APRESENTOU, "1");
      enviarTexto({ realtimeInput: { text:
        "[Aviso do sistema, não é fala da pessoa] O modo de acessibilidade acabou de ser ativado. Dê as boas-vindas em uma " +
        "ou duas frases, diga em que tela a pessoa está (use ler_tela) e pergunte o que ela quer fazer. Mencione que o " +
        "atalho Alt + M silencia o microfone." } });
    }
  }

  function executarFerramentas(chamadas) {
    var respostas = [];
    definirEstado("agindo");
    var cadeia = Promise.resolve();
    chamadas.forEach(function (ch) {
      cadeia = cadeia.then(function () { return executar(ch.name, ch.args || {}); })
        .then(function (resultado) {
          respostas.push({ id: ch.id, name: ch.name, response: { output: resultado } });
        });
    });
    cadeia.then(function () {
      enviar({ toolResponse: { functionResponses: respostas } });
      if (estado === "agindo") { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); }
    });
  }

  function resumoDaTela() {
    return pedirATela("ler_tela").then(function (t) {
      if (!t || t.erro) { return t; }
      return { pagina: t.pagina, titulo: t.titulo, titulo_principal: t.titulo_principal, dialogo_aberto: t.dialogo_aberto, avisos: t.avisos };
    });
  }

  function executar(nome, args) {
    registrarNoHistorico("Ação", descreverAcao(nome, args));
    if (nome === "responder_pergunta_da_voz") {
      return Promise.resolve(responderPergunta(args.escolha === "desativar" ? "desativar" : "continuar", "voz"));
    }
    if (nome === "desativar_modo_acessibilidade") {
      if (!args.confirmado) { return Promise.resolve({ precisa_confirmar: true }); }
      window.setTimeout(desativar, 2500);   // tempo de a Miranda se despedir
      return Promise.resolve({ ok: true, observacao: "O modo será desligado em instantes. Despeça-se em uma frase." });
    }
    if (nome === "navegar" || nome === "voltar") {
      var espera = esperarTelaNova(10000);
      return pedirATela(nome, args).then(function (r) {
        if (r && r.erro) { return r; }
        return espera.then(function (chegou) {
          if (!chegou) { return { erro: "A tela nova demorou a carregar. Chame ler_tela em seguida." }; }
          return resumoDaTela().then(function (t) { return { ok: true, tela: t }; });
        });
      });
    }
    if (nome === "clicar") {
      var geracaoAntes = geracao;
      var espera2 = esperarTelaNova(10000);
      return pedirATela("clicar", args).then(function (r) {
        /* Um clique pode trocar de tela (links, entrar, transições). */
        return new Promise(function (ok) { window.setTimeout(ok, 700); }).then(function () {
          if (!saindo && geracao === geracaoAntes) { return r; }
          return espera2.then(function () {
            return resumoDaTela().then(function (t) {
              r = r || {};
              r.mudou_de_tela = true;
              r.tela = t;
              return r;
            });
          });
        });
      });
    }
    return pedirATela(nome, args);
  }

  function descreverAcao(nome, args) {
    var nomes = { ler_tela: "lendo a tela", navegar: "abrindo " + (args.destino || ""), voltar: "voltando",
                  clicar: "clicando no item " + args.ref, preencher: "preenchendo o item " + args.ref,
                  focar: "levando o foco ao item " + args.ref, rolar: "rolando a tela",
                  pesquisar: "pesquisando " + (args.tipo || "") + (args.termo ? " por " + args.termo : ""),
                  resumo_da_conta: "consultando a conta", ler_notificacoes: "lendo as notificações",
                  desativar_modo_acessibilidade: "desativando o modo de acessibilidade",
                  responder_pergunta_da_voz: "registrando a sua resposta: " + (args.escolha || "") };
    return nomes[nome] || nome;
  }

  // ==================================================================
  // MODO ALTERNATIVO (compatível com qualquer PC)
  // Quando a voz ao vivo não funciona na máquina — WebSocket bloqueado
  // por rede, antivírus ou extensão; cota da Live API esgotada; modelo
  // indisponível —, a Miranda continua por voz pelo mesmo caminho da
  // conversa por texto (HTTPS comum):
  //   microfone → detecção de fala → WAV → generateContent (com as mesmas
  //   ferramentas) → texto → voz do próprio sistema (speechSynthesis).
  // ==================================================================
  var CHAVE_ALTERNATIVO = "prolink_voz_alternativo";
  var MODELOS_TEXTO = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash-preview"];
  var modoAlternativo = false;
  var chaveAtual = "", manualAtual = "";
  var alt = { gravando: false, blocos: [], antes: [], fala: 0, silencio: 0, ruido: 0.004,
              processando: false, falando: false, historico: [], vozes: null };

  function falhaDaVozAoVivo(motivo) {
    if (window.console) { window.console.warn("[Voz] Voz ao vivo indisponível neste PC: " + motivo); }
    diag.ultimoErro = motivo;
    if (!chaveAtual) { return indisponivel(motivo); }
    ativarModoAlternativo(motivo);
  }

  function ativarModoAlternativo(motivo) {
    if (modoAlternativo) { return; }
    modoAlternativo = true;
    gravar("sessionStorage", CHAVE_ALTERNATIVO, "1");
    window.clearTimeout(alvoReconexao);
    respondeu();
    if (ws) { var velho = ws; ws = null; try { velho.close(); } catch (erro) { /* ignora */ } }
    conectado = true;
    alcancouSetup = true;
    diag.modelo = "modo alternativo (" + MODELOS_TEXTO[0] + " + voz do sistema)";
    if (motivo) {
      registrarNoHistorico("Aviso", "A voz ao vivo não funcionou neste computador (" + motivo + "). " +
        "A Miranda continua por voz no modo compatível: ela ouve quando você fala e responde logo depois.");
    }
    if (window.console) { window.console.log("[Voz] Modo alternativo ligado."); }
    comecarConversa();
  }

  function rms(buffer) {
    var a = new Int16Array(buffer), soma = 0;
    for (var i = 0; i < a.length; i += 1) { var v = a[i] / 32768; soma += v * v; }
    return Math.sqrt(soma / (a.length || 1));
  }

  /* Detecção de fala por energia, adaptada ao ruído da sala. Blocos de 100 ms. */
  function vadAlternativo(buffer) {
    if (!microfoneLigado || alt.processando || alt.falando || estado === "aguardando") {
      alt.gravando = false; alt.blocos = []; alt.antes = []; alt.fala = 0;
      return;
    }
    diag.blocosEnviados += 1;
    var nivel = rms(buffer);
    var limiar = Math.max(0.012, alt.ruido * 3.2);
    if (!alt.gravando) {
      alt.antes.push(buffer);
      if (alt.antes.length > 3) { alt.antes.shift(); }
      if (nivel > limiar) {
        alt.fala += 1;
        if (alt.fala >= 2) { alt.gravando = true; alt.blocos = alt.antes.slice(); alt.antes = []; alt.silencio = 0; }
      } else {
        alt.fala = 0;
        alt.ruido = alt.ruido * 0.95 + nivel * 0.05;
      }
      return;
    }
    alt.blocos.push(buffer);
    alt.silencio = nivel > limiar * 0.7 ? 0 : alt.silencio + 1;
    if (alt.silencio >= 8 || alt.blocos.length >= 150) {   // 0,8 s de silêncio ou 15 s de fala
      var blocos = alt.blocos;
      alt.gravando = false; alt.blocos = []; alt.fala = 0;
      if (blocos.length >= 6) { perguntarAlternativo(null, blocos); }
    }
  }

  function wavBase64(blocos) {
    var total = blocos.reduce(function (s, b) { return s + b.byteLength; }, 0);
    var saida = new Uint8Array(44 + total), v = new DataView(saida.buffer);
    function txt(pos, t) { for (var i = 0; i < t.length; i += 1) { saida[pos + i] = t.charCodeAt(i); } }
    txt(0, "RIFF"); v.setUint32(4, 36 + total, true); txt(8, "WAVE"); txt(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    txt(36, "data"); v.setUint32(40, total, true);
    var pos = 44;
    blocos.forEach(function (b) { saida.set(new Uint8Array(b), pos); pos += b.byteLength; });
    return base64DeBytes(saida.buffer);
  }

  function instrucoesAlternativas() {
    return instrucoes(manualAtual) + "\n\nMODO COMPATÍVEL: a fala da pessoa chega como áudio. Comece SEMPRE a resposta " +
      "com a transcrição do que ela disse entre colchetes, assim: [Você disse: ...]. Depois escreva a resposta, curta, " +
      "que será lida em voz alta pelo computador. Se o áudio for só ruído ou estiver vazio, responda apenas [silêncio].";
  }

  function chamarGemini(indice) {
    var modelo = MODELOS_TEXTO[indice || 0];
    var corpo = {
      systemInstruction: { parts: [{ text: instrucoesAlternativas() }] },
      contents: alt.historico,
      tools: [{ functionDeclarations: FERRAMENTAS.map(function (f) {
        return { name: f.name, description: f.description, parameters: f.parameters };
      }) }],
      generationConfig: { temperature: 0.4 }
    };
    var controle = window.AbortController ? new window.AbortController() : null;
    var prazo = controle ? window.setTimeout(function () { controle.abort(); }, 30000) : null;
    return window.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelo +
        ":generateContent?key=" + encodeURIComponent(chaveAtual), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
      signal: controle ? controle.signal : undefined
    }).then(function (r) {
      window.clearTimeout(prazo);
      return r.json().catch(function () { return {}; }).then(function (dados) {
        if (r.ok) { return dados; }
        var msg = (dados.error && dados.error.message) || ("HTTP " + r.status);
        if ([404, 429, 500, 503].indexOf(r.status) !== -1 && (indice || 0) < MODELOS_TEXTO.length - 1) {
          return chamarGemini((indice || 0) + 1);
        }
        throw new Error(msg);
      });
    });
  }

  /* Uma pergunta (áudio ou texto) com o laço das ferramentas. */
  function perguntarAlternativo(texto, blocos) {
    if (alt.processando) { return; }
    alt.processando = true;
    definirEstado("agindo");
    textoEstado.textContent = "Miranda está pensando…";
    var parte = blocos ? { inlineData: { mimeType: "audio/wav", data: wavBase64(blocos) } } : { text: texto };
    var indicePergunta = alt.historico.length;
    alt.historico.push({ role: "user", parts: [parte] });
    if (texto && !/^\[Aviso do sistema/.test(texto)) { usuarioAtual = null; }
    var voltas = 0;

    function rodada() {
      return chamarGemini(0).then(function (dados) {
        var conteudo = dados.candidates && dados.candidates[0] && dados.candidates[0].content;
        var partes = (conteudo && conteudo.parts) || [];
        var chamadas = partes.filter(function (p) { return p.functionCall; });
        if (chamadas.length && voltas < 8) {
          voltas += 1;
          alt.historico.push(conteudo);
          var respostas = [];
          return chamadas.reduce(function (cadeia, p) {
            return cadeia.then(function () { return executar(p.functionCall.name, p.functionCall.args || {}); })
              .then(function (r) { respostas.push({ functionResponse: { name: p.functionCall.name, response: { output: r } } }); });
          }, Promise.resolve()).then(function () {
            alt.historico.push({ role: "user", parts: respostas });
            return rodada();
          });
        }
        if (conteudo) { alt.historico.push(conteudo); }
        return partes.filter(function (p) { return p.text && !p.thought; }).map(function (p) { return p.text; }).join(" ").trim();
      });
    }

    rodada().then(function (resposta) {
      var ouvido = /^\s*\[(?:Você disse:\s*)?([^\]]*)\]\s*/i.exec(resposta || "");
      var fala = resposta || "";
      if (ouvido) {
        fala = fala.slice(ouvido[0].length).trim();
        /* No histórico, o áudio vira o texto transcrito: a conversa fica leve. */
        if (blocos) { alt.historico[indicePergunta] = { role: "user", parts: [{ text: ouvido[1] || "(áudio)" }] }; }
        if (blocos && ouvido[1] && !/^silêncio$/i.test(ouvido[1].trim())) { registrarNoHistorico("Você", ouvido[1]); usuarioAtual = null; }
      } else if (blocos) {
        alt.historico[indicePergunta] = { role: "user", parts: [{ text: "(fala da pessoa)" }] };
      }
      while (alt.historico.length > 30) { alt.historico.shift(); }
      while (alt.historico.length && (alt.historico[0].role !== "user" || alt.historico[0].parts.some(function (p) { return p.functionResponse; }))) {
        alt.historico.shift();
      }
      alt.processando = false;
      if (!fala || /^\[?silêncio\]?$/i.test(fala)) { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); return; }
      registrarNoHistorico("Miranda", fala);
      falaAtual = null;
      falarAlternativo(fala);
    }).catch(function (erro) {
      alt.processando = false;
      alt.historico.splice(indicePergunta);
      if (window.console) { window.console.warn("[Voz] Modo alternativo:", erro); }
      diag.ultimoErro = String(erro && erro.message || erro);
      if (/api key|API_KEY|permission/i.test(diag.ultimoErro)) { return indisponivel(diag.ultimoErro); }
      var aviso = /quota|exhausted|429/i.test(diag.ultimoErro)
        ? "A Miranda atingiu o limite de uso gratuito da API do Gemini por agora. Tente de novo em alguns minutos."
        : "Não consegui falar com a Miranda agora. Tente de novo em instantes.";
      registrarNoHistorico("Aviso", aviso);
      falarAlternativo(aviso);
    });
  }

  function vozPortugues() {
    var vozes = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return vozes.filter(function (v) { return /^pt[-_]BR/i.test(v.lang); })[0] ||
      vozes.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
  }

  function falarAlternativo(texto) {
    legenda.textContent = limitarLegenda(texto);
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); return; }
    window.speechSynthesis.cancel();
    /* Frases curtas: o Chrome corta falas longas no meio. */
    var frases = texto.match(/[^.!?;:]+[.!?;:]*/g) || [texto];
    var voz = vozPortugues();
    alt.falando = true;
    definirEstado("falando");
    var restantes = frases.length;
    function terminou() {
      restantes -= 1;
      if (restantes <= 0 && alt.falando) { fimDaFalaAlternativa(); }
    }
    frases.forEach(function (f) {
      var u = new window.SpeechSynthesisUtterance(f.trim());
      u.lang = "pt-BR";
      if (voz) { u.voice = voz; }
      u.rate = 1.05;
      u.onend = terminou;
      u.onerror = terminou;
      window.speechSynthesis.speak(u);
    });
    /* Rede de segurança: sem voz instalada, o fim da fala nunca é avisado. */
    window.clearTimeout(alt.prazoFala);
    alt.prazoFala = window.setTimeout(function () { if (alt.falando) { fimDaFalaAlternativa(); } },
      2500 + texto.length * 90);
  }

  function fimDaFalaAlternativa() {
    window.clearTimeout(alt.prazoFala);
    alt.falando = false;
    fimDaFala = Date.now();
    if (estado === "falando") { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); }
  }

  if (window.speechSynthesis) {
    try { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = function () { /* carrega a lista */ }; } catch (erro) { /* ignora */ }
  }

  // ==================================================================
  // CONTROLES
  // ==================================================================
  function alternarMicrofone() {
    /* Ainda sem som liberado: o atalho libera o som e silencia o microfone. */
    if (estado === "aguardando") {
      iniciarPeloGesto();
      microfoneLigado = false;
      enviar({ realtimeInput: { audioStreamEnd: true } });
      window.setTimeout(function () { if (conectado) { definirEstado("silenciado"); } }, 400);
      return;
    }
    /* Sem microfone (recusado ou desconectado): o atalho pede de novo. */
    if (conectado && !fluxoMicrofone && !pedindoMicrofone) { religarMicrofonePelaPessoa(); return; }
    if (modoAlternativo && alt.falando) {
      window.speechSynthesis.cancel();
      fimDaFalaAlternativa();
      anunciar("Miranda interrompida. Pode falar.");
      return;
    }
    /* Com a Miranda falando, o atalho primeiro a interrompe. */
    if (fontesTocando.length) {
      pararFala();
      /* Descarta o resto só se a resposta ainda estiver chegando. Se ela
         já chegou inteira, a próxima resposta não pode ser jogada fora. */
      descartarResto = turnoEmAndamento;
      definirEstado(microfoneLigado ? "ouvindo" : "silenciado");
      anunciar("Miranda interrompida. Pode falar.");
      return;
    }
    microfoneLigado = !microfoneLigado;
    if (!microfoneLigado) { enviar({ realtimeInput: { audioStreamEnd: true } }); }
    if (conectado) { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); }
  }

  function iniciarPeloGesto() {
    if (ctxCaptura && ctxCaptura.state === "suspended") { ctxCaptura.resume().catch(function () { /* ignora */ }); }
    prepararAudio().then(function () {
      if (!audioLiberado()) { return; }
      botaoIniciar.hidden = true;
      if (!conectado) {
        if (ws && (ws.readyState === 0 || ws.readyState === 1)) { return; }   // já conectando
        indiceModelo = 0; tentativas = 0; conectar(); return;
      }
      if (estado === "aguardando") { definirEstado(microfoneLigado ? "ouvindo" : "silenciado"); }
      legenda.textContent = "";
      saudar();
    });
  }

  /* Qualquer tecla ou clique — na barra de voz ou dentro da tela —
     conta como o gesto que o navegador exige para tocar som. */
  function aoInteragir(evento) {
    if (audioLiberado() && estado !== "aguardando") { return; }
    if (evento && evento.type === "keydown" && evento.key === "Escape") { return; }
    if (estado === "indisponivel" || estado === "sem_chave") { return; }
    iniciarPeloGesto();
  }
  ["keydown", "pointerdown", "touchend"].forEach(function (tipo) {
    window.addEventListener(tipo, aoInteragir, true);
  });

  function desativar() {
    encerrando = true;
    gravar("sessionStorage", CHAVE_RECUSADA, "1");
    gravar("sessionStorage", CHAVE_PERGUNTADA, "1");
    gravar("localStorage", CHAVE_MODO, null);
    gravar("sessionStorage", CHAVE_RETOMADA, null);
    gravar("sessionStorage", CHAVE_JA_APRESENTOU, null);
    gravar("sessionStorage", CHAVE_ALTERNATIVO, null);
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    gravar("sessionStorage", "prolink_boas_vindas_vista", "1");
    pararFala();
    desligarMicrofone();
    if (ws) { try { ws.close(1000, "modo desativado"); } catch (erro) { /* ignora */ } }
    ws = null;
    window.location.replace(paginaAtual);
  }

  function aoMudarChave() {
    if (ORIGEM_DA_CHAVE !== "interface") { return; }
    if (!conectado && ler("sessionStorage", CHAVE_DA_SESSAO)) {
      indiceModelo = 0;
      prepararAudio().then(function () { conectar(); });
    }
  }

  function pedirGesto() {
    definirEstado("aguardando");
    botaoIniciar.hidden = false;
    botaoIniciar.textContent = "Iniciar assistente de voz";
    legenda.textContent = "Aperte qualquer tecla ou clique em qualquer lugar para ouvir a Miranda.";
    if (!perguntaAberta()) { try { botaoIniciar.focus(); } catch (erro) { /* ignora */ } }
  }

  function religarMicrofonePelaPessoa() {
    microfoneLigado = true;
    ligarMicrofone(true).then(function () {
      registrarNoHistorico("Aviso", "Microfone ligado: " + nomeDoMicrofoneAtual() + ".");
      definirEstado("ouvindo");
    }).catch(function () {
      legenda.textContent = erroMicrofone;
      anunciar(erroMicrofone);
    });
  }

  botaoMicrofone.addEventListener("click", function () {
    if (!conectado) { iniciarPeloGesto(); return; }
    if (!fluxoMicrofone && !pedindoMicrofone) { religarMicrofonePelaPessoa(); return; }
    alternarMicrofone();
  });
  botaoIniciar.addEventListener("click", iniciarPeloGesto);
  document.getElementById("voz-lista-microfones").addEventListener("change", function (evento) {
    var id = evento.target.value;
    gravar("localStorage", CHAVE_MICROFONE, id || null);
    microfonesTentados = {};
    trocarMicrofone(id, null);
  });
  botaoDesativar.addEventListener("click", desativar);
  botaoTranscricao.addEventListener("click", function () {
    var abrir = gaveta.hidden;
    gaveta.hidden = !abrir;
    botaoTranscricao.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (abrir) { historico.scrollTop = historico.scrollHeight; campoTexto.focus(); }
  });
  formTexto.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var texto = campoTexto.value.trim();
    if (!texto) { return; }
    campoTexto.value = "";
    registrarNoHistorico("Você", texto);
    usuarioAtual = null;
    if (!conectado) { iniciarPeloGesto(); }
    enviarTexto({ realtimeInput: { text: texto } });
    if (conectado && !modoAlternativo) { aguardarResposta(); }
  });

  window.addEventListener("keydown", atalhoMicrofone, true);

  /* Chave colada na moldura (Ctrl + Espaço) ou dentro da tela. */
  document.addEventListener("prolink:chave-gemini", aoMudarChave);
  window.addEventListener("storage", function (evento) { if (evento.key === CHAVE_DA_SESSAO) { aoMudarChave(); } });

  // ==================================================================
  // PARTIDA
  // ==================================================================
  if (ler("localStorage", CHAVE_MODO) !== "1") { gravar("localStorage", CHAVE_MODO, "1"); }
  prepararAudio().then(function () {
    /* Vindo do clique em "Ativar", o navegador costuma liberar o som.
       Se não liberar (recarregou a página, abriu depois), um botão
       focado pede um Enter. */
    /* Conecta de qualquer jeito. Sem som liberado (F5, arquivo aberto
       direto), a Miranda fica pronta e toca no primeiro toque de tecla.
       Sem chave, a caixinha da chave abre, e o clique em "Usar esta
       chave" já é o gesto que libera o som. */
    var semChaveAinda = ORIGEM_DA_CHAVE === "interface" && !ler("sessionStorage", CHAVE_DA_SESSAO);
    mostrarPergunta();
    /* Sem chave, a caixinha da chave só abre depois de a pessoa escolher
       continuar — uma pergunta de cada vez. */
    if (perguntaAberta() && semChaveAinda) { return; }
    conectar();
  }).catch(function (erro) { indisponivel(String(erro && erro.message || erro)); });

  window.addEventListener("pagehide", function () {
    encerrando = true;
    if (ws) { try { ws.close(1000, "página fechada"); } catch (erro) { /* ignora */ } }
  });
  /* Voltou pelo histórico com a página guardada: a conexão foi fechada. */
  window.addEventListener("pageshow", function (evento) { if (evento.persisted) { window.location.reload(); } });

  window.ProLinkVoz = {
    _audio: function () { return audio; },
    _fluxo: function () { return fluxoMicrofone; },
    _fontes: function () { return fontesTocando.length; },
    estado: function () { return estado; },
    conectado: function () { return conectado; },
    desativar: desativar,
    _executar: executar
  };
})(window, document);
