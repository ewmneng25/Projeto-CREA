/* ============================================================
   ProLink — integração com a API oficial do CREA-AM

   Este arquivo concentra TODA a conversa com a API do desafio.
   O resto do sistema não sabe como a consulta é feita: chama
   ProLinkCrea.consultar(...) ou ProLinkCrea.localizar(...) e
   recebe o resultado.

   ------------------------------------------------------------
   DE ONDE VEM O TOKEN
   ------------------------------------------------------------
   O token da equipe fica no arquivo chave_api_crea.txt, na raiz
   do projeto (ao lado dos HTMLs), no mesmo esquema que a Miranda
   usa com chave_api_gemini.txt. Trocar o token é trocar o conteúdo
   desse arquivo, sem tocar em código.

   O arquivo é lido com fetch. Aberto com duplo clique, quem entrega o
   conteúdo é o banco.js, a partir da cópia em app/core/arquivos-locais.js
   (gerada pelo build.py).

   Sem o arquivo, ou com ele vazio, a consulta responde que está
   indisponível e o cadastro segue pelo caminho de dados declarados.

   ------------------------------------------------------------
   ROTAS DA API (documentação oficial do desafio)
   ------------------------------------------------------------
   Base: https://desafio-prolink.crea-am.org.br/api/v1/?p=<recurso>
   Header: Authorization: Bearer <token>

   - Profissional por CPF ..... ?p=profissionais&cpf=
   - Profissional por RNP ..... ?p=profissionais (filtrado por pro_rnp)
   - Empresa por CNPJ ......... ?p=empresas&cnpj=
   - Empresa por registro ..... ?p=empresas (filtrada por emp_registro_crea)
   - ART por RNP + número ..... ?p=arts&rnp=&art_numero=
   - CAT por RNP + número ..... ?p=cats&rnp=&cat_numero=
   - ARTs do profissional ..... ?p=profissionais/{pro_rnp}/arts&page=&limit=
   - CATs do profissional ..... ?p=profissionais/{pro_rnp}/cats&page=&limit=

   A documentação não traz busca direta por RNP. Por isso a consulta
   por RNP pede a lista de profissionais e confere o pro_rnp de cada
   um aqui. O parâmetro rnp também é enviado: se a API passar a
   filtrar por ele, a lista já chega com um item só.

   ------------------------------------------------------------
   O QUE A API NÃO TEM (conferido no MER do desafio)
   ------------------------------------------------------------
   api_profissional e api_empresa não têm e-mail, telefone, cidade
   nem UF. O CPF é "input apenas": serve para buscar e nunca volta
   na resposta. Por isso:

   - o e-mail de contato do perfil é informado pela própria pessoa;
   - o login é feito com o documento do cadastro e a senha.

   ------------------------------------------------------------
   DIVERGÊNCIAS ENTRE O MER E OS EXEMPLOS DA DOCUMENTAÇÃO
   ------------------------------------------------------------
   Quadro técnico: o MER diz qut_tipo, qut_funcao, qut_dt_inicio e
   qut_dt_fim; o exemplo do endpoint mostra eqt_cargo e eqt_dt_inicio.
   CAO: o MER descreve quadro_tecnico, profissionais, arts e
   atividades_tos; o exemplo devolve empresa e cao_arts.
   As funções abaixo aceitam os dois formatos.
   ============================================================ */
