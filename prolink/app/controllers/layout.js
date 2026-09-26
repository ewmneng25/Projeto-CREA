/* ============================================================
   ProLink — controller: preferências de exibição, busca da barra superior,
   notificações clicáveis e entrada social
   ============================================================ */
(function (window, document) {
  "use strict";
  var U = window.__ProLinkInterno;
  if (!U) { return; }
  var normalizar = U.normalizar, avisar = U.avisar, dialogo = U.dialogo, escapar = U.escapar,
      ladoAtual = U.ladoAtual, paginaAtual = U.paginaAtual, parametro = U.parametro, sessao = U.sessao;

  // ==================================================================
  // 2. PREFERÊNCIAS DE EXIBIÇÃO
  // ==================================================================
  (function aplicarPreferencias() {
    var preferencias = window.ProLinkBanco ? ProLinkModelos.sessao.preferencias() : {};
    document.documentElement.classList.toggle("pl-texto-maior", !!preferencias.textoMaior);
    document.documentElement.classList.toggle("pl-sem-animacao", !!preferencias.reduzirMovimento);
  })();

  // ==================================================================
  // 3. BUSCA DA BARRA SUPERIOR
  // ==================================================================
  (function ligarBuscaGlobal() {
    var campo = document.getElementById("busca");
    if (!campo || !campo.closest(".busca-global")) { return; }

    var destino = { profissional: "oportunidades.html", empresa: "empresa-profissionais.html",
                    admin: "admin-usuarios.html" }[ladoAtual()];
    var dicas = { profissional: "Buscar oportunidades por título, empresa ou cidade",
                  empresa: "Buscar profissionais por nome, especialidade ou cidade",
                  admin: "Buscar usuários por nome ou e-mail" };
    campo.placeholder = dicas[ladoAtual()];

    campo.addEventListener("keydown", function (evento) {
      if (evento.key !== "Enter") { return; }
      evento.preventDefault();
      var termo = campo.value.trim();
      window.location.href = destino + (termo ? "?q=" + encodeURIComponent(termo) : "");
    });
  })();

  // ==================================================================
  // 4. NOTIFICAÇÕES QUE LEVAM PARA A TELA CERTA
  // ==================================================================
  (function ligarNotificacoes() {
    var painel = document.getElementById("painel-notificacoes");
    if (!painel) { return; }
    var lado = ladoAtual();

    var destinos = {
      profissional: { candidatura: "candidaturas.html", registro: "portfolio.html",
                      mensagem: "mensagens.html", prazo: "oportunidades.html", avaliacao: "avaliacoes.html" },
      empresa: { candidatura: "empresa-candidaturas.html", registro: "empresa-perfil.html",
                 mensagem: "empresa-mensagens.html", prazo: "empresa-demandas.html",
                 avaliacao: "empresa-avaliacoes.html" },
      admin: { candidatura: "admin-usuarios.html", registro: "admin-usuarios.html",
               mensagem: "admin-denuncias.html", prazo: "admin-denuncias.html",
               avaliacao: "admin-auditoria.html" }
    }[lado];

    function destinoDe(titulo) {
      var t = normalizar(titulo);
      if (t.indexOf("candidatura") !== -1) { return destinos.candidatura; }
      if (t.indexOf("registro") !== -1) { return destinos.registro; }
      if (t.indexOf("mensagem") !== -1) { return destinos.mensagem; }
      if (t.indexOf("prazo") !== -1) { return destinos.prazo; }
      if (t.indexOf("avaliacao") !== -1) { return destinos.avaliacao; }
      return "";
    }

    function ligar() {
      painel.querySelectorAll(".lista-notificacoes li").forEach(function (item) {
        if (item.dataset.ligado) { return; }
        var titulo = item.querySelector("strong");
        var href = destinoDe(titulo ? titulo.textContent : "");
        if (!href) { return; }
        item.dataset.ligado = "1";
        item.classList.add("notificacao-link");
        /* Um link de verdade dentro do item: o leitor de tela anuncia
           "link" e o teclado abre com Enter, sem papel falso no <li>. */
        var link = document.createElement("a");
        link.className = "notificacao-alvo";
        link.href = href;
        while (item.firstChild) { link.appendChild(item.firstChild); }
        item.appendChild(link);
      });
      var ajustar = painel.querySelector(".notificacoes-rodape a");
      if (ajustar) {
        ajustar.href = { profissional: "configuracoes.html", empresa: "empresa-configuracoes.html",
                         admin: "admin-configuracoes.html" }[lado] + "#notificacoes";
      }
    }

    ligar();
    new MutationObserver(ligar).observe(painel, { childList: true, subtree: true });
  })();

  // ==================================================================
  // 5. ENTRAR COM GOOGLE OU LINKEDIN
  // ==================================================================
  document.querySelectorAll("[data-login-social]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var provedor = botao.getAttribute("data-login-social");
      dialogo({
        titulo: "Entrar com " + provedor,
        texto: "Entrar com " + escapar(provedor) + " depende de um servidor que receba a " +
               "autorização do provedor (OAuth) e crie a sessão com segurança. Este protótipo " +
               "roda só no navegador, então essa opção ainda não está disponível.",
        corpo: '<p class="dica">Para conhecer o sistema sem conta, use o botão ' +
               "<strong>Entrar como visitante</strong> na tela de entrada.</p>",
        cancelar: false,
        confirmar: "Entendi",
        aoConfirmar: function () {
          var campo = document.getElementById("identificacao");
          if (campo) { window.setTimeout(function () { campo.focus(); campo.select(); }, 50); }
        }
      });
    });
  });


})(window, document);
