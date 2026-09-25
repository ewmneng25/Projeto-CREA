/* ============================================================
   ProLink — models: repositórios da base CSV

   Os controllers não falam com a camada de persistência
   (app/core/banco.js): pedem os dados a um repositório por tabela.
   Cada repositório tem as operações básicas e, quando faz sentido,
   consultas próprias da entidade.

     ProLinkModelos.demandas.listar({ situacao: "Aberta" })
     ProLinkModelos.usuarios.porDocumento("12345678901")
     ProLinkModelos.sessao.atual()
     ProLinkModelos.auditoria.registrar("Cadastro", "Maria Souza")

   Na migração para PHP, cada repositório vira uma classe Repository
   com as mesmas operações, e o banco.js dá lugar ao acesso ao MariaDB.
   ============================================================ */
(function (window) {
  "use strict";

  var Banco = window.ProLinkBanco;
  if (!Banco) { return; }

  function repositorio(tabela, extras) {
    var base = {
      tabela: tabela,
      listar: function (filtro) { return Banco.listar(tabela, filtro); },
      buscar: function (id) { return Banco.buscar(tabela, id); },
      inserir: function (dados) { return Banco.inserir(tabela, dados); },
      atualizar: function (id, campos) { return Banco.atualizar(tabela, id, campos); },
      excluir: function (id) { return Banco.excluir(tabela, id); },
      excluirOnde: function (filtro) { return Banco.excluirOnde(tabela, filtro); }
    };
    return Object.assign(base, extras || {});
  }

  var Modelos = {
    /* Infraestrutura da base, sem tabela específica. */
    base: {
      disponivel: Banco.disponivel,
      aguardarGravacoes: Banco.aguardarGravacoes,
      restaurar: Banco.restaurarDemonstracao,
      csvDaTabela: Banco.csvDaTabela,
      tabelas: Banco.tabelas,
      usarBase: Banco.usarBase,
      emDemonstracao: Banco.emDemonstracao
    },
    /* Quem está usando o sistema agora. */
    sessao: {
      atual: Banco.usuarioAtual,
      entrar: Banco.entrar,
      sair: Banco.sair,
      id: Banco.idSessao,
      salvarUsuario: Banco.salvarUsuario,
      preferencias: Banco.preferencias,
      salvarPreferencias: Banco.salvarPreferencias
    },
    usuarios: repositorio("usuarios", { porEmail: Banco.porEmail, porDocumento: Banco.porDocumento }),
    auditoria: repositorio("auditoria", { registrar: Banco.registrarAuditoria })
  };

  Banco.tabelas().forEach(function (tabela) {
    if (!Modelos[tabela]) { Modelos[tabela] = repositorio(tabela); }
  });

  window.ProLinkModelos = Modelos;
})(window);
