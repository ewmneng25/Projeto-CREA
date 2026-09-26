/* ============================================================
   ProLink — agente de voz (lado da tela)

   Carregado em todas as telas. Tem dois papéis:

   1. Fora do modo de acessibilidade: não faz nada além de oferecer
      o atalho Alt + M, que abre a caixinha para ativar o modo.

   2. Dentro do modo de acessibilidade, a tela roda num quadro da
      moldura de voz (acessivel.html). A moldura mantém a conversa de
      áudio com o Gemini aberta enquanto a pessoa troca de tela; este
      agente é a mão da Miranda dentro da tela: lê o que está nela,
      clica, preenche campos, pesquisa na base e navega.

   A conversa entre moldura e tela é feita por postMessage, que
   funciona tanto pelo servidor local quanto aberto por duplo clique.
   ============================================================ */
(function (window, document) {
  "use strict";

  var MARCA = "prolink-voz";
  var dentroDaMoldura = window.parent && window.parent !== window;

  /* Páginas que a Miranda pode abrir, com o que cada uma é. */
  var PAGINAS = {
    "index.html": "página inicial pública",
    "login.html": "entrar na conta ou entrar como visitante",
    "cadastro.html": "criar conta",
    "recuperar.html": "recuperar acesso",
    "buscar.html": "buscar profissionais (visitante)",
    "inicio.html": "início do profissional",
    "oportunidades.html": "oportunidades abertas (profissional)",
    "oportunidade.html": "detalhe de uma oportunidade (use ?d=ID)",
    "candidaturas.html": "minhas candidaturas (profissional)",
    "profissionais.html": "buscar profissionais",
    "profissional.html": "perfil de um profissional (use ?p=ID)",
    "portfolio.html": "meu portfólio: projetos, obras e documentos (profissional)",
    "mensagens.html": "mensagens (profissional)",
    "perfil.html": "meu perfil (profissional)",
    "perfil-publico.html": "como meu perfil aparece para os outros",
    "avaliacoes.html": "avaliações (profissional)",
    "privacidade.html": "privacidade e dados",
    "configuracoes.html": "configurações (profissional)",
    "miranda.html": "conversa por texto com a Miranda",
    "empresa-inicio.html": "início da empresa",
    "empresa-demandas.html": "minhas demandas (empresa)",
    "empresa-publicar.html": "publicar demanda (empresa)",
    "empresa-candidaturas.html": "candidaturas recebidas (empresa)",
    "empresa-profissionais.html": "buscar profissionais (empresa)",
    "empresa-mensagens.html": "mensagens (empresa)",
    "empresa-perfil.html": "perfil da empresa",
    "empresa-avaliacoes.html": "avaliações (empresa)",
    "empresa-configuracoes.html": "configurações (empresa)",
    "admin-inicio.html": "painel administrativo",
    "admin-usuarios.html": "usuários (administração)",
    "admin-denuncias.html": "denúncias (administração)",
    "admin-auditoria.html": "trilha de auditoria (administração)",
    "admin-configuracoes.html": "configurações (administração)"
  };

  /* Botões que mudam dados ou mandam algo para outra pessoa: só com
     a confirmação da pessoa, dada em voz. */
  var SENSIVEL = /publicar|enviar|excluir|apagar|encerrar|confirmar|criar conta|manifestar|bloquear|remover|denunciar|contratar|recusar|aprovar|suspender|salvar|restaurar|desativar/i;

  function paginaAtual() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  /* Na própria moldura, o agente só empresta a lista de telas. */
  if (paginaAtual() === "acessivel.html") {
    window.ProLinkVozAgente = { ativo: false, paginas: PAGINAS };
    return;
  }

  function modoVozAtivo() {
    try { return window.localStorage.getItem("prolink_modo_voz") === "1"; } catch (erro) { return false; }
  }

  function limpar(texto, limite) {
    texto = String(texto == null ? "" : texto).replace(/\s+/g, " ").trim();
    if (limite && texto.length > limite) { texto = texto.slice(0, limite - 1) + "…"; }
    return texto;
  }

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function visivel(el) {
    if (!el || !el.isConnected || el.closest("[hidden]")) { return false; }
    var estilo = window.getComputedStyle(el);
    return estilo.display !== "none" && estilo.visibility !== "hidden" && el.getClientRects().length > 0;
  }

  function esperar(ms) { return new Promise(function (ok) { window.setTimeout(ok, ms); }); }

  // ==================================================================
  // LEITURA DA TELA
  // ==================================================================
  var INTERATIVOS = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
    '[role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], ' +
    '[role="menuitem"], [role="option"], [contenteditable="true"]';

  var registro = [];   // ref -> elemento, válido até a próxima leitura

  function dialogoAberto() {
    var lista = Array.prototype.filter.call(
      document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"]'), visivel);
    return lista[lista.length - 1] || null;
  }

  function textoPorIds(ids) {
    return String(ids || "").split(/\s+/).map(function (id) {
      var el = id && document.getElementById(id);
      return el ? el.textContent : "";
    }).join(" ");
  }

  function rotulo(el) {
    var texto = el.getAttribute("aria-label") || textoPorIds(el.getAttribute("aria-labelledby"));
    if (!limpar(texto) && el.id) {
      var label = document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]');
      if (label) { texto = label.textContent; }
    }
    if (!limpar(texto) && el.closest("label")) { texto = el.closest("label").textContent; }
    if (!limpar(texto) && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      texto = el.getAttribute("placeholder") || el.getAttribute("title") || el.name || "";
    }
    if (!limpar(texto)) { texto = el.innerText || el.textContent || el.getAttribute("title") || el.value || ""; }
    return limpar(texto, 90);
  }

  function tipoDe(el) {
    var papel = el.getAttribute("role");
    if (el.tagName === "A") { return "link"; }
    if (el.tagName === "BUTTON" || papel === "button") { return "botão"; }
    if (el.tagName === "SELECT") { return "lista de opções"; }
    if (el.tagName === "TEXTAREA") { return "campo de texto longo"; }
    if (el.tagName === "SUMMARY") { return "seção expansível"; }
    if (el.tagName === "INPUT") {
      var t = (el.type || "text").toLowerCase();
      if (el.hasAttribute("data-senha")) { return "campo de senha"; }
      return { checkbox: "caixa de marcar", radio: "opção", file: "enviar arquivo", password: "campo de senha",
               submit: "botão", button: "botão", search: "campo de busca", email: "campo de e-mail",
               date: "campo de data", number: "campo numérico", tel: "campo de telefone" }[t] || "campo de texto";
    }
    return { tab: "aba", radio: "opção", checkbox: "caixa de marcar", "switch": "interruptor", menuitem: "item de menu",
             option: "opção", link: "link" }[papel] || "controle";
  }

  function regiaoDe(el, dialogo) {
    if (dialogo && dialogo.contains(el)) { return "diálogo"; }
    if (el.closest("nav, .sidebar, .lateral, aside.nav")) { return "menu"; }
    if (el.closest("header, .topbar, .topo, .topo-publico")) { return "topo"; }
    if (el.closest("footer")) { return "rodapé"; }
    return "conteúdo";
  }

  function descreverElemento(el, dialogo) {
    var item = { ref: registro.length, tipo: tipoDe(el), rotulo: rotulo(el), regiao: regiaoDe(el, dialogo) };
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      var t = (el.type || "").toLowerCase();
      if (t === "checkbox" || t === "radio") { item.marcado = el.checked; }
      else if (t === "password" || el.hasAttribute("data-senha")) { item.valor = el.value ? "(preenchido)" : ""; }
      else if (t === "file") { item.arquivos = el.files ? el.files.length : 0; }
      else { item.valor = limpar(el.value, 120); }
    }
    if (el.tagName === "SELECT") {
      item.valor = el.selectedIndex >= 0 ? limpar(el.options[el.selectedIndex].text, 60) : "";
      item.opcoes = Array.prototype.slice.call(el.options, 0, 30).map(function (o) { return limpar(o.text, 40); });
    }
    var estado = el.getAttribute("aria-checked") || el.getAttribute("aria-selected") || el.getAttribute("aria-pressed");
    if (estado) { item.marcado = estado === "true"; }
    if (el.getAttribute("aria-expanded")) { item.aberto = el.getAttribute("aria-expanded") === "true"; }
    if (el.getAttribute("aria-current")) { item.atual = true; }
    if (el.disabled || el.getAttribute("aria-disabled") === "true") { item.desativado = true; }
    if (el.required || el.getAttribute("aria-required") === "true") { item.obrigatorio = true; }
    if (el.getAttribute("aria-invalid") === "true") { item.com_erro = true; }
    if (el.tagName === "A") {
      var destino = (el.getAttribute("href") || "").split("/").pop();
      if (destino && destino.charAt(0) !== "#") { item.abre = destino; }
    }
    return item;
  }

  function lerTela() {
    registro = [];
    var dialogo = dialogoAberto();
    var raiz = dialogo || document;
    var candidatos = Array.prototype.filter.call(raiz.querySelectorAll(INTERATIVOS), function (el) {
      if (el.closest("[aria-hidden='true']")) { return false; }
      if (el.type === "file") { return !el.disabled; }   // costuma ficar escondido atrás de um botão
      return visivel(el);
    });
    /* Com um diálogo aberto, só ele importa (o resto da tela está bloqueado). */
    var ordem = { "diálogo": 0, "conteúdo": 1, "topo": 2, "menu": 3, "rodapé": 4 };
    var itens = candidatos.map(function (el) { return { el: el, regiao: regiaoDe(el, dialogo) }; })
      .sort(function (a, b) { return ordem[a.regiao] - ordem[b.regiao]; });
    var LIMITE = 110;
    var elementos = [];
    itens.slice(0, LIMITE).forEach(function (par) {
      var d = descreverElemento(par.el, dialogo);
      registro.push(par.el);
      if (d.rotulo || d.tipo !== "controle") { elementos.push(d); }
    });

    var principal = dialogo || document.getElementById("conteudo") || document.querySelector("main") || document.body;
    var h1 = document.querySelector("h1");
    var avisos = Array.prototype.filter.call(
      document.querySelectorAll('[role="alert"], [role="status"], .retorno-crea, .erro-inline, .aviso-banco'),
      function (el) { return visivel(el) && limpar(el.textContent) && !el.closest(".splash, .transicao"); })
      .map(function (el) { return limpar(el.textContent, 240); });

    var resultado = {
      pagina: paginaAtual() + window.location.search,
      o_que_e: PAGINAS[paginaAtual()] || "",
      titulo: limpar(document.title),
      titulo_principal: h1 ? limpar(h1.textContent, 120) : "",
      conta: contaAtual(),
      dialogo_aberto: dialogo ? limpar(rotuloDoDialogo(dialogo), 120) : null,
      avisos: avisos.slice(0, 6),
      texto: limpar(principal.innerText || principal.textContent, 3500),
      elementos: elementos,
      observacao: itens.length > LIMITE ? "A tela tem mais elementos do que os listados; os de conteúdo vêm primeiro." : undefined
    };
    return resultado;
  }

  function rotuloDoDialogo(d) {
    return d.getAttribute("aria-label") || textoPorIds(d.getAttribute("aria-labelledby")) ||
      (d.querySelector("h1, h2, h3") || d).textContent;
  }

  function contaAtual() {
    try {
      var M = window.ProLinkModelos;
      var u = M && M.sessao.atual();
      if (!u) { return null; }
      return {
        nome: u.nome, tipo: u.visitante ? "visitante" : u.tipoConta,
        base: "real"
      };
    } catch (erro) { return null; }
  }

  function elementoDaRef(ref) {
    if (ref === null || ref === undefined || ref === "" || isNaN(Number(ref))) { return null; }
    var el = registro[Number(ref)];
    if (!el || !el.isConnected) { return null; }
    return el;
  }

  // ==================================================================
  // AÇÕES
  // ==================================================================
  function situacaoDepois() {
    return esperar(450).then(function () {
      var d = dialogoAberto();
      var avisos = Array.prototype.filter.call(
        document.querySelectorAll('[role="alert"], .retorno-crea, .erro-inline'), function (el) {
          return visivel(el) && limpar(el.textContent);
        }).map(function (el) { return limpar(el.textContent, 240); });
      return { dialogo_aberto: d ? limpar(rotuloDoDialogo(d), 120) : null, avisos: avisos.slice(0, 5) };
    });
  }

  function clicar(args) {
    var el = elementoDaRef(args.ref);
    if (!el) { return { erro: "Esse elemento não está mais na tela. Chame ler_tela de novo." }; }
    var nome = rotulo(el);
    if (SENSIVEL.test(nome) && !args.confirmado) {
      return { precisa_confirmar: true, acao: nome,
               instrucao: "Pergunte à pessoa se ela confirma essa ação e só então chame clicar de novo com confirmado=true." };
    }
    if (el.type === "file") {
      return { erro: "Escolher arquivo exige a pessoa. Use focar nesse elemento e peça para ela apertar Enter." };
    }
    if (el.disabled || el.getAttribute("aria-disabled") === "true") { return { erro: "O botão \"" + nome + "\" está desativado." }; }
    try { el.scrollIntoView({ block: "center" }); } catch (erro) { /* ignora */ }
    try { el.focus({ preventScroll: true }); } catch (erro) { /* ignora */ }
    /* Botões que abrem a janela de escolher arquivo por script: sem um
       gesto real da pessoa o navegador não abre a janela. O clique é
       segurado, o foco fica no botão e a Miranda pede um Enter. */
    var pediuArquivo = false;
    var clicarOriginal = window.HTMLInputElement.prototype.click;
    window.HTMLInputElement.prototype.click = function () {
      if (this.type === "file") {
        pediuArquivo = true;
        if (!this.isConnected || this.hidden) { try { this.remove(); } catch (erro) { /* ignora */ } }
        return;
      }
      return clicarOriginal.apply(this, arguments);
    };
    try { el.click(); } finally { window.HTMLInputElement.prototype.click = clicarOriginal; }
    if (pediuArquivo) {
      avisarMoldura({ tipo: "focar-quadro" });
      el.focus();
      return { precisa_da_pessoa: true, focado: nome,
               instrucao: "Esse botão abre a janela de escolher arquivo, que só a própria pessoa pode usar. " +
                          "O foco já está nele: peça para ela apertar Enter e escolher o arquivo." };
    }
    return situacaoDepois().then(function (depois) {
      depois.ok = true;
      depois.clicado = nome;
      return depois;
    });
  }

  var SIM = /^(sim|s|true|verdadeiro|marcar|marcado|ligar|ligado|ativar|ativo|1)$/i;

  function preencher(args) {
    var el = elementoDaRef(args.ref);
    if (!el) { return { erro: "Esse campo não está mais na tela. Chame ler_tela de novo." }; }
    var valor = String(args.valor == null ? "" : args.valor);
    var nome = rotulo(el);
    var tipo = (el.type || "").toLowerCase();

    if (tipo === "file") { return { erro: "Escolher arquivo exige a pessoa. Use focar e peça para ela apertar Enter." }; }
    if (el.disabled || el.readOnly) { return { erro: "O campo \"" + nome + "\" não pode ser editado agora." }; }

    if (tipo === "checkbox" || tipo === "radio" || /checkbox|radio|switch/.test(el.getAttribute("role") || "")) {
      var querMarcado = SIM.test(normalizar(valor).trim());
      var marcado = el.checked != null && el.tagName === "INPUT" ? el.checked : el.getAttribute("aria-checked") === "true";
      if (querMarcado !== marcado || tipo === "radio") { el.click(); }
      return situacaoDepois().then(function (d) { d.ok = true; d.campo = nome; d.marcado = el.checked; return d; });
    }

    if (el.tagName === "SELECT") {
      var alvo = normalizar(valor).trim();
      var opcoes = Array.prototype.slice.call(el.options);
      var achada = opcoes.filter(function (o) { return normalizar(o.text).trim() === alvo || normalizar(o.value) === alvo; })[0] ||
        opcoes.filter(function (o) { return alvo && normalizar(o.text).indexOf(alvo) !== -1; })[0];
      if (!achada) {
        return { erro: "Nenhuma opção corresponde a \"" + valor + "\".", opcoes: opcoes.map(function (o) { return limpar(o.text, 40); }) };
      }
      el.value = achada.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return situacaoDepois().then(function (d) { d.ok = true; d.campo = nome; d.valor = limpar(achada.text); return d; });
    }

    try { el.focus({ preventScroll: true }); } catch (erro) { /* ignora */ }
    if (el.isContentEditable) {
      el.textContent = valor;
    } else {
      var prototipo = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(prototipo, "value").set;
      setter.call(el, valor);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return situacaoDepois().then(function (d) {
      d.ok = true;
      d.campo = nome;
      /* Senha, mesmo visível pelo olhinho: o valor nunca volta para a Miranda. */
      if (tipo !== "password" && !el.hasAttribute("data-senha")) { d.valor = limpar(el.value, 120); }
      if (el.getAttribute("aria-invalid") === "true" || (el.validationMessage && !el.checkValidity())) {
        d.problema = el.validationMessage || "o campo foi marcado com erro";
      }
      return d;
    });
  }

  function focar(args) {
    var el = elementoDaRef(args.ref);
    if (!el) { return { erro: "Esse elemento não está mais na tela. Chame ler_tela de novo." }; }
    /* Campo de arquivo escondido: o foco vai para o botão que o abre. */
    var alvo = el;
    if (el.type === "file" && !visivel(el)) {
      var label = el.id && document.querySelector('label[for="' + el.id + '"]');
      alvo = label && visivel(label) ? label : (el.closest("label") || el.parentElement);
      if (alvo && !alvo.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT)$/.test(alvo.tagName)) {
        alvo.setAttribute("tabindex", "0");
        alvo.addEventListener("keydown", function (evento) {
          if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); el.click(); }
        });
      }
    }
    try { alvo.scrollIntoView({ block: "center" }); } catch (erro) { /* ignora */ }
    avisarMoldura({ tipo: "focar-quadro" });
    alvo.focus();
    return { ok: true, focado: rotulo(el) || rotulo(alvo),
             instrucao: el.type === "file" ? "Diga à pessoa para apertar Enter e escolher o arquivo na janela que abrir." : undefined };
  }

  function navegar(args) {
    var destino = String(args.destino || "").trim().replace(/^\.?\//, "");
    var arquivo = destino.split(/[?#]/)[0].toLowerCase();
    if (!arquivo || !Object.prototype.hasOwnProperty.call(PAGINAS, arquivo)) {
      return { erro: "Página desconhecida: \"" + destino + "\".", paginas: Object.keys(PAGINAS) };
    }
    window.setTimeout(function () { window.location.href = destino; }, 30);
    return { ok: true, indo_para: destino };
  }

  function voltar() {
    window.setTimeout(function () { window.history.back(); }, 30);
    return { ok: true };
  }

  function rolar(args) {
    var passo = String(args.direcao || "baixo") === "cima" ? -0.8 : 0.8;
    window.scrollBy({ top: window.innerHeight * passo, behavior: "auto" });
    return { ok: true };
  }

  // ==================================================================
  // CONSULTAS DIRETAS NA BASE (mais rápidas que navegar pela tela)
  // ==================================================================
  function lista(valor) {
    if (Array.isArray(valor)) { return valor; }
    if (!valor) { return []; }
    try { var v = JSON.parse(valor); return Array.isArray(v) ? v : [String(valor)]; } catch (erro) { return [String(valor)]; }
  }

  function combina(texto, termos) {
    var t = normalizar(texto);
    return termos.every(function (termo) { return t.indexOf(termo) !== -1; });
  }

  function pesquisar(args) {
    var M = window.ProLinkModelos;
    if (!M) { return { erro: "A base de dados ainda não carregou nesta tela." }; }
    var tipo = normalizar(args.tipo || "oportunidades");
    var termos = normalizar((args.termo || "") + " " + (args.cidade || "")).split(/\s+/).filter(function (t) {
      return t.length > 1 && ["de", "da", "do", "em", "para", "com", "e", "a", "o"].indexOf(t) === -1;
    });
    var limite = Math.min(Number(args.limite) || 8, 15);

    if (tipo.indexOf("prof") === 0) {
      var profs = M.profissionais.listar().filter(function (p) {
        return combina([p.nome, p.titulo, p.cidade, p.uf, lista(p.areas).join(" "), lista(p.competencias).join(" "), p.resumo].join(" "), termos);
      }).sort(function (a, b) { return (Number(b.nota) || 0) - (Number(a.nota) || 0); });
      return {
        total: profs.length,
        resultados: profs.slice(0, limite).map(function (p) {
          return { id: p.id, nome: p.nome, titulo: p.titulo, cidade: p.cidade + (p.uf ? "/" + p.uf : ""),
                   nota: p.nota, avaliacoes: p.avaliacoes, verificado: String(p.verificado) === "sim" || p.verificado === true,
                   areas: lista(p.areas), abrir: "profissional.html?p=" + p.id };
        })
      };
    }

    if (tipo.indexOf("empr") === 0) {
      var demandas = M.demandas.listar();
      var empresas = M.usuarios.listar().filter(function (u) {
        return (u.tipoConta === "empresa" || u.tipoConta === "contratante") &&
          combina([u.nome, u.titulo, u.cidadeExibicao, u.sobre, u.razaoSocial].join(" "), termos);
      });
      return {
        total: empresas.length,
        resultados: empresas.slice(0, limite).map(function (u) {
          var abertas = demandas.filter(function (d) {
            return (d.empresaUsuarioId === u.id || d.empresa === u.nome) && d.situacao === "Aberta";
          });
          return { id: u.id, nome: u.nome, ramo: u.titulo, cidade: u.cidadeExibicao, sobre: limpar(u.sobre, 220),
                   demandas_abertas: abertas.map(function (d) { return { id: d.id, titulo: d.titulo, abrir: "oportunidade.html?d=" + d.id }; }) };
        })
      };
    }

    var eu = M.sessao.atual();
    var API = window.ProLinkDemandas;
    var prof = null;
    try { prof = eu && eu.profissionalId && API && API.profissionalPorId ? API.profissionalPorId(eu.profissionalId) : null; } catch (erro) { prof = null; }
    var abertas = M.demandas.listar().filter(function (d) {
      return d.situacao === "Aberta" &&
        combina([d.titulo, d.tipo, d.empresa, d.cidade, d.uf, d.modalidade, lista(d.areas).join(" "), d.resumo].join(" "), termos);
    });
    var itens = abertas.map(function (d) {
      var item = { id: d.id, titulo: d.titulo, empresa: d.empresa, cidade: d.cidade + (d.uf ? "/" + d.uf : ""),
                   modalidade: d.modalidade, prazo: d.prazo, faixa: d.faixa, areas: lista(d.areas),
                   resumo: limpar(d.resumo, 200), abrir: "oportunidade.html?d=" + d.id };
      if (prof && API.compatibilidade) {
        try { var c = API.compatibilidade(prof, d); item.compatibilidade = c && (c.total != null ? c.total : c); } catch (erro) { /* ignora */ }
      }
      return item;
    });
    if (prof) { itens.sort(function (a, b) { return (Number(b.compatibilidade) || 0) - (Number(a.compatibilidade) || 0); }); }
    return { total: itens.length, resultados: itens.slice(0, limite) };
  }

  function resumoDaConta() {
    var M = window.ProLinkModelos;
    var conta = contaAtual();
    if (!M || !conta) { return { conta: null, observacao: "Ninguém entrou numa conta nesta sessão." }; }
    var eu = M.sessao.atual();
    var r = { conta: conta, email: eu.email || "", titulo: eu.titulo || "", cidade: eu.cidadeExibicao || "" };
    try {
      if (eu.tipoConta === "profissional") {
        var minhas = M.candidaturas.listar().filter(function (c) {
          return c.profissionalId === eu.profissionalId || c.profissionalId === eu.id;
        });
        r.candidaturas = minhas.map(function (c) { return { demanda: c.demandaTitulo, empresa: c.empresa, situacao: c.situacao }; }).slice(0, 10);
        r.projetos = M.projetos.listar({ usuarioId: eu.id }).length;
        r.obras = M.obras.listar({ usuarioId: eu.id }).length;
      } else if (eu.tipoConta === "empresa" || eu.tipoConta === "contratante") {
        var minhasDemandas = M.demandas.listar().filter(function (d) { return d.empresaUsuarioId === eu.id; });
        r.demandas = minhasDemandas.map(function (d) {
          return { id: d.id, titulo: d.titulo, situacao: d.situacao,
                   candidaturas: M.candidaturas.listar({ demandaId: d.id }).length };
        }).slice(0, 12);
      }
      var conversas = M.conversas.listar({ usuarioId: eu.id });
      r.mensagens_nao_lidas = conversas.reduce(function (s, c) { return s + (Number(c.naoLidas) || 0); }, 0);
    } catch (erro) { r.observacao = "Parte do resumo não pôde ser montada."; }
    return r;
  }

  function lerNotificacoes() {
    var botao = document.getElementById("abrir-notificacoes");
    var painel = document.getElementById("painel-notificacoes");
    if (!botao || !painel) { return { erro: "Esta tela não tem notificações." }; }
    var estavaAberto = visivel(painel);
    if (!estavaAberto) { botao.click(); }
    return esperar(350).then(function () {
      var itens = Array.prototype.map.call(painel.querySelectorAll(".lista-notificacoes li"), function (li) {
        var link = li.querySelector("a[href]");
        return { texto: limpar(li.textContent, 220), nova: li.classList.contains("notificacao-nova"),
                 abre: link ? (link.getAttribute("href") || "").split("/").pop() : undefined };
      });
      if (!estavaAberto && visivel(painel)) { botao.click(); }
      return { total: itens.length, notificacoes: itens.slice(0, 15) };
    });
  }

  var ACOES = {
    ler_tela: lerTela, clicar: clicar, preencher: preencher, focar: focar, navegar: navegar,
    voltar: voltar, rolar: rolar, pesquisar: pesquisar, resumo_da_conta: resumoDaConta,
    ler_notificacoes: lerNotificacoes
  };

  // ==================================================================
  // CONVERSA COM A MOLDURA
  // ==================================================================
  function avisarMoldura(dados) {
    if (!dentroDaMoldura) { return; }
    dados.marca = MARCA;
    try { window.parent.postMessage(dados, "*"); } catch (erro) { /* moldura fechada */ }
  }

  function informarPronta() {
    avisarMoldura({
      tipo: "pronta",
      pagina: paginaAtual(),
      endereco: paginaAtual() + window.location.search + window.location.hash,
      titulo: document.title
    });
  }

  if (dentroDaMoldura) {
    document.documentElement.classList.add("em-moldura-voz");

    window.addEventListener("message", function (evento) {
      if (evento.source !== window.parent) { return; }
      var msg = evento.data;
      if (!msg || msg.marca !== MARCA || msg.tipo !== "pedido") { return; }
      var acao = ACOES[msg.acao];
      Promise.resolve()
        .then(function () { return acao ? acao(msg.args || {}) : { erro: "Ação desconhecida: " + msg.acao }; })
        .catch(function (erro) { return { erro: "Falhou: " + (erro && erro.message ? erro.message : erro) }; })
        .then(function (resultado) {
          avisarMoldura({ tipo: "resposta", id: msg.id, resultado: resultado });
        });
    });

    /* Pronta quando a base terminou de desenhar a tela (ou logo, se a
       tela não usa a base). */
    var avisou = false;
    function pronta() { if (!avisou) { avisou = true; window.setTimeout(informarPronta, 150); } }
    document.addEventListener("prolink:base-pronta", pronta);
    window.addEventListener("load", function () { window.setTimeout(pronta, 1500); });
    if (window.ProLinkBanco && window.ProLinkBanco.paginaPronta) { pronta(); }

    /* Documento que não é tela do ProLink (manual em PDF, site de fora):
       abre em outra aba, para a voz e o atalho continuarem na tela. */
    document.addEventListener("click", function (evento) {
      var link = evento.target.closest && evento.target.closest("a[href]");
      if (!link || link.target === "_blank") { return; }
      var href = link.getAttribute("href") || "";
      if (/\.pdf([?#]|$)/i.test(href) || /^(https?:)?\/\//i.test(href) && link.host !== window.location.host) {
        link.target = "_blank";
        link.rel = "noopener";
      }
    }, true);

    /* O primeiro toque dentro da tela libera o som da moldura (o gesto
       vale também para ela, que é a janela de cima). */
    var ultimoToque = 0;
    function tocou(evento) {
      if (evento.type === "keydown" && evento.key === "Escape") { return; }
      var agora = Date.now();
      if (agora - ultimoToque < 800) { return; }
      ultimoToque = agora;
      avisarMoldura({ tipo: "interacao" });
    }
    ["keydown", "pointerdown", "touchend"].forEach(function (tipo) { window.addEventListener(tipo, tocou, true); });

    window.addEventListener("pagehide", function () { avisarMoldura({ tipo: "saindo" }); });
    window.addEventListener("beforeunload", function () { avisarMoldura({ tipo: "saindo" }); });

    /* O título muda depois que os dados carregam (perfil, oportunidade). */
    var ultimoTitulo = document.title;
    window.setInterval(function () {
      if (document.title !== ultimoTitulo) { ultimoTitulo = document.title; informarPronta(); }
    }, 1500);
  }

  /* Alt + M: dentro do modo, liga e desliga o microfone (e interrompe a
     Miranda se ela estiver falando); fora dele, oferece o modo. */
  window.addEventListener("keydown", function (evento) {
    if (!evento.altKey || evento.ctrlKey || evento.metaKey) { return; }
    if (evento.code !== "KeyM" && String(evento.key).toLowerCase() !== "m") { return; }
    evento.preventDefault();
    if (evento.__prolinkAtalho) { return; }   // a moldura já tratou direto
    if (dentroDaMoldura) {
      avisarMoldura({ tipo: "atalho-microfone" });
    } else if (window.ProLinkBoasVindas) {
      window.ProLinkBoasVindas.abrir();
    }
  }, true);

  window.ProLinkVozAgente = { ativo: dentroDaMoldura, modoVozAtivo: modoVozAtivo, paginas: PAGINAS, lerTela: lerTela };
})(window, document);
