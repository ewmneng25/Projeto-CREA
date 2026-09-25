#!/usr/bin/env python3
"""Gera as paginas HTML do ProLink a partir de um shell comum."""
import os
import re

# Este arquivo fica em app/views/; as páginas são geradas na raiz do projeto.
BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --------------------------------------------------------------------------
# Icones (SVG inline, traco 1.8, herdam currentColor)
# --------------------------------------------------------------------------
_P = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>')

ICONS = {
    "inicio": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    "maleta": '<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/>',
    "chip": '<rect x="7" y="7" width="10" height="10" rx="2.5"/><path d="M10 2.5v3M14 2.5v3M10 18.5v3M14 18.5v3M2.5 10h3M2.5 14h3M18.5 10h3M18.5 14h3"/>',
    "escudo": '<path d="M12 3 5 6v5.5c0 4.3 2.9 7.7 7 9.5 4.1-1.8 7-5.2 7-9.5V6z"/><path d="m9.2 12 2 2 3.8-4"/>',
    "pasta": '<path d="M3 7.5A2 2 0 0 1 5 5.5h3.8l1.7 2.2H19a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "balao": '<path d="M20.5 12c0 4.1-3.8 7.4-8.5 7.4-1 0-2-.15-2.9-.42L4 20.5l1.6-3.7C4.2 15.5 3.5 13.8 3.5 12 3.5 7.9 7.3 4.6 12 4.6s8.5 3.3 8.5 7.4z"/>',
    "estrela": '<path d="m12 4 2.5 5.1 5.6.8-4 4 .95 5.6L12 16.9 6.95 19.5 7.9 13.9l-4-4 5.6-.8z"/>',
    "usuario": '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.5 20.2a7.5 7.5 0 0 1 15 0"/>',
    "lupa": '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    "sino": '<path d="M18 9a6 6 0 0 0-12 0c0 5.2-2 6.5-2 6.5h16S18 14.2 18 9z"/><path d="M13.7 19.2a2 2 0 0 1-3.4 0"/>',
    "marcador": '<path d="M6.5 4.5h11v16l-5.5-4-5.5 4z"/>',
    "pino": '<path d="M12 21s6.5-5.7 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.3 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
    "predio": '<path d="M4 21V6.5l7-3.5v18"/><path d="M11 10h6.5a1.5 1.5 0 0 1 1.5 1.5V21"/><path d="M7 9.5h.01M7 13h.01M7 16.5h.01M14.5 14h.01M14.5 17.5h.01"/><path d="M2.5 21h19"/>',
    "check": '<path d="m4.5 12.5 5 5 10-11"/>',
    "checkcirculo": '<circle cx="12" cy="12" r="8.8"/><path d="m8.4 12.2 2.5 2.5 4.7-5.2"/>',
    "documento": '<path d="M6 3.5h7.5L18.5 8v12.5H6z"/><path d="M13.5 3.5V8h5"/><path d="M9 13h6.5M9 16.5h4.5"/>',
    "upload": '<path d="M12 16V4.5"/><path d="m7.5 9 4.5-4.5L16.5 9"/><path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
    "mais": '<path d="M12 5.5v13M5.5 12h13"/>',
    "engrenagem": '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.47-1 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.47 1z"/>',
    "seta": '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
    "chevron": '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    "equipe": '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.4a6.4 6.4 0 0 1 12.4 0"/><path d="M16.2 5.5a3.4 3.4 0 0 1 0 6.6"/><path d="M18 19.4a6.4 6.4 0 0 0-2-4.4"/>',
    "relogio": '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.3l3.4 2"/>',
    "enviar": '<path d="M21 4 3 11l7 2.8L13 21z"/><path d="m10 13.8 3.4-3.4"/>',
    "clipe": '<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/>',
    "raio": '<path d="M13.5 3 5 13.5h6L10.5 21 19 10.5h-6z"/>',
    "grafico": '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    "cadeado": '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>',
    "email": '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/>',
    "lupa_doc": '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m14.5 14.5 5 5"/><path d="M8 10.5h5"/>',
    "fechar": '<path d="m6 6 12 12M18 6 6 18"/>',
    "faisca": ('<path d="M12 3.2 13.9 9l5.9 1.9-5.9 1.9L12 18.7l-1.9-5.9L4.2 10.9 10.1 9z"/>'
               '<path d="M18.5 3.5v3M20 5h-3"/>'),
    "sair": ('<path d="M14.5 20.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h8.5"/>'
             '<path d="M17 15.5 20.5 12 17 8.5"/><path d="M20 12H9.5"/>'),
    "recomecar": ('<path d="M4.5 12a7.5 7.5 0 1 1 2.3 5.4"/><path d="M4.2 18.4v-4.6h4.6"/>'),
}


def ico(nome):
    return _P % ICONS[nome]


_CONTADOR_LOGO = {"n": 0}


def logo(tamanho=34, animada=False):
    """A marca do ProLink: uma treliça.

    A treliça é a figura que junta as duas coisas que a plataforma faz.
    Em engenharia, é a estrutura que ganha rigidez pela triangulação —
    nenhuma barra sozinha sustenta, o conjunto sustenta. Em rede, é
    exatamente um grafo: nós ligados por arestas.

    São quatro nós: três nas pontas e um no centro, que é o Crea — todo
    vínculo passa por ele, e é isso que dá rigidez ao conjunto.

    `animada` liga o traçado progressivo das barras, usado no splash.
    """
    _CONTADOR_LOGO["n"] += 1
    ident = "pl%d" % _CONTADOR_LOGO["n"]
    classe = ' class="marca-svg marca-animada"' if animada else ' class="marca-svg"'

    return (
        '<svg%s width="%d" height="%d" viewBox="0 0 44 44" fill="none" '
        'aria-hidden="true">'

        # Barras: triângulo externo e os três tirantes até o nó central.
        '<g stroke="url(#%s-barra)" stroke-width="2.6" stroke-linecap="round">'
        '<path class="barra" d="M22 7.5 6.5 34.5"/>'
        '<path class="barra" d="M22 7.5 37.5 34.5"/>'
        '<path class="barra" d="M6.5 34.5h31"/>'
        '<path class="barra" d="M22 7.5V22"/>'
        '<path class="barra" d="M22 22 6.5 34.5"/>'
        '<path class="barra" d="M22 22l15.5 12.5"/>'
        '</g>'

        # Nós das pontas.
        '<g fill="url(#%s-no)">'
        '<circle class="no" cx="22" cy="7.5" r="4.2"/>'
        '<circle class="no" cx="6.5" cy="34.5" r="4.2"/>'
        '<circle class="no" cx="37.5" cy="34.5" r="4.2"/>'
        '</g>'

        # Nó central, o Crea: mais claro, com anel, porque é por onde
        # todo vínculo passa.
        '<circle class="no no-centro" cx="22" cy="22" r="5.6" fill="#0b1220"/>'
        '<circle class="no no-centro" cx="22" cy="22" r="5.6" fill="none" '
        'stroke="#7aa7ff" stroke-width="2.4"/>'
        '<circle class="no no-centro" cx="22" cy="22" r="1.9" fill="#7aa7ff"/>'

        '<defs>'
        '<linearGradient id="%s-barra" gradientUnits="userSpaceOnUse" x1="6" y1="8" x2="38" y2="35">'
        '<stop stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/>'
        '</linearGradient>'
        '<linearGradient id="%s-no" gradientUnits="userSpaceOnUse" x1="6" y1="8" x2="38" y2="35">'
        '<stop stop-color="#93c5fd"/><stop offset="1" stop-color="#2563eb"/>'
        '</linearGradient>'
        '</defs></svg>'
        % (classe, tamanho, tamanho, ident, ident, ident, ident)
    )


def estrelas(nota, tamanho=None):
    cheias = int(round(nota))
    itens = []
    for i in range(5):
        classe = "" if i < cheias else ' class="vazia"'
        itens.append('<svg viewBox="0 0 24 24" fill="currentColor"%s aria-hidden="true">'
                     '<path d="m12 3.6 2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.4l-5.38 2.84 1.03-6L3.3 10l6-.9z"/>'
                     '</svg>' % classe)
    return '<span class="estrelas" role="img" aria-label="%s de 5">%s</span>' % (
        str(nota).replace(".", ","), "".join(itens))


# --------------------------------------------------------------------------
# Navegacao
# --------------------------------------------------------------------------
NAV_PRINCIPAL = [
    ("inicio.html", "Início", "inicio", ""),
    ("oportunidades.html", "Oportunidades", "maleta", "0"),
    ("candidaturas.html", "Minhas candidaturas", "enviar", ""),
    ("profissionais.html", "Buscar profissionais", "lupa", ""),
    ("portfolio.html", "Meu portfólio", "pasta", ""),
    ("mensagens.html", "Mensagens", "balao", "0"),
]
NAV_PERFIL = [
    ("perfil.html", "Meu perfil", "usuario", ""),
    ("avaliacoes.html", "Avaliações", "estrela", ""),
    ("privacidade.html", "Privacidade e dados", "cadeado", ""),
]

# Lado da empresa: quem contrata publica demanda e procura profissional,
# em vez de manter portfólio e buscar oportunidade.
NAV_EMPRESA = [
    ("empresa-inicio.html", "Início", "inicio", ""),
    ("empresa-demandas.html", "Minhas demandas", "maleta", "0"),
    ("empresa-candidaturas.html", "Candidaturas", "equipe", "0"),
    ("empresa-profissionais.html", "Buscar profissionais", "lupa", ""),
    ("empresa-mensagens.html", "Mensagens", "balao", "0"),
]
# Lado do administrador: o Crea-AM operando a plataforma. Moderação,
# auditoria e integrações — o RF06 do Anexo I.
NAV_ADMIN = [
    ("admin-inicio.html", "Painel", "grafico", ""),
    ("admin-usuarios.html", "Usuários", "equipe", ""),
    ("admin-denuncias.html", "Denúncias", "sino", "0"),
]
NAV_ADMIN_GOVERNANCA = [
    ("admin-auditoria.html", "Trilha de auditoria", "documento", ""),
]

NAV_EMPRESA_PERFIL = [
    ("empresa-perfil.html", "Perfil da empresa", "predio", ""),
    ("empresa-avaliacoes.html", "Avaliações", "estrela", ""),
]


# Os mesmos ids de assets/js/demandas.js: é por eles que o perfil público e a
# conversa certa abrem a partir de qualquer cartão.
ID_PROFISSIONAL = {
    "Daniel Silva do Carmo": "prof-001",
    "Ana Beatriz Farias": "prof-002",
    "Lucas Martins": "prof-003",
    "Rafael Souza": "prof-004",
    "Paula Menezes": "prof-005",
}


def link_perfil(nome):
    return "profissional.html?p=%s" % ID_PROFISSIONAL.get(nome, "prof-001")


def link_conversa(nome, pagina="mensagens.html"):
    return "%s?com=%s" % (pagina, ID_PROFISSIONAL.get(nome, "prof-001"))


def bloco_nav(itens, ativo):
    linhas = []
    for href, rotulo, icone, contador in itens:
        atual = ' aria-current="page"' if href == ativo else ""
        badge = '<span class="nav-contador">%s</span>' % contador if contador else ""
        linhas.append('        <a href="%s"%s>%s<span>%s</span>%s</a>'
                      % (href, atual, ico(icone), rotulo, badge))
    return "\n".join(linhas)


AVISO_INDICATIVO = ("""<p class="aviso-indicativo">%s <strong>Correspondência indicativa.</strong>
            O ProLink não contrata, não intermedeia e não classifica pessoas. Cabe às
            partes verificar habilitação, atribuições profissionais, regularidade, escopo,
            preços e contratos.</p>""")

RODAPE_PROFISSIONAL = """<div class="cartao-plano" id="cartao-lateral">
        <h4 data-lateral="titulo">&nbsp;</h4>
        <p data-lateral="texto"></p>
        <a class="btn btn-sm" href="portfolio.html" data-lateral="botao">Completar perfil</a>
      </div>"""

RODAPE_EMPRESA = """<div class="cartao-plano" id="cartao-lateral">
        <h4 data-lateral="titulo">&nbsp;</h4>
        <p data-lateral="texto"></p>
        <a class="btn btn-sm" href="empresa-candidaturas.html" data-lateral="botao">Ver candidaturas</a>
      </div>"""

# O administrador não tem cartão no rodapé da lateral: o que importa para
# ele já está no painel, e um alerta permanente ali só competiria com a
# fila de denúncias de verdade.
RODAPE_ADMIN = ""

SHELL = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITULO__ · ProLink</title>
<meta name="description" content="ProLink — plataforma que conecta profissionais técnicos a empresas, obras e oportunidades.">
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>
<div class="app">

  <aside class="sidebar" aria-label="Menu lateral">
    <a class="marca" href="__INICIO_HREF__">
      __LOGO__
      <span class="marca-nome">Pro<span>Link</span></span>
    </a>

    <a class="atalho-miranda" href="miranda.html" data-transicao="Chamando a Miranda…"__MIRANDA_ATUAL__>
      <img class="rosto-miranda" src="assets/img/miranda-avatar.png" alt="" width="40" height="40">
      <span class="atalho-miranda-texto">
        <strong>Falar com a Miranda</strong>
        <small>Assistente do ProLink</small>
      </span>
    </a>

    <div>
      <p class="nav-grupo-titulo">__GRUPO1__</p>
      <nav class="nav" aria-label="Navegação principal">
__NAV1__
      </nav>
    </div>

    <div>
      <p class="nav-grupo-titulo">__GRUPO2__</p>
      <nav class="nav" aria-label="Navegação do perfil">
__NAV2__
      </nav>
    </div>

    <div class="sidebar-rodape">
      __RODAPE_LATERAL__
    </div>
  </aside>

  <div class="conteudo">
    <header class="topbar" aria-label="Barra superior">
      <div class="busca-global">
        __ICO_LUPA__
        <label class="sr-apenas" for="busca">Buscar na plataforma</label>
        <input id="busca" type="search" placeholder="Buscar oportunidades, empresas ou profissionais">
      </div>
      <div class="topbar-acoes">
        <div class="area-notificacoes">
          <button class="botao-icone" type="button" id="abrir-notificacoes"
                  aria-label="Notificações" aria-expanded="false" aria-haspopup="true">
            __ICO_SINO__<span class="ponto-alerta"></span>
          </button>
          <div class="painel-notificacoes" id="painel-notificacoes" hidden></div>
        </div>
        <a class="botao-icone" href="manual-do-usuario.pdf" target="_blank" rel="noopener"
           aria-label="Manual do usuário (PDF)" title="Manual do usuário">__ICO_MANUAL__</a>
        <a class="botao-icone" href="__CONFIG_HREF__" aria-label="Configurações" title="Configurações"__CONFIG_ATUAL__>__ICO_ENGRENAGEM__</a>
        <div class="usuario-topbar">
          <span class="avatar avatar-sm" data-usuario-campo="iniciais">--</span>
          <span>
            <strong data-usuario-campo="nome">Perfil de teste</strong>
            <small data-usuario-campo="registro">Registro pendente</small>
          </span>
        </div>
        <button class="botao-icone botao-sair" type="button" id="sair-da-sessao"
                title="Sair da sessão" aria-label="Sair da sessão" hidden>__ICO_SAIR__</button>
      </div>
    </header>

    <main class="pagina" id="conteudo">
__CORPO__
    </main>
  </div>
</div>

<!-- Botão flutuante da Miranda: presente em todas as telas internas.
     O guia (miranda-guia.js) usa este botão como âncora das dicas. -->
<button class="miranda-flutuante" type="button" id="miranda-flutuante"
        aria-label="Abrir dicas da Miranda">
  <img src="assets/img/miranda-avatar.png" alt="" width="56" height="56">
  <span class="miranda-flutuante-alerta" id="miranda-flutuante-alerta" hidden></span>
</button>

<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
<script src="assets/js/demandas.js"></script>
<script src="assets/js/interacoes.js"></script>
<script src="assets/js/miranda-guia.js"></script>
__SCRIPTS__
</body>
</html>
"""


def shell(titulo, ativo, corpo, scripts=(), lado="profissional"):
    """Monta a tela interna. `lado` troca a navegação e o rodapé da lateral.

    Profissional e empresa usam o mesmo esqueleto de propósito: é a mesma
    plataforma, e quem conhece um lado não precisa reaprender o outro.
    """
    empresa = lado == "empresa"
    admin = lado == "admin"
    html = SHELL
    html = html.replace("__TITULO__", titulo)
    html = html.replace(
        "\n__SCRIPTS__",
        "".join('\n<script src="assets/js/%s"></script>' % nome for nome in scripts),
    )
    html = html.replace("__LOGO__", logo(32))
    nav1 = NAV_ADMIN if admin else (NAV_EMPRESA if empresa else NAV_PRINCIPAL)
    nav2 = NAV_ADMIN_GOVERNANCA if admin else (NAV_EMPRESA_PERFIL if empresa else NAV_PERFIL)
    html = html.replace("__NAV1__", bloco_nav(nav1, ativo))
    html = html.replace("__NAV2__", bloco_nav(nav2, ativo))
    html = html.replace("__GRUPO1__",
                        "Administração" if admin else ("Contratação" if empresa else "Trabalho"))
    html = html.replace("__GRUPO2__",
                        "Governança" if admin else ("Minha empresa" if empresa else "Minha carreira"))
    html = html.replace("__INICIO_HREF__",
                        "admin-inicio.html" if admin else
                        ("empresa-inicio.html" if empresa else "inicio.html"))
    html = html.replace("__RODAPE_LATERAL__",
                        RODAPE_ADMIN if admin else (RODAPE_EMPRESA if empresa else RODAPE_PROFISSIONAL))
    html = html.replace("__ICO_LUPA__", ico("lupa"))
    html = html.replace("__ICO_SINO__", ico("sino"))
    html = html.replace("__ICO_ENGRENAGEM__", ico("engrenagem"))
    html = html.replace("__ICO_MANUAL__", ico("documento"))
    config = ("admin-configuracoes.html" if admin else
              ("empresa-configuracoes.html" if empresa else "configuracoes.html"))
    html = html.replace("__CONFIG_HREF__", config)
    html = html.replace("__CONFIG_ATUAL__", ' aria-current="page"' if ativo == config else "")
    html = html.replace("__ICO_FAISCA__", ico("faisca"))
    html = html.replace("__ICO_SAIR__", ico("sair"))
    html = html.replace(
        "__MIRANDA_ATUAL__",
        ' aria-current="page"' if ativo == "miranda.html" else "",
    )
    html = html.replace("__CORPO__", corpo)
    # Depois do corpo: o marcador pode vir de dentro dele. Aviso do item 10.2,
    # inserido em toda tela que mostra percentual de correspondência.
    html = html.replace("__AVISO_IND__", AVISO_INDICATIVO % ico("escudo"))
    return html


# --------------------------------------------------------------------------
# Trechos reutilizaveis
# --------------------------------------------------------------------------
def estatistica(valor, rotulo, icone, cor=""):
    classe = " " + cor if cor else ""
    return """<div class="cartao">
        <div class="estatistica">
          <span class="icone%s">%s</span>
          <span>
            <span class="valor">%s</span>
            <span class="rotulo">%s</span>
          </span>
        </div>
      </div>""" % (classe, ico(icone), valor, rotulo)


def oportunidade(tag, classe_tag, titulo, resumo, empresa, local, publicado, compat,
                 iniciais, cor_avatar, demanda_id="2026-118"):
    return """<article class="oportunidade">
          <span class="avatar avatar-empresa avatar-md %s">%s</span>
          <div>
            <span class="etiqueta %s">%s</span>
            <h3>%s</h3>
            <p>%s</p>
            <div class="meta-linha">
              <span class="meta">%s %s</span>
              <span class="meta">%s %s</span>
              <span class="meta">%s Publicado %s</span>
            </div>
          </div>
          <div class="oportunidade-acoes">
            <button class="salvar" type="button" aria-label="Salvar oportunidade" aria-pressed="false">%s</button>
            <span class="compatibilidade">%s compatível</span>
            <a class="btn btn-sm" href="oportunidade.html?d=%s">Ver detalhes</a>
          </div>
        </article>""" % (cor_avatar, iniciais, classe_tag, tag, titulo, resumo,
                         ico("predio"), empresa, ico("pino"), local,
                         ico("relogio"), publicado, ico("marcador"), compat, demanda_id)


# --------------------------------------------------------------------------
# 1. Painel inicial
# --------------------------------------------------------------------------
INICIO = """      <div class="pagina-cabecalho">
        <div>
          <h1>Olá, <span data-usuario-campo="primeiroNome">visitante</span></h1>
          <p id="subtitulo-painel">&nbsp;</p>
        </div>
      </div>

      <section class="banner">
        <div>
          <h2>Portfólio em dia, demanda certa no seu caminho</h2>
          <p>Sua nota de compatibilidade sai do que está no portfólio: acervo do Crea,
             projetos e currículo. Cada item que você acrescenta melhora a posição nas buscas.</p>
          <div class="banner-acoes">
            <a class="btn" href="oportunidades.html">Buscar oportunidades</a>
            <a class="btn btn-contorno" href="portfolio.html">Atualizar portfólio</a>
          </div>
        </div>
        <div class="banner-arte" aria-hidden="true">__ARTE__</div>
      </section>

      <section class="secao">
        <div class="cartao busca-painel">
          <div class="busca-painel-texto">
            <h2>Procurando um parceiro para um projeto?</h2>
            <p class="dica">Encontre quem assina a disciplina que você não assina — elétrica,
               ambiental, agronomia — e proponha uma parceria.</p>
          </div>

          <form class="busca-painel-campos" action="profissionais.html" method="get">
            <div class="campo">
              <label class="sr-apenas" for="busca-parceiro">Especialidade ou nome</label>
              <div class="campo-entrada">
                __ICO_LUPA_BUSCA__
                <input id="busca-parceiro" name="q" type="search"
                       placeholder="Especialidade, competência ou nome">
              </div>
            </div>
            <button class="btn" type="submit">Buscar</button>
          </form>

          <div class="busca-painel-atalhos">
            <span class="dica">Buscas frequentes:</span>
            <a class="etiqueta" href="profissionais.html?area=Eletrica">Elétrica</a>
            <a class="etiqueta" href="profissionais.html?area=Ambiental">Ambiental</a>
            <a class="etiqueta" href="profissionais.html?area=Geotecnia">Geotecnia</a>
            <a class="etiqueta" href="profissionais.html?area=Agronomia">Agronomia</a>
          </div>
        </div>
      </section>

      <section class="secao">
        <div class="grade grade-4">
          __STATS__
        </div>
      </section>

      <section class="secao">
        <div class="cartao analise-concluida" id="cartao-analise">
          <div class="analise-cabecalho">
            <div>
              <span class="etiqueta etiqueta-verde" id="estado-analise">__CHECKC__ Análise concluída</span>
              <h2 style="margin:10px 0 6px" id="titulo-analise">&nbsp;</h2>
              <p class="dica" id="base-analise"></p>
            </div>
            <div class="analise-nota">
              <span class="analise-valor" id="valor-analise">–</span>
              <span class="rotulo">compatibilidade</span>
            </div>
          </div>

          <div class="grade grade-principal" style="margin-top:22px; gap:30px">
            <div>
              <h3 style="margin-bottom:12px">Competências identificadas</h3>
              <div class="competencias" id="competencias-analise"></div>
            </div>

            <div>
              <h3 style="margin-bottom:14px">O que sustenta a sua nota</h3>
              <div style="display:grid; gap:14px" id="forca-analise"></div>
            </div>
          </div>

          __AVISO_IND__

          <div class="analise-acoes">
            <a class="btn btn-secundario" href="oportunidades.html" id="link-compativeis">Ver oportunidades compatíveis</a>
            <a class="btn btn-fantasma" href="portfolio.html">Atualizar meu portfólio</a>
            <button class="btn btn-fantasma" type="button" id="nova-analise">Refazer análise</button>
          </div>
        </div>
      </section>

      <section class="secao">
        <div class="grade grade-principal">
          <div>
            <div class="secao-titulo">
              <h2>Oportunidades recomendadas</h2>
              <a href="oportunidades.html">Ver todas</a>
            </div>
            <div class="lista-oportunidades" id="ops-recomendadas"></div>
          </div>

          <div>
            <div class="secao-titulo"><h2>Atividade recente</h2></div>
            <div class="cartao cartao-limpo">
              <ul class="lista-divisoria" id="atividade-recente"></ul>
            </div>

            <div class="cartao" style="margin-top:20px">
              <h3 style="margin-bottom:12px">Próximos prazos</h3>
              <ul id="proximos-prazos"></ul>
            </div>
          </div>
        </div>
      </section>
