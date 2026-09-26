/* ============================================================
   ProLink — base de dados em CSV, sem servidor

   Toda a base é feita de arquivos CSV, um por tabela. Não há
   servidor, banco ou programa rodando, e ninguém precisa escolher
   pasta: o próprio sistema guarda os CSV dentro do navegador.

   ------------------------------------------------------------
   DE ONDE VEM E ONDE FICA
   ------------------------------------------------------------
   - dados/*.csv (na pasta do projeto) é a base inicial.
     O build.py empacota esses CSV em dados/base-inicial.js, porque
     uma página aberta com duplo clique não pode ler arquivos do
     disco com fetch, mas pode carregar um script.
   - Na primeira abertura, cada CSV inicial é copiado para o
     armazenamento interno do navegador (IndexedDB), no banco
     "prolink-base-csv", um registro por tabela com o texto do CSV.
   - A partir daí, o sistema lê e grava esses CSV. O administrador
     pode baixar qualquer tabela como arquivo .csv ou restaurar a
     base inicial em Configurações.

   ------------------------------------------------------------
   COMO FUNCIONA EM CADA PÁGINA
   ------------------------------------------------------------
   1. Este arquivo lê os CSV para a memória e só então carrega os
      outros scripts da página (atributo data-scripts).
   2. As leituras saem da memória, na hora. Cada alteração muda a
      memória e regrava o CSV da tabela logo em seguida.

   ------------------------------------------------------------
   FORMATO DOS CSV
   ------------------------------------------------------------
   Separador ";" e UTF-8 com BOM (abre direto no Excel em
   português). Primeira linha: cabeçalho. Listas e objetos ficam
   como texto JSON dentro da célula; verdadeiro e falso, como
   "sim" e "nao". Nas tabelas com a coluna "extras", campos sem
   coluna própria vão para ela, em JSON.

   ------------------------------------------------------------
   USO PELAS TELAS
   ------------------------------------------------------------
     ProLinkBanco.listar("demandas", { situacao: "Aberta" })
     ProLinkBanco.buscar("usuarios", "u-daniel")
     ProLinkBanco.inserir("projetos", { nome: "...", usuarioId: "..." })
     ProLinkBanco.atualizar("usuarios", id, { sobre: "..." })
     ProLinkBanco.excluir("projetos", id)
     ProLinkBanco.excluirOnde("miranda_mensagens", { usuarioId: id })
   ============================================================ */
