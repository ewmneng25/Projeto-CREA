/* ============================================================
   ProLink — view: componentes de interface compartilhados

   Uma auditoria clicou em todos os botões de todas as telas e
   anotou os que não faziam nada. Este arquivo liga cada um deles
   a um comportamento real. O que precisa durar vai para a base
   CSV, pelo banco.js.

   O que está aqui, em ordem:
    1. Utilitários: aviso flutuante, caixa de diálogo, download
    2. Preferências de exibição (vindas de Configurações)
    3. Busca da barra superior
    4. Notificações que levam para a tela certa
    5. Entrar com Google/LinkedIn (explica o limite do protótipo)
    6. Filtros em abas que filtram de verdade
    7. Buscas com filtros laterais: aplicar, limpar, salvar, alertar
    8. Painel administrativo: usuários, auditoria e denúncias
    9. Avaliações: solicitar e ver as realizadas
   10. Portfólio: adicionar projeto, currículo e certificados
   11. Perfil da empresa: editar

   Tudo é ligado só quando o elemento existe na página, então o
   mesmo arquivo serve todas as telas.
   ============================================================ */
(function (window, document) {
  "use strict";

  // ==================================================================
  // 1. UTILITÁRIOS
  // ==================================================================

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** Minúsculas, sem acento, sem números soltos e sem espaços sobrando. */
  function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  function sessao() { return (window.ProLinkBanco && ProLinkModelos.sessao.atual()) || {}; }

  /** profissional | empresa | admin — contratante usa as telas da empresa. */
  function ladoAtual() {
    var tipo = sessao().tipoConta;
    if (tipo === "admin") { return "admin"; }
    if (tipo === "empresa" || tipo === "contratante") { return "empresa"; }
    var pagina = paginaAtual();
    if (pagina.indexOf("admin-") === 0) { return "admin"; }
    if (pagina.indexOf("empresa-") === 0) { return "empresa"; }
    return "profissional";
  }

  function paginaAtual() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function parametro(nome) {
    var busca = window.location.search.replace(/^\?/, "").split("&");
    for (var i = 0; i < busca.length; i += 1) {
      var par = busca[i].split("=");
      if (decodeURIComponent(par[0]) === nome) {
        return decodeURIComponent((par[1] || "").replace(/\+/g, " "));
      }
    }
    return "";
  }

  function agora() {
    var d = new Date();
    function dois(n) { return String(n).padStart(2, "0"); }
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() +
           " " + dois(d.getHours()) + ":" + dois(d.getMinutes());
  }

  /** Aviso curto no canto da tela, que some sozinho. */
  function avisar(texto, tipo) {
    var antigo = document.querySelector(".aviso-flutuante");
    if (antigo) { antigo.remove(); }
    var aviso = document.createElement("div");
    aviso.className = "aviso-flutuante" + (tipo ? " aviso-" + tipo : "");
    aviso.setAttribute("role", "status");
    aviso.innerHTML = texto;
    document.body.appendChild(aviso);
    window.setTimeout(function () { aviso.classList.add("saindo"); }, 3800);
    window.setTimeout(function () { aviso.remove(); }, 4300);
  }

  /**
   * Caixa de diálogo no mesmo estilo da denúncia.
   * @param {{titulo, texto?, corpo?, confirmar?, cancelar?, aoConfirmar?}} op
   *   aoConfirmar(caixa) devolve false para manter a caixa aberta.
   */
  function dialogo(op) {
    var fundo = document.createElement("div");
    fundo.className = "denuncia-fundo";
    fundo.innerHTML =
      '<div class="denuncia-caixa" role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo">' +
        '<h2 id="dialogo-titulo">' + escapar(op.titulo) + "</h2>" +
        (op.texto ? '<p class="dica" style="margin:6px 0 18px">' + op.texto + "</p>" : "") +
        '<div class="dialogo-corpo">' + (op.corpo || "") + "</div>" +
        '<p class="erro-inline" data-dialogo="erro" hidden></p>' +
        '<div class="acoes-formulario" style="margin-top:18px">' +
          (op.cancelar === false ? "<span></span>"
            : '<button class="btn btn-secundario" type="button" data-dialogo="cancelar">' +
              escapar(op.cancelar || "Cancelar") + "</button>") +
          '<button class="btn" type="button" data-dialogo="confirmar">' +
            escapar(op.confirmar || "Confirmar") + "</button>" +
        "</div>" +
      "</div>";

    document.body.appendChild(fundo);
    var caixa = fundo.querySelector(".denuncia-caixa");
    var anterior = document.activeElement;

    function fechar() {
      fundo.remove();
      document.removeEventListener("keydown", teclar);
      if (anterior && anterior.focus) { anterior.focus(); }
    }
    function teclar(evento) { if (evento.key === "Escape") { fechar(); } }

    caixa.erro = function (mensagem) {
      var erro = caixa.querySelector('[data-dialogo="erro"]');
      erro.textContent = mensagem;
      erro.hidden = !mensagem;
    };
    caixa.fechar = fechar;

    var cancelar = caixa.querySelector('[data-dialogo="cancelar"]');
    if (cancelar) { cancelar.addEventListener("click", fechar); }
    caixa.querySelector('[data-dialogo="confirmar"]').addEventListener("click", function () {
      if (op.aoConfirmar && op.aoConfirmar(caixa) === false) { return; }
      fechar();
    });
    fundo.addEventListener("click", function (evento) { if (evento.target === fundo) { fechar(); } });
    document.addEventListener("keydown", teclar);

    var primeiro = caixa.querySelector("input, select, textarea, button");
    if (primeiro) { primeiro.focus(); }
    return caixa;
  }

  /** Gera um arquivo e dispara o download no navegador. */
  function baixar(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** CSV com separador ; (abre direto no Excel em português). */
  function tabelaParaCsv(tabela, linhas) {
    function celula(texto) {
      var limpo = String(texto).replace(/\s+/g, " ").trim().replace(/"/g, '""');
      return '"' + limpo + '"';
    }
    var cabecalho = Array.prototype.map.call(tabela.querySelectorAll("thead th"), function (th) {
      return celula(th.textContent);
    }).filter(function (_, i, lista) { return !/^"A[cç][aã]o"$/.test(lista[i]); });
    var colunas = cabecalho.length;
    var corpo = linhas.map(function (tr) {
      return Array.prototype.slice.call(tr.children, 0, colunas).map(function (td) {
        return celula(td.textContent);
      }).join(";");
    });
    return "\ufeff" + [cabecalho.join(";")].concat(corpo).join("\r\n");
  }

  function botaoPorTexto(texto, raiz) {
    var alvo = normalizar(texto);
    return Array.prototype.filter.call((raiz || document).querySelectorAll("button, a.btn"), function (b) {
      return normalizar(b.textContent) === alvo;
    });
  }

  /** Tira os ouvintes antigos de um elemento trocando-o por uma cópia. */
  function limparOuvintes(elemento) {
    var copia = elemento.cloneNode(true);
    elemento.parentNode.replaceChild(copia, elemento);
    return copia;
  }

  /** Grava na trilha de auditoria (dados/auditoria.csv). */
  function registrarAuditoria(acao, alvo) {
    if (window.ProLinkBanco) { ProLinkModelos.auditoria.registrar(acao, alvo); }
  }

  window.ProLinkInteracoes = {
    avisar: avisar, dialogo: dialogo, baixar: baixar, escapar: escapar,
    sessao: sessao, ladoAtual: ladoAtual,
    normalizar: normalizar, parametro: parametro, agora: agora
  };

  window.__ProLinkInterno = {
    normalizar: normalizar, avisar: avisar,
    dialogo: dialogo, baixar: baixar, tabelaParaCsv: tabelaParaCsv, botaoPorTexto: botaoPorTexto,
    limparOuvintes: limparOuvintes, registrarAuditoria: registrarAuditoria, escapar: escapar,
    sessao: sessao, ladoAtual: ladoAtual, paginaAtual: paginaAtual, parametro: parametro,
    agora: agora
  };
})(window, document);