"""


def pagina_inicio():
    arte = """<svg width="230" height="150" viewBox="0 0 230 150" fill="none">
          <rect x="6" y="66" width="46" height="78" rx="5" fill="rgba(255,255,255,.24)"/>
          <rect x="60" y="38" width="52" height="106" rx="5" fill="rgba(255,255,255,.34)"/>
          <rect x="120" y="58" width="44" height="86" rx="5" fill="rgba(255,255,255,.22)"/>
          <rect x="172" y="22" width="50" height="122" rx="5" fill="rgba(255,255,255,.4)"/>
          <g fill="rgba(255,255,255,.55)">
            <rect x="70" y="52" width="10" height="10" rx="2"/><rect x="88" y="52" width="10" height="10" rx="2"/>
            <rect x="70" y="70" width="10" height="10" rx="2"/><rect x="88" y="70" width="10" height="10" rx="2"/>
            <rect x="182" y="38" width="11" height="11" rx="2"/><rect x="201" y="38" width="11" height="11" rx="2"/>
            <rect x="182" y="58" width="11" height="11" rx="2"/><rect x="201" y="58" width="11" height="11" rx="2"/>
          </g>
          <path d="M0 144h230" stroke="rgba(255,255,255,.6)" stroke-width="2"/>
        </svg>"""

    stats = "\n          ".join([
        estatistica("0", "Demandas abertas", "maleta"),
        estatistica("0", "Parcerias ativas", "equipe", "icone-roxo"),
        estatistica("0", "Avaliações recebidas", "estrela", "icone-ambar"),
        estatistica("0", "Documentos validados", "escudo", "icone-verde"),
    ])

    ops = "\n              ".join([
        oportunidade("Projeto", "", "Projeto elétrico industrial",
                     "Galpão de 4.200 m² com subestação própria. Exige ART de projeto e execução.",
                     "TechSolut Engenharia", "Manaus, AM", "há 1 h", "94%", "TS", "", "2026-118"),
        oportunidade("Parceria", "etiqueta-verde", "Consultoria ambiental para licenciamento",
                     "Parceria para licenciamento de empreendimento às margens do rio Negro.",
                     "Verde Engenharia", "Manaus, AM", "há 3 h", "88%", "VE", "avatar-verde", "2026-119"),
        oportunidade("Serviço", "etiqueta-roxa", "Laudo técnico de estrutura metálica",
                     "Vistoria e laudo de cobertura metálica com 1.800 m² em centro de distribuição.",
                     "Construtora Alfa", "Itacoatiara, AM", "há 5 h", "81%", "CA", "avatar-ambar", "2026-120"),
    ])

    def atividade(icone, titulo, desc, tempo, cor=""):
        classe = " " + cor if cor else ""
        return """<li>
                  <div class="item-atividade">
                    <span class="icone%s">%s</span>
                    <span>
                      <strong>%s</strong>
                      <span>%s</span>
                    </span>
                    <time>%s</time>
                  </div>
                </li>""" % (classe, ico(icone), titulo, desc, tempo)

    atividades = "\n                ".join([
        atividade("documento", "Nova demanda publicada", "Projeto estrutural residencial", "há 2 h"),
        atividade("checkcirculo", "Documento validado", "ART nº 2026/123456", "há 6 h", "icone-verde"),
        atividade("balao", "Mensagem da TechSolut", "Interesse no seu perfil", "ontem"),
        atividade("estrela", "Nova avaliação recebida", "Construtora Alfa · 4,5", "25/07", "icone-ambar"),
    ])

    def criterio(rotulo, valor, largura):
        return """<div>
                  <div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:6px">
                    <span>%s</span><strong>%s</strong>
                  </div>
                  <div class="barra-compat"><span style="width:%s"></span></div>
                </div>""" % (rotulo, valor, largura)

    forca = "\n                ".join([
        criterio("Acervo do Crea", "6 documentos", "100%"),
        criterio("Projetos descritos", "6 de 8", "75%"),
        criterio("Currículo e certificados", "Completo", "100%"),
        criterio("Áreas de atuação declaradas", "3 de 5", "60%"),
    ])

    corpo = (INICIO.replace("__ARTE__", arte)
                   .replace("__FORCA__", forca)
                   .replace("__CHECKC__", ico("check"))
                   .replace("__ICO_LUPA_BUSCA__", ico("lupa"))
                   .replace("__STATS__", stats)
                   .replace("__OPS__", ops)
                   .replace("__ATIVIDADES__", atividades)
                   .replace("__CHECK__", ico("check")))
    return shell("Início", "inicio.html", corpo)


# --------------------------------------------------------------------------
# 2. Oportunidades
# --------------------------------------------------------------------------
def pagina_oportunidades():
    ops = "\n            ".join([
        oportunidade("Projeto", "", "Projeto elétrico industrial",
                     "Galpão de 4.200 m² com subestação própria. Exige ART de projeto e execução.",
                     "TechSolut Engenharia", "Manaus, AM", "há 1 h", "94%", "TS", "", "2026-118"),
        oportunidade("Parceria", "etiqueta-verde", "Consultoria ambiental para licenciamento",
                     "Parceria para licenciamento de empreendimento às margens do rio Negro.",
                     "Verde Engenharia", "Manaus, AM", "há 3 h", "88%", "VE", "avatar-verde", "2026-119"),
        oportunidade("Serviço", "etiqueta-roxa", "Laudo técnico de estrutura metálica",
                     "Vistoria e laudo de cobertura metálica com 1.800 m² em centro de distribuição.",
                     "Construtora Alfa", "Itacoatiara, AM", "há 5 h", "81%", "CA", "avatar-ambar", "2026-120"),
        oportunidade("Projeto", "", "Compatibilização de projetos em BIM",
                     "Compatibilização arquitetônico-estrutural de hospital de 9 pavimentos.",
                     "Norte Projetos", "Parintins, AM", "ontem", "76%", "NP", "avatar-roxo", "2026-121"),
        oportunidade("Serviço", "etiqueta-roxa", "Fiscalização de obra pública",
                     "Acompanhamento mensal de obra de saneamento com emissão de relatórios.",
                     "Prefeitura de Iranduba", "Iranduba, AM", "há 2 dias", "72%", "PI", "", "2026-120"),
    ])

    def filtro(rotulo, marcado=False, contador=""):
        check = " checked" if marcado else ""
        extra = ' <span style="margin-left:auto;color:var(--tinta-3);font-size:13px">%s</span>' % contador if contador else ""
        return ('<label class="opcao-filtro"><input type="checkbox"%s><span>%s</span>%s</label>'
                % (check, rotulo, extra))

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Oportunidades</h1>
          <p>38 demandas abertas compatíveis com o seu registro profissional.</p>
        </div>
        <div style="display:flex; gap:10px">
          <button class="btn btn-secundario" type="button">Salvar esta busca</button>
          <button class="btn" type="button">Criar alerta</button>
        </div>
      </div>

      <div class="grade grade-filtro">
        <aside class="cartao">
          <h3 style="margin-bottom:14px">Filtros</h3>

          <div class="filtro-bloco">
            <h4>Tipo de demanda</h4>
            __TIPOS__
          </div>

          <div class="filtro-bloco">
            <h4>Área de atuação</h4>
            __AREAS__
          </div>

          <div class="filtro-bloco">
            <h4>Local</h4>
            <div class="campo" style="margin-bottom:10px">
              <label class="sr-apenas" for="cidade">Cidade</label>
              <select id="cidade">
                <option>Manaus, AM</option>
                <option>Todo o Amazonas</option>
                <option>Região Norte</option>
                <option>Brasil</option>
              </select>
            </div>
            __MODAL__
          </div>

          <div class="filtro-bloco">
            <button class="btn btn-bloco" type="button">Aplicar filtros</button>
            <button class="btn btn-fantasma btn-bloco" type="button" style="margin-top:8px">Limpar</button>
          </div>
        </aside>

        <div>
          <div class="abas" role="group" aria-label="Filtrar lista">
            <button class="aba-filtro" type="button" aria-pressed="true">Todas</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Projetos</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Parcerias</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Serviços</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Salvas</button>
          </div>

          <div class="secao-titulo">
            <span class="meta">38 demandas compatíveis com o seu registro</span>
          </div>

          __AVISO_IND__

          <div class="lista-oportunidades">
            __OPS__
          </div>

          <div style="display:flex; justify-content:center; margin-top:24px">
            <button class="btn btn-secundario" type="button">Carregar mais</button>
          </div>
        </div>
      </div>
"""
    tipos = "\n            ".join([filtro("Projeto", True), filtro("Parceria", False),
                                  filtro("Serviço", True), filtro("Vaga fixa", False)])
    areas = "\n            ".join([filtro("Civil / estrutural", True), filtro("Elétrica"),
                                   filtro("Ambiental"), filtro("Mecânica"), filtro("Agronomia")])
    modal = "\n            ".join([filtro("Presencial", True), filtro("Remoto"), filtro("Híbrido")])

    corpo = (corpo.replace("__TIPOS__", tipos).replace("__AREAS__", areas)
                  .replace("__MODAL__", modal).replace("__OPS__", ops))
    return shell("Oportunidades", "oportunidades.html", corpo)