(function (window, document) {
  "use strict";

  var ESQUEMA = {
    "usuarios": {
      "colunas": [
        "id",
        "tipoConta",
        "nome",
        "email",
        "documento",
        "registro",
        "ufRegistro",
        "rnp",
        "rne",
        "titulo",
        "situacao",
        "cidadeExibicao",
        "sobre",
        "verificado",
        "identidadeVerificada",
        "primeiroAcesso",
        "demonstracao",
        "profissionalId",
        "criadoEm",
        "extras"
      ],
      "tipos": {
        "verificado": "b",
        "identidadeVerificada": "b",
        "primeiroAcesso": "b",
        "demonstracao": "b",
        "extras": "j"
      }
    },
    "profissionais": {
      "colunas": [
        "id",
        "nome",
        "iniciais",
        "cor",
        "titulo",
        "registro",
        "rnp",
        "cidade",
        "uf",
        "nota",
        "avaliacoes",
        "verificado",
        "atendeEstado",
        "areas",
        "acervoPorArea",
        "competencias",
        "acervo",
        "resumo"
      ],
      "tipos": {
        "nota": "n",
        "avaliacoes": "n",
        "verificado": "b",
        "atendeEstado": "b",
        "areas": "j",
        "acervoPorArea": "j",
        "competencias": "j",
        "acervo": "j"
      }
    },
    "demandas": {
      "colunas": [
        "id",
        "titulo",
        "tipo",
        "empresa",
        "empresaIniciais",
        "empresaUsuarioId",
        "cidade",
        "uf",
        "local",
        "modalidade",
        "prazo",
        "inicio",
        "faixa",
        "areas",
        "exigencias",
        "resumo",
        "escopo",
        "situacao",
        "publicadaEm",
        "desfecho",
        "contratadoId"
      ],
      "tipos": {
        "areas": "j",
        "exigencias": "j"
      }
    },
    "candidaturas": {
      "colunas": [
        "id",
        "demandaId",
        "demandaTitulo",
        "empresa",
        "profissionalId",
        "profissional",
        "compatibilidade",
        "criterios",
        "mensagem",
        "acervo",
        "situacao",
        "data"
      ],
      "tipos": {
        "profissional": "j",
        "compatibilidade": "n",
        "criterios": "j",
        "acervo": "j"
      }
    },
    "privacidade": {
      "colunas": [
        "id",
        "usuarioId",
        "nomeCompleto",
        "cidade",
        "telefone",
        "email",
        "acervo",
        "avaliacoes",
        "curriculo",
        "usoDadosCrea",
        "buscas",
        "avisos"
      ],
      "tipos": {
        "nomeCompleto": "b",
        "cidade": "b",
        "telefone": "b",
        "email": "b",
        "acervo": "b",
        "avaliacoes": "b",
        "curriculo": "b",
        "usoDadosCrea": "b",
        "buscas": "b",
        "avisos": "b"
      }
    },
    "configuracoes": {
      "colunas": [
        "id",
        "usuarioId",
        "eventos",
        "frequencia",
        "textoMaior",
        "reduzirMovimento",
        "guiaDesligado",
        "telasVistas"
      ],
      "tipos": {
        "eventos": "j",
        "textoMaior": "b",
        "reduzirMovimento": "b",
        "guiaDesligado": "b",
        "telasVistas": "j"
      }
    },
    "buscas_salvas": {
      "colunas": [
        "id",
        "usuarioId",
        "tipo",
        "nome",
        "pagina",
        "resumo",
        "estado",
        "frequencia",
        "canal",
        "criadoEm"
      ],
      "tipos": {
        "estado": "j"
      }
    },
    "conversas": {
      "colunas": [
        "id",
        "usuarioId",
        "contato",
        "demanda",
        "naoLidas",
        "quando",
        "atualizadaEm"
      ],
      "tipos": {
        "naoLidas": "n"
      }
    },
    "mensagens": {
      "colunas": [
        "id",
        "conversaId",
        "de",
        "texto",
        "hora",
        "dia",
        "anexo",
        "proposta",
        "link",
        "convite",
        "criadoEm"
      ],
      "tipos": {
        "anexo": "j",
        "proposta": "j",
        "link": "j",
        "convite": "b"
      }
    },
    "miranda_mensagens": {
      "colunas": [
        "id",
        "usuarioId",
        "autor",
        "texto",
        "hora",
        "criadoEm"
      ],
      "tipos": {}
    },
    "projetos": {
      "colunas": [
        "id",
        "usuarioId",
        "nome",
        "descricao",
        "area",
        "situacao",
        "periodo",
        "capa",
        "criadoEm"
      ],
      "tipos": {}
    },
    "arquivos": {
      "colunas": [
        "id",
        "usuarioId",
        "categoria",
        "referenciaId",
        "nome",
        "detalhe",
        "tamanho",
        "criadoEm"
      ],
      "tipos": {}
    },
    "avaliacoes": {
      "colunas": [
        "id",
        "lado",
        "sentido",
        "autorIniciais",
        "autorNome",
        "projeto",
        "nota",
        "data",
        "texto",
        "empresa",
        "usuarioId",
        "criterios"
      ],
      "tipos": {
        "nota": "n",
        "empresa": "b",
        "criterios": "j"
      }
    },
    "pedidos_avaliacao": {
      "colunas": [
        "id",
        "usuarioId",
        "contrato",
        "mensagem",
        "criadoEm"
      ],
      "tipos": {}
    },
    "denuncias": {
      "colunas": [
        "id",
        "protocolo",
        "titulo",
        "alvo",
        "denunciante",
        "motivo",
        "situacao",
        "recebida",
        "decisao",
        "fundamento",
        "decididaEm",
        "criadoEm"
      ],
      "tipos": {}
    },
    "auditoria": {
      "colunas": [
        "id",
        "data",
        "acao",
        "autor",
        "alvo",
        "origem"
      ],
      "tipos": {}
    },
    "documentos": {
      "colunas": [
        "id",
        "usuarioId",
        "tipo",
        "numero",
        "rnp",
        "titulo",
        "local",
        "situacao",
        "confirmadoEm",
        "origem",
        "criadoEm"
      ],
      "tipos": {}
    },
    "salvos": {
      "colunas": [
        "id",
        "usuarioId",
        "tipo",
        "alvoId",
        "criadoEm"
      ],
      "tipos": {}
    },
    "obras": {
      "colunas": [
        "id",
        "usuarioId",
        "nome",
        "cliente",
        "cidade",
        "periodo",
        "area",
        "porte",
        "descricao",
        "situacao",
        "criadoEm"
      ],
      "tipos": {}
    }
  };
  var TABELAS = Object.keys(ESQUEMA);
  var SEPARADOR = ";";
  var CHAVE_SESSAO = "prolink_sessao";

  var scriptAtual = document.currentScript;
  var scriptsDaPagina = (scriptAtual && scriptAtual.getAttribute("data-scripts") || "")
    .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  /* data-scripts usa caminhos a partir de app/ (ex.: "controllers/sessao.js"). */
  var pastaDosScripts = scriptAtual ? scriptAtual.getAttribute("src").replace(/core\/banco\.js.*$/, "") : "app/";
  /* A mesma versão do banco.js (?v=…) vai para os scripts que ele carrega. */
  var versaoDosScripts = scriptAtual ? (scriptAtual.getAttribute("src").split("?")[1] || "") : "";

  /* ------------------------------------------------------------------
     DUAS BASES
     O sistema tem uma base só (dados/*.csv): a população de exemplo, as
     contas da apresentação e as contas criadas no cadastro. O modo de
     demonstração, que usava uma base fictícia separada, foi retirado.
     ------------------------------------------------------------------ */
  var CHAVE_MODO = "prolink_modo";
  var MODO_DEMO = "demonstracao";
  /* Páginas de entrada sempre usam a base real: chegar nelas encerra a
     demonstração. */
  var PAGINAS_DA_BASE_REAL = ["index.html", "login.html", "cadastro.html", "recuperar.html"];

  /* O modo de demonstração saiu do sistema: a base é sempre a real. O que
     sobrou dele no navegador (marca do modo e a base fictícia) é apagado. */
  function lerModo() { return "real"; }
  try {
    window.localStorage.removeItem(CHAVE_MODO);
    Object.keys(window.localStorage).forEach(function (chave) {
      if (chave.indexOf("prolink_demo_csv_") === 0) { window.localStorage.removeItem(chave); }
    });
    if (window.indexedDB) { window.indexedDB.deleteDatabase("prolink-demo-csv"); }
  } catch (erro) { /* ignora */ }
  function gravarModo(modo) {
    try {
      if (modo === MODO_DEMO) { window.localStorage.setItem(CHAVE_MODO, MODO_DEMO); }
      else { window.localStorage.removeItem(CHAVE_MODO); }
    } catch (erro) { /* ignora */ }
  }

  var paginaDoArquivo = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (lerModo() === MODO_DEMO && PAGINAS_DA_BASE_REAL.indexOf(paginaDoArquivo) !== -1) {
    gravarModo("real");
    try {
      window.localStorage.removeItem(CHAVE_SESSAO);
      window.sessionStorage.removeItem(CHAVE_SESSAO);
    } catch (erro) { /* ignora */ }
  }
  var modoAtual = lerModo();

  function baseInicialDo(modo) {
    return (modo === MODO_DEMO ? window.PROLINK_BASE_DEMONSTRACAO : window.PROLINK_BASE_INICIAL) || {};
  }
  function versaoDo(modo) {
    return (modo === MODO_DEMO ? window.PROLINK_VERSAO_DEMONSTRACAO : window.PROLINK_VERSAO_BASE) || "";
  }
  var BASE_INICIAL = baseInicialDo(modoAtual);
  var ARQUIVOS_LOCAIS = window.PROLINK_ARQUIVOS_LOCAIS || {};
  var linhas = {};           // tabela -> [linha crua do CSV (textos)]
  var pronto = false;

  var VISITANTE = {
    id: "visitante", tipoConta: "visitante", visitante: true, verificado: false,
    identidadeVerificada: false, nome: "Visitante", titulo: "Navegando sem conta",
    documento: "", registro: "", email: ""
  };

  // ==================================================================
  // CSV: leitura e escrita do texto
  // ==================================================================
  function lerCsv(texto) {
    texto = String(texto || "").replace(/^\ufeff/, "");
    var tabela = [], linha = [], campo = "", aspas = false;
    for (var i = 0; i < texto.length; i += 1) {
      var c = texto[i];
      if (aspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i += 1; } else { aspas = false; }
        } else {
          campo += c;
        }
      } else if (c === '"') {
        aspas = true;
      } else if (c === SEPARADOR) {
        linha.push(campo); campo = "";
      } else if (c === "\n") {
        linha.push(campo); tabela.push(linha); linha = []; campo = "";
      } else if (c !== "\r") {
        campo += c;
      }
    }
    if (campo !== "" || linha.length) { linha.push(campo); tabela.push(linha); }

    var cabecalho = tabela.shift() || [];
    return tabela
      .filter(function (l) { return l.length > 1 || l[0] !== ""; })
      .map(function (l) {
        var objeto = {};
        cabecalho.forEach(function (nome, indice) { objeto[nome] = l[indice] == null ? "" : l[indice]; });
        return objeto;
      });
  }

  function celula(valor) {
    var texto = valor == null ? "" : String(valor);
    return /[";\r\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
  }

  function escreverCsv(tabela, registros) {
    var colunas = ESQUEMA[tabela].colunas;
    var saida = [colunas.join(SEPARADOR)];
    registros.forEach(function (r) {
      saida.push(colunas.map(function (c) { return celula(r[c]); }).join(SEPARADOR));
    });
    return "\ufeff" + saida.join("\r\n") + "\r\n";
  }

  // ==================================================================
  // Conversão entre a célula (texto) e o valor usado pelas telas
  //   b = booleano (sim/nao)   n = número   j = JSON
  // ==================================================================
  function paraValor(tipo, texto) {
    if (tipo === "b") { return texto === "sim"; }
    if (tipo === "n") { return texto === "" ? null : Number(texto); }
    if (tipo === "j") {
      if (!texto) { return null; }
      try { return JSON.parse(texto); } catch (erro) { return null; }
    }
    return texto;
  }

  function paraTexto(tipo, valor) {
    if (valor == null) { return ""; }
    if (tipo === "b") { return valor ? "sim" : "nao"; }
    if (tipo === "j") { return JSON.stringify(valor); }
    return String(valor);
  }

  function linhaParaObjeto(tabela, linha) {
    var definicao = ESQUEMA[tabela];
    var objeto = {};
    definicao.colunas.forEach(function (coluna) {
      objeto[coluna] = paraValor(definicao.tipos[coluna] || "t", linha[coluna] || "");
    });
    var extras = objeto.extras;
    delete objeto.extras;
    if (extras && typeof extras === "object") {
      Object.keys(extras).forEach(function (chave) {
        if (!(chave in objeto) || objeto[chave] === "" || objeto[chave] === null) { objeto[chave] = extras[chave]; }
      });
    }
    return objeto;
  }

  function objetoParaLinha(tabela, objeto, linhaAtual) {
    var definicao = ESQUEMA[tabela];
    var temExtras = definicao.colunas.indexOf("extras") !== -1;
    var linha = Object.assign({}, linhaAtual || {});
    var extras = temExtras ? (paraValor("j", linha.extras || "") || {}) : {};

    Object.keys(objeto).forEach(function (chave) {
      if (chave !== "extras" && definicao.colunas.indexOf(chave) !== -1) {
        linha[chave] = paraTexto(definicao.tipos[chave] || "t", objeto[chave]);
      } else if (temExtras && chave !== "extras") {
        extras[chave] = objeto[chave];
      }
    });
    if (temExtras) { linha.extras = Object.keys(extras).length ? paraTexto("j", extras) : ""; }
    return linha;
  }

  function textoDoValor(valor) {
    if (valor === true) { return "sim"; }
    if (valor === false) { return "nao"; }
    return valor == null ? "" : String(valor);
  }

  function combina(objeto, filtro) {
    return Object.keys(filtro || {}).every(function (campo) {
      return textoDoValor(objeto[campo]) === textoDoValor(filtro[campo]);
    });
  }

  // ==================================================================
  // Armazenamento interno: um registro por tabela com o texto do CSV
  // ==================================================================
  /* Três caminhos, nesta ordem: IndexedDB (o normal), localStorage e,
     em último caso, memória. O localStorage existe porque o Chrome
     recusa o IndexedDB quando a página é aberta por duplo clique
     (endereço file://) — antes disso, a base inteira não abria e o
     ProLink só funcionava por servidor local. */
  var NOME_IDB = modoAtual === MODO_DEMO ? "prolink-demo-csv" : "prolink-base-csv";
  var PREFIXO_LOCAL = modoAtual === MODO_DEMO ? "prolink_demo_csv_" : "prolink_csv_";
  var deposito = null;
  var aberturaDoDeposito = null;
  var memoria = {};

  function abrirIdb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("IndexedDB ausente")); return; }
      var pedido;
      /* Em file://, o próprio open() lança SecurityError no Chrome. */
      try { pedido = window.indexedDB.open(NOME_IDB, 1); }
      catch (erro) { reject(erro); return; }
      pedido.onupgradeneeded = function () { pedido.result.createObjectStore("csv"); };
      pedido.onsuccess = function () { resolve(pedido.result); };
      pedido.onerror = function () { reject(pedido.error || new Error("IndexedDB recusado")); };
      pedido.onblocked = function () { reject(new Error("IndexedDB bloqueado")); };
    });
  }

  function depositoIndexedDb(db) {
    return {
      nome: "indexeddb",
      ler: function (tabela) {
        return new Promise(function (resolve, reject) {
          var pedido = db.transaction("csv", "readonly").objectStore("csv").get(tabela);
          pedido.onsuccess = function () { resolve(pedido.result); };
          pedido.onerror = function () { reject(pedido.error); };
        });
      },
      gravar: function (tabela, texto) {
        return new Promise(function (resolve, reject) {
          var transacao = db.transaction("csv", "readwrite");
          transacao.objectStore("csv").put(texto, tabela);
          transacao.oncomplete = function () { resolve(); };
          transacao.onerror = function () { reject(transacao.error); };
        });
      }
    };
  }

  function depositoLocalStorage() {
    /* Teste de escrita: em janela anônima com bloqueio, isto já falha. */
    window.localStorage.setItem(PREFIXO_LOCAL + "__teste", "1");
    window.localStorage.removeItem(PREFIXO_LOCAL + "__teste");
    return {
      nome: "localstorage",
      ler: function (tabela) {
        var valor = window.localStorage.getItem(PREFIXO_LOCAL + tabela);
        return Promise.resolve(valor === null ? undefined : valor);
      },
      gravar: function (tabela, texto) {
        try {
          window.localStorage.setItem(PREFIXO_LOCAL + tabela, texto);
          return Promise.resolve();
        } catch (erro) {
          return Promise.reject(erro);
        }
      }
    };
  }

  function depositoMemoria() {
    return {
      nome: "memoria",
      ler: function (tabela) { return Promise.resolve(memoria[tabela]); },
      gravar: function (tabela, texto) { memoria[tabela] = texto; return Promise.resolve(); }
    };
  }

  function abrirDeposito() {
    if (deposito) { return Promise.resolve(deposito); }
    if (aberturaDoDeposito) { return aberturaDoDeposito; }

    aberturaDoDeposito = abrirIdb()
      .then(function (db) { deposito = depositoIndexedDb(db); return deposito; })
      .catch(function (erro) {
        if (window.console) {
          window.console.warn("[Base CSV] IndexedDB indisponível (" +
            (erro && erro.message ? erro.message : erro) + "); usando o localStorage.");
        }
        try {
          deposito = depositoLocalStorage();
        } catch (outro) {
          if (window.console) {
            window.console.warn("[Base CSV] localStorage também indisponível; a base vai " +
              "funcionar só nesta sessão, sem guardar nada.");
          }
          deposito = depositoMemoria();
        }
        return deposito;
      });

    return aberturaDoDeposito;
  }

  function lerCsvGuardado(tabela) {
    return abrirDeposito().then(function (d) { return d.ler(tabela); });
  }

  function guardarCsv(tabela, texto) {
    return abrirDeposito().then(function (d) { return d.gravar(tabela, texto); });
  }

  var filas = {};
  var pendentes = 0;
  var ouvintesDeFim = [];

  function avisarFalhaDeGravacao(tabela, erro) {
    if (window.console) { window.console.error("[Base CSV] Não foi possível gravar " + tabela + ".csv:", erro); }
    var U = window.__ProLinkInterno;
    if (U && U.avisar) {
      U.avisar("Não foi possível gravar " + tabela + ".csv. O armazenamento do navegador pode estar cheio ou bloqueado.", "atencao");
    }
  }

  function agendarGravacao(tabela) {
    pendentes += 1;
    filas[tabela] = (filas[tabela] || Promise.resolve()).then(function () {
      return guardarCsv(tabela, escreverCsv(tabela, linhas[tabela]));
    }).catch(function (erro) {
      avisarFalhaDeGravacao(tabela, erro);
    }).then(function () {
      pendentes -= 1;
      if (!pendentes) {
        var ouvintes = ouvintesDeFim;
        ouvintesDeFim = [];
        ouvintes.forEach(function (f) { f(); });
      }
    });
  }

  /** Resolve quando todas as gravações em andamento terminarem. */
  function aguardarGravacoes() {
    if (!pendentes) { return Promise.resolve(); }
    return new Promise(function (resolve) { ouvintesDeFim.push(resolve); });
  }

  window.addEventListener("beforeunload", function (evento) {
    if (pendentes) { evento.preventDefault(); evento.returnValue = ""; }
  });

  // ==================================================================
  // API das telas (síncrona: lê e altera a memória)
  // ==================================================================
  function disponivel() { return pronto; }

  function copia(valor) { return valor == null ? valor : JSON.parse(JSON.stringify(valor)); }

  function listar(tabela, filtro) {
    if (!pronto || !linhas[tabela]) { return []; }
    return linhas[tabela]
      .map(function (l) { return linhaParaObjeto(tabela, l); })
      .filter(function (o) { return combina(o, filtro); });
  }

  function buscar(tabela, id) {
    return listar(tabela, { id: id })[0] || null;
  }

  function novoId(tabela) {
    var aleatorio = Math.random().toString(16).slice(2, 8) + Date.now().toString(16).slice(-4);
    return tabela.slice(0, 3) + "-" + aleatorio;
  }

  function agoraTexto() {
    var d = new Date();
    function dois(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()) + " " +
           dois(d.getHours()) + ":" + dois(d.getMinutes()) + ":" + dois(d.getSeconds());
  }

  function inserir(tabela, objeto) {
    if (!pronto || !ESQUEMA[tabela]) { return null; }
    var novo = copia(objeto) || {};
    novo.id = String(novo.id || novoId(tabela));
    if (linhas[tabela].some(function (l) { return l.id === novo.id; })) { return null; }
    if (ESQUEMA[tabela].colunas.indexOf("criadoEm") !== -1 && !novo.criadoEm) { novo.criadoEm = agoraTexto(); }
    var linha = objetoParaLinha(tabela, novo);
    linhas[tabela].push(linha);
    agendarGravacao(tabela);
    return linhaParaObjeto(tabela, linha);
  }

  function atualizar(tabela, id, campos) {
    if (!pronto || !id || !linhas[tabela]) { return null; }
    var indice = -1;
    linhas[tabela].forEach(function (l, i) { if (l.id === id) { indice = i; } });
    if (indice === -1) { return null; }
    var mudancas = copia(campos) || {};
    delete mudancas.id;
    linhas[tabela][indice] = objetoParaLinha(tabela, mudancas, linhas[tabela][indice]);
    agendarGravacao(tabela);
    return linhaParaObjeto(tabela, linhas[tabela][indice]);
  }

  function excluir(tabela, id) {
    if (!pronto || !id || !linhas[tabela]) { return false; }
    var antes = linhas[tabela].length;
    linhas[tabela] = linhas[tabela].filter(function (l) { return l.id !== id; });
    if (linhas[tabela].length === antes) { return false; }
    agendarGravacao(tabela);
    return true;
  }

  function excluirOnde(tabela, filtro) {
    if (!pronto || !linhas[tabela] || !filtro || !Object.keys(filtro).length) { return 0; }
    var antes = linhas[tabela].length;
    linhas[tabela] = linhas[tabela].filter(function (l) { return !combina(linhaParaObjeto(tabela, l), filtro); });
    var excluidos = antes - linhas[tabela].length;
    if (excluidos) { agendarGravacao(tabela); }
    return excluidos;
  }

  // ------------------------------------------------------------------
  // Sessão: o navegador guarda só o id; os dados vêm do usuarios.csv
  // ------------------------------------------------------------------
  /* Sessão lembrada (localStorage) ou só enquanto o navegador estiver
     aberto (sessionStorage), conforme "Manter conectado". */
  function idSessao() {
    try {
      return window.localStorage.getItem(CHAVE_SESSAO) || window.sessionStorage.getItem(CHAVE_SESSAO) || "";
    } catch (erro) { return ""; }
  }

  function entrar(id, lembrar) {
    try {
      window.localStorage.removeItem(CHAVE_SESSAO);
      window.sessionStorage.removeItem(CHAVE_SESSAO);
      (lembrar === false ? window.sessionStorage : window.localStorage).setItem(CHAVE_SESSAO, id);
    } catch (erro) { /* ignora */ }
  }

  function sair() {
    try {
      window.localStorage.removeItem(CHAVE_SESSAO);
      window.sessionStorage.removeItem(CHAVE_SESSAO);
    } catch (erro) { /* ignora */ }
    /* Sair encerra também a demonstração: a próxima página usa a base real. */
    gravarModo("real");
  }

  function usuarioAtual() {
    var id = idSessao();
    if (!id) { return null; }
    if (id === "visitante") { return copia(VISITANTE); }
    var usuario = buscar("usuarios", id);
    if (!usuario && pronto) { sair(); }
    return usuario;
  }

  function porEmail(email) {
    var alvo = String(email || "").trim().toLowerCase();
    if (!alvo) { return null; }
    return listar("usuarios").filter(function (u) { return String(u.email || "").toLowerCase() === alvo; })[0] || null;
  }

  /** Conta pelo documento de entrada (CPF, CNPJ ou RNP), só dígitos. */
  function porDocumento(documento) {
    var alvo = String(documento || "").replace(/\D/g, "");
    if (!alvo) { return null; }
    return listar("usuarios").filter(function (u) {
      return String(u.documentoLogin || "").replace(/\D/g, "") === alvo;
    })[0] || null;
  }

  function salvarUsuario(dados) {
    if (!dados) { return null; }
    if (dados.visitante || dados.tipoConta === "visitante") { entrar("visitante"); return copia(VISITANTE); }
    var id = dados.id || (idSessao() !== "visitante" ? idSessao() : "");
    var existente = id ? buscar("usuarios", id) : porEmail(dados.email);
    var gravado = existente ? atualizar("usuarios", existente.id, dados) : inserir("usuarios", dados);
    if (gravado) { entrar(gravado.id); }
    return gravado;
  }

  // ------------------------------------------------------------------
  // Preferências (Configurações e guia da Miranda)
  // Visitante não tem conta: as preferências valem só nesta aba.
  // ------------------------------------------------------------------
  function preferencias() {
    var usuario = usuarioAtual();
    if (!usuario || usuario.visitante) {
      try { return JSON.parse(window.sessionStorage.getItem("prolink_pref_visitante") || "{}"); }
      catch (erro) { return {}; }
    }
    return listar("configuracoes", { usuarioId: usuario.id })[0] || { usuarioId: usuario.id };
  }

  function salvarPreferencias(campos) {
    var usuario = usuarioAtual();
    if (!usuario || usuario.visitante) {
      var atual = Object.assign(preferencias(), campos);
      try { window.sessionStorage.setItem("prolink_pref_visitante", JSON.stringify(atual)); } catch (erro) { /* ignora */ }
      return atual;
    }
    var linha = listar("configuracoes", { usuarioId: usuario.id })[0];
    return linha
      ? atualizar("configuracoes", linha.id, campos)
      : inserir("configuracoes", Object.assign({ usuarioId: usuario.id }, campos));
  }

  function registrarAuditoria(acao, alvo, autor) {
    var d = new Date();
    function dois(n) { return String(n).padStart(2, "0"); }
    var usuario = usuarioAtual();
    return inserir("auditoria", {
      data: dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() + " " +
            dois(d.getHours()) + ":" + dois(d.getMinutes()),
      acao: acao,
      autor: autor || (usuario && usuario.email) || "sistema",
      alvo: alvo || "",
      origem: "este computador"
    });
  }

  /** Volta todos os CSV ao estado da base inicial (dados/*.csv do projeto). */
  function restaurarDemonstracao() {
    guardarCsv("__versao_base", versaoDo(modoAtual));
    return Promise.all(TABELAS.map(function (tabela) {
      var texto = BASE_INICIAL[tabela] || escreverCsv(tabela, []);
      linhas[tabela] = lerCsv(texto);
      return guardarCsv(tabela, texto);
    }));
  }

  /** Texto atual do CSV de uma tabela, para baixar ou conferir. */
  function csvDaTabela(tabela) {
    return ESQUEMA[tabela] ? escreverCsv(tabela, linhas[tabela] || []) : "";
  }

  // ==================================================================
  // Arquivos de texto do projeto (chaves e manual da Miranda)
  // Aberta com duplo clique, a página não lê arquivos locais com fetch.
  // Primeiro tenta o arquivo de verdade (funciona quando o site está
  // hospedado); se falhar, usa a cópia empacotada pelo build.py em
  // app/core/arquivos-locais.js.
  // ==================================================================
  var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;

  function nomeLocal(url) {
    if (typeof url !== "string" || /^[a-z][a-z0-9+.-]*:/i.test(url) || /^\/\//.test(url)) { return ""; }
    return url.split("?")[0].split("#")[0].replace(/^\.?\//, "");
  }

  function copiaEmpacotada(nome) {
    return new Response(ARQUIVOS_LOCAIS[nome], { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  window.fetch = function (recurso, opcoes) {
    var nome = nomeLocal(recurso);
    var metodo = ((opcoes && opcoes.method) || "GET").toUpperCase();
    if (nome && metodo === "GET" && Object.prototype.hasOwnProperty.call(ARQUIVOS_LOCAIS, nome)) {
      if (!fetchOriginal || window.location.protocol === "file:") {
        return Promise.resolve(copiaEmpacotada(nome));
      }
      return fetchOriginal(recurso, opcoes)
        .then(function (resposta) {
          if (!resposta.ok) { return copiaEmpacotada(nome); }
          /* Servido por HTTP, o arquivo de verdade vale. Se ele estiver
             diferente da cópia empacotada, avisa: aberto por duplo clique
             o ProLink usaria a cópia antiga (foi o que aconteceu com a
             chave do Gemini). */
          try {
            resposta.clone().text().then(function (texto) {
              var atual = String(texto || "").trim();
              var pacote = String(ARQUIVOS_LOCAIS[nome] || "").trim();
              if (atual !== pacote && window.console) {
                window.console.warn('[ProLink] "' + nome + '" mudou depois do último build. ' +
                  'Rode "python3 build.py" para quem abrir por duplo clique usar a versão nova.');
              }
            }).catch(function () { /* sem clone: segue em frente */ });
          } catch (erro) { /* navegador sem clone(): ignora */ }
          return resposta;
        })
        .catch(function () { return copiaEmpacotada(nome); });
    }
    return fetchOriginal(recurso, opcoes);
  };

  // ==================================================================
  // Abertura: lê os CSV (ou copia a base inicial) e carrega a página
  // ==================================================================
  function carregarTabela(tabela) {
    return lerCsvGuardado(tabela).then(function (texto) {
      if (typeof texto === "string") { return texto; }
      /* Primeira abertura (ou tabela nova): copia o CSV inicial do projeto. */
      var inicial = BASE_INICIAL[tabela] || escreverCsv(tabela, []);
      return guardarCsv(tabela, inicial).then(function () { return inicial; });
    }).then(function (texto) {
      linhas[tabela] = lerCsv(texto);
    });
  }

  /* O conteúdo das telas internas fica escondido até os controllers
     trocarem o HTML de exemplo pelos dados da base: assim nenhuma conta
     vê, nem por um instante, dados que não são dela. */
  function mostrarPagina() { document.documentElement.classList.add("base-pronta"); }
  window.setTimeout(mostrarPagina, 5000);

  function avisarSemArmazenamento(erro) {
    mostrarPagina();
    if (window.console) { window.console.error("[Base CSV] Armazenamento do navegador indisponível:", erro); }
    function mostrar() {
      var aviso = document.createElement("div");
      aviso.className = "aviso-banco";
      aviso.setAttribute("role", "alert");
      aviso.innerHTML = "<strong>Não foi possível abrir a base de dados.</strong> O navegador está bloqueando o " +
        "armazenamento do site (janela anônima com bloqueio ou dados do site desativados). " +
        "Abra o ProLink numa janela comum.";
      document.body.insertBefore(aviso, document.body.firstChild);
    }
    if (document.body) { mostrar(); } else { document.addEventListener("DOMContentLoaded", mostrar); }
  }

  function carregarScripts() {
    var fila = scriptsDaPagina.slice();
    (function proximo() {
      if (!fila.length) {
        window.ProLinkBanco.paginaPronta = true;
        mostrarPagina();
        document.dispatchEvent(new CustomEvent("prolink:base-pronta"));
        return;
      }
      var s = document.createElement("script");
      s.src = pastaDosScripts + fila.shift() + (versaoDosScripts ? "?" + versaoDosScripts : "");
      s.onload = proximo;
      s.onerror = proximo;
      document.body.appendChild(s);
    })();
  }

  /* Quando a base inicial do projeto muda (CSV editados + build.py), o que
     estava guardado no navegador foi criado a partir da base antiga: o
     sistema troca pela nova, para o projeto e o navegador não divergirem. */
  /* Base real: quando a base inicial do projeto muda, o que foi criado no
     navegador (contas do cadastro, demandas, candidaturas, mensagens) é
     mantido, e os registros novos do projeto entram junto. Nada se perde. */
  function mesclarComGuardado(tabela) {
    var inicial = BASE_INICIAL[tabela] || escreverCsv(tabela, []);
    return lerCsvGuardado(tabela).then(function (texto) {
      if (typeof texto !== "string" || !texto) { return guardarCsv(tabela, inicial); }
      var guardadas = lerCsv(texto);
      var existentes = {};
      guardadas.forEach(function (r) { if (r.id) { existentes[r.id] = true; } });
      var novas = lerCsv(inicial).filter(function (r) { return !r.id || !existentes[r.id]; });
      if (!novas.length) { return; }
      return guardarCsv(tabela, escreverCsv(tabela, guardadas.concat(novas)));
    });
  }

  /* Geração da base: mudou, a base guardada é trocada inteira (contas e
     dados antigos saem). Dentro da mesma geração, só mescla. */
  var GERACAO_DA_BASE = "apresentacao-2026-09";

  function conferirVersao() {
    var versao = versaoDo(modoAtual);
    return Promise.all([lerCsvGuardado("__versao_base"), lerCsvGuardado("__geracao_base")]).then(function (lidas) {
      var guardada = lidas[0];
      var mesmaGeracao = lidas[1] === GERACAO_DA_BASE;
      if (guardada === versao && mesmaGeracao) { return; }
      if (modoAtual !== MODO_DEMO && guardada && mesmaGeracao) {
        return Promise.all(TABELAS.map(mesclarComGuardado)).then(function () {
          return guardarCsv("__versao_base", versao);
        });
      }
      return Promise.all(TABELAS.map(function (tabela) {
        return guardarCsv(tabela, BASE_INICIAL[tabela] || escreverCsv(tabela, []));
      })).then(function () {
        try {
          window.localStorage.removeItem(CHAVE_SESSAO);
          window.sessionStorage.removeItem(CHAVE_SESSAO);
        } catch (erro) { /* ignora */ }
        return guardarCsv("__geracao_base", GERACAO_DA_BASE).then(function () {
          return guardarCsv("__versao_base", versao);
        });
      });
    });
  }

  /** Troca a base em uso (real ou demonstração) nesta página, sem recarregar.
      Usado ao começar a demonstração, a partir da tela de entrar. */
  function usarBase(modo) {
    modo = modo === MODO_DEMO ? MODO_DEMO : "real";
    gravarModo(modo);
    if (modo === modoAtual) { return Promise.resolve(); }
    return aguardarGravacoes().then(function () {
      modoAtual = modo;
      BASE_INICIAL = baseInicialDo(modo);
      NOME_IDB = modo === MODO_DEMO ? "prolink-demo-csv" : "prolink-base-csv";
      PREFIXO_LOCAL = modo === MODO_DEMO ? "prolink_demo_csv_" : "prolink_csv_";
      deposito = null;
      aberturaDoDeposito = null;
      memoria = {};
      linhas = {};
      pronto = false;
      return conferirVersao();
    }).then(function () {
      return Promise.all(TABELAS.map(carregarTabela));
    }).then(function () { pronto = true; });
  }

  function iniciar() {
    /* Sem conferir o IndexedDB aqui: abrirDeposito() decide sozinho
       entre IndexedDB, localStorage e memória. */
    conferirVersao().then(function () {
      return Promise.all(TABELAS.map(carregarTabela));
    }).then(function () {
      pronto = true;
      carregarScripts();
    }).catch(avisarSemArmazenamento);
  }

  window.ProLinkBanco = {
    disponivel: disponivel,
    listar: listar, buscar: buscar, inserir: inserir, atualizar: atualizar,
    excluir: excluir, excluirOnde: excluirOnde,
    usuarioAtual: usuarioAtual, entrar: entrar, sair: sair, porEmail: porEmail, porDocumento: porDocumento,
    salvarUsuario: salvarUsuario, idSessao: idSessao,
    preferencias: preferencias, salvarPreferencias: salvarPreferencias,
    registrarAuditoria: registrarAuditoria,
    aguardarGravacoes: aguardarGravacoes,
    restaurarDemonstracao: restaurarDemonstracao,
    usarBase: usarBase,
    modo: function () { return modoAtual; },
    emDemonstracao: function () { return modoAtual === MODO_DEMO; },
    csvDaTabela: csvDaTabela,
    tabelas: function () { return TABELAS.slice(); },
    _csv: { ler: lerCsv, escrever: escreverCsv }
  };

  iniciar();
})(window, document);
