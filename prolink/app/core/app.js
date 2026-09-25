/* ============================================================
   ProLink — núcleo compartilhado pelos controllers

   Sessão, troca de página com transição, iniciais do usuário na tela
   e hash de senha. Cada controller pega daqui o que precisa
   (window.ProLink), em vez de repetir essas funções.
   ============================================================ */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Sessão: o navegador guarda só o id de quem entrou. Os dados do usuário
     ficam em dados/usuarios.csv e são lidos e gravados pelo banco.js.
     ----------------------------------------------------------------------- */

  /** Troca de contexto avisa antes de trocar o chão debaixo dos pés. */
  function irCom(texto, destino) {
    /* Só troca de página depois de os CSV terminarem de ser gravados. */
    var espera = window.ProLinkBanco ? ProLinkModelos.base.aguardarGravacoes() : Promise.resolve();
    espera.then(function () {
      if (window.ProLinkTransicao) {
        window.ProLinkTransicao.mostrar(texto, destino);
      } else {
        window.location.href = destino;
      }
    });
  }

  var Banco = window.ProLinkBanco;

  function lerUsuarioSalvo() {
    var dados = Banco ? ProLinkModelos.sessao.atual() : null;
    return dados && dados.nome ? dados : null;
  }

  function salvarUsuario(dados) {
    return Banco ? Boolean(ProLinkModelos.sessao.salvarUsuario(dados)) : false;
  }

  function calcularIniciais(nome) {
    var partes = nome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) { return "--"; }
    var primeira = partes[0].charAt(0);
    var ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : "";
    return (primeira + ultima).toUpperCase();
  }

  /* Aplica o cadastro salvo (se existir) nos textos marcados com
     data-usuario-campo. Sem cadastro salvo, mantém os textos neutros que já
     estão no HTML ("Perfil de teste", "Registro pendente" etc.). */
  function aplicarUsuarioNaTela() {
    var alvos = document.querySelectorAll("[data-usuario-campo]");
    if (!alvos.length) { return; }

    var dados = lerUsuarioSalvo();
    if (!dados) { return; }

    var valores = {
      nome: dados.nome,
      primeiroNome: dados.nome.split(/\s+/)[0],
      iniciais: calcularIniciais(dados.nome),
      titulo: dados.titulo || (dados.tipoConta === "empresa"
        ? "Empresa contratante" : "Profissional cadastrado"),
      /* Só exibe o número quando ele veio da consulta ao Crea. Sem
         verificação, a tela diz isso com todas as letras. */
      registro: dados.registro
        ? ("CREA-" + (dados.ufRegistro || "AM") + " " + dados.registro)
        : (dados.tipoConta === "admin"
            ? "Perfil administrador"
            : "Registro não verificado"),
      razaoSocial: dados.razaoSocial || dados.nome,
      cidade: dados.cidadeExibicao || dados.cidade || "",
      sobre: dados.sobre || ""
    };

    alvos.forEach(function (elemento) {
      var campo = elemento.getAttribute("data-usuario-campo");
      if (valores[campo]) { elemento.textContent = valores[campo]; }
    });
  }

  aplicarUsuarioNaTela();

  /** SHA-256 de "sal:senha", em hexadecimal. A senha nunca vai para o CSV. */
  function hashDaSenha(sal, senha) {
    var bytes = new TextEncoder().encode(sal + ":" + senha);
    return window.crypto.subtle.digest("SHA-256", bytes).then(function (resumo) {
      return Array.prototype.map.call(new Uint8Array(resumo), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }
  window.ProLinkSenha = { hash: hashDaSenha };

  /** Lê uma imagem e devolve uma data URL de até `lado` px (logotipo guardado na conta). */
  function imagemReduzida(arquivo, lado) {
    lado = lado || 160;
    return new Promise(function (resolve, reject) {
      if (!arquivo) { resolve(""); return; }
      var leitor = new FileReader();
      leitor.onerror = function () { reject(new Error("Não foi possível ler a imagem.")); };
      leitor.onload = function () {
        if (/svg/i.test(arquivo.type) || /\.svg$/i.test(arquivo.name)) {
          resolve(leitor.result.length < 60000 ? leitor.result : "");
          return;
        }
        var img = new Image();
        img.onerror = function () { reject(new Error("Arquivo de imagem inválido.")); };
        img.onload = function () {
          var escala = Math.min(1, lado / Math.max(img.width, img.height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function tamanhoLegivel(bytes) {
    if (bytes < 1048576) { return Math.max(1, Math.round(bytes / 1024)) + " KB"; }
    return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
  }

  window.ProLink = {
    imagemReduzida: imagemReduzida,
    tamanhoLegivel: tamanhoLegivel,
    Banco: Banco,
    irCom: irCom,
    lerUsuarioSalvo: lerUsuarioSalvo,
    salvarUsuario: salvarUsuario,
    calcularIniciais: calcularIniciais,
    aplicarUsuarioNaTela: aplicarUsuarioNaTela,
    hashDaSenha: hashDaSenha
  };
})();