(function (window) {
  "use strict";

  // ==================================================================
  // CONFIGURAÇÃO
  // ==================================================================
  var BASE = "https://desafio-prolink.crea-am.org.br/api/v1";
  var ARQUIVO_DA_CHAVE = "chave_api_crea.txt";
  var TOKEN = "";   // preenchido com o conteúdo de chave_api_crea.txt

  /* Teto de páginas seguidas numa mesma listagem. Evita laço infinito
     se a API devolver total_paginas errado. */
  var MAXIMO_DE_PAGINAS = 20;
  var ITENS_POR_PAGINA = 20;

  function configurado() { return Boolean(BASE && TOKEN); }

  // ==================================================================
  // LEITURA DO TOKEN
  // ==================================================================
  var leituraDoToken = null;

  /**
   * Lê chave_api_crea.txt uma vez e guarda em memória.
   * Se a leitura falhar, a próxima consulta tenta de novo.
   * @returns {Promise<string>} o token, ou "" se não deu para ler
   */
  function carregarToken() {
    if (TOKEN) { return Promise.resolve(TOKEN); }
    if (leituraDoToken) { return leituraDoToken; }

    leituraDoToken = fetch(ARQUIVO_DA_CHAVE + "?v=" + Date.now(), { cache: "no-store" })
      .then(function (resposta) {
        if (!resposta.ok) {
          console.error('[Crea] O arquivo "' + ARQUIVO_DA_CHAVE + '" respondeu com status ' +
                        resposta.status + ". Confira se ele está na raiz do projeto.");
          return "";
        }
        return resposta.text();
      })
      .then(function (texto) {
        TOKEN = String(texto || "").trim();
        if (!TOKEN) {
          console.error('[Crea] O arquivo "' + ARQUIVO_DA_CHAVE + '" está vazio ou não foi encontrado.');
        }
        leituraDoToken = null;
        return TOKEN;
      })
      .catch(function (erro) {
        console.error('[Crea] Não foi possível ler "' + ARQUIVO_DA_CHAVE + '". Se a página foi ' +
                      "rode o build.py para atualizar app/core/arquivos-locais.js. " +
                      "Erro original:", erro);
        leituraDoToken = null;
        return "";
      });

    return leituraDoToken;
  }

  /* Começa a ler assim que o script carrega, para a primeira consulta
     não esperar pelo arquivo. */
  carregarToken();

  // ==================================================================
  // UTILITÁRIOS
  // ==================================================================
  /** Só tira a máscara: a validação de verdade é do lado do Crea. */
  function somenteDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  /** Números de ART e CAT têm letras (AM2026...): só tira espaços. */
  function textoLimpo(valor) {
    return String(valor || "").trim().toUpperCase();
  }

  /**
   * Monta a URL no formato da API: BASE/?p=recurso&param=valor
   * @param {string} recurso - ex.: "profissionais/1234567890/arts"
   * @param {object} parametros - só os preenchidos entram na URL
   */
  function montarUrl(recurso, parametros) {
    var url = BASE + "/?p=" + recurso;
    Object.keys(parametros || {}).forEach(function (nome) {
      var valor = parametros[nome];
      if (valor !== undefined && valor !== null && valor !== "") {
        url += "&" + nome + "=" + encodeURIComponent(valor);
      }
    });
    return url;
  }

  /**
   * A API devolve às vezes um array, às vezes um envelope paginado
   * ({ pagina_atual, total_paginas, data: [...] }). Aqui vira sempre array.
   */
  function extrairLista(dados) {
    if (Array.isArray(dados)) { return dados; }
    if (!dados || typeof dados !== "object") { return []; }
    if (Array.isArray(dados.data)) { return dados.data; }
    if (Array.isArray(dados.dados)) { return dados.dados; }
    if (Array.isArray(dados.itens)) { return dados.itens; }
    return [];
  }

  var MENSAGENS = {
    "demonstracao": "Consulta ao Crea indisponível: o token não foi encontrado. Confira se o " +
                    "arquivo chave_api_crea.txt está na pasta do ProLink, ao lado do index.html.",
    "nao-encontrado": "O Crea não encontrou registro com esses dados. Confira os números digitados.",
    "sem-autorizacao": "O token de acesso foi recusado pela API do desafio. Confira o conteúdo " +
                       "de chave_api_crea.txt."
  };

  /**
   * Faz um GET na API com o token. Sempre resolve, nunca rejeita.
   * @returns {Promise<{modo: string, dados?: any, mensagem?: string}>}
   */
  function requisitar(recurso, parametros) {
    return carregarToken().then(function (token) {
      if (!token) {
        return { modo: "demonstracao", mensagem: MENSAGENS.demonstracao };
      }

      return fetch(montarUrl(recurso, parametros), {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json"
        }
      })
        .then(function (resposta) {
          if (resposta.status === 404) {
            return { modo: "nao-encontrado", mensagem: MENSAGENS["nao-encontrado"] };
          }
          if (resposta.status === 401 || resposta.status === 403) {
            return { modo: "sem-autorizacao", mensagem: MENSAGENS["sem-autorizacao"] };
          }
          if (!resposta.ok) {
            return {
              modo: "erro",
              mensagem: "A API do Crea respondeu com erro " + resposta.status + "."
            };
          }
          return resposta.json()
            .then(function (dados) { return { modo: "oficial", dados: dados }; })
            .catch(function () {
              return { modo: "erro", mensagem: "A API do Crea devolveu uma resposta que não é JSON." };
            });
        })
        .catch(function (erro) {
          /* Falha de rede e bloqueio de CORS chegam aqui do mesmo jeito. */
          return {
            modo: "erro",
            mensagem: "Não foi possível falar com a API do Crea agora: " +
                      (erro.message || String(erro))
          };
        });
    });
  }

  /**
   * Busca uma listagem e segue as páginas enquanto houver
   * (envelope com total_paginas). Resposta em array vem numa chamada só.
   * @returns {Promise<{modo: string, itens: Array, mensagem?: string}>}
   */
  function requisitarTodasAsPaginas(recurso, parametros) {
    var itens = [];

    function pagina(numero) {
      var comPagina = Object.assign({}, parametros, { page: numero, limit: ITENS_POR_PAGINA });

      return requisitar(recurso, comPagina).then(function (resultado) {
        if (resultado.modo !== "oficial") {
          /* Erro na primeira página é erro; nas seguintes, fica o que já veio. */
          if (numero === 1) { resultado.itens = []; return resultado; }
          return { modo: "oficial", itens: itens };
        }

        itens = itens.concat(extrairLista(resultado.dados));

        var total = resultado.dados && Number(resultado.dados.total_paginas);
        if (total && numero < total && numero < MAXIMO_DE_PAGINAS) {
          return pagina(numero + 1);
        }
        return { modo: "oficial", itens: itens };
      });
    }

    return pagina(1);
  }

  /** Dicionário de pro_status. Só "A" está na documentação. */
  function traduzirSituacao(status) {
    var mapa = { "A": "Ativo" };
    return mapa[status] || status || "";
  }

  /** "2026-08-01 14:00:00" vira "01/08/2026". */
  function formatarData(valor) {
    var partes = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return partes ? partes[3] + "/" + partes[2] + "/" + partes[1] : String(valor || "");
  }

  /**
   * Traduz a resposta da API para o formato que as telas usam.
   * Os nomes da API (pro_, emp_) vêm primeiro; os antigos ficam de reserva.
   */
  function normalizar(tipo, dados) {
    dados = dados || {};

    if (tipo === "empresa") {
      return {
        tipo: "empresa",
        nome: dados.emp_razao_social || dados.razao_social || dados.nome || "",
        fantasia: dados.emp_nome_fantasia || "",
        cnpj: dados.emp_cnpj || "",
        /* A API não tem RNE. O número que identifica a empresa no Crea é
           o emp_registro_crea, que aparece como "Registro no Crea". */
        rne: dados.rne || dados.registro_nacional || "",
        registro: dados.emp_registro_crea || dados.registro || dados.numero_registro || "",
        dataRegistro: formatarData(dados.emp_dt_registro || dados.data_registro),
        situacao: dados.situacao || "",
        responsavel: dados.responsavel_tecnico || "",
        cidade: dados.cidade || "",
        uf: dados.uf || "AM"
      };
    }

    var modalidades = Array.isArray(dados.modalidades) ? dados.modalidades : [];
    var nomesModalidades = modalidades.map(function (m) { return m.mod_nome; }).filter(Boolean);

    return {
      tipo: "profissional",
      nome: dados.pro_nome || dados.nome || "",
      rnp: dados.pro_rnp || dados.rnp || "",
      registro: dados.pro_registro_crea || dados.registro || dados.numero_registro || "",
      titulo: nomesModalidades[0] || dados.titulo || dados.titulo_profissional || "",
      situacao: traduzirSituacao(dados.pro_status || dados.situacao),
      anuidade: dados.anuidade || "",
      dataRegistro: dados.data_registro || "",
      atribuicoes: nomesModalidades.length ? nomesModalidades : (dados.atribuicoes || []),
      modalidades: modalidades,
      cidade: dados.cidade || "",
      uf: dados.uf || "AM"
    };
  }

  /** ART da API no formato da lista de acervo do cadastro. */
  function normalizarArt(art) {
    var atividades = Array.isArray(art.atividades) ? art.atividades : [];
    var primeira = atividades[0] || {};
    return {
      numero: art.art_numero || "",
      atividade: primeira.aat_descricao || primeira.tos_descricao || art.art_tipo || "",
      obra: [art.art_objeto, art.art_local_municipio].filter(Boolean).join(", "),
      data: "",
      situacao: art.art_situacao || "",
      contratante: art.art_contratante_nome || "",
      tos: atividades.map(function (a) { return a.tos_codigo; }).filter(Boolean),
      original: art
    };
  }

  /** CAT da API no formato da lista de acervo do cadastro. */
  function normalizarCat(cat) {
    return {
      numero: cat.cat_numero || "",
      atividade: cat.cat_finalidade || cat.cat_tipo || "",
      obra: "",
      data: formatarData(cat.cat_dt_emissao),
      validade: formatarData(cat.cat_dt_validade),
      original: cat
    };
  }

  /**
   * Da lista devolvida pela API, fica só o item que bate com o valor
   * procurado. Se a API ignorar o filtro e mandar a lista inteira, esta
   * conferência impede que o primeiro da lista seja aceito por engano.
   */
  function escolherItem(lista, campo, procurado, comparar) {
    var achados = lista.filter(function (item) {
      return item && item[campo] !== undefined && comparar(item[campo]) === procurado;
    });
    if (achados.length) { return achados[0]; }

    /* Resposta sem o campo de conferência (ex.: profissional não traz CPF):
       só vale se a API devolveu exatamente um registro. */
    var semCampo = lista.every(function (item) { return item && item[campo] === undefined; });
    if (semCampo && lista.length === 1) { return lista[0]; }
    return null;
  }

  /**
   * Consulta a API oficial.
   * @param {"profissional"|"empresa"|"profissional_rnp"|"empresa_rne"|"art"|"cat"} tipo
   * @param {object} valores - cpf, cnpj, rnp, rne e/ou numero
   * @returns {Promise<{ok: boolean, modo: string, dados?: object, mensagem?: string}>}
   *
   * Sempre resolve — nunca rejeita. Quem chama decide o que fazer
   * com ok: false, e o cadastro nunca trava por causa da consulta.
   */
  function consultar(tipo, valores) {
    valores = valores || {};
    var pedido;

    switch (tipo) {
      case "profissional":
        var cpf = somenteDigitos(valores.cpf);
        pedido = requisitar("profissionais", { cpf: cpf }).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(extrairLista(r.dados), "pro_cpf", cpf, somenteDigitos) : null;
          r.normalizado = "profissional";
          return r;
        });
        break;

      case "empresa":
        var cnpj = somenteDigitos(valores.cnpj);
        pedido = requisitar("empresas", { cnpj: cnpj }).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(extrairLista(r.dados), "emp_cnpj", cnpj, somenteDigitos) : null;
          r.normalizado = "empresa";
          return r;
        });
        break;

      case "profissional_rnp":
        var rnp = somenteDigitos(valores.rnp);
        pedido = requisitarTodasAsPaginas("profissionais", { rnp: rnp }).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(r.itens, "pro_rnp", rnp, somenteDigitos) : null;
          r.normalizado = "profissional";
          return r;
        });
        break;

      case "empresa_rne":
        var rne = somenteDigitos(valores.rne);
        pedido = requisitarTodasAsPaginas("empresas", {}).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(r.itens, "emp_registro_crea", rne, somenteDigitos) : null;
          r.normalizado = "empresa";
          return r;
        });
        break;

      case "art":
        var numeroArt = textoLimpo(valores.numero);
        pedido = requisitar("arts", {
          rnp: somenteDigitos(valores.rnp), art_numero: numeroArt
        }).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(extrairLista(r.dados), "art_numero", numeroArt, textoLimpo) : null;
          r.normalizado = "art";
          return r;
        });
        break;

      case "cat":
        var numeroCat = textoLimpo(valores.numero);
        pedido = requisitar("cats", {
          rnp: somenteDigitos(valores.rnp), cat_numero: numeroCat
        }).then(function (r) {
          r.item = r.modo === "oficial"
            ? escolherItem(extrairLista(r.dados), "cat_numero", numeroCat, textoLimpo) : null;
          r.normalizado = "cat";
          return r;
        });
        break;

      default:
        return Promise.resolve({
          ok: false,
          modo: "erro",
          mensagem: "Tipo de consulta não previsto: " + tipo + "."
        });
    }

    return pedido.then(function (r) {
      if (r.modo !== "oficial") {
        return { ok: false, modo: r.modo, mensagem: r.mensagem };
      }
      if (!r.item) {
        /* A API respondeu 200 com lista vazia: registro não existe. */
        return { ok: false, modo: "nao-encontrado", mensagem: MENSAGENS["nao-encontrado"] };
      }

      var dados;
      if (r.normalizado === "art") { dados = normalizarArt(r.item); }
      else if (r.normalizado === "cat") { dados = normalizarCat(r.item); }
      else { dados = normalizar(r.normalizado, r.item); }

      /* O CPF é "input apenas" no MER: a resposta não o traz. Quando a
         busca foi por CPF, ele fica guardado para a conferência do
         documento anexado. */
      if (tipo === "profissional") { dados.cpf = somenteDigitos(valores.cpf); }

      return { ok: true, modo: "oficial", dados: dados };
    });
  }

  /**
   * Localiza o registro a partir do documento.
   *
   * tipoConta vem da primeira tela do cadastro e limita as chaves:
   *   "pf" (pessoa física)   -> CPF (11 dígitos) ou RNP do profissional
   *   "pj" (pessoa jurídica) -> CNPJ (14 dígitos) ou RNP da empresa
   *                             (o número de registro da empresa no Crea)
   * Sem tipoConta, vale o comportamento antigo: CPF e CNPJ pelo tamanho,
   * e o número de registro tentado como profissional e depois como empresa.
   * Quem decide se existe é sempre o Crea.
   *
   * @returns {Promise<{ok, modo, dados?, chave?, mensagem?}>}
   */
  function localizar(valor, tipoConta) {
    var digitos = somenteDigitos(valor);
    var pf = tipoConta === "pf";
    var pj = tipoConta === "pj";

    if (digitos.length === 11 && !pj) {
      return consultar("profissional", { cpf: digitos })
        .then(function (r) { r.chave = "cpf"; return r; });
    }
    if (digitos.length === 14 && !pf) {
      return consultar("empresa", { cnpj: digitos })
        .then(function (r) { r.chave = "cnpj"; return r; });
    }
    /* Cadastro com tipo de conta: só CPF (pessoa física) ou CNPJ
       (pessoa jurídica). O número de registro não é aceito aqui. */
    if (pf || pj) {
      return Promise.resolve({ ok: false, modo: "invalido",
        mensagem: pf ? "Informe o CPF (11 dígitos)." : "Informe o CNPJ (14 dígitos)." });
    }
    if (pf && digitos.length === 14) {
      return Promise.resolve({ ok: false, modo: "invalido",
        mensagem: "CNPJ é documento de pessoa jurídica. Informe o CPF ou o RNP." });
    }
    if (pj && digitos.length === 11) {
      return Promise.resolve({ ok: false, modo: "invalido",
        mensagem: "CPF é documento de pessoa física. Informe o CNPJ ou o RNP da empresa." });
    }
    if (digitos.length < 4) {
      return Promise.resolve({
        ok: false, modo: "invalido",
        mensagem: pf ? "Informe o CPF ou o RNP."
                : pj ? "Informe o CNPJ ou o RNP da empresa."
                : "Informe um CPF, um CNPJ, um RNP ou um RNE."
      });
    }

    /* Pessoa jurídica: o número de registro é o da empresa. */
    if (pj) {
      return consultar("empresa_rne", { rne: digitos })
        .then(function (r) { r.chave = "rnp"; return r; });
    }

    return consultar("profissional_rnp", { rnp: digitos }).then(function (resultado) {
      if (resultado.ok) { resultado.chave = "rnp"; return resultado; }
      /* Pessoa física não procura empresa. */
      if (pf) { return resultado; }
      /* Token ausente ou recusado: a segunda chamada daria o mesmo resultado. */
      if (resultado.modo !== "nao-encontrado") { return resultado; }
      return consultar("empresa_rne", { rne: digitos }).then(function (segundo) {
        segundo.chave = "rne";
        return segundo;
      });
    });
  }

  // ==================================================================
  // ACERVO TÉCNICO (ARTs e CATs)
  // ==================================================================
  /**
   * Importa o acervo em vez de pedir os números ao profissional.
   * Usa as listagens oficiais por RNP. Sempre resolve: se não vier nada,
   * a conta é criada sem acervo e o profissional pode vincular depois.
   */
  function listarAcervo(registro) {
    var rnp = somenteDigitos((registro && (registro.rnp || registro.rne)) || "");

    if (!rnp) {
      return Promise.resolve({
        ok: false, modo: "sem-rnp",
        mensagem: "O registro não trouxe RNP nem RNE, que é a chave do acervo."
      });
    }

    return Promise.all([
      requisitarTodasAsPaginas("profissionais/" + encodeURIComponent(rnp) + "/arts", {}),
      requisitarTodasAsPaginas("profissionais/" + encodeURIComponent(rnp) + "/cats", {})
    ]).then(function (respostas) {
      var arts = respostas[0];
      var cats = respostas[1];

      if (arts.modo === "demonstracao") {
        return {
          ok: false, modo: "demonstracao",
          mensagem: "Importação de acervo indisponível: o token do Crea não foi encontrado. " +
                    "Os números podem ser vinculados manualmente no portfólio."
        };
      }

      var listaArts = arts.modo === "oficial" ? arts.itens.map(normalizarArt) : [];
      var listaCats = cats.modo === "oficial" ? cats.itens.map(normalizarCat) : [];

      if (!listaArts.length && !listaCats.length) {
        var falhou = arts.modo !== "oficial" && arts.modo !== "nao-encontrado";
        return {
          ok: false,
          modo: falhou ? arts.modo : "vazio",
          mensagem: falhou
            ? (arts.mensagem || "Não foi possível buscar o acervo no Crea agora.")
            : "O Crea não tem ARTs nem CATs registradas para este RNP."
        };
      }

      return { ok: true, modo: "oficial", arts: listaArts, cats: listaCats };
    });
  }

  // ==================================================================
  // EMPRESA: QUADRO TÉCNICO E ACERVO OPERACIONAL (CAO)
  // ==================================================================
  /** Um vínculo do quadro técnico, nos dois formatos (MER e exemplo). */
  function normalizarVinculo(item) {
    var fim = formatarData(item.qut_dt_fim || item.eqt_dt_fim);
    return {
      nome: item.pro_nome || "",
      rnp: item.pro_rnp || "",
      registro: item.pro_registro_crea || "",
      funcao: item.eqt_cargo || item.qut_funcao || item.qut_tipo || "",
      tipo: item.qut_tipo || "",
      inicio: formatarData(item.eqt_dt_inicio || item.qut_dt_inicio),
      fim: fim,
      ativo: !fim
    };
  }

  /**
   * Profissionais vinculados à empresa, pelo registro no Crea (ex.: AM987654).
   * O registro tem letras, então vai como veio, não só os dígitos.
   */
  function quadroTecnico(registroCrea) {
    var registro = String(registroCrea || "").trim();
    if (!registro) {
      return Promise.resolve({ ok: false, modo: "sem-registro", itens: [],
        mensagem: "A empresa não trouxe registro no Crea." });
    }
    return requisitar("empresas/" + encodeURIComponent(registro) + "/quadro-tecnico", {})
      .then(function (r) {
        if (r.modo !== "oficial") {
          return { ok: false, modo: r.modo, itens: [], mensagem: r.mensagem };
        }
        return { ok: true, modo: "oficial", itens: extrairLista(r.dados).map(normalizarVinculo) };
      });
  }

  /**
   * Certidão de Acervo Operacional: as ARTs ligadas à empresa, com o
   * profissional de cada uma. Aceita cao_arts (exemplo) ou arts (MER).
   */
  function acervoOperacional(registroCrea) {
    var registro = String(registroCrea || "").trim();
    if (!registro) {
      return Promise.resolve({ ok: false, modo: "sem-registro", arts: [],
        mensagem: "A empresa não trouxe registro no Crea." });
    }
    return requisitar("empresas/" + encodeURIComponent(registro) + "/cao", {})
      .then(function (r) {
        if (r.modo !== "oficial") {
          return { ok: false, modo: r.modo, arts: [], mensagem: r.mensagem };
        }
        var dados = r.dados || {};
        var lista = Array.isArray(dados.cao_arts) ? dados.cao_arts
                  : (Array.isArray(dados.arts) ? dados.arts : []);
        var arts = lista.map(function (art) {
          var normalizada = normalizarArt(art);
          normalizada.profissional = (art.profissional && art.profissional.pro_nome) || "";
          return normalizada;
        });
        return { ok: true, modo: "oficial", arts: arts };
      });
  }

  window.ProLinkCrea = {
    consultar: consultar,
    localizar: localizar,
    listarAcervo: listarAcervo,
    quadroTecnico: quadroTecnico,
    acervoOperacional: acervoOperacional,
    configurado: configurado,
    somenteDigitos: somenteDigitos
  };
})(window);
