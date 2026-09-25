/* ============================================================
   ProLink — prévia do perfil público

   "Ver perfil público" em Meu perfil e em Perfil da empresa abre
   esta tela: o perfil do jeito que um visitante sem conta vê,
   com o cabeçalho das páginas públicas.

   Para profissional, a prévia respeita Privacidade e dados campo a
   campo — é justamente para conferir o efeito dessas escolhas.
   ============================================================ */
(function (window, document) {
  "use strict";

  var alvo = document.getElementById("previa-perfil-publico");
  if (!alvo) { return; }

  function escapar(texto) {
    return String(texto == null ? "" : texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var sessao = (window.ProLinkBanco && ProLinkModelos.sessao.atual()) || {};
  var API = window.ProLinkDemandas;
  var tipo = sessao.tipoConta;

  function faixa(voltar) {
    return '<div class="faixa-visitante" style="margin-bottom:22px"><div><strong>Prévia do seu perfil público</strong>' +
      "<p>É assim que um visitante sem conta vê o seu perfil na busca pública. " +
      (tipo === "profissional" ? "O que você ocultou em Privacidade e dados não aparece aqui." : "") +
      '</p></div><div style="display:flex; gap:10px; flex-wrap:wrap">' +
      (tipo === "profissional" ? '<a class="btn btn-secundario" href="privacidade.html">Ajustar o que aparece</a>' : "") +
      '<a class="btn" href="' + voltar + '">Voltar ao meu perfil</a></div></div>';
  }

  function iniciais(nome) {
    var p = String(nome || "").trim().split(/\s+/);
    return ((p[0] || "-").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }

  /* As ações do topo trocam "Entrar/Criar conta" por voltar ao sistema. */
  var acoes = document.getElementById("acoes-previa");

  if (!tipo || tipo === "visitante" || tipo === "admin") {
    alvo.innerHTML = '<div class="cartao" style="max-width:640px; margin:40px auto; text-align:center">' +
      "<h1 style='margin-bottom:10px'>Prévia do perfil público</h1>" +
      '<p class="dica" style="margin-bottom:20px">Esta tela mostra como o perfil de um profissional ou de uma ' +
      "empresa aparece para quem não tem conta. Entre com uma conta para ver a sua.</p>" +
      '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap">' +
      '<a class="btn" href="login.html">Entrar</a><a class="btn btn-secundario" href="buscar.html">Ver a busca pública</a></div></div>';
    return;
  }

  if (tipo === "profissional") {
    var prof = API ? API.PROFISSIONAL : {};
    var priv = API ? API.lerPrivacidade() : { nomeCompleto: true, cidade: true, acervo: true, avaliacoes: true };
    var nome = sessao.nome || prof.nome || "Profissional";
    var nomeExibido = priv.nomeCompleto ? nome : nome.split(/\s+/)[0] + " " + iniciais(nome).slice(-1) + ".";
    if (acoes) { acoes.innerHTML = '<a class="btn btn-secundario" href="inicio.html">Abrir o ProLink</a>'; }

    var acervo = (prof.acervo || []).map(function (d) {
      return '<li class="arquivo"><span><strong style="display:block; font-size:14px">' + d.tipo + " " +
        escapar(d.numero) + '</strong><span style="font-size:12.5px; color:var(--tinta-3)">' + escapar(d.atividade) +
        '</span></span><span class="etiqueta etiqueta-verde">Confirmada no Crea</span></li>';
    }).join("");

    alvo.innerHTML = faixa("perfil.html") +
      '<div class="perfil-capa"></div><div class="perfil-cabecalho">' +
        '<span class="avatar avatar-lg">' + escapar(iniciais(nome)) + "</span>" +
        '<div class="perfil-identidade"><h1>' + escapar(nomeExibido) + "</h1>" +
          "<p style='color:var(--tinta-2)'>" + escapar(sessao.titulo || prof.titulo || "") +
            (sessao.registro ? " · CREA-" + escapar(sessao.ufRegistro || "AM") + " " + escapar(sessao.registro) : "") + "</p>" +
          '<div class="meta-linha" style="margin-top:10px">' +
            (priv.cidade ? '<span class="meta">' + escapar(sessao.cidadeExibicao || "Manaus, AM") + "</span>" : "") +
            (priv.email && sessao.email ? '<span class="meta">' + escapar(sessao.email) + "</span>" : "") +
            (priv.avaliacoes && prof.nota ? '<span class="meta">Nota ' + String(prof.nota).replace(".", ",") +
              " em " + prof.avaliacoes + " avaliações</span>" : "") +
          "</div></div>" +
        '<div class="perfil-acoes"><a class="btn" href="cadastro.html">Entrar em contato</a></div>' +
      "</div>" +
      '<div class="grade grade-principal" style="margin-top:24px"><div>' +
        (sessao.sobre ? '<div class="cartao" style="margin-bottom:20px"><h2 style="margin-bottom:10px">Sobre</h2><p style="color:var(--tinta-2)">' +
          escapar(sessao.sobre) + "</p></div>" : "") +
        '<div class="cartao" style="margin-bottom:20px"><h2 style="margin-bottom:12px">Competências</h2><div class="competencias">' +
          (prof.competencias || []).map(function (c) { return '<span class="etiqueta">' + escapar(c) + "</span>"; }).join("") +
        "</div></div>" +
        '<div class="cartao cartao-limpo"><div class="cartao-cabecalho"><h2>Acervo técnico</h2></div>' +
          (priv.acervo
            ? '<ul class="lista-arquivos" style="padding:16px 20px 20px">' + acervo + "</ul>"
            : '<p class="estado-vazio" style="margin:16px 20px 20px">Você ocultou o acervo técnico do perfil público.</p>') +
        "</div>" +
      "</div><div>" +
        '<div class="cartao"><div class="faixa-verificado"><span><strong>' +
          (sessao.verificado ? "Registro verificado" : "Registro não verificado") + "</strong><span>" +
          (sessao.verificado ? "Conferido na base do Crea-AM." : "Sem confirmação do Crea.") + "</span></span></div>" +
          '<p class="aviso-lgpd" style="margin-top:16px">Telefone e e-mail só aparecem se você ligar essa opção ' +
          "em Privacidade e dados.</p></div>" +
      "</div></div>";
    return;
  }

  /* Empresa ou contratante */
  if (acoes) { acoes.innerHTML = '<a class="btn btn-secundario" href="empresa-inicio.html">Abrir o ProLink</a>'; }
  var nomeEmpresa = sessao.nome || "Empresa";
  var M = window.ProLinkModelos;
  var registroEmpresa = (M && M.usuarios.buscar(sessao.id)) || sessao;
  var areas = registroEmpresa.areasAtuacao && registroEmpresa.areasAtuacao.length
    ? registroEmpresa.areasAtuacao : ["Áreas ainda não informadas"];
  var obrasEmpresa = M ? M.obras.listar({ usuarioId: sessao.id }) : [];
  var anexosEmpresa = M ? M.arquivos.listar({ usuarioId: sessao.id }) : [];
  alvo.innerHTML = faixa("empresa-perfil.html") +
    '<div class="perfil-capa"></div><div class="perfil-cabecalho">' +
      (registroEmpresa.logotipo
        ? '<span class="avatar avatar-lg avatar-empresa avatar-com-logo"><img src="' + escapar(registroEmpresa.logotipo) + '" alt="Logotipo de ' + escapar(nomeEmpresa) + '"></span>'
        : '<span class="avatar avatar-lg avatar-empresa">' + escapar(iniciais(nomeEmpresa)) + "</span>") +
      '<div class="perfil-identidade"><h1>' + escapar(nomeEmpresa) + "</h1>" +
        "<p style='color:var(--tinta-2)'>" + (tipo === "contratante" ? "Contratante sem registro no Crea"
          : "Empresa" + (sessao.registro ? " · CREA-" + escapar(sessao.ufRegistro || "AM") + " " + escapar(sessao.registro) : "")) + "</p>" +
        '<div class="meta-linha" style="margin-top:10px"><span class="meta">' + escapar(sessao.cidadeExibicao || "Manaus, AM") +
        "</span>" + (sessao.email ? '<span class="meta">' + escapar(sessao.email) + "</span>" : "") + "</div></div>" +
      '<div class="perfil-acoes"><a class="btn" href="cadastro.html">Ver demandas abertas</a></div>' +
    "</div>" +
    '<div class="grade grade-principal" style="margin-top:24px"><div>' +
      '<div class="cartao" style="margin-bottom:20px"><h2 style="margin-bottom:10px">Sobre a empresa</h2><p style="color:var(--tinta-2)">' +
        escapar(sessao.sobre || "A empresa ainda não escreveu uma apresentação.") + "</p></div>" +
      '<div class="cartao" style="margin-bottom:20px"><h2 style="margin-bottom:12px">Áreas de atuação</h2><div class="competencias">' +
        areas.map(function (a) { return '<span class="etiqueta">' + escapar(a) + "</span>"; }).join("") + "</div></div>" +
      '<div class="cartao cartao-limpo"><div class="cartao-cabecalho"><h2>Obras e serviços executados</h2></div>' +
        (obrasEmpresa.length ? '<ul class="lista-divisoria">' + obrasEmpresa.map(function (o) {
          var fotos = anexosEmpresa.filter(function (x) { return x.referenciaId === o.id && x.categoria === "foto-obra"; }).length;
          var atestado = anexosEmpresa.some(function (x) { return x.referenciaId === o.id && x.categoria === "atestado"; });
          return '<li class="obra-item"><div class="obra-topo"><div><strong>' + escapar(o.nome) + '</strong><span class="dica">' +
            escapar([o.cidade, o.area, o.porte].filter(Boolean).join(" · ")) + '</span></div><span class="etiqueta">' + escapar(o.situacao || "Concluída") +
            '</span></div><div class="obra-anexos">' + (fotos ? '<span class="anexo-chip">' + fotos + (fotos === 1 ? " foto" : " fotos") + "</span>" : "") +
            (atestado ? '<span class="anexo-chip anexo-atestado">Com atestado de capacidade técnica</span>' : "") + "</div></li>";
        }).join("") + "</ul>" : '<p class="estado-vazio" style="margin:16px 20px 20px">Nenhuma obra publicada.</p>') + "</div>" +
    "</div><div>" +
      '<div class="cartao"><div class="faixa-verificado"><span><strong>' +
        (tipo === "contratante" ? "Sem registro no Crea" : "Empresa verificada") + "</strong><span>" +
        (tipo === "contratante" ? "Contratante não recebe selo de verificado." : "CNPJ e registro conferidos.") +
        "</span></span></div></div>" +
    "</div></div>";
})(window, document);