# --------------------------------------------------------------------------
# 3. Triagem inteligente
# --------------------------------------------------------------------------
def pagina_portfolio():
    """Meu portfólio: projetos, documentos técnicos, currículo e certificados.

    Os documentos do Crea entram aqui no mesmo formato dos projetos — cartões
    numa grade, com abas por tipo. São a mesma coisa do ponto de vista de quem
    contrata: prova de que o profissional já fez aquilo. A diferença é a
    origem, e ela aparece no próprio cartão: projeto é declarado, ART e CAT
    são confirmadas na base do Crea.
    """
    skyline = ('<svg viewBox="0 0 300 152" preserveAspectRatio="none" fill="rgba(255,255,255,.28)">'
               '<rect x="18" y="72" width="52" height="80" rx="4"/>'
               '<rect x="80" y="44" width="60" height="108" rx="4"/>'
               '<rect x="150" y="64" width="50" height="88" rx="4"/>'
               '<rect x="210" y="30" width="58" height="122" rx="4"/>'
               '<g fill="rgba(255,255,255,.45)">'
               '<rect x="92" y="58" width="12" height="12" rx="2"/><rect x="112" y="58" width="12" height="12" rx="2"/>'
               '<rect x="92" y="80" width="12" height="12" rx="2"/><rect x="112" y="80" width="12" height="12" rx="2"/>'
               '<rect x="222" y="44" width="13" height="13" rx="2"/><rect x="243" y="44" width="13" height="13" rx="2"/>'
               '<rect x="222" y="66" width="13" height="13" rx="2"/><rect x="243" y="66" width="13" height="13" rx="2"/>'
               '</g></svg>')

    def projeto(titulo, desc, etiqueta, periodo, area, capa):
        return """<article class="projeto">
            <div class="projeto-capa %s">%s<span class="etiqueta">%s</span></div>
            <div class="projeto-corpo">
              <h3>%s</h3>
              <p>%s</p>
              <div class="projeto-rodape">
                <span class="meta">%s %s</span>
                <span class="meta">%s</span>
              </div>
            </div>
          </article>""" % (capa, skyline, etiqueta, titulo, desc, ico("relogio"), periodo, area)

    def documento(tipo, numero, atividade, obra, origem, situacao, classe):
        """Mesmo cartão dos projetos, com a capa trocada pelo tipo do documento."""
        return """<article class="projeto documento-card">
            <div class="documento-capa">
              <span class="documento-tipo">%s</span>
              <span class="documento-numero">%s</span>
              <span class="etiqueta %s">%s</span>
            </div>
            <div class="projeto-corpo">
              <h3>%s</h3>
              <p>%s</p>
              <div class="projeto-rodape">
                <span class="meta">%s %s</span>
                <span class="meta">%s</span>
              </div>
            </div>
          </article>""" % (tipo, numero, classe, situacao, atividade, obra,
                           ico("escudo"), origem, "Crea-AM")

    def arquivo(nome, detalhe, tamanho):
        return """<li class="arquivo">
                %s
                <span>
                  <strong style="display:block; font-size:14px">%s</strong>
                  <span style="font-size:12.5px; color:var(--tinta-3)">%s</span>
                </span>
                <span class="tamanho">%s</span>
              </li>""" % (ico("checkcirculo"), nome, detalhe, tamanho)

    def vincular(tipo, rotulo, exemplo):
        """Vínculo por número: a confirmação vem da API, não de um anexo."""
        return """<details class="vincular-manual">
            <summary>%s Vincular uma %s pelo número</summary>
            <p class="dica">Informamos o número ao Crea com o seu RNP e a resposta oficial
               entra no acervo. Você não anexa o documento — ele continua lá.</p>
            <div class="vincular-campos">
              <div class="campo">
                <label for="rnp-%s">Seu RNP</label>
                <input id="rnp-%s" type="text" data-usuario-rnp placeholder="Registro Nacional do Profissional">
              </div>
              <div class="campo">
                <label for="numero-%s">Número da %s</label>
                <input id="numero-%s" type="text" placeholder="%s">
              </div>
              <button class="btn" type="button" data-validar="%s" aria-label="Validar no Crea">%s Validar no Crea</button>
            </div>
            <div class="retorno-crea" id="retorno-%s" hidden></div>
          </details>""" % (ico("mais"), rotulo, tipo, tipo, tipo, rotulo, tipo,
                           exemplo, tipo, ico("lupa_doc"), tipo)

    projetos = "\n          ".join([
        projeto("Edifício Residencial Manaós", "Projeto estrutural completo, 18 pavimentos, fundação profunda.",
                "Concluído", "05/2023", "Estrutural", ""),
        projeto("Indústria de Alimentos Norte", "Projeto elétrico e SPDA para planta industrial de 6.000 m².",
                "Concluído", "12/2022", "Elétrica", "capa-ambar"),
        projeto("Centro Comercial Ponta Negra", "Instalações hidráulicas e combate a incêndio.",
                "Concluído", "08/2022", "Hidráulica", "capa-cinza"),
        projeto("Ponte sobre o igarapé do Quarenta", "Reforço estrutural e laudo de capacidade de carga.",
                "Em andamento", "Desde 03/2026", "Estrutural", "capa-verde"),
        projeto("Hospital Regional de Parintins", "Compatibilização de projetos em BIM, 9 pavimentos.",
                "Em andamento", "Desde 06/2026", "BIM", "capa-roxa"),
        projeto("Galpão logístico Distrito Industrial", "Estrutura metálica e memorial de cálculo.",
                "Concluído", "02/2021", "Estrutural", "capa-cinza"),
    ])

    documentos = "\n          ".join([
        documento("ART", "2026/123456", "Projeto estrutural residencial", "Residencial Ponta Negra",
                  "Confirmada em 10/07/2026", "Validada", "etiqueta-verde"),
        documento("ART", "2026/123455", "Laudo técnico estrutural", "Centro de Distribuição Alfa",
                  "Confirmada em 02/07/2026", "Validada", "etiqueta-verde"),
        documento("ART", "2026/123454", "Instalações hidráulicas", "Edifício Solimões",
                  "Aguardando retorno da consulta", "Em consulta", "etiqueta-ambar"),
        documento("ART", "2026/123451", "Projeto elétrico e SPDA", "Indústria de Alimentos Norte",
                  "Confirmada em 18/06/2026", "Validada", "etiqueta-verde"),
        documento("CAT", "2025/0881", "Execução de fundação profunda", "Edifício Residencial Manaós",
                  "Confirmada em 12/12/2025", "Validada", "etiqueta-verde"),
        documento("CAT", "2024/0640", "Projeto elétrico industrial", "Indústria de Alimentos Norte",
                  "Confirmada em 05/11/2024", "Validada", "etiqueta-verde"),
    ])

    curriculo = arquivo("curriculo-daniel-carmo.pdf", "Enviado em 04/09/2026 · lido pela análise", "820 KB")
    certificados = "\n              ".join([
        arquivo("diploma-engenharia-civil-ufam.pdf", "Universidade Federal do Amazonas · 2018", "1,2 MB"),
        arquivo("curso-revit-estrutural.pdf", "Certificação BIM · 2024", "640 KB"),
        arquivo("nr-35-trabalho-em-altura.pdf", "Válido até 03/2027", "410 KB"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Meu portfólio</h1>
          <p>Projetos, documentos técnicos e certificados. É daqui que sai a sua nota de
             compatibilidade, mostrada no início.</p>
        </div>
        <button class="btn" type="button">__MAIS__ Adicionar projeto</button>
      </div>

      <section class="secao" style="margin-top:0">
        <div class="secao-titulo">
          <h2>Projetos</h2>
          <span class="dica">6 projetos · 4 concluídos e 2 em andamento</span>
        </div>

        <div class="abas" role="group" aria-label="Filtrar lista">
          <button class="aba-filtro" type="button" aria-pressed="true">Todos</button>
          <button class="aba-filtro" type="button" aria-pressed="false">Concluídos</button>
          <button class="aba-filtro" type="button" aria-pressed="false">Em andamento</button>
          <button class="aba-filtro" type="button" aria-pressed="false">Arquivados</button>
        </div>

        <div class="grade grade-3">
          __PROJETOS__
        </div>
      </section>

      <section class="secao">
        <div class="secao-titulo">
          <h2>Documentos técnicos</h2>
          <span class="dica">6 documentos · 5 validados e 1 em consulta</span>
        </div>

        <p class="dica" style="margin-bottom:16px; max-width:82ch">
          ARTs e CATs não são anexadas: você informa o número e a confirmação vem da base do
          Crea. Arquivo enviado por quem tem interesse no resultado seria declaração, não
          comprovação — e é essa diferença que dá valor ao selo. O documento continua no Crea.
        </p>

        <div class="abas" role="group" aria-label="Filtrar lista">
          <button class="aba-filtro" type="button" aria-pressed="true">Todos</button>
          <button class="aba-filtro" type="button" aria-pressed="false">ARTs</button>
          <button class="aba-filtro" type="button" aria-pressed="false">CATs</button>
          <button class="aba-filtro" type="button" aria-pressed="false">Em consulta</button>
        </div>

        <div class="grade grade-3" style="margin-bottom:16px">
          __DOCUMENTOS__
        </div>

        <div class="grade grade-2">
          __VINCULAR_ART__
          __VINCULAR_CAT__
        </div>
      </section>

      <section class="secao">
        <div class="secao-titulo">
          <h2>Currículo e certificados</h2>
          <span class="dica">O que o Crea não emite — reforça o perfil, sem selo de verificado</span>
        </div>

        <div class="grade grade-2" style="align-items:start">
          <div class="cartao cartao-limpo">
            <div class="cartao-cabecalho">
              <h3>Currículo</h3>
              <button class="btn btn-secundario btn-sm" type="button">Substituir</button>
            </div>
            <ul class="lista-arquivos" style="padding:16px 20px 20px">
              __CURRICULO__
            </ul>
          </div>

          <div class="cartao cartao-limpo">
            <div class="cartao-cabecalho">
              <h3>Diplomas e certificados</h3>
              <button class="btn btn-secundario btn-sm" type="button">__MAIS__ Adicionar</button>
            </div>
            <ul class="lista-arquivos" style="padding:16px 20px 20px">
              __CERTIFICADOS__
            </ul>
          </div>
        </div>
      </section>
"""
    corpo = (corpo.replace("__PROJETOS__", projetos)
                  .replace("__DOCUMENTOS__", documentos)
                  .replace("__VINCULAR_ART__", vincular("art", "ART", "Ex.: 2026/123456"))
                  .replace("__VINCULAR_CAT__", vincular("cat", "CAT", "Ex.: 2025/0881"))
                  .replace("__CURRICULO__", curriculo)
                  .replace("__CERTIFICADOS__", certificados)
                  .replace("__MAIS__", ico("mais")))
    return shell("Meu portfólio", "portfolio.html", corpo, scripts=("crea-api.js",))


# --------------------------------------------------------------------------
# 6. Mensagens
# --------------------------------------------------------------------------
def pagina_mensagens(lado="profissional"):
    def conversa(iniciais, nome, previa, hora, nao_lidas="", atual=False, cor=""):
        badge = '<span class="nao-lidas">%s</span>' % nao_lidas if nao_lidas else ""
        marca = ' aria-current="true"' if atual else ""
        return """<button class="conversa" type="button"%s>
              <span class="avatar avatar-empresa %s">%s</span>
              <span style="flex:1; min-width:0">
                <span class="conversa-topo">
                  <strong>%s</strong>
                  <time>%s</time>
                </span>
                <span class="conversa-topo">
                  <p>%s</p>
                  %s
                </span>
              </span>
            </button>""" % (marca, cor, iniciais, nome, hora, previa, badge)

    conversas = "\n            ".join([
        conversa("TS", "TechSolut Engenharia", "Temos interesse no seu perfil para o projeto elétrico.", "10:30", "2", True),
        conversa("VE", "Verde Engenharia", "Podemos marcar uma reunião para detalhar a parceria?", "ontem", "1", False, "avatar-verde"),
        conversa("CA", "Construtora Alfa", "Documento recebido, obrigado!", "25/07", "", False, "avatar-ambar"),
        conversa("AB", "Ana Beatriz Farias", "Perfeito, fico no aguardo.", "24/07"),
        conversa("LM", "Lucas Martins", "Obrigado pelo retorno.", "20/07", "", False, "avatar-roxo"),
        conversa("NP", "Norte Projetos", "Enviei o escopo em anexo.", "18/07", "", False, "avatar-verde"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Mensagens</h1>
          <p>3 conversas não lidas.</p>
        </div>
        <button class="btn" type="button">__MAIS__ Nova conversa</button>
      </div>

      <div class="painel-mensagens">
        <div class="coluna-conversas">
          <div class="busca-conversas">
            <label class="sr-apenas" for="busca-conversas">Buscar conversas</label>
            <input id="busca-conversas" type="search" placeholder="Buscar conversas">
          </div>
          <div class="lista-conversas">
            __CONVERSAS__
          </div>
        </div>

        <div class="coluna-conversa">
          <div class="conversa-cabecalho">
            <span class="avatar avatar-empresa">TS</span>
            <div style="flex:1">
              <strong style="display:block; font-size:15px">TechSolut Engenharia</strong>
              <span class="meta">Projeto elétrico industrial · Manaus, AM</span>
            </div>
            <button class="btn btn-secundario btn-sm" type="button">Ver demanda</button>
          </div>

          <div class="mensagens-corpo">
            <span class="divisor-data">Hoje</span>

            <div class="balao balao-recebido">
              Olá! Vimos suas ARTs de projeto elétrico industrial e temos interesse no seu perfil
              para o galpão do Distrito Industrial.
              <time>10:12</time>
            </div>

            <div class="balao balao-enviado">
              Bom dia! Tenho disponibilidade a partir da próxima semana. O galpão já tem projeto
              arquitetônico aprovado?
              <time>10:20</time>
            </div>

            <div class="balao balao-recebido">
              Tem sim, aprovado em julho. Posso enviar as pranchas e o memorial hoje ainda.
              <time>10:28</time>
            </div>

            <div class="balao balao-recebido">
              Você atende também a parte de subestação?
              <time>10:30</time>
            </div>
          </div>

          <div class="compositor">
            <button class="botao-icone" type="button" aria-label="Anexar arquivo">__CLIPE__</button>
            <label class="sr-apenas" for="nova-mensagem">Escreva uma mensagem</label>
            <input id="nova-mensagem" type="text" placeholder="Escreva uma mensagem">
            <button class="btn" type="button">__ENVIAR__ Enviar</button>
          </div>
        </div>

        <aside class="coluna-contexto">
          <h3 style="margin-bottom:12px">Sobre a demanda</h3>
          <p style="font-size:14px; color:var(--tinta-2); margin-bottom:16px">
            Projeto elétrico industrial para galpão de 4.200 m² com subestação própria.
          </p>
          <ul style="display:grid; gap:10px; margin-bottom:18px">
            <li class="meta">__PINO__ Distrito Industrial, Manaus</li>
            <li class="meta">__RELOGIO__ Início previsto: outubro</li>
            <li class="meta">__DOC__ Exige ART de projeto e execução</li>
          </ul>
          <div class="faixa-verificado" style="margin-bottom:16px">
            __ESCUDO__
            <span>
              <strong>Empresa verificada</strong>
              <span>CNPJ e registro conferidos</span>
            </span>
          </div>
          <button class="btn btn-bloco" type="button">Enviar proposta</button>
          <button class="btn btn-secundario btn-bloco" style="margin-top:8px" type="button">Compartilhar portfólio</button>
        </aside>
      </div>
"""
    corpo = (corpo.replace("__CONVERSAS__", conversas).replace("__MAIS__", ico("mais"))
                  .replace("__CLIPE__", ico("clipe")).replace("__ENVIAR__", ico("enviar"))
                  .replace("__PINO__", ico("pino")).replace("__RELOGIO__", ico("relogio"))
                  .replace("__DOC__", ico("documento")).replace("__ESCUDO__", ico("escudo")))
    alvo = "empresa-mensagens.html" if lado == "empresa" else "mensagens.html"
    return shell("Mensagens", alvo, corpo, scripts=("mensagens.js",), lado=lado)


# --------------------------------------------------------------------------
# 7. Avaliacoes
# --------------------------------------------------------------------------
def pagina_avaliacoes(lado="profissional"):
    def linha_dist(rotulo, largura, total):
        return """<div class="linha-distribuicao">
              <span>%s</span>
              <span class="barra-dist"><span style="width:%s"></span></span>
              <span>%s</span>
            </div>""" % (rotulo, largura, total)

    def avaliacao(iniciais, empresa, projeto, nota, texto, data, cor=""):
        return """<li>
              <div class="avaliacao-item">
                <span class="avatar avatar-empresa avatar-md %s">%s</span>
                <div>
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start">
                    <div>
                      <strong style="font-size:15px">%s</strong>
                      <span class="meta" style="margin-top:2px">%s</span>
                    </div>
                    <div style="text-align:right">
                      %s
                      <span class="meta" style="justify-content:flex-end">%s</span>
                    </div>
                  </div>
                  <p>%s</p>
                </div>
              </div>
            </li>""" % (cor, iniciais, empresa, projeto, estrelas(nota), data, texto)

    avaliacoes = "\n            ".join([
        avaliacao("TS", "TechSolut Engenharia", "Projeto estrutural industrial", 5,
                  "Excelente profissional. Entregou o projeto no prazo e com muita qualidade técnica. "
                  "A comunicação durante a obra foi um diferencial.", "25/07/2026"),
        avaliacao("CA", "Construtora Alfa", "Laudo técnico estrutural", 4,
                  "Laudo bem fundamentado e entregue dentro do combinado. Pequeno atraso na vistoria inicial.",
                  "12/07/2026", "avatar-ambar"),
        avaliacao("VE", "Verde Engenharia", "Consultoria em licenciamento", 5,
                  "Domínio da legislação ambiental do Amazonas e ótima disponibilidade para reuniões.",
                  "28/06/2026", "avatar-verde"),
        avaliacao("NP", "Norte Projetos", "Compatibilização em BIM", 5,
                  "Trabalho preciso, reduziu bastante o retrabalho na obra.", "15/06/2026", "avatar-roxo"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Avaliações</h1>
          <p>O que empresas e parceiros dizem sobre os seus serviços.</p>
        </div>
        <button class="btn btn-secundario" type="button">Solicitar avaliação</button>
      </div>

      <div class="grade grade-principal">
        <div>
          <div class="cartao" style="margin-bottom:20px">
            <div class="resumo-nota">
              <div style="text-align:center">
                <div class="nota-grande" data-conta="nota">–</div>
                <div style="margin:8px 0 4px" data-conta="estrelas">__ESTRELAS__</div>
                <span class="meta" style="justify-content:center" data-conta="base-nota">Nenhuma avaliação ainda</span>
              </div>
              <div style="display:grid; gap:8px" data-conta="distribuicao">
                __DIST__
              </div>
            </div>
          </div>

          <div class="abas" role="group" aria-label="Filtrar lista">
            <button class="aba-filtro" type="button" aria-pressed="true">Recebidas</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Realizadas</button>
          </div>

          <div class="cartao cartao-limpo">
            <ul class="lista-divisoria"></ul>
          </div>
        </div>

        <div>
          <div class="cartao">
            <h3 style="margin-bottom:12px">Notas por critério</h3>
            <div style="display:grid; gap:14px" data-conta="criterios"></div>
          </div>

          <div class="cartao" style="margin-top:20px">
            <h3 style="margin-bottom:8px">Reputação no ProLink</h3>
            <p style="font-size:13.5px; color:var(--tinta-2); margin-bottom:14px">
              Só quem contratou pelo ProLink pode avaliar. Cada nota fica vinculada a um contrato registrado.
            </p>
            <div class="faixa-verificado">
              __ESCUDO__
              <span>
                <strong data-conta="verificadas">Nenhuma avaliação ainda</strong>
                <span>Cada nota vem de um contrato registrado</span>
              </span>
            </div>
          </div>
        </div>
      </div>
"""

    def criterio(rotulo, nota, largura):
        return """<div>
                <div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:6px">
                  <span>%s</span><strong>%s</strong>
                </div>
                <div class="barra-compat"><span style="width:%s"></span></div>
              </div>""" % (rotulo, nota, largura)

    criterios = "\n              ".join([
        criterio("Qualidade técnica", "5,0", "100%"),
        criterio("Cumprimento de prazo", "4,8", "96%"),
        criterio("Comunicação", "4,9", "98%"),
        criterio("Documentação entregue", "4,6", "92%"),
    ])
    dist = "\n                ".join([
        linha_dist("5 estrelas", "0%", "0"),
        linha_dist("4 estrelas", "0%", "0"),
        linha_dist("3 estrelas", "0%", "0"),
        linha_dist("2 estrelas", "0%", "0"),
        linha_dist("1 estrela", "0%", "0"),
    ])
    corpo = (corpo.replace("__ESTRELAS__", estrelas(5)).replace("__DIST__", dist)
                  .replace("__AVALIACOES__", avaliacoes).replace("__CRITERIOS__", criterios)
                  .replace("__ESCUDO__", ico("escudo")))
    alvo = "empresa-avaliacoes.html" if lado == "empresa" else "avaliacoes.html"
    return shell("Avaliações", alvo, corpo, lado=lado)


# --------------------------------------------------------------------------
# 7b. Miranda (assistente virtual)
# --------------------------------------------------------------------------
def pagina_miranda():
    def sugestao(texto):
        return '<button type="button" data-sugestao="%s">%s</button>' % (texto, texto)

    sugestoes = "\n              ".join([
        sugestao("Qual a diferença entre ART e CAT?"),
        sugestao("Como anexo uma ART no ProLink?"),
        sugestao("Como a análise calcula minha compatibilidade?"),
        sugestao("Preciso de visto para atuar em outro estado?"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Miranda</h1>
          <p>Assistente do ProLink. Tire dúvidas sobre o sistema, sobre o Crea e sobre engenharia.</p>
        </div>
      </div>

      <details class="declaracao-ia">
        <summary>__ICO_CHIP__ Esta assistente usa inteligência artificial. Saiba o que isso significa</summary>

        <div class="declaracao-corpo">
          <div class="grade grade-2" style="gap:24px; align-items:start">
            <div>
              <h3>O que ela faz</h3>
              <p>Explica as telas do ProLink e responde dúvidas sobre ART, CAT, registro
                 profissional e anuidade. As respostas partem de um manual escrito e revisado
                 por pessoas, e a supervisão humana é permanente.</p>

              <h3 style="margin-top:18px">O que ela não faz</h3>
              <p><strong>A Miranda não decide nada.</strong> Não ordena profissionais, não
                 calcula compatibilidade e não influencia contratação. Quem ordena é uma regra
                 fixa, de pesos declarados, que você pode abrir em qualquer tela onde apareça
                 um percentual.</p>

              <h3 style="margin-top:18px">Seus dados</h3>
              <p>A conversa não leva CPF, RNP, e-mail nem acervo. Vai apenas a sua pergunta e
                 o manual da plataforma.</p>
            </div>

            <div>
              <h3>Riscos que assumimos</h3>
              <ul class="lista-descarte">
                <li>Ela pode errar ou entender mal a pergunta. Confira informação crítica
                    direto com o Crea.</li>
                <li>Pode não saber. Nesse caso responde que não consta, em vez de inventar.</li>
                <li>Modelos de linguagem carregam vieses do que leram. É por isso que ela não
                    participa de nenhuma decisão sobre pessoas.</li>
                <li>Não substitui atendimento oficial do Conselho nem parecer técnico.</li>
              </ul>

              <h3 style="margin-top:18px">Como reclamar</h3>
              <p>Resposta errada ou inadequada pode ser denunciada como qualquer outro
                 conteúdo, e a análise é feita por pessoas do Crea-AM.</p>
            </div>
          </div>

          <p class="dica" style="margin-top:18px">
            Declaração publicada em atenção ao item 12.3 do Edital nº 03/2026 — CREA-AM.
          </p>
        </div>
      </details>

      <section class="miranda-sala">
        <header class="miranda-cabecalho">
          <img class="rosto-miranda" src="assets/img/miranda-avatar.png" alt=""
               width="40" height="40">
          <span class="identidade">
            <strong>Miranda</strong>
            <small>Assistente virtual · responde na hora</small>
          </span>
          <button class="btn btn-secundario btn-sm" type="button" id="miranda-limpar">
            __RECOMECAR__ Nova conversa
          </button>
        </header>

        <div class="miranda-conversa" id="miranda-mensagens" role="log" aria-live="polite"
             aria-label="Conversa com a Miranda">
          <div class="miranda-vazio" id="miranda-vazio">
            <img class="miranda-corpo" src="assets/img/miranda.png"
                 alt="Miranda, assistente virtual do ProLink" width="176" height="199">
            <h2>Oi! Eu sou a Miranda</h2>
            <p>Pergunte como usar qualquer tela do ProLink, ou tire uma dúvida
               técnica sobre responsabilidade técnica, registro profissional e
               normas de engenharia.</p>
            <div class="sugestoes-miranda">
              __SUGESTOES__
            </div>
          </div>
        </div>

        <form class="miranda-compositor" id="miranda-form">
          <div class="miranda-caixa">
            <label class="sr-apenas" for="miranda-campo">Escreva sua pergunta para a Miranda</label>
            <textarea id="miranda-campo" rows="1" placeholder="Escreva sua pergunta…"></textarea>
            <button class="miranda-enviar" type="submit" id="miranda-enviar" aria-label="Enviar pergunta">
              __ENVIAR__
            </button>
          </div>
          <p class="miranda-aviso">
            Enter envia, Shift+Enter quebra a linha. A Miranda pode errar —
            confirme prazos e taxas no Crea da sua região.
          </p>
        </form>
      </section>
"""
    corpo = (corpo.replace("__SUGESTOES__", sugestoes)
                  .replace("__RECOMECAR__", ico("recomecar"))
                  .replace("__ENVIAR__", ico("enviar")))
    corpo = corpo.replace("__ICO_CHIP__", ico("chip"))
    return shell("Miranda", "miranda.html", corpo, scripts=("miranda.js",))


# --------------------------------------------------------------------------
# 8. Perfil
# --------------------------------------------------------------------------
def pagina_perfil():
    corpo = """      <div class="perfil-capa"></div>
      <div class="perfil-cabecalho">
        <span class="avatar avatar-lg" data-usuario-campo="iniciais">--</span>
        <div class="perfil-identidade">
          <h1 data-usuario-campo="nome">Perfil de teste</h1>
          <p style="color:var(--tinta-2)"><span data-usuario-campo="titulo">Profissional cadastrado</span> · <span data-usuario-campo="registro">Registro pendente</span></p>
          <div class="meta-linha" style="margin-top:10px">
            <span class="meta">__PINO__ <span data-usuario-campo="cidade">Manaus, AM</span></span>
            <span class="meta">__ESTRELA__ <span data-conta="resumo-avaliacoes">Sem avaliações</span></span>
          </div>
        </div>
        <div class="perfil-acoes">
          <button class="btn btn-fantasma" type="button"
                  data-denunciar="este perfil profissional">Denunciar</button>
          <a class="btn btn-secundario" href="perfil-publico.html">Ver perfil público</a>
          <button class="btn" type="button" id="abrir-editar-perfil">Editar perfil</button>
        </div>
      </div>

      <div class="grade grade-principal" style="margin-top:24px">
        <div>
          <div class="cartao" style="margin-bottom:20px">
            <h2 style="margin-bottom:10px">Sobre</h2>
            <p data-usuario-campo="sobre" data-conta="sobre" style="color:var(--tinta-2); max-width:70ch"></p>
          </div>

          <div class="cartao" style="margin-bottom:20px">
            <h2 style="margin-bottom:12px">Especialidades</h2>
            <div class="competencias" data-conta="especialidades"></div>
          </div>

          <div class="cartao cartao-limpo">
            <div class="cartao-cabecalho">
              <h2>Projetos</h2>
              <a class="link" href="portfolio.html">Ver portfólio</a>
            </div>
            <ul class="lista-divisoria" data-conta="projetos"></ul>
          </div>
        </div>

        <div>
          <div class="cartao" style="margin-bottom:20px">
            <div class="faixa-verificado" style="margin-bottom:16px" data-conta="faixa-verificado">
              __ESCUDO__
              <span>
                <strong data-conta="verificado-titulo">&nbsp;</strong>
                <span data-conta="verificado-texto"></span>
              </span>
            </div>
            <div class="grade grade-3" style="gap:12px; text-align:center">
              <div><strong style="display:block; font-size:20px" data-conta="n-documentos">0</strong><span class="rotulo">documentos</span></div>
              <div><strong style="display:block; font-size:20px" data-conta="n-projetos">0</strong><span class="rotulo">projetos</span></div>
              <div><strong style="display:block; font-size:20px" data-conta="nota">–</strong><span class="rotulo">avaliação</span></div>
            </div>
          </div>

          <div class="cartao" style="margin-bottom:20px">
            <h3 style="margin-bottom:12px">Registro profissional</h3>
            <ul style="display:grid; gap:12px; font-size:14px">
              <li style="display:flex; justify-content:space-between; gap:12px">
                <span style="color:var(--tinta-2)">Registro</span><strong data-usuario-campo="registro">Registro pendente</strong></li>
              <li style="display:flex; justify-content:space-between; gap:12px">
                <span style="color:var(--tinta-2)">Situação</span><span class="etiqueta" data-conta="situacao">–</span></li>
              <li style="display:flex; justify-content:space-between; gap:12px">
                <span style="color:var(--tinta-2)">Título</span><strong data-conta="titulo">–</strong></li>
            </ul>
            <a class="btn btn-secundario btn-bloco" style="margin-top:16px" href="portfolio.html">Ver meu portfólio</a>
          </div>

          <div class="cartao">
            <h3 style="margin-bottom:12px">Onde atende</h3>
            <ul data-conta="atendimento"></ul>
          </div>
        </div>
      </div>

      <div class="modal-fundo" id="modal-editar-perfil" hidden>
      <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="titulo-editar-perfil">
        <div class="modal-cabecalho">
          <h2 id="titulo-editar-perfil">Editar perfil</h2>
          <button class="botao-icone" type="button" id="fechar-editar-perfil" aria-label="Fechar">
            __ICO_FECHAR__
          </button>
        </div>
        <div class="modal-corpo">
          <div class="grade-form">
            <div class="campo campo-largo">
              <label for="editar-nome">Nome completo</label>
              <input id="editar-nome" type="text">
            </div>
            <div class="campo">
              <label for="editar-titulo">Título profissional</label>
              <input id="editar-titulo" type="text" placeholder="Ex.: Engenheiro civil">
            </div>
            <div class="campo">
              <label for="editar-cidade">Cidade e estado</label>
              <input id="editar-cidade" type="text" placeholder="Ex.: Manaus, AM">
            </div>
            <div class="campo campo-largo">
              <label for="editar-sobre">Sobre</label>
              <textarea id="editar-sobre" placeholder="Fale sobre sua atuação profissional."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-rodape">
          <button class="btn btn-secundario" type="button" id="cancelar-editar-perfil">Cancelar</button>
          <button class="btn" type="button" id="salvar-editar-perfil">Salvar alterações</button>
        </div>
      </div>
    </div>"""

    def experiencia(cargo, empresa, periodo, desc):
        return """<li>
                <div class="item-atividade">
                  <span class="icone">%s</span>
                  <span>
                    <strong>%s</strong>
                    <span>%s · %s</span>
                    <p style="font-size:13.5px; color:var(--tinta-2); margin-top:6px">%s</p>
                  </span>
                </div>
              </li>""" % (ico("predio"), cargo, empresa, periodo, desc)

    exp = "\n              ".join([
        experiencia("Engenheiro civil autônomo", "ProLink", "2021 — atual",
                    "Projeto estrutural e fiscalização para construtoras do Amazonas."),
        experiencia("Coordenador de projetos", "Norte Projetos", "2019 — 2021",
                    "Coordenação de equipe de 6 projetistas em obras verticais."),
        experiencia("Engenheiro de obras", "Construtora Alfa", "2017 — 2019",
                    "Acompanhamento de execução e medições em obra industrial."),
    ])
    corpo = (corpo.replace("__EXPERIENCIA__", exp).replace("__PINO__", ico("pino"))
                  .replace("__RELOGIO__", ico("relogio")).replace("__ESTRELA__", ico("estrela"))
                  .replace("__ESCUDO__", ico("escudo")).replace("__CHECK__", ico("check"))
                  .replace("__ICO_FECHAR__", ico("fechar")))
    return shell("Meu perfil", "perfil.html", corpo)


# --------------------------------------------------------------------------
# 9. Landing publica
# --------------------------------------------------------------------------
def pagina_index():
    def recurso(icone, titulo, texto):
        return """<div class="recurso">
            <span class="icone">%s</span>
            <h3>%s</h3>
            <p>%s</p>
          </div>""" % (ico(icone), titulo, texto)

    recursos = "\n          ".join([
        recurso("escudo", "Documentos validados",
                "ARTs e CATs conferidas junto ao Crea viram um selo visível para quem contrata."),
        recurso("chip", "Triagem inteligente",
                "A análise do currículo cruza suas competências com as demandas abertas e ordena por compatibilidade."),
        recurso("estrela", "Reputação com lastro",
                "Só avalia quem contratou pela plataforma, e cada nota fica ligada a um contrato registrado."),
    ])

    html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ProLink · Conecte. Valide. Construa.</title>
<meta name="description" content="A plataforma que conecta profissionais técnicos e impulsiona grandes projetos.">
<style>
  /* Enquanto o splash não entra, a página fica escondida: a primeira
     coisa que aparece é o splash, não um lampejo da página inicial. */
  html.splash-pendente { background: #0b1220; }
  html.splash-pendente body { visibility: hidden; }
  html.splash-pendente .splash { visibility: visible; }
</style>
<script>
  (function () {
    try {
      if (window.sessionStorage.getItem("prolink_splash_visto") === "1") { return; }
    } catch (erro) { /* sem sessionStorage: o splash aparece */ }
    var raiz = document.documentElement;
    raiz.classList.add("splash-pendente");
    /* Rede de segurança: se o script do splash falhar, a página aparece. */
    window.setTimeout(function () { raiz.classList.remove("splash-pendente"); }, 4000);
  })();
</script>
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body class="pagina-inicial">
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<header class="topo-publico">
  <a class="marca" href="index.html">__LOGO__<span class="marca-nome">Pro<span>Link</span></span></a>
  <nav aria-label="Navegação principal">
    <a href="buscar.html">Buscar profissionais</a>
    <a href="#recursos">Como funciona</a>
    <a href="#recursos">Para empresas</a>
  </nav>
</header>

<main id="conteudo">
  <section class="heroi">
    <div>
      <p class="assinatura">Conecte. Valide. Construa.</p>
      <h1>A plataforma que conecta profissionais técnicos e impulsiona grandes projetos.</h1>
      <p class="chamada">
        Engenheiros, agrônomos e geocientistas reúnem registro, documentos e portfólio em um só perfil —
        e as empresas encontram quem já comprovou o que sabe fazer.
      </p>
      <div class="heroi-botoes">
        <a class="btn btn-lg" href="cadastro.html" data-transicao="Abrindo seu cadastro…">Criar conta</a>
        <a class="btn btn-lg btn-secundario" href="login.html" data-transicao="Abrindo a tela de entrada…">Entrar</a>
      </div>
      <p class="dica" style="margin-top:14px">
        Sem registro no Crea, dá para seguir como visitante na tela de entrar: você navega
        e vê os perfis, mas não publica demanda nem recebe proposta.
      </p>

      <div class="heroi-numeros">
        <div><strong>Registro</strong><span>conferido no Crea</span></div>
        <div><strong>ART e CAT</strong><span>pelo número, sem upload</span></div>
        <div><strong>Avaliação</strong><span>só com contrato</span></div>
      </div>
    </div>

    <div class="heroi-arte">
      __PREVIA__
    </div>
  </section>

  <section class="faixa-recursos" id="recursos">
    <div class="interno">
      <h2 style="font-size:28px; letter-spacing:-.02em; margin-bottom:8px">Do registro ao contrato, no mesmo lugar</h2>
      <p style="color:var(--tinta-2); max-width:62ch; margin-bottom:34px">
        O ProLink resolve o problema mais caro de quem contrata serviço técnico: saber, antes de fechar,
        se o profissional está regular e se já fez aquilo antes.
      </p>
      <div class="grade grade-3">
        __RECURSOS__
      </div>
    </div>
  </section>
</main>

<footer class="rodape-publico">
  <span>ProLink · Desafio Crea Pro-Link — II CENATEC 2026 ·
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário</a></span>
  <span>Ambiente de divulgação voluntária. Não substitui contratação, habilitação,
        licitação, seleção, fiscalização ou verificação documental.</span>
</footer>

<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
<script src="assets/js/miranda-guia.js"></script>
</body>
</html>
"""

    previa = """<div class="fluxo">
        <p class="fluxo-titulo">Como um perfil vira contrato</p>

        <div class="fluxo-passo">
          <span class="icone">__I_ESCUDO__</span>
          <div>
            <strong>Registro conferido</strong>
            <p>ARTs e CATs checadas na base do Crea, sem depender do que o profissional declara.</p>
          </div>
        </div>

        <div class="fluxo-passo">
          <span class="icone">__I_CHIP__</span>
          <div>
            <strong>Demanda compatível</strong>
            <p>A análise cruza o histórico comprovado com as demandas abertas na região.</p>
          </div>
        </div>

        <div class="fluxo-passo">
          <span class="icone">__I_MALETA__</span>
          <div>
            <strong>Contrato fechado</strong>
            <p>Proposta, conversa e avaliação ficam registradas no mesmo lugar.</p>
          </div>
        </div>

        <svg class="fluxo-skyline" viewBox="0 0 420 90" preserveAspectRatio="none" aria-hidden="true">
          <rect x="10" y="42" width="54" height="48" rx="5"/>
          <rect x="76" y="20" width="62" height="70" rx="5"/>
          <rect x="150" y="52" width="50" height="38" rx="5"/>
          <rect x="212" y="8" width="66" height="82" rx="5"/>
          <rect x="290" y="36" width="52" height="54" rx="5"/>
          <rect x="354" y="58" width="56" height="32" rx="5"/>
        </svg>
      </div>"""

    previa = (previa.replace("__I_ESCUDO__", ico("escudo"))
                    .replace("__I_CHIP__", ico("chip"))
                    .replace("__I_MALETA__", ico("maleta")))
    return (html.replace("__LOGO__", logo(32)).replace("__RECURSOS__", recursos)
                .replace("__PREVIA__", previa))


# --------------------------------------------------------------------------
# 10. Login
# --------------------------------------------------------------------------
def pagina_login():
    html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entrar · ProLink</title>
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<div class="tela-login">
  <section class="login-vitrine">
    <a class="marca" href="index.html" style="color:#fff">__LOGO__<span class="marca-nome" style="color:#fff">Pro<span style="color:#fff">Link</span></span></a>

    <h2>Seu registro profissional, finalmente trabalhando a seu favor.</h2>
    <p>Entre para acompanhar demandas, validar documentos e responder empresas em um só lugar.</p>
    <ul class="login-lista">
      <li>__CHECK__ Documentos conferidos junto ao Crea</li>
      <li>__CHECK__ Oportunidades ordenadas por compatibilidade</li>
      <li>__CHECK__ Avaliações vinculadas a contratos reais</li>
    </ul>

    <p class="login-rodape">ProLink · Desafio Crea Pro-Link — II CENATEC 2026</p>
  </section>

  <main class="login-area" id="conteudo">
    <div class="login-caixa">
      <h1>Entrar</h1>
      <p>Acesse sua conta para continuar.</p>

      <div class="campo">
        <label for="identificacao">CPF, CNPJ ou e-mail</label>
        <div class="campo-entrada">
          __EMAIL__
          <input id="identificacao" type="text" placeholder="O documento ou o e-mail do cadastro"
                 autocomplete="username"
                 aria-describedby="erro-identificacao">
        </div>
        <span class="erro-campo" id="erro-identificacao" role="alert" hidden></span>
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <div class="campo-entrada">
          __CADEADO__
          <input id="senha" type="password" placeholder="Sua senha"
                 autocomplete="current-password"
                 aria-describedby="erro-senha">
        </div>
        <span class="erro-campo" id="erro-senha" role="alert" hidden></span>
        <div class="campo-rodape">
          <label class="opcao-filtro" style="padding:0"><input type="checkbox" id="manter-conectado" checked><span>Manter conectado</span></label>
          <a class="link" href="recuperar.html">Esqueci a senha</a>
        </div>
      </div>
      <button class="btn btn-lg btn-bloco" type="button" id="entrar-sessao">Entrar</button>

      <div class="separador">quer só conhecer o sistema?</div>

      <button class="btn btn-secundario btn-bloco" type="button" id="entrar-demonstracao">
        Usar modo de demonstração
      </button>
      <p class="aviso-demonstracao">
        __ESCUDO__
        <span>Veja o ProLink com dados fictícios, sem criar conta: como profissional (PF),
        empresa (PJ) ou administrativo.</span>
      </p>

      <div class="separador">ou entre com</div>

      <div class="botoes-sociais">
        <button class="botao-social" type="button" data-login-social="Google">__GOOGLE__ Google</button>
        <button class="botao-social" type="button" data-login-social="LinkedIn">__LINKEDIN__ LinkedIn</button>
      </div>

      <div class="separador">não tem registro no Crea?</div>

      <button class="btn btn-secundario btn-bloco" type="button" id="entrar-visitante">
        Entrar como visitante
      </button>
      <p class="dica" style="text-align:center; margin-top:8px">
        Navega e vê os perfis, sem publicar demanda nem receber proposta.
      </p>

      <p style="text-align:center; margin-top:24px; font-size:14px; color:var(--tinta-2)">
        Não tem uma conta? <a class="link" href="cadastro.html">Criar conta</a>
      </p>
      <p class="dica" style="text-align:center; margin-top:14px">
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário (PDF)</a>
      </p>
    </div>
  </main>
</div>
<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
<script src="assets/js/interacoes.js"></script>
<script src="assets/js/miranda-guia.js"></script>
</body>
</html>
"""
    google = ('<svg viewBox="0 0 24 24" aria-hidden="true">'
              '<path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2.05H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.24c1.9-1.75 3-4.34 3-7.35z"/>'
              '<path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 22z"/>'
              '<path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9z"/>'
              '<path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2 10 10 0 0 0 3.06 7.5l3.35 2.58C7.2 7.8 9.4 6.04 12 6.04z"/></svg>')
    linkedin = ('<svg viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">'
                '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4v11H3zM9.5 9.5h3.8v1.5a4.1 4.1 0 0 1 3.7-2c3 0 4 2 4 4.9v6.6h-4V15c0-1.5-.5-2.5-1.9-2.5-1.1 0-1.7.7-2 1.5-.1.3-.1.7-.1 1v5.5h-4z"/></svg>')

    return (html.replace("__LOGO__", logo(32)).replace("__CHECK__", ico("checkcirculo"))
                .replace("__EMAIL__", ico("email")).replace("__CADEADO__", ico("cadeado"))
                .replace("__GOOGLE__", google).replace("__LINKEDIN__", linkedin)
                .replace("__ESCUDO__", ico("escudo")))



# --------------------------------------------------------------------------
# 11. Criar conta
# --------------------------------------------------------------------------
def pagina_cadastro():
    """Cadastro linear: uma decisão por tela.

    A ordem é sempre a mesma e não dá para pular etapa:

        Crea achou:     Documento > Registro > Comprovação > Acesso > Experiência
        Crea não achou: Documento > Seus dados > Acesso > Experiência

    Registro mostra os dados do Crea logo depois da busca. Comprovação pede
    o CPF ou o CNPJ anexado, que o Gemini lê e o sistema confere com o
    registro. Acesso pede o e-mail — a API do Crea não tem e-mail — e a senha.

    Não há botão de consultar nem caixa de autorização na etapa 1: avançar
    dispara a busca no Crea, e a resposta escolhe a etapa 2. Quando o Crea
    confirma, nome, título, RNP e situação vêm de lá e viram uma ficha de
    leitura — ninguém digita o que a API já sabe (Anexo I, item 8.4). Quando
    não confirma, os mesmos campos aparecem para preencher e entram como
    declarados, com o perfil sem o selo de verificado.
    """

    def campo(rotulo, id_, tipo="text", ph="", largo=False, dica="", auto=""):
        cls = ' campo-largo' if largo else ''
        aut = ' autocomplete="%s"' % auto if auto else ''
        hint = '<span class="dica">%s</span>' % dica if dica else ''
        return """<div class="campo%s">
            <label for="%s">%s</label>
            <input id="%s" type="%s" placeholder="%s"%s>
            %s
          </div>""" % (cls, id_, rotulo, id_, tipo, ph, aut, hint)

    def selecao(rotulo, id_, opcoes, largo=False):
        cls = ' campo-largo' if largo else ''
        itens = "".join('<option>%s</option>' % o for o in opcoes)
        return """<div class="campo%s">
            <label for="%s">%s</label>
            <select id="%s">%s</select>
          </div>""" % (cls, id_, rotulo, id_, itens)

    def caixa(rotulo, id_="", dica=""):
        ident = ' id="%s"' % id_ if id_ else ''
        extra = '<span class="dica dica-aceite">%s</span>' % dica if dica else ''
        return ('<label class="aceite"><input type="checkbox"%s><span>%s%s</span></label>'
                % (ident, rotulo, extra))

    def upload(id_, titulo, texto, aceita, multiplo=False):
        return """<div class="bloco-upload">
            <label class="area-upload area-upload-campo" for="%s">
              %s
              <h3>%s</h3>
              <p>%s</p>
              <span class="btn btn-secundario btn-sm">Escolher arquivo</span>
              <input class="entrada-arquivo" id="%s" type="file" accept="%s"%s>
            </label>
            <ul class="lista-arquivos" data-lista-de="%s"></ul>
          </div>""" % (id_, ico("upload"), titulo, texto, id_, aceita,
                       " multiple" if multiplo else "", id_)

    def projeto_form(n):
        return """<fieldset class="projeto-form">
            <legend>Projeto %d</legend>
            <div class="grade-form">
              %s
              %s
              %s
              <div class="campo campo-largo">
                <label for="proj-desc-%d">O que você fez neste projeto</label>
                <textarea id="proj-desc-%d" placeholder="Ex.: cálculo estrutural e acompanhamento de execução da fundação profunda."></textarea>
              </div>
            </div>
          </fieldset>""" % (
            n,
            campo("Nome do projeto ou obra", "proj-nome-%d" % n, ph="Ex.: Edifício Residencial Manaós"),
            selecao("Área", "proj-area-%d" % n,
                    ["Estrutural", "Elétrica", "Hidráulica", "Ambiental", "Geotecnia",
                     "Mecânica", "Agronomia", "BIM / compatibilização", "Outra"]),
            campo("Ano de conclusão", "proj-ano-%d" % n, ph="2024"),
            n, n)

    # ---------------------------------------------------------------- etapa 1
    etapa_documento = """%s

          <div class="retorno-crea" id="retorno-crea" hidden></div>

""" % (
        campo("CPF", "documento", ph="Somente números", largo=True),)

    # ------------------------------------------------- etapa 2 (achou no Crea)
    etapa_confirmacao = """<div class="ficha-crea" id="resumo-crea"></div>

          <div class="acervo-importado" id="acervo-importado"></div>


          <div class="grupo-campo">
            %s
            <p class="dica" style="margin-top:10px">
              Não é você nesses dados? <button class="btn-texto" type="button" id="corrigir-documento">Voltar e corrigir o documento</button>
            </p>
          </div>""" % (
        caixa("Confirmo que esses dados são meus e autorizo o ProLink a usá-los no meu perfil",
              "aceite-uso-dados"),)

    # ---------------------------------------------------------------- etapa 2
    etapa_dados = """<div class="retorno-crea retorno-atencao" id="motivo-dados"></div>

          <div class="escolha-caminho" id="escolha-caminho">
            <p class="dica">O que você quer fazer no ProLink?</p>
            <div class="grade grade-2" style="gap:12px">
              <button class="opcao-caminho" type="button" data-caminho="registrado" aria-current="true">
                <strong>Ofertar serviço técnico</strong>
                <span>Tenho registro no Crea, mesmo que a consulta não tenha confirmado agora.</span>
              </button>
              <button class="opcao-caminho" type="button" data-caminho="contratante">
                <strong>Contratar serviço técnico</strong>
                <span>Não tenho registro no Crea. Quero publicar demanda e procurar profissionais.</span>
              </button>
            </div>
          </div>

          <div id="dados-contratante" hidden>
            <p class="aviso-lgpd" style="margin-bottom:20px">
              %s Conta de contratante não recebe selo de verificado e não aparece nas buscas de
              profissionais.
            </p>
            <div class="grade-form">
              %s
              %s
              %s
              %s
              %s
            </div>
          </div>

          <div id="dados-profissional" hidden>
            <div class="grade-form">
              %s
              %s
              %s
              %s
              %s
              %s
              %s
              %s
            </div>
          </div>

          <div id="dados-sem-registro" hidden>
            <div class="grade-form">
              <h4 class="titulo-grupo-form">Dados essenciais <span>obrigatórios</span></h4>
              <div class="campo campo-largo">
                <label for="sr-nome">Nome completo</label>
                <input id="sr-nome" type="text" placeholder="Seu nome" autocomplete="name">
              </div>
              <div class="campo campo-largo">
                <label for="sr-profissao">Profissão ou ocupação</label>
                <input id="sr-profissao" type="text" placeholder="Ex.: estudante de engenharia, projetista">
              </div>
              <div class="campo">
                <label for="sr-cidade">Cidade</label>
                <input id="sr-cidade" type="text" placeholder="Manaus" autocomplete="address-level2">
              </div>
              <div class="campo">
                <label for="sr-uf">Estado</label>
                <select id="sr-uf"><option value="">Selecione</option><option>AM</option><option>AC</option><option>AP</option><option>PA</option><option>RO</option><option>RR</option><option>TO</option><option>Outro estado</option></select>
              </div>
              <div class="campo">
                <label for="sr-telefone">Telefone ou WhatsApp</label>
                <input id="sr-telefone" type="tel" placeholder="(92) 90000-0000" autocomplete="tel">
              </div>
              <div class="campo">
                <label for="sr-email">E-mail</label>
                <input id="sr-email" type="email" placeholder="seu@email.com" autocomplete="email">
                <span class="dica">Este será o seu login.</span>
              </div>
              <h4 class="titulo-grupo-form">Perfil <span>opcional</span></h4>
              <div class="campo">
                <label for="sr-formacao">Formação</label>
                <select id="sr-formacao"><option value="">Selecione</option><option>Ensino médio</option><option>Curso técnico em andamento</option><option>Curso técnico concluído</option><option>Graduação em andamento</option><option>Graduação concluída</option><option>Pós-graduação</option></select>
              </div>
              <div class="campo">
                <label for="sr-nascimento">Data de nascimento</label>
                <input id="sr-nascimento" type="date" placeholder="" autocomplete="bday">
              </div>
              <div class="campo campo-largo">
                <label for="sr-habilidades">Habilidades e áreas de interesse</label>
                <input id="sr-habilidades" type="text" placeholder="Ex.: AutoCAD, orçamento de obras, instalações elétricas">
                <span class="dica">Separe por vírgulas.</span>
              </div>
              <div class="campo campo-largo">
                <label for="sr-sobre">Sobre você</label>
                <textarea id="sr-sobre" maxlength="600" placeholder="Conte sua experiência, sua formação e o que você procura."></textarea>
              </div>
            </div>
          </div>

          <div id="dados-empresa-sem-registro" hidden>
            <div class="grade-form">
              <h4 class="titulo-grupo-form">Dados essenciais <span>obrigatórios</span></h4>
              <div class="campo campo-largo">
                <label for="ser-razao">Razão social</label>
                <input id="ser-razao" type="text" placeholder="Nome registrado da empresa" autocomplete="organization">
              </div>
              <div class="campo">
                <label for="ser-cidade">Cidade</label>
                <input id="ser-cidade" type="text" placeholder="Manaus" autocomplete="address-level2">
              </div>
              <div class="campo">
                <label for="ser-uf">Estado</label>
                <select id="ser-uf"><option value="">Selecione</option><option>AM</option><option>AC</option><option>AP</option><option>PA</option><option>RO</option><option>RR</option><option>TO</option><option>Outro estado</option></select>
              </div>
              <div class="campo">
                <label for="ser-telefone">Telefone ou WhatsApp</label>
                <input id="ser-telefone" type="tel" placeholder="(92) 3000-0000" autocomplete="tel">
              </div>
              <div class="campo">
                <label for="ser-email">E-mail</label>
                <input id="ser-email" type="email" placeholder="contato@empresa.com.br" autocomplete="email">
                <span class="dica">Este será o login da empresa.</span>
              </div>
              <h4 class="titulo-grupo-form">Perfil <span>opcional</span></h4>
              <div class="campo">
                <label for="ser-fantasia">Nome fantasia</label>
                <input id="ser-fantasia" type="text" placeholder="Como a empresa é conhecida">
              </div>
              <div class="campo">
                <label for="ser-porte">Porte</label>
                <select id="ser-porte"><option value="">Selecione</option><option>MEI</option><option>Microempresa</option><option>Pequena</option><option>Média</option><option>Grande</option></select>
              </div>
              <div class="campo campo-largo">
                <label for="ser-area">Área de atuação</label>
                <input id="ser-area" type="text" placeholder="Ex.: construção civil, manutenção predial">
              </div>
              <div class="campo campo-largo">
                <label for="ser-site">Site ou rede social</label>
                <input id="ser-site" type="url" placeholder="https://" autocomplete="url">
              </div>
              <div class="campo campo-largo">
                <label for="ser-sobre">Sobre a empresa</label>
                <textarea id="ser-sobre" maxlength="600" placeholder="Conte o que a empresa faz e o que ela procura no ProLink."></textarea>
              </div>
            </div>
          </div>

          <div id="dados-empresa" hidden>
            <div class="grade-form">
              %s
              %s
              %s
              %s
              %s
              %s
              %s
              %s
            </div>
          </div>""" % (
        ico("escudo"),
        campo("Nome ou razão social", "con-nome", largo=True, auto="organization",
              ph="Como você quer aparecer para os profissionais"),
        campo("Cidade", "con-cidade", ph="Manaus"),
        selecao("Estado", "con-uf", ["AM", "AC", "AP", "PA", "RO", "RR", "TO", "Outro estado"]),
        campo("Telefone ou WhatsApp", "con-telefone", tipo="tel", ph="(92) 90000-0000", auto="tel"),
        campo("E-mail", "con-email", tipo="email", ph="seu@email.com", largo=True, auto="email",
              dica="E-mail de contato: aparece no seu perfil. Você entra com o documento e a senha."),

        campo("Nome completo", "dec-nome", ph="Como aparece no seu registro profissional",
              largo=True, auto="name"),
        selecao("Título profissional", "dec-titulo", [
            "Engenheiro civil", "Engenheiro eletricista", "Engenheiro mecânico",
            "Engenheiro de produção", "Engenheiro ambiental",
            "Engenheiro de segurança do trabalho", "Engenheiro agrônomo",
            "Engenheiro de pesca", "Geólogo", "Geógrafo",
            "Técnico de nível médio", "Outro"]),
        selecao("Situação do registro", "dec-situacao",
                ["Ativo", "Em regularização", "Registro em andamento", "Não tenho certeza"]),
        campo("Número do registro no Crea", "dec-registro", ph="Ex.: 1234567890",
              dica="Se você não souber agora, pode deixar em branco e preencher depois."),
        selecao("UF do registro", "dec-uf", ["AM", "AC", "AP", "PA", "RO", "RR", "TO", "Outro estado"]),
        campo("RNP", "dec-rnp", ph="Registro Nacional do Profissional"),
        campo("Cidade onde atua", "dec-cidade", ph="Manaus"),
        campo("E-mail", "dec-email", tipo="email", ph="seu@email.com", largo=True, auto="email",
              dica="E-mail de contato: aparece no seu perfil conforme suas escolhas de privacidade."),

        campo("Razão social", "emp-nome", ph="Nome registrado da empresa", largo=True,
              auto="organization"),
        campo("Nome fantasia", "emp-fantasia", ph="Como a empresa é conhecida"),
        campo("Registro da empresa no Crea", "emp-registro", ph="Ex.: 987654321"),
        selecao("UF do registro", "emp-uf", ["AM", "AC", "AP", "PA", "RO", "RR", "TO", "Outro estado"]),
        campo("Cidade", "emp-cidade", ph="Manaus"),
        campo("Responsável técnico", "emp-responsavel", ph="Nome do profissional responsável"),
        campo("Registro do responsável técnico", "emp-resp-registro", ph="Ex.: 1234567890"),
        campo("E-mail", "emp-email", tipo="email", ph="contato@empresa.com.br", largo=True,
              auto="email", dica="Este será o login da empresa."))

    # ---------------------------------------------------------------- etapa 3
    etapa_acesso = """<div class="login-do-crea" id="login-do-crea"></div>

          <div class="grade-form">
            <div class="campo-largo" id="bloco-email-cad" hidden>
              %s
            </div>
            %s
            %s
          </div>

          <div class="grupo-campo">
            <h4>Consentimentos</h4>
            <p class="dica" style="margin-bottom:12px">Você pode rever qualquer um deles depois, no seu perfil.</p>
            %s
            %s
            %s
          </div>""" % (
        campo("E-mail de contato", "email-cad", tipo="email", ph="seu@email.com", largo=True, auto="email",
              dica="Aparece no seu perfil, conforme suas escolhas de privacidade. Não é usado para entrar."),
        campo("Senha", "senha-cad", tipo="password", ph="Mínimo de 8 caracteres",
              auto="new-password", dica="Ao menos 8 caracteres, com letras e números."),
        campo("Confirmar senha", "senha-conf", tipo="password", ph="Repita a senha",
              auto="new-password"),
        caixa("Li e aceito os termos de uso e a política de privacidade", "aceite-termos"),
        caixa("Quero que meu perfil apareça nas buscas públicas", "aceite-visibilidade",
              "Você controla o que fica visível a cada momento, campo por campo."),
        caixa("Quero receber avisos de demandas abertas na minha região", "aceite-avisos"))

    # ---------------------------------------------------------------- etapa 4
    etapa_experiencia = """<div class="grupo-campo" style="margin-top:0; padding-top:0; border-top:0">
            <div class="secao-titulo">
              <h4>Currículo e certificados</h4>
            </div>
            <div class="grade-2 grade">
              %s
              %s
            </div>
          </div>

          <div class="grupo-campo">
            <div class="secao-titulo">
              <h4>Projetos do portfólio</h4>
              <span class="dica">Opcional.</span>
            </div>
            <div id="lista-projetos">
              %s
            </div>
            <button class="btn btn-secundario" type="button" id="add-projeto">%s Adicionar outro projeto</button>
          </div>

          <div class="grupo-campo">
            %s
          </div>""" % (
        upload("arq-curriculo", "Currículo",
               "PDF ou DOCX, até 10 MB.", ".pdf,.doc,.docx"),
        upload("arq-certificados", "Diplomas e certificados",
               "Pode enviar vários de uma vez.", ".pdf,.png,.jpg,.jpeg", True),
        projeto_form(1),
        ico("mais"),
        upload("arq-projetos", "Arquivos dos projetos",
               "Plantas, memoriais ou fotos da obra. PDF, PNG ou JPG.",
               ".pdf,.png,.jpg,.jpeg", True))

    # A empresa não tem currículo nem diploma: mostra apresentação, áreas e o que já executou.
    AREAS_EMPRESA = ['Montagem industrial', 'Instalações elétricas', 'Estrutura metálica', 'Construção civil', 'Infraestrutura', 'SPDA', 'Hidráulica e saneamento', 'Ambiental', 'Laudos e perícias', 'Manutenção industrial']
    etapa_empresa = """<div id="experiencia-empresa" hidden>
          <div class="grupo-campo" style="margin-top:0; padding-top:0; border-top:0">
            <h4>Apresentação da empresa</h4>
            <div class="grade-form" style="margin-top:12px">
              <div class="campo-largo">%s</div>
              <div class="campo campo-largo">
                <label for="emp-apresentacao">Sobre a empresa</label>
                <textarea id="emp-apresentacao" maxlength="600" placeholder="Ex.: atuamos em montagem industrial e instalações elétricas no Amazonas, com equipe própria."></textarea>
                <span class="dica">Aparece em "Sobre a empresa" no perfil.</span>
              </div>
            </div>
          </div>

          <div class="grupo-campo">
            <h4>Áreas de atuação</h4>
            <span class="dica">Usadas nas buscas e na compatibilidade com as demandas.</span>
            <div class="opcoes-grade" id="areas-empresa">%s</div>
          </div>

          <div class="grupo-campo">
            <h4>Uma obra ou serviço executado</h4>
            <span class="dica">Opcional.</span>
            <fieldset class="projeto-form" style="margin-top:12px">
              <legend>Obra ou serviço</legend>
              <div class="grade-form">
                %s
                %s
                %s
                %s
                %s
                %s
                <div class="campo campo-largo">
                  <label for="obra-descricao">O que a empresa executou</label>
                  <textarea id="obra-descricao" maxlength="400" placeholder="Ex.: montagem da estrutura metálica e da cobertura, com equipe própria."></textarea>
                </div>
              </div>
            </fieldset>
            <div class="grade-form" style="margin-top:14px">
              <div class="campo-largo">%s</div>
              <div class="campo-largo">%s</div>
            </div>
          </div>
        </div>""" % (
        upload("arq-logo", "Logotipo", "PNG, JPG, WEBP ou SVG. Aparece no perfil e nas buscas.", ".png,.jpg,.jpeg,.webp,.svg"),
        "".join('<label class="opcao-filtro"><input type="checkbox" name="area-empresa" value="%s"><span>%s</span></label>' % (a, a) for a in AREAS_EMPRESA),
        campo("Nome da obra ou serviço", "obra-nome", ph="Ex.: Galpão logístico Distrito Industrial", largo=True),
        campo("Cliente", "obra-cliente", ph="Nome do cliente ou cliente sob sigilo"),
        campo("Cidade", "obra-cidade", ph="Manaus, AM"),
        campo("Conclusão ou período", "obra-periodo", ph="Ex.: 02/2026"),
        selecao("Área", "obra-area", AREAS_EMPRESA),
        campo("Porte", "obra-porte", ph="Ex.: 4.200 m², 1.500 kVA"),
        upload("arq-obra-fotos", "Fotos da obra", "Antes, durante e depois. PNG ou JPG, várias de uma vez.", ".png,.jpg,.jpeg,.webp", True),
        upload("arq-atestado", "Atestado de capacidade técnica", "Emitido pelo cliente. PDF, até 10 MB.", ".pdf"))

    etapa_experiencia = '<div id="experiencia-profissional">' + etapa_experiencia + '</div>' + etapa_empresa

    html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Criar conta · ProLink</title>
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<header class="topo-publico">
  <a class="marca" href="index.html">__LOGO__<span class="marca-nome">Pro<span>Link</span></span></a>
  <div class="acoes">
    <span class="dica">Já tem uma conta?</span>
    <a class="btn btn-secundario" href="login.html" data-transicao="Abrindo a tela de entrada…">Entrar</a>
  </div>
</header>

<main class="pagina-cadastro" id="conteudo">
  <div class="cadastro-cabecalho">
    <h1>Criar sua conta</h1>
  </div>

  <ol class="passos passos-lineares" id="passos" aria-label="Etapas do cadastro">
    <li class="passo" data-etapa="passo-tipo">
      <span class="passo-num">1</span>
      <span><strong>Tipo de conta</strong><span class="dica">Pessoa física ou jurídica</span></span>
    </li>
    <li class="passo" data-etapa="passo-documento">
      <span class="passo-num">2</span>
      <span><strong>Documento</strong><span class="dica" id="passo-documento-dica">CPF ou CNPJ</span></span>
    </li>
    <li class="passo" data-etapa="passo-confirmacao" hidden>
      <span class="passo-num">2</span>
      <span><strong>Registro</strong><span class="dica">Dados do Crea</span></span>
    </li>
    <li class="passo" data-etapa="passo-acesso">
      <span class="passo-num">3</span>
      <span><strong>Acesso</strong><span class="dica">E-mail e senha</span></span>
    </li>
    <li class="passo" data-etapa="passo-dados" hidden>
      <span class="passo-num">2</span>
      <span><strong>Seus dados</strong><span class="dica">Sem registro no Crea</span></span>
    </li>
    <li class="passo" data-etapa="passo-experiencia">
      <span class="passo-num">4</span>
      <span><strong>Experiência</strong><span class="dica">Currículo, ARTs e projetos</span></span>
    </li>
  </ol>

  <form class="cartao formulario" id="form-cadastro" onsubmit="return false">
    <section class="etapa-cadastro" id="passo-tipo">
      <h2>Como você quer criar a conta?</h2>
      <div class="escolha-caminho escolha-tipo-conta" role="radiogroup" aria-label="Tipo de conta">
        <div class="grade grade-2" style="gap:12px">
          <button class="opcao-caminho" type="button" role="radio" aria-checked="false" data-tipo-conta="pf">
            <strong>Pessoa física</strong>
            <span>Sou engenheiro(a) ou profissional técnico. Entro com o CPF.</span>
          </button>
          <button class="opcao-caminho" type="button" role="radio" aria-checked="false" data-tipo-conta="pj">
            <strong>Pessoa jurídica</strong>
            <span>Sou uma empresa. Entro com o CNPJ.</span>
          </button>
        </div>
        <p class="erro-inline" id="erro-tipo-conta" hidden>Escolha pessoa física ou pessoa jurídica para continuar.</p>
      </div>
      <div class="acoes-formulario">
        <span></span>
        <button class="btn" type="button" data-passo="proximo">Continuar</button>
      </div>
    </section>

    <section class="etapa-cadastro" id="passo-documento" hidden>
      <h2 id="titulo-documento">Qual é o seu documento?</h2>
      __ETAPA1__
      <div class="acoes-formulario">
        <button class="btn btn-secundario" type="button" data-passo="anterior">Voltar</button>
        <button class="btn" type="button" data-passo="proximo">Continuar</button>
      </div>
    </section>

    <section class="etapa-cadastro" id="passo-confirmacao" hidden>
      <h2 id="titulo-confirmacao">Encontramos seu registro no Crea</h2>
      <p class="dica" style="margin-bottom:20px">Confira se os dados são seus.</p>
      __ETAPA_CONF__
      <div class="acoes-formulario">
        <button class="btn btn-secundario" type="button" data-passo="anterior">Voltar</button>
        <button class="btn" type="button" data-passo="proximo">Confirmar e continuar</button>
      </div>
    </section>

    <section class="etapa-cadastro" id="passo-dados" hidden>
      <h2 id="titulo-dados">Seus dados</h2>
      __ETAPA2__
      <div class="acoes-formulario">
        <button class="btn btn-secundario" type="button" data-passo="anterior">Voltar</button>
        <button class="btn" type="button" data-passo="proximo">Continuar</button>
      </div>
    </section>

    <section class="etapa-cadastro" id="passo-acesso" hidden>
      <h2>Crie seu acesso</h2>
      <p class="dica" style="margin-bottom:20px">Informe o e-mail de contato do seu perfil e defina
         a senha.</p>
      __ETAPA3__
      <div class="acoes-formulario">
        <button class="btn btn-secundario" type="button" data-passo="anterior">Voltar</button>
        <button class="btn" type="button" data-passo="proximo">Continuar</button>
      </div>
    </section>

    <section class="etapa-cadastro" id="passo-experiencia" hidden>
      <h2 id="titulo-experiencia">Sua experiência</h2>
      <p class="dica" id="dica-experiencia" style="margin-bottom:20px">Tudo nesta etapa é opcional.</p>
      __ETAPA4__
      <p class="aviso-lgpd aviso-preencher-depois" id="aviso-preencher-depois"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
         <span id="texto-preencher-depois">Você pode completar depois, em <b>Meu portfólio</b>.</span></p>
      <div class="acoes-formulario">
        <button class="btn btn-secundario" type="button" data-passo="anterior">Voltar</button>
        <div class="acoes-direita">
          <button class="btn btn-secundario" type="button" id="preencher-depois">Preencher depois</button>
          <button class="btn" type="button" id="finalizar-cadastro">Criar conta</button>
        </div>
      </div>
    </section>
  </form>
</main>

<footer class="rodape-publico">
  <span>ProLink · Desafio Crea Pro-Link — II CENATEC 2026 ·
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário</a></span>
  <span>Ambiente de divulgação voluntária. Não substitui contratação, habilitação,
        licitação, seleção, fiscalização ou verificação documental.</span>
</footer>

<script src="assets/js/crea-api.js"></script>
<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
<script src="assets/js/miranda-guia.js"></script>
</body>
</html>
"""
    return (html.replace("__LOGO__", logo(32))
                .replace("__ETAPA1__", etapa_documento)
                .replace("__ETAPA_CONF__", etapa_confirmacao)
                .replace("__ETAPA2__", etapa_dados)
                .replace("__ETAPA3__", etapa_acesso)
                .replace("__ETAPA4__", etapa_experiencia))


# ==========================================================================
# CONFIGURAÇÕES E PRÉVIA DO PERFIL PÚBLICO
#
# A engrenagem da barra superior leva para Configurações, uma por lado, com o
# mesmo corpo: o configuracoes.js desenha as seções conforme o perfil da
# sessão. A prévia do perfil público usa o cabeçalho das telas públicas,
# porque é assim que um visitante sem conta vê a página.
# ==========================================================================
def pagina_configuracoes(lado="profissional"):
    nome = {"empresa": "empresa-configuracoes.html",
            "admin": "admin-configuracoes.html"}.get(lado, "configuracoes.html")
    corpo = """      <div id="tela-configuracoes" data-lado="%s"></div>
""" % lado
    return shell("Configurações", nome, corpo, scripts=("configuracoes.js",), lado=lado)


def pagina_perfil_publico():
    html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Perfil público · ProLink</title>
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<header class="topo-publico">
  <a class="marca" href="index.html">__LOGO__<span class="marca-nome">Pro<span>Link</span></span></a>
  <nav aria-label="Navegação principal">
    <a href="buscar.html">Buscar profissionais</a>
    <a href="index.html#recursos">Como funciona</a>
  </nav>
  <div class="acoes" id="acoes-previa">
    <a class="btn btn-secundario" href="login.html">Entrar</a>
    <a class="btn" href="cadastro.html">Criar conta</a>
  </div>
</header>

<main id="conteudo" class="pagina-previa" style="max-width:var(--max); margin:0 auto; padding:28px 32px 56px">
  <div id="previa-perfil-publico"></div>
</main>

<footer class="rodape-publico">
  <span>ProLink · Desafio Crea Pro-Link — II CENATEC 2026 ·
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário</a></span>
  <span>Ambiente de divulgação voluntária. Não substitui contratação, habilitação,
        licitação, fiscalização ou verificação documental.</span>
</footer>
<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/demandas.js"></script>
<script src="assets/js/perfil-publico.js"></script>
</body>
</html>
"""
    return html.replace("__LOGO__", logo(32))


# ==========================================================================
# LADO DA EMPRESA
#
# Quem contrata tem outro trabalho a fazer: publica demanda, lê candidatura
# e escolhe profissional. As telas reaproveitam o mesmo esqueleto e os
# mesmos componentes do lado profissional — é a mesma plataforma, e quem
# conhece um lado não deveria reaprender o outro.
# ==========================================================================
def candidato(iniciais, nome, titulo, registro, compat, nota, avaliacoes,
              resumo, etiquetas, cor="", verificado=True):
    """Cartão de profissional, do ponto de vista de quem contrata."""
    selo = ('<span class="etiqueta etiqueta-verde">%s Registro verificado</span>' % ico("escudo")
            if verificado
            else '<span class="etiqueta etiqueta-ambar">Registro não verificado</span>')
    marcas = "".join('<span class="etiqueta">%s</span>' % e for e in etiquetas)
    return ("""<article class="cartao candidato">
        <div class="candidato-topo">
          <span class="avatar avatar-md %s">%s</span>
          <div style="flex:1; min-width:0">
            <h3>%s</h3>
            <span class="meta">%s · %s</span>
          </div>
          <div style="text-align:right">
            <strong class="candidato-compat">%s</strong>
            <span class="rotulo">compatível</span>
          </div>
        </div>

        <div class="meta-linha" style="margin:12px 0">
          %s
          <span class="meta">%s %s em %s avaliações</span>
        </div>

        <p style="font-size:13.5px; color:var(--tinta-2)">%s</p>

        <div class="competencias" style="margin-top:12px">%s</div>

        <div class="candidato-acoes">
          <a class="btn btn-sm" href="__CONVERSA__">Enviar mensagem</a>
          <a class="btn btn-secundario btn-sm" href="__PERFIL__">Ver perfil</a>
          <button class="btn btn-fantasma btn-sm" type="button"
                  data-denunciar="o perfil de %s">Denunciar</button>
        </div>
      </article>""" % (cor, iniciais, nome, titulo, registro, compat, selo,
                       ico("estrela"), nota, avaliacoes, resumo, marcas, nome)
                      ).replace("__PERFIL__", link_perfil(nome)
                      ).replace("__CONVERSA__", link_conversa(nome, "empresa-mensagens.html"))


def demanda(titulo, tipo, classe_tipo, local, prazo, candidaturas, situacao,
            classe_situacao, resumo, demanda_id="2026-118"):
    return """<article class="cartao demanda-card">
        <div class="demanda-topo">
          <div>
            <span class="etiqueta %s">%s</span>
            <h3 style="margin:8px 0 6px">%s</h3>
            <p style="font-size:13.5px; color:var(--tinta-2); max-width:70ch">%s</p>
          </div>
          <span class="etiqueta %s">%s</span>
        </div>

        <div class="meta-linha" style="margin-top:14px">
          <span class="meta">%s %s</span>
          <span class="meta">%s Propostas até %s</span>
          <span class="meta">%s %s candidaturas</span>
        </div>

        <div class="demanda-acoes">
          <a class="btn btn-sm" href="empresa-candidaturas.html?d=%s">Ver candidaturas</a>
          <a class="btn btn-secundario btn-sm" href="empresa-publicar.html">Editar demanda</a>
          <button class="btn btn-fantasma btn-sm" type="button"
                  data-encerrar="%s">Encerrar demanda</button>
        </div>
      </article>""" % (classe_tipo, tipo, titulo, resumo, classe_situacao, situacao,
                       ico("pino"), local, ico("relogio"), prazo, ico("equipe"), candidaturas,
                       demanda_id, titulo)


# --------------------------------------------------------------------------
# Painel da empresa
# --------------------------------------------------------------------------
def pagina_empresa_inicio():
    stats = "\n          ".join([
        estatistica("0", "Demandas abertas", "maleta"),
        estatistica("0", "Candidaturas recebidas", "equipe", "icone-roxo"),
        estatistica("0", "Em negociação", "balao", "icone-ambar"),
        estatistica("0", "Contratações concluídas", "checkcirculo", "icone-verde"),
    ])

    candidatos = "\n              ".join([
        candidato("DC", "Daniel Silva do Carmo", "Engenheiro civil", "CREA-AM 031947/D",
                  "94%", "4,8", "23",
                  "6 ARTs de projeto estrutural nos últimos 3 anos, todas confirmadas no Crea.",
                  ["Cálculo estrutural", "Fundações profundas", "Laudos técnicos"]),
        candidato("AB", "Ana Beatriz Farias", "Engenheira eletricista", "CREA-AM 028114/D",
                  "88%", "4,9", "31",
                  "Projeto elétrico industrial e SPDA, com acervo em plantas de 4.000 m² ou mais.",
                  ["SPDA", "Projeto elétrico", "Subestação"], "avatar-roxo"),
        candidato("LM", "Lucas Martins", "Engenheiro ambiental", "CREA-AM 034720/D",
                  "81%", "4,6", "12",
                  "Licenciamento ambiental na região metropolitana de Manaus.",
                  ["Licenciamento", "Estudos de impacto"], "avatar-verde"),
    ])

    def atividade(icone, titulo, desc, tempo, cor=""):
        classe = " " + cor if cor else ""
        return """<li>
                  <div class="item-atividade">
                    <span class="icone%s">%s</span>
                    <span>
                      <strong>%s</strong>
                      <span>%s</span>
                    </span>
                    <time>%s</time>
                  </div>
                </li>""" % (classe, ico(icone), titulo, desc, tempo)

    atividades = "\n                ".join([
        atividade("equipe", "3 novas candidaturas", "Projeto elétrico industrial", "há 1 h", "icone-roxo"),
        atividade("checkcirculo", "Registro conferido", "Daniel Silva do Carmo · CREA-AM", "há 3 h", "icone-verde"),
        atividade("balao", "Resposta recebida", "Ana Beatriz Farias", "ontem"),
        atividade("estrela", "Você avaliou um profissional", "Norte Projetos · 5,0", "25/07", "icone-ambar"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Olá, <span data-usuario-campo="nome">empresa</span></h1>
          <p id="subtitulo-painel">&nbsp;</p>
        </div>
      </div>

      <section class="banner">
        <div>
          <h2>Contrate sabendo que o registro está em dia</h2>
          <p>Toda candidatura chega com o registro já conferido no Crea.</p>
          <div class="banner-acoes">
            <a class="btn" href="empresa-publicar.html">Publicar demanda</a>
            <a class="btn btn-contorno" href="empresa-profissionais.html">Buscar profissionais</a>
          </div>
        </div>
        <div class="banner-arte" aria-hidden="true">__ARTE__</div>
      </section>

      <section class="secao">
        <div class="grade grade-4">
          __STATS__
        </div>
      </section>

      <section class="secao">
        <div class="grade grade-principal">
          <div>
            <div class="secao-titulo">
              <h2>Profissionais recomendados</h2>
              <a href="empresa-profissionais.html">Ver todos</a>
            </div>
            <div class="grade" style="gap:14px" id="recomendados-empresa"></div>
          </div>

          <div>
            <div class="secao-titulo"><h2>Atividade recente</h2></div>
            <div class="cartao cartao-limpo">
              <ul class="lista-divisoria" id="atividade-recente"></ul>
            </div>

            <div class="cartao" style="margin-top:20px">
              <h3 style="margin-bottom:12px">Suas demandas abertas</h3>
              <ul style="display:grid; gap:12px" id="demandas-abertas-resumo"></ul>
              <a class="btn btn-secundario btn-bloco" style="margin-top:14px" href="empresa-demandas.html">
                Ver todas as demandas
              </a>
            </div>
          </div>
        </div>
      </section>
"""
    arte = """<svg width="230" height="150" viewBox="0 0 230 150" fill="none">
          <rect x="6" y="66" width="46" height="78" rx="5" fill="rgba(255,255,255,.24)"/>
          <rect x="60" y="38" width="52" height="106" rx="5" fill="rgba(255,255,255,.34)"/>
          <rect x="120" y="58" width="44" height="86" rx="5" fill="rgba(255,255,255,.22)"/>
          <rect x="172" y="22" width="50" height="122" rx="5" fill="rgba(255,255,255,.4)"/>
          <path d="M0 144h230" stroke="rgba(255,255,255,.6)" stroke-width="2"/>
        </svg>"""

    corpo = (corpo.replace("__ARTE__", arte)
                  .replace("__STATS__", stats)
                  .replace("__CANDIDATOS__", candidatos)
                  .replace("__ATIVIDADES__", atividades))
    return shell("Início", "empresa-inicio.html", corpo, lado="empresa")


# --------------------------------------------------------------------------
# Minhas demandas
# --------------------------------------------------------------------------
def pagina_empresa_demandas():
    demandas = "\n          ".join([
        demanda("Projeto elétrico industrial", "Projeto", "", "Distrito Industrial, Manaus",
                "20/09/2026", "7", "Aberta", "etiqueta-verde",
                "Galpão de 4.200 m² com subestação própria. Exige ART de projeto e execução.",
                "2026-118"),
        demanda("Laudo técnico de estrutura metálica", "Serviço", "etiqueta-roxa",
                "Itacoatiara, AM", "15/09/2026", "5", "Em análise", "etiqueta-ambar",
                "Vistoria e laudo de cobertura metálica com 1.800 m² em centro de distribuição.",
                "2026-120"),
        demanda("Consultoria ambiental para licenciamento", "Parceria", "etiqueta-verde",
                "Manaus, AM", "30/09/2026", "4", "Aberta", "etiqueta-verde",
                "Licenciamento de empreendimento às margens do rio Negro.", "2026-119"),
        demanda("Compatibilização de projetos em BIM", "Projeto", "", "Parintins, AM",
                "10/09/2026", "2", "Encerrando", "etiqueta-ambar",
                "Compatibilização arquitetônico-estrutural de hospital de 9 pavimentos.",
                "2026-121"),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Minhas demandas</h1>
          <p>4 abertas · 18 candidaturas recebidas · 11 contratações concluídas.</p>
        </div>
        <a class="btn" href="empresa-publicar.html">__MAIS__ Publicar demanda</a>
      </div>

      <div class="abas" role="group" aria-label="Filtrar lista">
        <button class="aba-filtro" type="button" aria-pressed="true">Todas</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Abertas</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Em análise</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Encerradas</button>
      </div>

      <div class="grade" style="gap:14px">
        __DEMANDAS__
      </div>
"""
    corpo = corpo.replace("__DEMANDAS__", demandas).replace("__MAIS__", ico("mais"))
    return shell("Minhas demandas", "empresa-demandas.html", corpo, lado="empresa")


# --------------------------------------------------------------------------
# Publicar demanda
# --------------------------------------------------------------------------
def pagina_empresa_publicar():
    def campo(rotulo, id_, tipo="text", ph="", largo=False, dica=""):
        cls = ' campo-largo' if largo else ''
        hint = '<span class="dica">%s</span>' % dica if dica else ''
        return """<div class="campo%s">
            <label for="%s">%s</label>
            <input id="%s" type="%s" placeholder="%s">
            %s
          </div>""" % (cls, id_, rotulo, id_, tipo, ph, hint)

    def selecao(rotulo, id_, opcoes, largo=False, dica=""):
        cls = ' campo-largo' if largo else ''
        itens = "".join("<option>%s</option>" % o for o in opcoes)
        hint = '<span class="dica">%s</span>' % dica if dica else ''
        return """<div class="campo%s">
            <label for="%s">%s</label>
            <select id="%s">%s</select>
            %s
          </div>""" % (cls, id_, rotulo, id_, itens, hint)

    def caixa(rotulo):
        return ('<label class="opcao-filtro"><input type="checkbox"><span>%s</span></label>' % rotulo)

    exigencias = "\n              ".join(caixa(e) for e in [
        "ART de projeto", "ART de execução", "CAT em obra semelhante",
        "Registro ativo no Crea", "Anuidade em dia", "Seguro de responsabilidade civil"])

    areas = "\n              ".join(caixa(a) for a in [
        "Estrutural", "Elétrica", "Hidráulica e sanitária", "Ambiental",
        "Geotecnia", "Mecânica", "Agronomia", "BIM / compatibilização"])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Publicar demanda</h1>
          <p>Quanto mais específica a exigência técnica, melhor o ProLink filtra quem tem
             acervo compatível — e menos candidatura fora do perfil você lê.</p>
        </div>
      </div>

      <form class="cartao formulario" onsubmit="return false" style="max-width:900px">
        <h2>O serviço</h2>
        <p class="dica" style="margin-bottom:20px">É isso que o profissional vê primeiro na busca.</p>

        <div class="grade-form">
          %s
          %s
          %s
          %s
          %s
          <div class="campo campo-largo">
            <label for="descricao">Descrição do serviço</label>
            <textarea id="descricao" placeholder="Ex.: galpão de 4.200 m² com subestação própria. O projeto arquitetônico já está aprovado."></textarea>
          </div>
        </div>

        <div class="grupo-campo">
          <h4>Área de atuação exigida</h4>
          <p class="dica" style="margin-bottom:10px">Só profissionais com atribuição compatível veem a demanda.</p>
          <div class="opcoes-grade">
            %s
          </div>
        </div>

        <div class="grupo-campo">
          <h4>Exigências técnicas</h4>
          <p class="dica" style="margin-bottom:10px">Cada item marcado vira um filtro na triagem das candidaturas.</p>
          <div class="opcoes-grade">
            %s
          </div>
        </div>

        <div class="grupo-campo">
          <h4>Prazo e valor</h4>
          <div class="grade-form" style="margin-top:12px">
            %s
            %s
            %s
          </div>
        </div>

        <div class="acoes-formulario">
          <a class="btn btn-secundario" href="empresa-demandas.html">Cancelar</a>
          <a class="btn" href="empresa-demandas.html">Publicar demanda</a>
        </div>
      </form>
""" % (
        campo("Título da demanda", "titulo-demanda", ph="Ex.: Projeto elétrico industrial", largo=True),
        selecao("Tipo", "tipo-demanda", ["Projeto", "Serviço", "Parceria", "Vaga fixa"]),
        selecao("Modalidade", "modalidade", ["Presencial", "Remoto", "Híbrido"]),
        campo("Cidade da obra", "cidade-obra", ph="Manaus"),
        selecao("Estado", "uf-obra", ["AM", "AC", "AP", "PA", "RO", "RR", "TO"]),
        areas, exigencias,
        campo("Propostas até", "prazo-propostas", tipo="date"),
        campo("Início previsto", "inicio-obra", tipo="date"),
        selecao("Faixa de valor", "faixa-valor", [
            "A combinar", "Até R$ 5 mil", "R$ 5 mil a R$ 20 mil",
            "R$ 20 mil a R$ 50 mil", "Acima de R$ 50 mil"],
            dica="Demanda com faixa declarada recebe mais candidatura."))

    return shell("Publicar demanda", "empresa-publicar.html", corpo, lado="empresa")


# --------------------------------------------------------------------------
# Buscar profissionais
# --------------------------------------------------------------------------
def pagina_empresa_profissionais():
    def filtro(rotulo, marcado=False, contador=""):
        check = " checked" if marcado else ""
        extra = ('<span style="margin-left:auto;color:var(--tinta-3);font-size:13px">%s</span>'
                 % contador if contador else "")
        return ('<label class="opcao-filtro"><input type="checkbox"%s><span>%s</span>%s</label>'
                % (check, rotulo, extra))

    candidatos = "\n            ".join([
        candidato("DC", "Daniel Silva do Carmo", "Engenheiro civil", "CREA-AM 031947/D",
                  "94%", "4,8", "23",
                  "6 ARTs de projeto estrutural nos últimos 3 anos, todas confirmadas no Crea. "
                  "Atua em edificações verticais e estruturas metálicas.",
                  ["Cálculo estrutural", "Fundações profundas", "Laudos técnicos", "BIM · Revit"]),
        candidato("AB", "Ana Beatriz Farias", "Engenheira eletricista", "CREA-AM 028114/D",
                  "88%", "4,9", "31",
                  "Projeto elétrico industrial e SPDA, com acervo em plantas de 4.000 m² ou mais.",
                  ["SPDA", "Projeto elétrico", "Subestação"], "avatar-roxo"),
        candidato("LM", "Lucas Martins", "Engenheiro ambiental", "CREA-AM 034720/D",
                  "81%", "4,6", "12",
                  "Licenciamento ambiental na região metropolitana de Manaus, com histórico "
                  "em empreendimentos às margens de corpos d'água.",
                  ["Licenciamento", "Estudos de impacto", "Outorga"], "avatar-verde"),
        candidato("RS", "Rafael Souza", "Engenheiro mecânico", "Registro em regularização",
                  "64%", "4,2", "5",
                  "Montagem industrial e tubulação. Registro ainda não confirmado pelo Crea.",
                  ["Tubulação", "Montagem industrial"], "avatar-ambar", False),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Buscar profissionais</h1>
          <p id="subtitulo-busca">&nbsp;</p>
        </div>
        <button class="btn btn-secundario" type="button">Salvar esta busca</button>
      </div>

      <div class="grade grade-filtro">
        <aside class="cartao">
          <h3 style="margin-bottom:14px">Filtros</h3>

          <div class="filtro-bloco">
            <h4>Situação no Crea</h4>
            %s
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <h4>Área de atuação</h4>
            %s
            %s
            %s
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <h4>Acervo comprovado</h4>
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <h4>Onde atende</h4>
            <div class="campo" style="margin-bottom:10px">
              <label class="sr-apenas" for="cidade-prof">Cidade</label>
              <select id="cidade-prof">
                <option>Manaus, AM</option>
                <option>Todo o Amazonas</option>
                <option>Região Norte</option>
              </select>
            </div>
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <button class="btn btn-bloco" type="button">Aplicar filtros</button>
            <button class="btn btn-fantasma btn-bloco" type="button" style="margin-top:8px">Limpar</button>
          </div>
        </aside>

        <div>
          <div class="abas" role="group" aria-label="Filtrar lista">
            <button class="aba-filtro" type="button" aria-pressed="true">Todos</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Verificados</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Já contratados</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Salvos</button>
          </div>

          <div class="secao-titulo">
            <span class="meta">Correspondências para a demanda de projeto elétrico</span>
          </div>

          __AVISO_IND__

          <div class="grade grade-2" style="gap:14px">
            __CANDIDATOS__
          </div>

          <div style="display:flex; justify-content:center; margin-top:24px">
            <button class="btn btn-secundario" type="button">Carregar mais</button>
          </div>
        </div>
      </div>
""" % (
        filtro("Registro ativo", True),
        filtro("Em regularização", False),
        filtro("Empresa registrada", False),
        filtro("Estrutural", True), filtro("Elétrica", True), filtro("Ambiental"),
        filtro("Mecânica"), filtro("Agronomia"),
        filtro("Com ART confirmada", True), filtro("Com CAT em obra semelhante"),
        filtro("Aceita viagem ao interior"), filtro("Atende remoto"))

    corpo = corpo.replace("__CANDIDATOS__", candidatos)
    return shell("Buscar profissionais", "empresa-profissionais.html", corpo, lado="empresa")


# --------------------------------------------------------------------------
# Perfil da empresa
# --------------------------------------------------------------------------
def pagina_empresa_perfil():
    corpo = """      <div class="perfil-capa"></div>
      <div class="perfil-cabecalho">
        <span class="avatar avatar-lg avatar-empresa" data-usuario-campo="iniciais">--</span>
        <div class="perfil-identidade">
          <h1 data-usuario-campo="nome">&nbsp;</h1>
          <p style="color:var(--tinta-2)"><span data-conta="atividade-empresa"></span>
             <span data-usuario-campo="registro"></span></p>
          <div class="meta-linha" style="margin-top:10px">
            <span class="meta">%s <span data-usuario-campo="cidade"></span></span>
            <span class="meta">%s <span data-conta="resumo-contratacoes">Nenhuma contratação ainda</span></span>
            <span class="meta">%s <span data-conta="resumo-avaliacoes">Sem avaliações</span></span>
          </div>
        </div>
        <div class="perfil-acoes">
          <a class="btn btn-secundario" href="perfil-publico.html">Ver perfil público</a>
          <button class="btn" type="button" id="abrir-editar-empresa">Editar perfil</button>
        </div>
      </div>

      <div class="grade grade-principal" style="margin-top:24px">
        <div>
          <div class="cartao" style="margin-bottom:20px">
            <h2 style="margin-bottom:10px">Sobre a empresa</h2>
            <p data-usuario-campo="sobre" data-conta="sobre" style="color:var(--tinta-2); max-width:70ch"></p>
          </div>

          <div class="cartao" style="margin-bottom:20px">
            <h2 style="margin-bottom:12px">Áreas em que costuma contratar</h2>
            <div class="competencias">
              <span class="etiqueta">Projeto elétrico</span>
              <span class="etiqueta">Estrutural</span>
              <span class="etiqueta">SPDA</span>
              <span class="etiqueta">Laudos e perícias</span>
              <span class="etiqueta">Ambiental</span>
              <span class="etiqueta">BIM · compatibilização</span>
            </div>
          </div>

          <div class="cartao cartao-limpo">
            <div class="cartao-cabecalho">
              <h2>Obras da empresa</h2>
              <a class="link" href="empresa-demandas.html">Ver demandas</a>
            </div>
            <ul class="lista-divisoria">
              %s
              %s
              %s
            </ul>
          </div>
        </div>

        <div>
          <div class="cartao" style="margin-bottom:20px">
            <div class="faixa-verificado" style="margin-bottom:16px" data-conta="faixa-verificado">
              %s
              <span>
                <strong data-conta="verificado-titulo">&nbsp;</strong>
                <span data-conta="verificado-texto"></span>
              </span>
            </div>
            <div class="grade grade-3" style="gap:12px; text-align:center">
              <div><strong style="display:block; font-size:20px" data-conta="n-contratacoes">0</strong><span class="rotulo">contratações</span></div>
              <div><strong style="display:block; font-size:20px" data-conta="n-demandas">0</strong><span class="rotulo">demandas abertas</span></div>
              <div><strong style="display:block; font-size:20px" data-conta="nota">–</strong><span class="rotulo">avaliação</span></div>
            </div>
          </div>

          <div class="cartao" style="margin-bottom:20px">
            <h3 style="margin-bottom:12px">Registro da empresa</h3>
            <ul style="display:grid; gap:12px; font-size:14px">
              <li class="linha-demanda"><span>CNPJ</span><strong data-conta="cnpj">–</strong></li>
              <li class="linha-demanda"><span>Registro</span><strong data-usuario-campo="registro">–</strong></li>
              <li class="linha-demanda"><span>Situação</span><span class="etiqueta" data-conta="situacao">–</span></li>
            </ul>
          </div>

          <div class="cartao">
            <h3 style="margin-bottom:6px">Responsável técnico</h3>
            <p class="dica" style="margin-bottom:14px">
              É o registro dele que responde tecnicamente pelas obras da empresa.
            </p>
            <div data-conta="responsavel"></div>
          </div>
        </div>
      </div>
""" % (ico("pino"), ico("maleta"), ico("estrela"),
       _obra("Galpão logístico Distrito Industrial", "Montagem de estrutura metálica", "Concluída em 02/2026"),
       _obra("Subestação Indústria Norte", "Instalação elétrica e SPDA", "Em execução"),
       _obra("Centro de Distribuição Alfa", "Reforço estrutural de cobertura", "Concluída em 11/2025"),
       ico("escudo"))

    return shell("Perfil da empresa", "empresa-perfil.html", corpo, lado="empresa")


def _obra(nome, servico, situacao):
    return """<li>
                <div class="item-atividade">
                  <span class="icone">%s</span>
                  <span>
                    <strong>%s</strong>
                    <span>%s</span>
                  </span>
                  <time>%s</time>
                </div>
              </li>""" % (ico("predio"), nome, servico, situacao)


# ==========================================================================
# LADO DO ADMINISTRADOR (RF06)
#
# O Crea-AM operando a plataforma. O Anexo I lista quatro perfis, e este é
# o quarto: moderar conteúdo, gerir perfis, auditar ações, tratar denúncias,
# emitir indicadores e configurar integrações.
#
# A trilha de auditoria aparece três vezes no edital (11.1, 11.3 e 8.5 g) e
# é um dos cenários mínimos de demonstração do Anexo I, item 7.
# ==========================================================================
def tabela(colunas, linhas, vazio="Nada por aqui."):
    """Tabela simples e responsiva, usada nas telas administrativas."""
    cabecalho = "".join("<th>%s</th>" % c for c in colunas)
    if not linhas:
        return '<p class="dica" style="padding:20px">%s</p>' % vazio
    corpo = "".join(
        "<tr>" + "".join("<td>%s</td>" % celula for celula in linha) + "</tr>"
        for linha in linhas
    )
    return """<div class="tabela-rolagem">
        <table class="tabela-admin">
          <thead><tr>%s</tr></thead>
          <tbody>%s</tbody>
        </table>
      </div>""" % (cabecalho, corpo)


def _pessoa(iniciais, nome, detalhe, cor=""):
    return """<span class="celula-pessoa">
            <span class="avatar avatar-sm %s">%s</span>
            <span><strong>%s</strong><span class="dica">%s</span></span>
          </span>""" % (cor, iniciais, nome, detalhe)


# --------------------------------------------------------------------------
# Painel administrativo
# --------------------------------------------------------------------------
def pagina_admin_inicio():
    stats = "\n          ".join([
        estatistica("0", "Usuários ativos", "equipe"),
        estatistica("0", "Registros verificados", "escudo", "icone-verde"),
        estatistica("0", "Denúncias na fila", "sino", "icone-ambar"),
        estatistica("0", "Demandas abertas", "maleta", "icone-roxo"),
    ])

    perfis = tabela(
        ["Perfil", "Usuários", "Verificados", "Bloqueados"],
        [["Profissional registrado", "2.418", "2.401", "4"],
         ["Empresa registrada", "473", "473", "1"],
         ["Terceiro sem registro", "296", "—", "7"],
         ["Administrador", "25", "—", "0"]])

    eventos = "\n                ".join([
        """<li>
                  <div class="item-atividade">
                    <span class="icone %s">%s</span>
                    <span><strong>%s</strong><span>%s</span></span>
                    <time>%s</time>
                  </div>
                </li>""" % (cor, ico(icone), titulo, desc, tempo)
        for icone, cor, titulo, desc, tempo in [
            ("sino", "icone-ambar", "Nova denúncia registrada",
             "Perfil de Rafael Souza · informação enganosa", "há 40 min"),
            ("escudo", "icone-verde", "Registro verificado pela API",
             "CPF ***.590.***-36 · consulta autorizada", "há 2 h"),
            ("equipe", "", "Usuário bloqueado", "Conta de teste duplicada", "há 5 h"),
            ("usuario", "icone-roxo", "Novo administrador cadastrado",
             "fiscalizacao@crea-am.org.br", "ontem"),
        ]])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Painel administrativo</h1>
          <p>Visão da plataforma para o Crea-AM: moderação, auditoria e indicadores.</p>
        </div>
        <a class="btn" href="admin-denuncias.html">Analisar denúncias</a>
      </div>

      <section class="secao" style="margin-top:0">
        <div class="grade grade-4">
          __STATS__
        </div>
      </section>

      <section class="secao">
        <div class="grade grade-principal">
          <div>
            <div class="secao-titulo">
              <h2>Usuários por perfil</h2>
              <a href="admin-usuarios.html">Gerir usuários</a>
            </div>
            <div class="cartao cartao-limpo" id="admin-perfis"></div>

            <div class="cartao" style="margin-top:20px">
              <h3 style="margin-bottom:6px">Indicadores do mês</h3>
              <p class="dica" style="margin-bottom:16px" id="admin-periodo"></p>
              <div class="grade grade-2" style="gap:18px" id="admin-indicadores"></div>
            </div>
          </div>

          <div>
            <div class="secao-titulo">
              <h2>Últimos eventos</h2>
              <a href="admin-auditoria.html">Ver trilha</a>
            </div>
            <div class="cartao cartao-limpo">
              <ul class="lista-divisoria" id="admin-eventos"></ul>
            </div>


          </div>
        </div>
      </section>
"""

    def indicador(rotulo, valor, largura, nota):
        return """<div>
                  <div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:6px">
                    <span>%s</span><strong>%s</strong>
                  </div>
                  <div class="barra-compat"><span style="width:%s"></span></div>
                  <span class="dica" style="margin-top:6px">%s</span>
                </div>""" % (rotulo, valor, largura, nota)

    indicadores = "\n                ".join([
        indicador("Cadastros novos", "312", "78%", "+18% sobre agosto"),
        indicador("Registros confirmados na API", "287", "92%", "92% dos cadastros do mês"),
        indicador("Demandas publicadas", "148", "64%", "média de 4,2 candidaturas cada"),
        indicador("Denúncias resolvidas", "11 de 14", "79%", "prazo médio de 1,4 dia"),
    ])

    corpo = (corpo.replace("__STATS__", stats)
                  .replace("__PERFIS__", perfis)
                  .replace("__EVENTOS__", eventos)
                  .replace("__INDICADORES__", indicadores))
    return shell("Painel administrativo", "admin-inicio.html", corpo, lado="admin")


# --------------------------------------------------------------------------
# Gestão de usuários
# --------------------------------------------------------------------------
def pagina_admin_usuarios():
    def acoes(bloqueado=False):
        if bloqueado:
            return ('<button class="btn btn-secundario btn-sm" type="button">Desbloquear</button>')
        return ('<button class="btn btn-secundario btn-sm" type="button" data-admin-bloquear>Bloquear</button>')

    linhas = [
        [_pessoa("DC", "Daniel Silva do Carmo", "daniel.carmo@exemplo.com"),
         "Profissional", '<span class="etiqueta etiqueta-verde">Verificado</span>',
         "CREA-AM 031947/D", "04/09/2026", acoes()],
        [_pessoa("DT", "Daniel Tec", "contato@danieltec.com.br", "avatar-empresa"),
         "Empresa", '<span class="etiqueta etiqueta-verde">Verificado</span>',
         "CREA-AM 987654321", "02/09/2026", acoes()],
        [_pessoa("AB", "Ana Beatriz Farias", "ana.farias@exemplo.com", "avatar-roxo"),
         "Profissional", '<span class="etiqueta etiqueta-verde">Verificado</span>',
         "CREA-AM 028114/D", "28/08/2026", acoes()],
        [_pessoa("RS", "Rafael Souza", "rafael.souza@exemplo.com", "avatar-ambar"),
         "Profissional", '<span class="etiqueta etiqueta-ambar">Não verificado</span>',
         "Em regularização", "26/08/2026", acoes()],
        [_pessoa("CE", "Condomínio Estrela", "sindico@estrela.exemplo.com", "avatar-empresa"),
         "Terceiro", '<span class="etiqueta etiqueta-neutra">Sem registro</span>',
         "—", "20/08/2026", acoes()],
        [_pessoa("TT", "Conta de teste", "teste@exemplo.com", "avatar-empresa"),
         "Profissional", '<span class="etiqueta etiqueta-ambar">Bloqueado</span>',
         "—", "12/08/2026", acoes(True)],
    ]

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Usuários</h1>
          <p>3.212 contas ativas. Bloqueio é reversível e fica registrado na trilha de auditoria.</p>
        </div>
        <button class="btn btn-secundario" type="button">Exportar relatório</button>
      </div>

      <div class="cartao" style="margin-bottom:18px">
        <div class="grade-form" style="grid-template-columns: minmax(0,2fr) repeat(3, minmax(0,1fr))">
          <div class="campo">
            <label for="busca-usuario">Buscar por nome, e-mail ou documento</label>
            <input id="busca-usuario" type="search" placeholder="Ex.: Daniel">
          </div>
          <div class="campo">
            <label for="filtro-perfil">Perfil</label>
            <select id="filtro-perfil">
              <option>Todos</option><option>Profissional</option>
              <option>Empresa</option><option>Terceiro</option><option>Administrador</option>
            </select>
          </div>
          <div class="campo">
            <label for="filtro-situacao">Situação</label>
            <select id="filtro-situacao">
              <option>Todas</option><option>Verificado</option>
              <option>Não verificado</option><option>Bloqueado</option>
            </select>
          </div>
          <div class="campo" style="align-self:end">
            <button class="btn btn-bloco" type="button">Filtrar</button>
          </div>
        </div>
      </div>

      <div class="cartao cartao-limpo">
        __TABELA__
      </div>

      <p class="dica" style="margin-top:14px; max-width:80ch">
        A exclusão é lógica: o registro recebe a situação de excluído e some das consultas
        operacionais, mas continua disponível para auditoria e restauração.
      </p>
"""
    corpo = corpo.replace("__TABELA__", tabela(
        ["Usuário", "Perfil", "Situação", "Registro", "Cadastro", "Ação"], linhas))
    return shell("Usuários", "admin-usuarios.html", corpo, lado="admin")


# --------------------------------------------------------------------------
# Fila de denúncias
# --------------------------------------------------------------------------
def pagina_admin_denuncias():
    def denuncia(protocolo, alvo, tipo, motivo, autor, quando, detalhe, urgente=False):
        etiqueta = ('<span class="etiqueta etiqueta-ambar">Aguardando há 2 dias</span>'
                    if urgente else '<span class="etiqueta etiqueta-neutra">Na fila</span>')
        return """<article class="cartao denuncia-card">
          <div class="denuncia-topo">
            <div>
              <span class="dica">Protocolo %s · recebida %s</span>
              <h3 style="margin:6px 0 4px">%s</h3>
              <span class="meta">%s %s · denunciado por %s</span>
            </div>
            %s
          </div>

          <p class="denuncia-motivo">%s</p>

          <div class="denuncia-acoes">
            <button class="btn btn-sm" type="button">Manter conteúdo</button>
            <button class="btn btn-secundario btn-sm" type="button">Remover conteúdo</button>
            <button class="btn btn-secundario btn-sm" type="button" data-admin-bloquear>Bloquear autor</button>
            <a class="btn btn-fantasma btn-sm" href="admin-auditoria.html">Ver histórico</a>
          </div>
        </article>""" % (protocolo, quando, motivo, ico("usuario"), alvo, autor, etiqueta, detalhe)

    denuncias = "\n        ".join([
        denuncia("2026/0341", "Rafael Souza", "perfil", "Informação profissional enganosa",
                 "Daniel Tec", "há 2 dias",
                 "A empresa alega que o perfil descreve experiência em obra que não consta no "
                 "acervo técnico e que o registro está em regularização, não ativo.", True),
        denuncia("2026/0339", "Demanda 2026/118", "demanda", "Exigência possivelmente discriminatória",
                 "Ana Beatriz Farias", "ontem",
                 "A denúncia aponta que o texto da demanda restringe candidatos por faixa etária, "
                 "o que é vedado pelo item 12.2 do edital."),
        denuncia("2026/0336", "Conta de teste", "perfil", "Conta duplicada ou falsa",
                 "Moderação automática", "há 3 dias",
                 "Cadastro com dados repetidos de outra conta e sem confirmação de registro no Crea."),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Denúncias</h1>
          <p>3 na fila · 11 resolvidas em setembro · prazo médio de resposta de 1,4 dia.</p>
        </div>
      </div>

      <p class="aviso-lgpd" style="margin-bottom:20px">
        %s Toda decisão tomada aqui — manter, remover ou bloquear — entra na trilha de auditoria
        com autor, data e motivo. Nenhuma remoção é definitiva: o conteúdo fica em exclusão
        lógica e pode ser restaurado.
      </p>

      <div class="abas" role="group" aria-label="Filtrar lista">
        <button class="aba-filtro" type="button" aria-pressed="true">Na fila <span class="nav-contador">3</span></button>
        <button class="aba-filtro" type="button" aria-pressed="false">Em análise</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Resolvidas</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Arquivadas</button>
      </div>

      <div class="grade" style="gap:14px">
        __DENUNCIAS__
      </div>
""" % ico("escudo")
    corpo = corpo.replace("__DENUNCIAS__", denuncias)
    return shell("Denúncias", "admin-denuncias.html", corpo, lado="admin")


# --------------------------------------------------------------------------
# Trilha de auditoria
# --------------------------------------------------------------------------
def pagina_admin_auditoria():
    def evento(quando, autor, acao, alvo, origem, classe=""):
        return [quando,
                '<span class="etiqueta %s">%s</span>' % (classe, acao),
                autor, alvo, '<span class="dica">%s</span>' % origem]

    linhas = [
        evento("11/09/2026 14:02", "admin@crea-am.org.br", "Bloqueio", "Conta de teste",
               "191.***.***.14", "etiqueta-ambar"),
        evento("11/09/2026 13:48", "daniel.carmo@exemplo.com", "Consulta ao Crea",
               "ART 2026/123456 · RNP 2618479301", "177.***.***.09"),
        evento("11/09/2026 11:20", "contato@danieltec.com.br", "Publicação de demanda",
               "Projeto elétrico industrial", "200.***.***.77", "etiqueta-verde"),
        evento("11/09/2026 09:37", "ana.farias@exemplo.com", "Denúncia registrada",
               "Demanda 2026/118", "189.***.***.42", "etiqueta-ambar"),
        evento("11/09/2026 08:12", "daniel.carmo@exemplo.com", "Alteração de perfil",
               "Visibilidade pública desativada", "177.***.***.09"),
        evento("10/09/2026 19:55", "admin@crea-am.org.br", "Configuração",
               "SMTP alterado", "191.***.***.14", "etiqueta-roxa"),
        evento("10/09/2026 18:03", "sindico@estrela.exemplo.com", "Cadastro",
               "Novo usuário sem registro no Crea", "45.***.***.31", "etiqueta-verde"),
        evento("10/09/2026 16:41", "daniel.carmo@exemplo.com", "Autenticação",
               "Entrada com verificação por código", "177.***.***.09"),
        evento("10/09/2026 16:38", "desconhecido", "Tentativa recusada",
               "3 senhas incorretas · conta protegida", "103.***.***.88", "etiqueta-ambar"),
    ]

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Trilha de auditoria</h1>
          <p>Quem fez, o quê, quando e de onde. Registro apenas de leitura — nada aqui se edita
             ou se apaga.</p>
        </div>
        <button class="btn btn-secundario" type="button">Exportar período</button>
      </div>

      <p class="aviso-lgpd" style="margin-bottom:20px">
        %s Os endereços de IP aparecem mascarados. O valor completo fica disponível sob
        requisição formal.
      </p>

      <div class="cartao" style="margin-bottom:18px">
        <div class="grade-form" style="grid-template-columns: repeat(4, minmax(0,1fr))">
          <div class="campo">
            <label for="aud-de">De</label>
            <input id="aud-de" type="date">
          </div>
          <div class="campo">
            <label for="aud-ate">Até</label>
            <input id="aud-ate" type="date">
          </div>
          <div class="campo">
            <label for="aud-acao">Ação</label>
            <select id="aud-acao">
              <option>Todas</option><option>Autenticação</option><option>Cadastro</option>
              <option>Alteração de perfil</option><option>Consulta ao Crea</option>
              <option>Publicação de demanda</option><option>Denúncia registrada</option>
              <option>Bloqueio</option><option>Configuração</option>
            </select>
          </div>
          <div class="campo">
            <label for="aud-autor">Autor</label>
            <input id="aud-autor" type="search" placeholder="e-mail do usuário">
          </div>
        </div>
      </div>

      <div class="cartao cartao-limpo">
        __TABELA__
      </div>
""" % ico("cadeado")
    corpo = corpo.replace("__TABELA__", tabela(
        ["Data e hora", "Ação", "Autor", "Alvo", "Origem"], linhas))
    return shell("Trilha de auditoria", "admin-auditoria.html", corpo, lado="admin")


# --------------------------------------------------------------------------
# Integrações
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Telas que ligam os dois lados (RF05)
#
# Quase todo o conteúdo destas quatro telas é montado pelo JavaScript, a
# partir do mesmo armazenamento: o interesse manifestado pelo profissional
# aparece na fila da empresa. Aqui ficam só o esqueleto e o texto fixo.
# --------------------------------------------------------------------------
def pagina_oportunidade():
    corpo = """      <p style="margin-bottom:18px">
        <a class="link" href="oportunidades.html">&larr; Voltar às oportunidades</a>
      </p>
      <div id="detalhe-oportunidade"></div>
"""
    return shell("Oportunidade", "oportunidades.html", corpo,
                 scripts=("candidaturas.js",))


def pagina_recuperar():
    """Recuperar acesso (RF01). Reaproveita o mesmo mecanismo de código do
    cadastro: o envio vai para o contato do registro, não para um endereço
    digitado agora — senão a recuperação viraria a porta de entrada."""
    corpo = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recuperar acesso · ProLink</title>
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<header class="topo-publico">
  <a class="marca" href="index.html">__LOGO__<span class="marca-nome">Pro<span>Link</span></span></a>
  <div class="acoes">
    <a class="btn btn-secundario" href="login.html">Voltar para entrar</a>
  </div>
</header>

<main class="login-area" id="conteudo" style="min-height:calc(100vh - 160px)">
  <div class="login-caixa">
    <h1>Recuperar acesso</h1>
    <p>Informe o documento da conta e o e-mail de contato cadastrado nela para criar uma nova senha.</p>

    <div class="campo">
      <label for="documento-recuperar">CPF ou CNPJ</label>
      <div class="campo-entrada">
        __EMAIL__
        <input id="documento-recuperar" type="text" inputmode="numeric" placeholder="O documento usado no cadastro" autocomplete="username">
      </div>
    </div>
    <div class="campo">
      <label for="email-recuperar">E-mail de contato cadastrado</label>
      <input id="email-recuperar" type="email" placeholder="seu@email.com" autocomplete="email">
    </div>
    <div class="campo">
      <label for="nova-senha">Nova senha</label>
      <input id="nova-senha" type="password" placeholder="Mínimo de 8 caracteres" autocomplete="new-password">
    </div>
    <div class="campo">
      <label for="nova-senha-conf">Confirmar nova senha</label>
      <input id="nova-senha-conf" type="password" autocomplete="new-password">
    </div>

    <button class="btn btn-lg btn-bloco" type="button" id="confirmar-recuperacao">Salvar nova senha</button>

    <div class="retorno-crea" id="retorno-recuperacao" role="status" hidden></div>

    <p class="aviso-lgpd" style="margin-top:22px">
      __ESCUDO__
      <span>A resposta é a mesma quando o documento não existe ou o e-mail não confere: dizer
      qual dos dois falhou entregaria quem tem conta aqui. Sem envio de código neste protótipo,
      a conferência é feita pelos dados da conta.</span>
    </p>

    <p class="dica" style="text-align:center; margin-top:18px">
      Perdeu também o acesso ao e-mail? A atualização é feita no Crea, pelo atendimento.
    </p>
  </div>
</main>

<footer class="rodape-publico">
  <span>ProLink · Desafio Crea Pro-Link — II CENATEC 2026 ·
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário</a></span>
  <span>Ambiente de divulgação voluntária. Não substitui contratação, habilitação,
        licitação, seleção, fiscalização ou verificação documental.</span>
</footer>
<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
</body>
</html>
"""
    return (corpo.replace("__LOGO__", logo(32))
                 .replace("__EMAIL__", ico("email"))
                 .replace("__ESCUDO__", ico("escudo")))


def pagina_privacidade():
    """Tela montada pelo JavaScript: o conteúdo depende do que o titular
    escolheu, e a escolha precisa refletir no cálculo na mesma hora."""
    corpo = """      <div id="tela-privacidade"></div>
"""
    return shell("Privacidade e dados", "privacidade.html", corpo,
                 scripts=("privacidade.js",))


def pagina_candidaturas():
    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Minhas candidaturas</h1>
          <p id="resumo-candidaturas">Carregando…</p>
        </div>
        <a class="btn btn-secundario" href="oportunidades.html">Buscar oportunidades</a>
      </div>

      <div class="abas" role="group" aria-label="Filtrar lista">
        <button class="aba-filtro" type="button" aria-pressed="true">Todas</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Em andamento</button>
        <button class="aba-filtro" type="button" aria-pressed="false">Encerradas</button>
      </div>

      <div class="grade" style="gap:14px" id="lista-minhas-candidaturas"></div>

      <p class="aviso-lgpd" style="margin-top:20px">
        %s Ao manifestar interesse você autoriza a empresa a ver o perfil e o acervo que
        você anexou — só isso. Nada além do que foi selecionado é compartilhado.
      </p>
""" % ico("cadeado")
    return shell("Minhas candidaturas", "candidaturas.html", corpo,
                 scripts=("candidaturas.js",))


def pagina_empresa_candidaturas():
    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Candidaturas</h1>
          <p id="titulo-fila">Carregando…</p>
        </div>
      </div>

      <div class="cartao" style="margin-bottom:18px">
        <div class="campo" style="margin-bottom:0; max-width:520px">
          <label for="seletor-demanda">Demanda</label>
          <select id="seletor-demanda"></select>
        </div>
      </div>

      <div class="grade" style="gap:14px" id="lista-candidaturas-empresa"></div>

      <p class="aviso-lgpd" style="margin-top:20px">
        %s A ordem é por compatibilidade calculada, não por preferência da plataforma. O
        critério é o mesmo para todos e pode ser aberto em cada cartão. A correspondência
        é indicativa: cabe à empresa verificar habilitação e regularidade.
      </p>
""" % ico("escudo")
    return shell("Candidaturas", "empresa-candidaturas.html", corpo,
                 scripts=("candidaturas.js",), lado="empresa")


def pagina_profissional_publico():
    corpo = """      <p style="margin-bottom:18px">
        <a class="link" href="empresa-candidaturas.html" id="voltar-perfil">&larr; Voltar às candidaturas</a>
      </p>
      <div id="perfil-publico"></div>
"""
    return shell("Perfil do profissional", "empresa-profissionais.html", corpo,
                 scripts=("candidaturas.js",), lado="empresa")


def pagina_buscar_publico():
    """Busca pública de profissionais.

    O Anexo I, item 3, define o perfil "Público" com estas necessidades:
    pesquisar profissionais com filtros de especialidade, experiência e nome,
    e ver o perfil do profissional. Sem conta, sem login.

    Só aparece aqui o que cada profissional autorizou a exibir — a tela de
    Privacidade e dados controla campo a campo o que é público.
    """
    def profissional(iniciais, nome, titulo, registro, cidade, resumo,
                     competencias, cor="", verificado=True):
        selo = ('<span class="etiqueta etiqueta-verde">%s Registro verificado</span>'
                % ico("escudo") if verificado
                else '<span class="etiqueta etiqueta-ambar">Registro não verificado</span>')
        marcas = "".join('<span class="etiqueta">%s</span>' % c for c in competencias)

        return ("""<article class="cartao candidato">
          <div class="candidato-topo">
            <span class="avatar avatar-md %s">%s</span>
            <div style="flex:1; min-width:0">
              <h3>%s</h3>
              <span class="meta">%s · %s</span>
            </div>
          </div>

          <div class="meta-linha" style="margin:12px 0">
            %s
            <span class="meta">%s %s</span>
          </div>

          <p style="font-size:13.5px; color:var(--tinta-2)">%s</p>

          <div class="competencias" style="margin-top:12px">%s</div>

          <div class="candidato-acoes">
            <a class="btn btn-secundario btn-sm" href="__PERFIL__">Ver perfil</a>
            <a class="btn btn-fantasma btn-sm" href="cadastro.html">Entrar em contato</a>
          </div>
        </article>""" % (cor, iniciais, nome, titulo, registro, selo,
                         ico("pino"), cidade, resumo, marcas)).replace("__PERFIL__", link_perfil(nome))

    def filtro(rotulo, marcado=False):
        check = " checked" if marcado else ""
        return ('<label class="opcao-filtro"><input type="checkbox"%s><span>%s</span></label>'
                % (check, rotulo))

    profissionais = "\n            ".join([
        profissional("DC", "Daniel Silva do Carmo", "Engenheiro civil", "CREA-AM 031947/D",
                     "Manaus, AM",
                     "Projeto estrutural e fiscalização de obra, com acervo em edificações "
                     "verticais e estruturas metálicas.",
                     ["Cálculo estrutural", "Fundações profundas", "Laudos técnicos"]),
        profissional("AB", "Ana Beatriz Farias", "Engenheira eletricista", "CREA-AM 028114/D",
                     "Manaus, AM",
                     "Projeto elétrico industrial e SPDA, com acervo em plantas de 4.000 m² "
                     "ou mais.",
                     ["SPDA", "Projeto elétrico", "Subestação"], "avatar-roxo"),
        profissional("LM", "Lucas Martins", "Engenheiro ambiental", "CREA-AM 034720/D",
                     "Manaus, AM",
                     "Licenciamento ambiental na região metropolitana, com histórico em "
                     "empreendimentos às margens de corpos d'água.",
                     ["Licenciamento", "Estudos de impacto"], "avatar-verde"),
        profissional("RS", "Rafael Souza", "Engenheiro mecânico", "Registro em regularização",
                     "Manaus, AM",
                     "Montagem industrial e tubulação. O Crea ainda não confirmou este registro.",
                     ["Tubulação", "Montagem industrial"], "avatar-ambar", False),
    ])

    corpo = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buscar profissionais · ProLink</title>
<meta name="description" content="Busca pública de profissionais registrados no Crea-AM.">
<link rel="stylesheet" href="assets/css/prolink.css">
</head>
<body>
<a class="pular-para-conteudo" href="#conteudo">Ir para o conteúdo</a>

<header class="topo-publico">
  <a class="marca" href="index.html">__LOGO__<span class="marca-nome">Pro<span>Link</span></span></a>
  <nav aria-label="Navegação principal">
    <a href="buscar.html" aria-current="page">Buscar profissionais</a>
    <a href="index.html#recursos">Como funciona</a>
  </nav>
  <div class="acoes">
    <a class="btn btn-secundario" href="login.html" data-transicao="Abrindo a tela de entrada…">Entrar</a>
    <a class="btn" href="cadastro.html" data-transicao="Abrindo seu cadastro…">Criar conta</a>
  </div>
</header>

<main id="conteudo" class="pagina" style="max-width:var(--max)">
  <div class="pagina-cabecalho">
    <div>
      <h1>Buscar profissionais</h1>
      <p id="subtitulo-busca">Consulta aberta, sem conta. Aparecem só os profissionais que
         autorizaram as buscas públicas.</p>
    </div>
  </div>

  <div class="grade grade-filtro">
    <aside class="cartao">
      <h2 style="font-size:16px; margin-bottom:14px">Filtros</h2>

      <div class="filtro-bloco">
        <div class="campo" style="margin-bottom:0">
          <label for="busca-nome">Nome do profissional</label>
          <input id="busca-nome" type="search" placeholder="Ex.: Daniel">
        </div>
      </div>

      <div class="filtro-bloco">
        <h4>Especialidade</h4>
        %s
        %s
        %s
        %s
        %s
      </div>

      <div class="filtro-bloco">
        <h4>Experiência</h4>
        <div class="campo" style="margin-bottom:0">
          <label class="sr-apenas" for="busca-experiencia">Tempo de experiência</label>
          <select id="busca-experiencia">
            <option>Qualquer tempo</option>
            <option>Mais de 2 anos</option>
            <option>Mais de 5 anos</option>
            <option>Mais de 10 anos</option>
          </select>
        </div>
      </div>

      <div class="filtro-bloco">
        <h4>Situação no Crea</h4>
        %s
        %s
      </div>

      <div class="filtro-bloco">
        <h4>Cidade</h4>
        <div class="campo" style="margin-bottom:0">
          <label class="sr-apenas" for="busca-cidade">Cidade</label>
          <select id="busca-cidade">
            <option>Todo o Amazonas</option>
            <option>Manaus</option>
            <option>Itacoatiara</option>
            <option>Parintins</option>
          </select>
        </div>
      </div>

      <div class="filtro-bloco">
        <button class="btn btn-bloco" type="button">Aplicar filtros</button>
      </div>
    </aside>

    <div>
      <p class="aviso-indicativo">
        %s <strong>Divulgação voluntária.</strong> Cada profissional escolhe o que exibir
        aqui. O ProLink não classifica pessoas nem recomenda institucionalmente: cabe a
        quem contrata verificar habilitação, atribuições e regularidade junto ao Crea.
      </p>

      <div class="secao-titulo" style="margin-top:18px">
        <span class="meta">4 profissionais encontrados</span>
      </div>

      <div class="grade grade-2" style="gap:14px">
        %s
      </div>

      <div class="cartao" style="margin-top:24px; text-align:center; padding:28px 24px">
        <h3 style="margin-bottom:8px">Quer falar com algum deles?</h3>
        <p class="dica" style="margin-bottom:16px">Enviar mensagem e publicar demanda
           exigem conta. Criar é gratuito, e leva menos tempo se você tiver registro no Crea.</p>
        <a class="btn" href="cadastro.html" data-transicao="Abrindo seu cadastro…">Criar conta</a>
      </div>
    </div>
  </div>
</main>

<footer class="rodape-publico">
  <span>ProLink · Desafio Crea Pro-Link — II CENATEC 2026 ·
        <a class="link" href="manual-do-usuario.pdf" target="_blank" rel="noopener">Manual do usuário</a></span>
  <span>Ambiente de divulgação voluntária. Não substitui contratação, habilitação,
        licitação, fiscalização ou verificação documental.</span>
</footer>
<script src="assets/js/transicao.js"></script>
<script src="assets/js/banco.js"></script>
<script src="assets/js/prolink.js"></script>
<script src="assets/js/interacoes.js"></script>
</body>
</html>
""" % (filtro("Estrutural"), filtro("Elétrica"), filtro("Hidráulica e sanitária"),
       filtro("Ambiental"), filtro("Agronomia"),
       filtro("Registro ativo", True), filtro("Empresa registrada"),
       ico("escudo"), profissionais)

    return corpo.replace("__LOGO__", logo(32))


def pagina_profissionais_logado():
    """Busca de profissionais dentro do sistema.

    Um profissional também procura profissional: parceria em projeto
    multidisciplinar, subcontratação de disciplina que ele não tem
    atribuição para assinar, indicação para uma demanda que não é a
    sua área. A plataforma prevê "Parceria" como tipo de demanda desde
    o início — faltava o caminho para encontrar com quem fazê-la.

    É a mesma busca pública, com duas diferenças: quem está logado pode
    enviar mensagem na hora e convidar para uma demanda.
    """
    def profissional(iniciais, nome, titulo, registro, cidade, resumo,
                     competencias, cor="", verificado=True):
        selo = ('<span class="etiqueta etiqueta-verde">%s Registro verificado</span>'
                % ico("escudo") if verificado
                else '<span class="etiqueta etiqueta-ambar">Registro não verificado</span>')
        marcas = "".join('<span class="etiqueta">%s</span>' % c for c in competencias)

        return ("""<article class="cartao candidato">
            <div class="candidato-topo">
              <span class="avatar avatar-md %s">%s</span>
              <div style="flex:1; min-width:0">
                <h3>%s</h3>
                <span class="meta">%s · %s</span>
              </div>
            </div>

            <div class="meta-linha" style="margin:12px 0">
              %s
              <span class="meta">%s %s</span>
            </div>

            <p style="font-size:13.5px; color:var(--tinta-2)">%s</p>

            <div class="competencias" style="margin-top:12px">%s</div>

            <div class="candidato-acoes">
              <a class="btn btn-sm" href="__CONVERSA__">Enviar mensagem</a>
              <a class="btn btn-secundario btn-sm" href="__PERFIL__">Ver perfil</a>
            </div>
          </article>""" % (cor, iniciais, nome, titulo, registro, selo,
                           ico("pino"), cidade, resumo, marcas)
                ).replace("__PERFIL__", link_perfil(nome)).replace("__CONVERSA__", link_conversa(nome))

    def filtro(rotulo, marcado=False):
        check = " checked" if marcado else ""
        return ('<label class="opcao-filtro"><input type="checkbox"%s><span>%s</span></label>'
                % (check, rotulo))

    profissionais = "\n            ".join([
        profissional("AB", "Ana Beatriz Farias", "Engenheira eletricista", "CREA-AM 028114/D",
                     "Manaus, AM",
                     "Projeto elétrico industrial e SPDA. Complementa projeto estrutural em "
                     "obras que exigem as duas disciplinas.",
                     ["SPDA", "Projeto elétrico", "Subestação"], "avatar-roxo"),
        profissional("LM", "Lucas Martins", "Engenheiro ambiental", "CREA-AM 034720/D",
                     "Manaus, AM",
                     "Licenciamento ambiental na região metropolitana, com histórico em "
                     "empreendimentos às margens de corpos d'água.",
                     ["Licenciamento", "Estudos de impacto"], "avatar-verde"),
        profissional("PM", "Paula Menezes", "Engenheira agrônoma", "CREA-AM 041288/D",
                     "Iranduba, AM",
                     "Projetos de irrigação e manejo de solo no interior do estado.",
                     ["Irrigação", "Manejo de solo"], "avatar-ambar"),
        profissional("RS", "Rafael Souza", "Engenheiro mecânico", "Registro em regularização",
                     "Manaus, AM",
                     "Montagem industrial e tubulação. O Crea ainda não confirmou este registro.",
                     ["Tubulação", "Montagem industrial"], "", False),
    ])

    corpo = """      <div class="pagina-cabecalho">
        <div>
          <h1>Buscar profissionais</h1>
          <p>Encontre quem complementa o que você não assina: parceria, subcontratação de
             disciplina ou indicação para uma demanda fora da sua área.</p>
        </div>
      </div>

      <div class="grade grade-filtro">
        <aside class="cartao">
          <h2 style="font-size:16px; margin-bottom:14px">Filtros</h2>

          <div class="filtro-bloco">
            <div class="campo" style="margin-bottom:0">
              <label for="busca-prof-nome">Nome do profissional</label>
              <input id="busca-prof-nome" type="search" placeholder="Ex.: Ana">
            </div>
          </div>

          <div class="filtro-bloco">
            <h4>Especialidade</h4>
            %s
            %s
            %s
            %s
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <h4>Experiência</h4>
            <div class="campo" style="margin-bottom:0">
              <label class="sr-apenas" for="busca-prof-exp">Tempo de experiência</label>
              <select id="busca-prof-exp">
                <option>Qualquer tempo</option>
                <option>Mais de 2 anos</option>
                <option>Mais de 5 anos</option>
                <option>Mais de 10 anos</option>
              </select>
            </div>
          </div>

          <div class="filtro-bloco">
            <h4>Situação no Crea</h4>
            %s
            %s
          </div>

          <div class="filtro-bloco">
            <h4>Cidade</h4>
            <div class="campo" style="margin-bottom:0">
              <label class="sr-apenas" for="busca-prof-cidade">Cidade</label>
              <select id="busca-prof-cidade">
                <option>Todo o Amazonas</option>
                <option>Manaus</option>
                <option>Itacoatiara</option>
                <option>Parintins</option>
              </select>
            </div>
          </div>

          <div class="filtro-bloco">
            <button class="btn btn-bloco" type="button">Aplicar filtros</button>
            <button class="btn btn-fantasma btn-bloco" type="button" style="margin-top:8px">Limpar</button>
          </div>
        </aside>

        <div>
          <div class="abas" role="group" aria-label="Filtrar lista">
            <button class="aba-filtro" type="button" aria-pressed="true">Todos</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Verificados</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Já trabalhei com</button>
            <button class="aba-filtro" type="button" aria-pressed="false">Salvos</button>
          </div>

          <div class="secao-titulo">
            <span class="meta">4 profissionais encontrados</span>
          </div>

          __AVISO_IND__

          <div class="grade grade-2" style="gap:14px">
            %s
          </div>

          <div style="display:flex; justify-content:center; margin-top:24px">
            <button class="btn btn-secundario" type="button">Carregar mais</button>
          </div>
        </div>
      </div>
""" % (filtro("Estrutural"), filtro("Elétrica"), filtro("Hidráulica e sanitária"),
       filtro("Ambiental"), filtro("Mecânica"), filtro("Agronomia"),
       filtro("Registro ativo", True), filtro("Empresa registrada"),
       profissionais)

    return shell("Buscar profissionais", "profissionais.html", corpo)


# --------------------------------------------------------------------------
PAGINAS = {
    "index.html": pagina_index,
    "login.html": pagina_login,
    "cadastro.html": pagina_cadastro,
    "inicio.html": pagina_inicio,
    "oportunidades.html": pagina_oportunidades,
    "miranda.html": pagina_miranda,
    "portfolio.html": pagina_portfolio,
    "mensagens.html": pagina_mensagens,
    "avaliacoes.html": pagina_avaliacoes,
    "perfil.html": pagina_perfil,
    "oportunidade.html": pagina_oportunidade,
    "candidaturas.html": pagina_candidaturas,
    "profissionais.html": pagina_profissionais_logado,
    "privacidade.html": pagina_privacidade,
    "recuperar.html": pagina_recuperar,
    "buscar.html": pagina_buscar_publico,

    # Lado da empresa
    "empresa-inicio.html": pagina_empresa_inicio,
    "empresa-demandas.html": pagina_empresa_demandas,
    "empresa-publicar.html": pagina_empresa_publicar,
    "empresa-profissionais.html": pagina_empresa_profissionais,
    "empresa-perfil.html": pagina_empresa_perfil,
    "empresa-candidaturas.html": pagina_empresa_candidaturas,
    "profissional.html": pagina_profissional_publico,
    "empresa-mensagens.html": lambda: pagina_mensagens("empresa"),
    "empresa-avaliacoes.html": lambda: pagina_avaliacoes("empresa"),

    # Lado do administrador (RF06)
    "admin-inicio.html": pagina_admin_inicio,
    "admin-usuarios.html": pagina_admin_usuarios,
    "admin-denuncias.html": pagina_admin_denuncias,
    "admin-auditoria.html": pagina_admin_auditoria,

    # Configurações (engrenagem da barra superior) e prévia do perfil público
    "configuracoes.html": pagina_configuracoes,
    "empresa-configuracoes.html": lambda: pagina_configuracoes("empresa"),
    "admin-configuracoes.html": lambda: pagina_configuracoes("admin"),
    "perfil-publico.html": pagina_perfil_publico,
}

# Cada script antigo vira seus arquivos na organização MVC, na mesma ordem.
MVC = {
    "prolink.js": ["models/repositorios.js", "core/app.js", "views/componentes.js",
                   "controllers/interface.js", "controllers/sessao.js", "controllers/cadastro.js",
                   "controllers/perfil.js", "controllers/denuncias.js", "controllers/notificacoes.js"],
    "demandas.js": ["models/demandas.js"],
    "crea-api.js": ["models/crea-api.js"],
    "interacoes.js": ["controllers/layout.js", "controllers/oportunidades.js", "controllers/demandas.js",
                      "controllers/busca.js", "controllers/portfolio.js", "controllers/avaliacoes.js",
                      "controllers/admin.js", "controllers/painel.js", "controllers/conta.js", "controllers/abas.js"],
}


def carregar_pela_base(html):
    """A base CSV é lida antes de tudo: app/core/banco.js abre os CSV e só então
    carrega models, views e controllers da página, na ordem certa."""
    tags = re.findall(r'<script src="assets/js/([\w-]+\.js)"></script>\n?', html)
    if "banco.js" not in tags:
        return html
    scripts = ["models/repositorios.js"]
    for t in tags:
        if t in ("transicao.js", "banco.js"):
            continue
        for destino in MVC.get(t, ["controllers/" + t]):
            if destino not in scripts:
                scripts.append(destino)
    html = re.sub(r'<script src="assets/js/[\w-]+\.js"></script>\n?', "", html)
    carga = ('<script src="app/views/chave-gemini.js"></script>\n'
             '<script src="app/views/icones.js"></script>\n'
             '<script src="app/views/transicao.js"></script>\n'
             '<script src="dados/base-inicial.js"></script>\n'
             '<script src="dados/base-demonstracao.js"></script>\n'
             '<script src="app/core/arquivos-locais.js"></script>\n'
             '<script src="app/core/banco.js" data-scripts="%s"></script>\n' % ",".join(scripts))
    return html.replace("</body>", carga + "</body>")


def empacotar_dados():
    """Uma página aberta com duplo clique não lê arquivos do disco com fetch,
    mas carrega scripts. Então os CSV de dados/ (a base inicial) e os arquivos
    de texto que o sistema lê viram strings dentro de dois scripts."""
    import glob, json
    import hashlib
    # Esta versão não usa arquivo de chave do Gemini: se sobrou um de
    # versão anterior, ele é apagado para não ir parar no repositório.
    chave_antiga = os.path.join(BASE, "chave_api_gemini.txt")
    if os.path.exists(chave_antiga):
        os.remove(chave_antiga)
        print("AVISO: chave_api_gemini.txt apagado. A chave do Gemini é inserida pela interface (Ctrl + Espaço).")
    pasta = os.path.join(BASE, "dados")

    def ler_csvs(pasta_csv):
        base = {}
        for caminho in sorted(glob.glob(os.path.join(pasta_csv, "*.csv"))):
            with open(caminho, encoding="utf-8") as f:
                base[os.path.splitext(os.path.basename(caminho))[0]] = f.read()
        return base

    def versao_de(base):
        return hashlib.sha256(json.dumps(base, sort_keys=True).encode("utf-8")).hexdigest()[:16]

    # Base real: dados/*.csv (só cabeçalhos no projeto entregue).
    base = ler_csvs(pasta)
    with open(os.path.join(pasta, "base-inicial.js"), "w", encoding="utf-8") as f:
        f.write("/* Gerado pelo build.py a partir de dados/*.csv (base real, começa vazia). Não edite. */\n")
        f.write("window.PROLINK_BASE_INICIAL = %s;\n" % json.dumps(base, ensure_ascii=False, indent=1))
        f.write("window.PROLINK_VERSAO_BASE = %s;\n" % json.dumps(versao_de(base)))
    # Base de demonstração: dados/demonstracao/*.csv (dados fictícios).
    demo = ler_csvs(os.path.join(pasta, "demonstracao"))
    with open(os.path.join(pasta, "base-demonstracao.js"), "w", encoding="utf-8") as f:
        f.write("/* Gerado pelo build.py a partir de dados/demonstracao/*.csv (só modo de demonstração). Não edite. */\n")
        f.write("window.PROLINK_BASE_DEMONSTRACAO = %s;\n" % json.dumps(demo, ensure_ascii=False))
        f.write("window.PROLINK_VERSAO_DEMONSTRACAO = %s;\n" % json.dumps(versao_de(demo)))
    textos = {}
    # A chave do Gemini NÃO é empacotada: ela é digitada na tela inicial
    # (Ctrl + Espaço) e vale só enquanto o site estiver aberto.
    for nome in ("chave_api_crea.txt", "manual-prolink.txt"):
        caminho = os.path.join(BASE, nome)
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as f:
                textos[nome] = f.read()
    with open(os.path.join(BASE, "app", "core", "arquivos-locais.js"), "w", encoding="utf-8") as f:
        f.write("/* Gerado pelo build.py: cópia dos arquivos de texto que o sistema lê.\n"
                "   Mudou uma chave ou o manual? Rode o build de novo. */\n")
        f.write("window.PROLINK_ARQUIVOS_LOCAIS = %s;\n" % json.dumps(textos, ensure_ascii=False, indent=1))
    with open(os.path.join(BASE, "app", "views", "icones.js"), "w", encoding="utf-8") as f:
        f.write("/* Gerado pelo build.py: os ícones SVG das telas, para os controllers. */\n")
        f.write("window.PROLINK_ICONES = %s;\n" % json.dumps({k: ico(k) for k in ICONS}, ensure_ascii=False))
    print("empacotados: %d CSV reais, %d de demonstração e %d arquivos de texto" % (len(base), len(demo), len(textos)))


if __name__ == "__main__":
    empacotar_dados()
    for nome, fn in PAGINAS.items():
        caminho = os.path.join(BASE, nome)
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(carregar_pela_base(fn()))
        print("gerado:", nome)
