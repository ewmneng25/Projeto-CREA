/* ============================================================
   ProLink — demandas, compatibilidade e candidaturas

   Este arquivo liga os dois lados da plataforma. A empresa
   publica uma demanda, o profissional manifesta interesse, e a
   candidatura aparece na lista da empresa — de verdade, não como
   texto fixo.

   ------------------------------------------------------------
   ONDE ISSO FICA GUARDADO
   ------------------------------------------------------------
   Na base CSV, pelo banco.js: dados/demandas.csv,
   dados/profissionais.csv, dados/candidaturas.csv e
   dados/privacidade.csv. Na migração para PHP e MariaDB, cada
   CSV vira uma tabela com as mesmas colunas.

   ------------------------------------------------------------
   A COMPATIBILIDADE É CALCULADA, NÃO ESCRITA
   ------------------------------------------------------------
   O item 12.3 do edital exige critérios de recomendação
   explicáveis. Por isso o percentual sai de uma regra fixa e
   auditável — quatro critérios com pesos declarados — e não de
   um modelo de linguagem. A mesma função que calcula devolve o
   detalhamento, que a tela mostra linha a linha.

   Nenhum critério usa raça, gênero, idade, origem ou condição
   social, conforme o item 12.2.
   ============================================================ */
(function (window) {
  "use strict";

  var Banco = window.ProLinkBanco;

  // ==================================================================
  // PRIVACIDADE
  // O que o titular decidiu mostrar. Fica aqui, e não na tela, porque
  // o cálculo de compatibilidade precisa respeitar a escolha: dado
  // que a pessoa não autorizou não entra em conta nenhuma.
  // ==================================================================
  var PADRAO_PRIVACIDADE = {
    nomeCompleto: true,
    cidade: true,
    telefone: false,
    email: false,
    acervo: true,
    avaliacoes: true,
    curriculo: true,
    /* consentimentos */
    usoDadosCrea: true,
    buscas: true,
    avisos: true
  };

  function usuarioDaSessao() {
    return (Banco && ProLinkModelos.sessao.atual()) || null;
  }

  function linhaDePrivacidade() {
    var usuario = usuarioDaSessao();
    if (!Banco || !usuario || usuario.visitante) { return null; }
    return ProLinkModelos.privacidade.listar({ usuarioId: usuario.id })[0] || null;
  }

  function lerPrivacidade() {
    var linha = linhaDePrivacidade();
    var dados = Object.assign({}, PADRAO_PRIVACIDADE);
    if (linha) {
      Object.keys(PADRAO_PRIVACIDADE).forEach(function (chave) {
        if (typeof linha[chave] === "boolean") { dados[chave] = linha[chave]; }
      });
    }
    return dados;
  }

  function gravarPrivacidade(dados) {
    var usuario = usuarioDaSessao();
    if (!Banco || !usuario || usuario.visitante) { return false; }
    var campos = {};
    Object.keys(PADRAO_PRIVACIDADE).forEach(function (chave) { campos[chave] = !!dados[chave]; });
    var linha = linhaDePrivacidade();
    return Boolean(linha
      ? ProLinkModelos.privacidade.atualizar(linha.id, campos)
      : ProLinkModelos.privacidade.inserir(Object.assign({ usuarioId: usuario.id }, campos)));
  }

  // ==================================================================
  // PESOS DA COMPATIBILIDADE
  // Somam 100. Mudar aqui muda a conta e o texto da tela juntos.
  // ==================================================================
  var PESOS = {
    area: 40,       // tem atribuição na área exigida
    acervo: 30,     // ARTs e CATs confirmadas naquela área
    local: 15,      // atende a cidade da obra
    reputacao: 15   // média das avaliações recebidas
  };
  var ACERVO_MAXIMO = 3;   // a partir de 3 documentos na área, ponto cheio

  // ==================================================================
  // DEMANDAS PUBLICADAS
  // Dados da própria aplicação — não vêm da API do Crea.
  // ==================================================================
  /* Demandas abertas ou em andamento, de dados/demandas.csv. */
  var DEMANDAS = Banco ? ProLinkModelos.demandas.listar().filter(function (d) {
    return d.situacao !== "Encerrada";
  }) : [];

  // ==================================================================
  // PROFISSIONAIS (dados/profissionais.csv)
  // O da sessão é o ligado à conta (coluna profissionalId de usuarios.csv).
  // Contas sem vínculo usam o profissional de demonstração, para as telas
  // de compatibilidade terem o que calcular.
  // ==================================================================
  var TODOS_PROFISSIONAIS = Banco ? ProLinkModelos.profissionais.listar() : [];
  var sessaoAtual = Banco ? ProLinkModelos.sessao.atual() : null;
  /* Cada conta usa só o próprio registro no diretório. Conta sem vínculo
     (empresa, visitante) fica com um perfil vazio: nada de emprestar o
     profissional de outra pessoa para ter o que calcular. */
  var idDaSessao = (sessaoAtual && sessaoAtual.profissionalId) || "";
  var PROFISSIONAL = TODOS_PROFISSIONAIS.filter(function (p) { return idDaSessao && p.id === idDaSessao; })[0] ||
                     { id: "", nome: "", acervo: [], areas: [], acervoPorArea: {}, competencias: [], nota: 0, avaliacoes: 0 };
  var OUTROS = TODOS_PROFISSIONAIS.filter(function (p) { return p.id !== PROFISSIONAL.id; });

  /** Qualquer profissional fictício pelo id (prof-001 é o da sessão). */
  function profissionalPorId(id) {
    if (!id || id === PROFISSIONAL.id) { return PROFISSIONAL; }
    return OUTROS.filter(function (p) { return p.id === id; })[0] || null;
  }

  // ==================================================================
  // CÁLCULO
  // ==================================================================
  /**
   * Compara um profissional com uma demanda.
   * @returns {{total:number, criterios:Array}} — o total e o porquê dele.
   */
  function compatibilidade(prof, demanda) {
    var criterios = [];

    /* Dado que o titular restringiu não entra no cálculo. Não é enfeite:
       se entrasse, a plataforma estaria usando informação que a pessoa
       pediu para não exibir. */
    if (prof.id === PROFISSIONAL.id) {
      var visivel = lerPrivacidade();
      prof = Object.assign({}, prof, {
        acervoPorArea: visivel.acervo ? prof.acervoPorArea : {},
        nota: visivel.avaliacoes ? prof.nota : 0,
        avaliacoes: visivel.avaliacoes ? prof.avaliacoes : 0
      });
    }

    /* 1. Área de atuação: tem atribuição no que a obra exige? */
    var areasEmComum = (demanda.areas || []).filter(function (area) {
      return (prof.areas || []).indexOf(area) !== -1;
    });
    var pontosArea = areasEmComum.length ? PESOS.area : 0;
    criterios.push({
      rotulo: "Área de atuação",
      peso: PESOS.area,
      pontos: pontosArea,
      detalhe: areasEmComum.length
        ? "Você atua em " + areasEmComum.join(" e ") + ", que é o que a demanda exige."
        : "A demanda exige " + (demanda.areas || []).join(" ou ") + ", fora das suas áreas."
    });

    /* 2. Acervo confirmado pelo Crea naquela área — o critério mais duro. */
    var documentos = 0;
    (demanda.areas || []).forEach(function (area) {
      documentos += (prof.acervoPorArea && prof.acervoPorArea[area]) || 0;
    });
    var proporcao = Math.min(documentos, ACERVO_MAXIMO) / ACERVO_MAXIMO;
    var pontosAcervo = Math.round(PESOS.acervo * proporcao);
    criterios.push({
      rotulo: "Acervo confirmado no Crea",
      peso: PESOS.acervo,
      pontos: pontosAcervo,
      detalhe: documentos
        ? documentos + (documentos === 1 ? " documento confirmado" : " documentos confirmados") +
          " na área da demanda (ponto cheio a partir de " + ACERVO_MAXIMO + ")."
        : "Nenhuma ART ou CAT confirmada nessa área."
    });

    /* 3. Localização. */
    var pontosLocal, detalheLocal;
    if (prof.cidade === demanda.cidade) {
      pontosLocal = PESOS.local;
      detalheLocal = "Você atende " + demanda.cidade + ", onde fica a obra.";
    } else if (prof.uf === demanda.uf && prof.atendeEstado) {
      pontosLocal = Math.round(PESOS.local * 0.6);
      detalheLocal = "A obra é em " + demanda.cidade + "; você declarou atender todo o " + demanda.uf + ".";
    } else {
      pontosLocal = 0;
      detalheLocal = "A obra fica em " + demanda.cidade + ", fora da sua região de atendimento.";
    }
    criterios.push({ rotulo: "Localização", peso: PESOS.local,
                     pontos: pontosLocal, detalhe: detalheLocal });

    /* 4. Reputação: só contam avaliações ligadas a contrato registrado. */
    var pontosNota = Math.round(PESOS.reputacao * ((prof.nota || 0) / 5));
    criterios.push({
      rotulo: "Avaliações recebidas",
      peso: PESOS.reputacao,
      pontos: pontosNota,
      detalhe: prof.avaliacoes
        ? "Média " + String(prof.nota).replace(".", ",") + " em " + prof.avaliacoes +
          " avaliações de contratos registrados."
        : "Ainda sem avaliações na plataforma."
    });

    var total = criterios.reduce(function (soma, c) { return soma + c.pontos; }, 0);
    return { total: total, criterios: criterios };
  }

  // ==================================================================
  // ARMAZENAMENTO DAS CANDIDATURAS
  // ==================================================================
  function lerTodas() {
    return Banco ? ProLinkModelos.candidaturas.listar().reverse() : [];
  }

  function montar(prof, demanda, mensagem, acervo, situacao, data, id) {
    var calculo = compatibilidade(prof, demanda);
    return {
      id: id || ("cand-" + Date.now()),
      demandaId: demanda.id,
      demandaTitulo: demanda.titulo,
      empresa: demanda.empresa,
      profissionalId: prof.id,
      profissional: {
        nome: prof.nome, iniciais: prof.iniciais, cor: prof.cor || "",
        titulo: prof.titulo, registro: prof.registro,
        cidade: prof.cidade, uf: prof.uf,
        nota: prof.nota, avaliacoes: prof.avaliacoes,
        verificado: prof.verificado, competencias: prof.competencias || []
      },
      compatibilidade: calculo.total,
      criterios: calculo.criterios,
      mensagem: mensagem || "",
      acervo: acervo || [],
      situacao: situacao || "enviada",
      data: data || new Date().toLocaleDateString("pt-BR")
    };
  }

  function porId(id) {
    for (var i = 0; i < DEMANDAS.length; i += 1) {
      if (DEMANDAS[i].id === id) { return DEMANDAS[i]; }
    }
    return (Banco && id && ProLinkModelos.demandas.buscar(id)) || null;
  }

  function jaCandidatou(demandaId) {
    return lerTodas().some(function (c) {
      return c.demandaId === demandaId && c.profissionalId === PROFISSIONAL.id;
    });
  }

  function candidatar(demandaId, mensagem, acervo) {
    if (jaCandidatou(demandaId)) { return null; }
    var nova = montar(PROFISSIONAL, porId(demandaId), mensagem, acervo, "enviada");
    var gravada = Banco ? ProLinkModelos.candidaturas.inserir(nova) : null;
    if (gravada) {
      ProLinkModelos.auditoria.registrar("Manifestação de interesse", nova.profissional.nome + " → " + nova.demandaTitulo);
    }
    return gravada;
  }

  function minhas() {
    return lerTodas().filter(function (c) { return c.profissionalId === PROFISSIONAL.id; });
  }

  function daDemanda(demandaId) {
    return lerTodas()
      .filter(function (c) { return c.demandaId === demandaId; })
      .sort(function (a, b) { return b.compatibilidade - a.compatibilidade; });
  }

  function atualizarSituacao(id, situacao) {
    if (Banco) { ProLinkModelos.candidaturas.atualizar(id, { situacao: situacao }); }
  }

  function contarPorDemanda() {
    var contagem = {};
    lerTodas().forEach(function (c) {
      contagem[c.demandaId] = (contagem[c.demandaId] || 0) + 1;
    });
    return contagem;
  }

  /** Média de compatibilidade do profissional em todas as demandas abertas. */
  function mediaCompatibilidade() {
    if (!DEMANDAS.length) { return 0; }
    var soma = DEMANDAS.reduce(function (total, d) {
      return total + compatibilidade(PROFISSIONAL, d).total;
    }, 0);
    return Math.round(soma / DEMANDAS.length);
  }

  window.ProLinkDemandas = {
    DEMANDAS: DEMANDAS,
    lerPrivacidade: lerPrivacidade,
    gravarPrivacidade: gravarPrivacidade,
    padraoPrivacidade: PADRAO_PRIVACIDADE,
    mediaCompatibilidade: mediaCompatibilidade,
    PROFISSIONAL: PROFISSIONAL,
    OUTROS: OUTROS,
    profissionalPorId: profissionalPorId,
    PESOS: PESOS,
    porId: porId,
    compatibilidade: compatibilidade,
    candidatar: candidatar,
    jaCandidatou: jaCandidatou,
    minhas: minhas,
    daDemanda: daDemanda,
    todas: lerTodas,
    atualizarSituacao: atualizarSituacao,
    contarPorDemanda: contarPorDemanda
  };
})(window);
