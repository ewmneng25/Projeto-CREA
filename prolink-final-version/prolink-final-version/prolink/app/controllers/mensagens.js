/* ============================================================
   ProLink — Mensagens

   Antes, trocar de conversa só mudava o destaque na lista: o
   cabeçalho, os balões e o painel da demanda continuavam os da
   TechSolut. E a caixa da empresa mostrava as conversas do ponto
   de vista do profissional. Agora cada conversa tem os seus dados,
   e cada lado vê as suas.

   Conversas ficam em dados/conversas.csv (uma linha por conversa,
   ligada ao usuário dono da caixa) e cada fala em dados/mensagens.csv.
   ============================================================ */
(function (window, document) {
  "use strict";

  var U = window.__ProLinkInterno;
  var lista = document.querySelector(".lista-conversas");
  if (!U || !lista) { return; }

  var lado = U.paginaAtual() === "empresa-mensagens.html" ? "empresa" : "profissional";
  var Banco = window.ProLinkBanco;
  var dono = U.sessao().id || "";
  var escapar = U.escapar;

  /* Quem pode aparecer numa conversa: profissionais do diretório e
     empresas/contratantes cadastrados, lidos da base em uso. */
  var eu = U.sessao() || {};
  var meuProfissional = eu.profissionalId || "";
  var DIRETORIO = {};
  function iniciaisDe(nome) {
    var partes = String(nome || "").split(/\s+/).filter(function (p) { return p.length > 2; });
    if (!partes.length) { return "--"; }
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }
  if (Banco) {
    ProLinkModelos.profissionais.listar().forEach(function (p) {
      DIRETORIO[p.id] = { nome: p.nome, iniciais: p.iniciais || "--", cor: p.cor || "", tipo: "profissional",
                          verificado: !!p.verificado,
                          detalhe: [p.titulo, p.verificado ? p.registro : "registro não verificado"].filter(Boolean).join(" · ") };
    });
    ProLinkModelos.usuarios.listar().filter(function (u) {
      return (u.tipoConta === "empresa" || u.tipoConta === "contratante") && u.id !== eu.id;
    }).forEach(function (u) {
      DIRETORIO[u.id] = { nome: u.nome, iniciais: iniciaisDe(u.nome),
                          cor: "", tipo: "empresa", verificado: !!u.verificado,
                          detalhe: (u.verificado ? "Empresa registrada" : "Contratante") + (u.cidadeExibicao ? " · " + u.cidadeExibicao : "") };
    });
  }

  var DEMANDAS = {};
  if (Banco) {
    ProLinkModelos.demandas.listar().filter(function (d) { return d.situacao !== "Encerrada"; }).forEach(function (d) {
      DEMANDAS[d.id] = { titulo: d.titulo, local: d.local || (d.cidade + ", " + d.uf), resumo: d.resumo || "",
                         empresaUsuarioId: d.empresaUsuarioId,
                         itens: [d.inicio ? "Início previsto: " + d.inicio : "", (d.exigencias || []).join(" · ")].filter(Boolean) };
    });
  }
  /* A empresa só convida para as próprias demandas. */
  function demandasDoConvite() {
    return Object.keys(DEMANDAS).filter(function (id) { return lado !== "empresa" || DEMANDAS[id].empresaUsuarioId === eu.id; });
  }

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  function carregar() {
    if (!Banco || !dono) { return { conversas: [] }; }
    var falas = ProLinkModelos.mensagens.listar();
    var conversas = ProLinkModelos.conversas.listar({ usuarioId: dono })
      .sort(function (a, b) { return String(b.atualizadaEm).localeCompare(String(a.atualizadaEm)); })
      .map(function (c) {
        c.mensagens = falas.filter(function (f) { return f.conversaId === c.id; })
          .sort(function (a, b) { return String(a.criadoEm).localeCompare(String(b.criadoEm)); });
        return c;
      });
    return { conversas: conversas };
  }
  var estado = carregar();

  function agoraIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") +
      " " + d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0");
  }

  function criarConversa(contato, demanda, quando) {
    var nova = Banco && ProLinkModelos.conversas.inserir({
      usuarioId: dono, contato: contato, demanda: demanda || "", naoLidas: 0,
      quando: quando || horaAgora(), atualizadaEm: agoraIso()
    });
    if (!nova) { U.avisar("Não foi possível gravar a conversa na base.", "atencao"); return null; }
    nova.mensagens = [];
    estado.conversas.unshift(nova);
    return nova;
  }

  var atual = null;

  function horaAgora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function contatoDe(c) { return DIRETORIO[c.contato] || { nome: "Contato", iniciais: "--", cor: "", tipo: "profissional", detalhe: "" }; }

  // ------------------------------------------------------------------
  // Desenho
  // ------------------------------------------------------------------
  function ultimaMensagem(c) {
    var ultima = c.mensagens[c.mensagens.length - 1];
    if (!ultima) { return "Conversa nova"; }
    if (ultima.anexo) { return "Arquivo: " + ultima.anexo.nome; }
    if (ultima.proposta) { return "Proposta enviada"; }
    if (ultima.convite) { return "Convite para demanda"; }
    return (ultima.de === "eu" ? "Você: " : "") + ultima.texto;
  }

  function desenharLista() {
    var termo = U.normalizar((document.getElementById("busca-conversas") || {}).value || "");
    var visiveis = estado.conversas.filter(function (c) {
      return !termo || U.normalizar(contatoDe(c).nome + " " + ultimaMensagem(c)).indexOf(termo) !== -1;
    });
    lista.innerHTML = visiveis.map(function (c) {
      var p = contatoDe(c);
      return '<button class="conversa" type="button" data-conversa="' + c.id + '"' +
        (atual && atual.id === c.id ? ' aria-current="true"' : "") + ">" +
        '<span class="avatar ' + (p.tipo === "empresa" ? "avatar-empresa " : "") + p.cor + '">' + p.iniciais + "</span>" +
        '<span style="flex:1; min-width:0"><span class="conversa-topo"><strong>' + escapar(p.nome) +
        "</strong><time>" + escapar(c.quando) + '</time></span><span class="conversa-topo"><p>' +
        escapar(ultimaMensagem(c)) + "</p>" + (c.naoLidas ? '<span class="nao-lidas">' + c.naoLidas + "</span>" : "") +
        "</span></span></button>";
    }).join("") || '<p class="estado-vazio" style="margin:16px">Nenhuma conversa encontrada.</p>';

    var cabecalho = document.querySelector(".pagina-cabecalho p");
    if (cabecalho) {
      var naoLidas = estado.conversas.filter(function (c) { return c.naoLidas; }).length;
      cabecalho.textContent = naoLidas ? naoLidas + (naoLidas === 1 ? " conversa não lida." : " conversas não lidas.")
                                       : "Nenhuma conversa não lida.";
    }
  }

  function balao(msg) {
    var classe = msg.de === "eu" ? "balao balao-enviado" : "balao balao-recebido";
    var corpo;
    if (msg.anexo) {
      corpo = '<span class="balao-anexo"><strong>' + escapar(msg.anexo.nome) + "</strong><span>" +
              escapar(msg.anexo.tamanho) + " · anexo</span></span>" + (msg.texto ? "<span>" + escapar(msg.texto) + "</span>" : "");
    } else if (msg.proposta) {
      corpo = '<span class="balao-cartao"><span class="etiqueta">Proposta</span><strong>' +
              escapar(msg.proposta.valor) + " · " + escapar(msg.proposta.prazo) + "</strong><span>" +
              escapar(msg.proposta.escopo) + "</span></span>";
    } else if (msg.link) {
      corpo = '<span class="balao-cartao"><span class="etiqueta">' + escapar(msg.link.rotulo) + "</span><strong>" +
              escapar(msg.link.titulo) + '</strong><a class="link" href="' + escapar(msg.link.href) + '">Abrir</a></span>';
    } else {
      corpo = escapar(msg.texto);
    }
    return '<div class="' + classe + '">' + corpo + "<time>" + escapar(msg.hora) + "</time></div>";
  }

  function desenharConversa() {
    var corpo = document.querySelector(".mensagens-corpo");
    var cab = document.querySelector(".conversa-cabecalho");
    var aside = document.querySelector(".coluna-contexto");
    if (!atual) {
      cab.innerHTML = '<div style="flex:1"><strong>Nenhuma conversa aberta</strong></div>';
      corpo.innerHTML = '<p class="estado-vazio" style="margin:auto">Escolha uma conversa ou comece uma nova.</p>';
      aside.innerHTML = "";
      return;
    }
    var p = contatoDe(atual);
    var demanda = DEMANDAS[atual.demanda];

    var destinoBotao = demanda
      ? (lado === "empresa" ? ["Ver candidaturas", "empresa-candidaturas.html?d=" + atual.demanda]
                            : ["Ver demanda", "oportunidade.html?d=" + atual.demanda])
      : (p.tipo === "profissional" ? ["Ver perfil", "profissional.html?p=" + atual.contato] : null);

    cab.innerHTML = '<span class="avatar ' + (p.tipo === "empresa" ? "avatar-empresa " : "") + p.cor + '">' + p.iniciais + "</span>" +
      '<div style="flex:1"><strong style="display:block; font-size:15px">' + escapar(p.nome) + '</strong><span class="meta">' +
      escapar(demanda ? demanda.titulo + " · " + demanda.local : p.detalhe) + "</span></div>" +
      (destinoBotao ? '<a class="btn btn-secundario btn-sm" href="' + destinoBotao[1] + '">' + destinoBotao[0] + "</a>" : "");

    var dia = "";
    corpo.innerHTML = atual.mensagens.map(function (msg) {
      var separador = msg.dia !== dia ? '<span class="divisor-data">' + escapar(msg.dia) + "</span>" : "";
      dia = msg.dia;
      return separador + balao(msg);
    }).join("") || '<p class="estado-vazio" style="margin:auto">Conversa nova. Escreva a primeira mensagem.</p>';
    corpo.scrollTop = corpo.scrollHeight;

    if (lado === "profissional") {
      aside.innerHTML = (demanda
        ? '<h3 style="margin-bottom:12px">Sobre a demanda</h3><p style="font-size:14px; color:var(--tinta-2); margin-bottom:16px">' +
          escapar(demanda.resumo) + '</p><ul style="display:grid; gap:10px; margin-bottom:18px">' +
          '<li class="meta">' + escapar(demanda.local) + "</li>" +
          demanda.itens.map(function (i) { return '<li class="meta">' + escapar(i) + "</li>"; }).join("") + "</ul>" +
          '<div class="faixa-verificado" style="margin-bottom:16px"><span><strong>' +
          (p.verificado ? "Empresa verificada" : "Contratante sem registro") + "</strong><span>" +
          (p.verificado ? "CNPJ e registro conferidos" : "Não recebe selo de verificado") + "</span></span></div>" +
          '<button class="btn btn-bloco" type="button" data-acao="proposta">Enviar proposta</button>'
        : '<h3 style="margin-bottom:12px">Sobre o contato</h3><p style="font-size:14px; color:var(--tinta-2); margin-bottom:16px">' +
          escapar(p.detalhe) + ". Conversa entre profissionais, fora de uma demanda: combine a parceria e " +
          "registre a ART de cada disciplina.</p>" +
          '<a class="btn btn-bloco" href="profissional.html?p=' + atual.contato + '">Ver perfil completo</a>') +
        '<button class="btn btn-secundario btn-bloco" style="margin-top:8px" type="button" data-acao="portfolio">Compartilhar portfólio</button>';
    } else {
      aside.innerHTML = '<h3 style="margin-bottom:12px">Sobre o profissional</h3>' +
        '<p style="font-size:14px; color:var(--tinta-2); margin-bottom:16px">' + escapar(p.detalhe) + "</p>" +
        (demanda ? '<ul style="display:grid; gap:10px; margin-bottom:18px"><li class="meta">Conversa sobre: ' +
          escapar(demanda.titulo) + "</li></ul>" : "") +
        '<div class="faixa-verificado" style="margin-bottom:16px"><span><strong>' +
          (p.verificado ? "Registro verificado" : "Registro não verificado") + "</strong><span>" +
          (p.verificado ? "Conferido na base do Crea-AM." : "O Crea ainda não confirmou este registro.") +
          "</span></span></div>" +
        '<button class="btn btn-bloco" type="button" data-acao="convite">Convidar para uma demanda</button>' +
        '<a class="btn btn-secundario btn-bloco" style="margin-top:8px" href="profissional.html?p=' + atual.contato +
          '">Ver perfil completo</a>';
    }
  }

  function abrir(id) {
    atual = estado.conversas.filter(function (c) { return c.id === id; })[0] || null;
    if (atual && atual.naoLidas) {
      atual.naoLidas = 0;
      ProLinkModelos.conversas.atualizar(atual.id, { naoLidas: 0 });
    }
    desenharLista();
    desenharConversa();
  }

  function adicionar(msg) {
    if (!atual) { return; }
    msg.de = "eu";
    msg.hora = horaAgora();
    msg.dia = "Hoje";
    var gravada = ProLinkModelos.mensagens.inserir({
      conversaId: atual.id, de: msg.de, texto: msg.texto || "", hora: msg.hora, dia: msg.dia,
      anexo: msg.anexo || null, proposta: msg.proposta || null, link: msg.link || null,
      convite: !!msg.convite, criadoEm: agoraIso()
    });
    if (!gravada) { U.avisar("Não foi possível gravar a mensagem na base.", "atencao"); return; }
    atual.mensagens.push(gravada);
    atual.quando = msg.hora;
    ProLinkModelos.conversas.atualizar(atual.id, { quando: msg.hora, atualizadaEm: agoraIso(), demanda: atual.demanda || "" });
    /* A conversa com mensagem nova sobe para o topo. */
    estado.conversas = [atual].concat(estado.conversas.filter(function (c) { return c !== atual; }));
    desenharLista();
    desenharConversa();
  }

  // ------------------------------------------------------------------
  // Ações
  // ------------------------------------------------------------------
  lista.addEventListener("click", function (evento) {
    var botao = evento.target.closest("[data-conversa]");
    if (botao) { abrir(botao.dataset.conversa); }
  });

  var busca = document.getElementById("busca-conversas");
  if (busca) { busca.addEventListener("input", desenharLista); }

  /* O prolink.js já ligava o campo e o botão de enviar a um balão genérico;
     trocamos pelos daqui, que gravam na conversa aberta. */
  var campo = U.limparOuvintes(document.getElementById("nova-mensagem"));
  var compositor = campo.parentElement;
  var botaoEnviar = U.limparOuvintes(compositor.querySelector(".btn"));
  var botaoAnexar = U.limparOuvintes(compositor.querySelector('[aria-label="Anexar arquivo"]'));

  function enviarTexto() {
    var texto = campo.value.trim();
    if (!atual) { U.avisar("Escolha uma conversa antes de escrever.", "atencao"); return; }
    if (!texto) { campo.focus(); U.avisar("Escreva a mensagem antes de enviar.", "atencao"); return; }
    adicionar({ texto: texto });
    campo.value = "";
    campo.focus();
  }
  botaoEnviar.addEventListener("click", enviarTexto);
  campo.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); enviarTexto(); }
  });

  botaoAnexar.addEventListener("click", function () {
    if (!atual) { U.avisar("Escolha uma conversa antes de anexar.", "atencao"); return; }
    var entrada = document.createElement("input");
    entrada.type = "file";
    entrada.accept = ".pdf,.png,.jpg,.jpeg,.dwg,.doc,.docx,.xlsx";
    entrada.hidden = true;
    document.body.appendChild(entrada);
    entrada.addEventListener("change", function () {
      var arquivo = entrada.files[0];
      entrada.remove();
      if (!arquivo) { return; }
      if (arquivo.size > 20 * 1024 * 1024) { U.avisar("O arquivo passa de 20 MB.", "atencao"); return; }
      var tamanho = arquivo.size < 1048576 ? Math.max(1, Math.round(arquivo.size / 1024)) + " KB"
                                           : (arquivo.size / 1048576).toFixed(1).replace(".", ",") + " MB";
      adicionar({ texto: campo.value.trim(), anexo: { nome: arquivo.name, tamanho: tamanho } });
      campo.value = "";
      U.avisar("Arquivo anexado. Neste protótipo só o nome fica registrado; o arquivo não é enviado.");
    });
    entrada.click();
  });

  document.querySelector(".coluna-contexto").addEventListener("click", function (evento) {
    var botao = evento.target.closest("[data-acao]");
    if (!botao || !atual) { return; }
    var acao = botao.dataset.acao;

    if (acao === "proposta") {
      U.dialogo({
        titulo: "Enviar proposta",
        texto: "A proposta vai para " + escapar(contatoDe(atual).nome) + " dentro desta conversa. " +
               "O ProLink não intermedeia contrato nem pagamento.",
        corpo: '<div class="grade-form"><div class="campo"><label for="pr-valor">Valor (R$)</label>' +
          '<input id="pr-valor" type="text" inputmode="decimal" placeholder="Ex.: 18.500,00"></div>' +
          '<div class="campo"><label for="pr-prazo">Prazo (dias)</label><input id="pr-prazo" type="number" min="1" placeholder="Ex.: 45"></div></div>' +
          '<div class="campo"><label for="pr-escopo">Escopo</label><textarea id="pr-escopo" placeholder="O que está incluído, entregáveis e ARTs."></textarea></div>',
        confirmar: "Enviar proposta",
        aoConfirmar: function (caixa) {
          var valor = caixa.querySelector("#pr-valor").value.trim();
          var prazo = caixa.querySelector("#pr-prazo").value.trim();
          var escopo = caixa.querySelector("#pr-escopo").value.trim();
          if (!/\d/.test(valor)) { caixa.erro("Informe o valor da proposta."); return false; }
          if (!(Number(prazo) > 0)) { caixa.erro("Informe o prazo em dias."); return false; }
          if (escopo.length < 10) { caixa.erro("Descreva o escopo em uma frase."); return false; }
          adicionar({ proposta: { valor: "R$ " + valor.replace(/^R\$\s*/, ""), prazo: prazo + " dias", escopo: escopo } });
          U.avisar("Proposta enviada para " + escapar(contatoDe(atual).nome) + ".", "ok");
        }
      });
    }

    if (acao === "portfolio") {
      var nome = U.sessao().nome || "Meu portfólio";
      adicionar({ link: { rotulo: "Portfólio", titulo: nome + " · projetos e acervo técnico",
                          href: "profissional.html?p=" + encodeURIComponent(meuProfissional) } });
      U.avisar("Portfólio compartilhado na conversa.", "ok");
    }

    if (acao === "convite") {
      U.dialogo({
        titulo: "Convidar para uma demanda",
        texto: escapar(contatoDe(atual).nome) + " recebe o convite na conversa e decide se manifesta interesse.",
        corpo: '<div class="campo"><label for="cv-demanda">Demanda</label><select id="cv-demanda">' +
          demandasDoConvite().map(function (id) {
            return '<option value="' + id + '"' + (id === atual.demanda ? " selected" : "") + ">" +
              escapar(DEMANDAS[id].titulo) + "</option>";
          }).join("") + "</select></div>",
        confirmar: "Enviar convite",
        aoConfirmar: function (caixa) {
          var id = caixa.querySelector("#cv-demanda").value;
          atual.demanda = id;
          adicionar({ convite: true, link: { rotulo: "Convite", titulo: DEMANDAS[id].titulo,
                                             href: "oportunidade.html?d=" + id } });
          U.avisar("Convite enviado.", "ok");
        }
      });
    }
  });

  /* Nova conversa */
  U.botaoPorTexto("Nova conversa").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var opcoes = Object.keys(DIRETORIO).filter(function (id) {
        /* Empresa conversa com profissional; profissional, com os dois. */
        return lado === "profissional" ? id !== meuProfissional : DIRETORIO[id].tipo === "profissional";
      });
      U.dialogo({
        titulo: "Nova conversa",
        texto: "Mensagens ficam dentro da plataforma: telefone e e-mail só aparecem se a pessoa autorizar.",
        corpo: '<div class="campo"><label for="nc-contato">Com quem</label><select id="nc-contato">' +
          opcoes.map(function (id) {
            return '<option value="' + id + '">' + escapar(DIRETORIO[id].nome) + " — " + escapar(DIRETORIO[id].detalhe) + "</option>";
          }).join("") + "</select></div>" +
          '<div class="campo"><label for="nc-demanda">Sobre qual demanda (opcional)</label><select id="nc-demanda">' +
          '<option value="">Nenhuma</option>' + demandasDoConvite().map(function (id) {
            return '<option value="' + id + '">' + escapar(DEMANDAS[id].titulo) + "</option>";
          }).join("") + "</select></div>" +
          '<div class="campo"><label for="nc-texto">Primeira mensagem</label><textarea id="nc-texto" placeholder="Apresente-se e diga o motivo do contato."></textarea></div>',
        confirmar: "Iniciar conversa",
        aoConfirmar: function (caixa) {
          var texto = caixa.querySelector("#nc-texto").value.trim();
          if (texto.length < 5) { caixa.erro("Escreva a primeira mensagem."); return false; }
          var contato = caixa.querySelector("#nc-contato").value;
          var existente = estado.conversas.filter(function (c) { return c.contato === contato; })[0];
          if (!existente) {
            existente = criarConversa(contato, caixa.querySelector("#nc-demanda").value);
            if (!existente) { return false; }
          }
          atual = existente;
          adicionar({ texto: texto });
          U.avisar("Conversa com " + escapar(DIRETORIO[contato].nome) + " iniciada.", "ok");
        }
      });
    });
  });

  // ------------------------------------------------------------------
  // Início: ?com= abre (ou cria) a conversa com quem veio do cartão
  // ------------------------------------------------------------------
  var com = U.parametro("com");
  if (com && DIRETORIO[com] && com !== meuProfissional) {
    var achada = estado.conversas.filter(function (c) { return c.contato === com; })[0];
    if (!achada) { achada = criarConversa(com, "", "agora"); }
    abrir(achada ? achada.id : "");
    campo.focus();
  } else {
    abrir(estado.conversas.length ? estado.conversas[0].id : "");
  }
})(window, document);
