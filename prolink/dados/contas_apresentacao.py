"""
Contas da apresentação do ProLink (base real, dados/*.csv).

O modo de demonstração saiu: o sistema tem uma base só, e quem apresenta
entra com as contas abaixo (a senha vai para o CSV só como hash SHA-256
com sal, como no cadastro):

  Profissional   Daniel Silva do Carmo            CPF 037.590.362-36
  Profissional   Eduardo Weber Martins Negreiros  CPF 034.082.532-42
  Empresa        DW Engenharia                    CNPJ 12.345.678/0001-95
  Administrativo Suporte ProLink                  admsuporte@prolink.com.br

Os dois profissionais têm currículo fictício (título, resumo, competências,
ARTs e CATs, projetos, arquivos e avaliações), e as demandas da DW
Engenharia e de outras empresas combinam com eles, para o painel já
sugerir oportunidades e a empresa já ver os dois entre os candidatos.

Idempotente: rodar de novo não duplica nada.
    python3 dados/contas_apresentacao.py
    python3 build.py
"""
import csv
import hashlib
import io
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))

SENHAS = {
    "u-daniel": ("sal-daniel-2026", "daniel123"),
    "u-eduardo": ("sal-eduardo-2026", "eduardo123"),
    "u-dw-engenharia": ("sal-dw-2026", "dwengenharia123"),
    "u-suporte": ("sal-suporte-2026", "admsuporte123"),
}

# Ids e nomes antigos (perfis de demonstração) -> contas da apresentação
TROCAS = [
    ("u-prof-demo", "u-daniel"),
    ("u-emp-demo", "u-dw-engenharia"),
    ("u-admin-demo", "u-suporte"),
    ("arq-demo-", "arq-dw-"),
    ("Daniel Tec Engenharia e Montagem LTDA", "DW Engenharia LTDA"),
    ("contato@danieltec.com.br", "contato@dwengenharia.com.br"),
    ("Daniel Tec", "DW Engenharia"),
]


def ler(nome):
    with open(os.path.join(AQUI, nome), encoding="utf-8-sig") as f:
        texto = f.read()
    for antigo, novo in TROCAS:
        texto = texto.replace(antigo, novo)
    leitor = csv.DictReader(io.StringIO(texto), delimiter=";")
    return leitor.fieldnames, [dict(l) for l in leitor]


def celula(valor):
    texto = "" if valor is None else str(valor)
    if any(c in texto for c in ';"\r\n'):
        texto = '"' + texto.replace('"', '""') + '"'
    return texto


def gravar(nome, colunas, linhas):
    saida = [";".join(colunas)] + [";".join(celula(l.get(c, "")) for c in colunas) for l in linhas]
    with open(os.path.join(AQUI, nome), "w", encoding="utf-8-sig", newline="") as f:
        f.write("\r\n".join(saida) + "\r\n")


def js(valor):
    return json.dumps(valor, ensure_ascii=False)


def por_id(linhas, ident):
    return next((l for l in linhas if l.get("id") == ident), None)


def pôr(linhas, linha):
    """Insere ou substitui pelo id (idempotente)."""
    atual = por_id(linhas, linha["id"])
    if atual is None:
        linhas.append(linha)
    else:
        atual.clear()
        atual.update(linha)


def hash_senha(sal, senha):
    return hashlib.sha256((sal + ":" + senha).encode("utf-8")).hexdigest()


tabelas = {}
for nome in sorted(os.listdir(AQUI)):
    if nome.endswith(".csv"):
        tabelas[nome[:-4]] = list(ler(nome))

usuarios = tabelas["usuarios"][1]
profissionais = tabelas["profissionais"][1]
demandas = tabelas["demandas"][1]
candidaturas = tabelas["candidaturas"][1]

LOGO_DW = ("data:image/svg+xml;base64," + __import__("base64").b64encode(
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#0f766e"/>'
    b'<path d="M18 72 L48 20 L78 72 Z" fill="none" stroke="#99f6e4" stroke-width="6" stroke-linejoin="round"/>'
    b'<text x="48" y="66" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="#fff">DW</text></svg>'
).decode("ascii"))

# ---------------------------------------------------------------------------
# Profissional 1: Daniel Silva do Carmo (engenheiro civil, estrutural)
# ---------------------------------------------------------------------------
ACERVO_DANIEL = [
    {"tipo": "ART", "numero": "2026/123456", "atividade": "Projeto estrutural residencial de 18 pavimentos", "area": "Estrutural"},
    {"tipo": "ART", "numero": "2026/123455", "atividade": "Laudo técnico estrutural de galpão", "area": "Estrutural"},
    {"tipo": "ART", "numero": "2025/118320", "atividade": "Projeto de reforço de estrutura de concreto", "area": "Estrutural"},
    {"tipo": "CAT", "numero": "2025/0881", "atividade": "Execução de fundação profunda", "area": "Estrutural"},
    {"tipo": "ART", "numero": "2025/104877", "atividade": "Fiscalização de obra vertical", "area": "Estrutural"},
    {"tipo": "ART", "numero": "2026/123454", "atividade": "Instalações hidráulicas prediais", "area": "Hidráulica"},
    {"tipo": "ART", "numero": "2026/123451", "atividade": "Projeto elétrico e SPDA de indústria", "area": "Elétrica"},
    {"tipo": "ART", "numero": "2024/087612", "atividade": "Modelagem BIM estrutural e compatibilização", "area": "BIM"},
]
DANIEL = {
    "id": "prof-001", "nome": "Daniel Silva do Carmo", "iniciais": "DC", "cor": "avatar-roxo",
    "titulo": "Engenheiro civil", "registro": "CREA-AM 031947/D", "rnp": "2618479301",
    "cidade": "Manaus", "uf": "AM", "nota": "4.8", "avaliacoes": "", "verificado": "sim", "atendeEstado": "sim",
    "areas": js(["Estrutural", "Hidráulica", "Elétrica", "BIM"]),
    "acervoPorArea": js({"Estrutural": 5, "Hidráulica": 1, "Elétrica": 1, "BIM": 1}),
    "competencias": js(["Cálculo estrutural", "Concreto armado", "Fundações profundas", "Laudos técnicos",
                        "Reforço estrutural", "BIM · Revit Structure"]),
    "acervo": js(ACERVO_DANIEL),
    "resumo": "Engenheiro civil (UFAM, 2018), pós-graduado em estruturas de concreto. Oito anos em projeto "
              "estrutural, laudos e fiscalização de obras verticais em Manaus, com 8 documentos confirmados no Crea.",
}

# ---------------------------------------------------------------------------
# Profissional 2: Eduardo Weber Martins Negreiros (engenheiro eletricista)
# ---------------------------------------------------------------------------
ACERVO_EDUARDO = [
    {"tipo": "ART", "numero": "2026/214501", "atividade": "Projeto elétrico e SPDA de galpão logístico", "area": "Elétrica"},
    {"tipo": "ART", "numero": "2026/214388", "atividade": "Projeto de usina solar fotovoltaica de 150 kWp", "area": "Elétrica"},
    {"tipo": "ART", "numero": "2025/198770", "atividade": "Laudo de instalações elétricas industriais", "area": "Elétrica"},
    {"tipo": "ART", "numero": "2025/187412", "atividade": "Projeto de subestação abrigada de 500 kVA", "area": "Elétrica"},
    {"tipo": "CAT", "numero": "2025/0912", "atividade": "Execução de SPDA e malha de aterramento", "area": "Elétrica"},
    {"tipo": "ART", "numero": "2025/176305", "atividade": "Compatibilização BIM de instalações elétricas", "area": "BIM"},
]
EDUARDO = {
    "id": "prof-eduardo", "nome": "Eduardo Weber Martins Negreiros", "iniciais": "EN", "cor": "avatar-verde",
    "titulo": "Engenheiro eletricista", "registro": "CREA-AM 052318/D", "rnp": "0425731986",
    "cidade": "Manaus", "uf": "AM", "nota": "4.7", "avaliacoes": "", "verificado": "sim", "atendeEstado": "sim",
    "areas": js(["Elétrica", "BIM"]),
    "acervoPorArea": js({"Elétrica": 5, "BIM": 1}),
    "competencias": js(["Projeto elétrico industrial", "SPDA e aterramento", "Energia solar fotovoltaica",
                        "Subestação abrigada", "NR-10", "BIM · Revit MEP"]),
    "acervo": js(ACERVO_EDUARDO),
    "resumo": "Engenheiro eletricista (UEA). Projetos elétricos prediais e industriais, SPDA, subestações "
              "abrigadas e usinas fotovoltaicas no Amazonas, modelados em BIM. 6 documentos confirmados no Crea.",
}

pôr(profissionais, DANIEL)
pôr(profissionais, EDUARDO)

# ---------------------------------------------------------------------------
# Contas
# ---------------------------------------------------------------------------
def conta(ident, base, extras):
    sal, senha = SENHAS[ident]
    extras = dict(extras)
    extras["senhaSal"] = sal
    extras["senhaHash"] = hash_senha(sal, senha)
    extras.pop("perfilDemonstracao", None)
    linha = {c: "" for c in tabelas["usuarios"][0]}
    linha.update(base)
    linha.update({"id": ident, "verificado": "sim", "primeiroAcesso": "nao", "demonstracao": "nao",
                  "extras": js(extras)})
    return linha


CONSENTIMENTOS = {"consultaCrea": True, "termos": True, "visibilidade": True, "avisos": True}

pôr(usuarios, conta("u-daniel", {
    "tipoConta": "profissional", "nome": "Daniel Silva do Carmo", "email": "danicarmo240306@gmail.com",
    "documento": "037.590.362-36", "registro": "031947/D", "ufRegistro": "AM", "rnp": "2618479301",
    "titulo": "Engenheiro civil", "situacao": "Ativo", "cidadeExibicao": "Manaus, AM",
    "sobre": "Engenheiro civil formado pela UFAM (2018), com pós-graduação em estruturas de concreto. "
             "Há oito anos faz projeto estrutural, laudos técnicos e fiscalização de obras verticais em Manaus: "
             "edifícios de até 18 pavimentos, fundações profundas e reforço de estruturas. Modela em BIM "
             "(Revit Structure) e compatibiliza com as demais disciplinas.",
    "profissionalId": "prof-001", "criadoEm": "2026-09-04 10:00:00",
}, {"documentoLogin": "03759036236", "consentimentos": CONSENTIMENTOS, "situacaoConta": "Verificado",
    "registroExibicao": "CREA-AM 031947/D", "cadastroEm": "04/09/2026",
    "telefone": "(92) 99100-2030", "formacao": "Engenharia Civil · UFAM · 2018"}))

pôr(usuarios, conta("u-eduardo", {
    "tipoConta": "profissional", "nome": "Eduardo Weber Martins Negreiros", "email": "ewmn.eng25@uea.edu.br",
    "documento": "034.082.532-42", "registro": "052318/D", "ufRegistro": "AM", "rnp": "0425731986",
    "titulo": "Engenheiro eletricista", "situacao": "Ativo", "cidadeExibicao": "Manaus, AM",
    "sobre": "Engenheiro eletricista formado pela Universidade do Estado do Amazonas (UEA). Projeta instalações "
             "elétricas prediais e industriais, SPDA e malhas de aterramento, subestações abrigadas e usinas "
             "solares fotovoltaicas. Trabalha em BIM (Revit MEP), com NR-10 em dia, e acompanha a execução em obra.",
    "profissionalId": "prof-eduardo", "criadoEm": "2026-09-06 14:00:00",
}, {"documentoLogin": "03408253242", "consentimentos": CONSENTIMENTOS, "situacaoConta": "Verificado",
    "registroExibicao": "CREA-AM 052318/D", "cadastroEm": "06/09/2026",
    "telefone": "(92) 99200-4050", "formacao": "Engenharia Elétrica · UEA"}))

dw_antes = json.loads((por_id(usuarios, "u-dw-engenharia") or {}).get("extras") or "{}")
pôr(usuarios, conta("u-dw-engenharia", {
    "tipoConta": "empresa", "nome": "DW Engenharia", "email": "contato@dwengenharia.com.br",
    "documento": "12.345.678/0001-95", "registro": "987654321", "ufRegistro": "AM", "rne": "AM-2345",
    "titulo": "Projetos estruturais, elétricos e energia solar", "situacao": "Ativa", "cidadeExibicao": "Manaus, AM",
    "sobre": "A DW Engenharia faz projeto estrutural, instalações elétricas, SPDA e energia solar no Amazonas. "
             "Executa com equipe própria e contrata profissionais registrados no Crea para projeto, laudo e fiscalização.",
    "criadoEm": "2026-09-02 09:00:00",
}, {"documentoLogin": "12345678000195", "razaoSocial": "DW Engenharia LTDA",
    "responsavelTecnico": "Wagner Duarte Lima", "consentimentos": CONSENTIMENTOS, "situacaoConta": "Verificado",
    "registroExibicao": "CREA-AM 987654321", "cadastroEm": "02/09/2026",
    "areasAtuacao": ["Projeto estrutural", "Instalações elétricas", "Energia solar", "SPDA", "Laudos técnicos"],
    "logotipo": LOGO_DW}))

pôr(usuarios, conta("u-suporte", {
    "tipoConta": "admin", "nome": "Suporte ProLink", "email": "admsuporte@prolink.com.br",
    "titulo": "Suporte administrativo", "cidadeExibicao": "Manaus, AM", "criadoEm": "2026-08-01 09:00:00",
}, {"consentimentos": {"termos": True}, "situacaoConta": "Verificado", "registroExibicao": "—",
    "cadastroEm": "01/08/2026"}))

# Nenhuma outra conta de exemplo entra com senha: só as quatro acima.
for u in usuarios:
    if u["id"] in SENHAS:
        continue
    extras = json.loads(u.get("extras") or "{}")
    mudou = False
    for chave in ("senhaSal", "senhaHash", "perfilDemonstracao"):
        if chave in extras:
            extras.pop(chave)
            mudou = True
    if mudou:
        u["extras"] = js(extras)
    u["demonstracao"] = "nao"

# ---------------------------------------------------------------------------
# Demandas da DW Engenharia (duas novas, na área de cada profissional)
# ---------------------------------------------------------------------------
for d in demandas:
    if d["empresaUsuarioId"] == "u-dw-engenharia":
        d["empresa"] = "DW Engenharia"
        d["empresaIniciais"] = "DW"


def demanda(ident, titulo, tipo, areas, exigencias, resumo, escopo, faixa, prazo, inicio, publicada):
    return {"id": ident, "titulo": titulo, "tipo": tipo, "empresa": "DW Engenharia", "empresaIniciais": "DW",
            "empresaUsuarioId": "u-dw-engenharia", "cidade": "Manaus", "uf": "AM", "local": "Manaus, AM",
            "modalidade": "Presencial", "prazo": prazo, "inicio": inicio, "faixa": faixa, "areas": js(areas),
            "exigencias": js(exigencias), "resumo": resumo, "escopo": escopo, "situacao": "Aberta",
            "publicadaEm": publicada, "desfecho": "", "contratadoId": ""}


pôr(demandas, demanda("2026-175", "Projeto estrutural de edifício comercial", "Projeto", ["Estrutural", "BIM"],
                      ["Registro ativo no Crea", "ART de projeto", "Experiência em BIM"],
                      "Projeto estrutural em concreto armado de edifício comercial de 8 pavimentos.",
                      "Projeto estrutural completo em concreto armado, com fundações, modelo BIM e compatibilização "
                      "com as instalações, para edifício comercial de 8 pavimentos no Adrianópolis.",
                      "Acima de R$ 50 mil", "30/11/2026", "Novembro de 2026", "2026-09-24 10:00"))
pôr(demandas, demanda("2026-176", "Usina solar fotovoltaica em cobertura", "Projeto", ["Elétrica"],
                      ["Registro ativo no Crea", "ART de projeto", "NR-10"],
                      "Projeto de usina fotovoltaica de 120 kWp na cobertura de um galpão.",
                      "Projeto executivo de usina solar fotovoltaica de 120 kWp em cobertura metálica, com "
                      "estudo de sombreamento, conexão à rede e SPDA.",
                      "R$ 20 mil a R$ 50 mil", "20/11/2026", "Outubro de 2026", "2026-09-25 09:00"))

# ---------------------------------------------------------------------------
# Candidaturas dos dois (mesma regra de compatibilidade do demandas.js)
# ---------------------------------------------------------------------------
avaliacoes = tabelas["avaliacoes"][1]


def reputacao(usuario_id):
    notas = [float(a["nota"]) for a in avaliacoes if a["usuarioId"] == usuario_id and a["sentido"] == "recebida"]
    return (round(sum(notas) / len(notas), 1), len(notas)) if notas else (0, 0)


def compatibilidade(prof, d):
    areas = json.loads(d["areas"])
    comuns = [a for a in areas if a in json.loads(prof["areas"])]
    por_area = json.loads(prof["acervoPorArea"])
    docs = sum(por_area.get(a, 0) for a in areas)
    nota, qtd = float(prof["nota"] or 0), int(prof["avaliacoes"] or 0)
    if prof["cidade"] == d["cidade"]:
        local, dl = 15, "Você atende %s, onde fica a obra." % d["cidade"]
    elif prof["uf"] == d["uf"] and prof["atendeEstado"] == "sim":
        local, dl = 9, "A obra é em %s; você declarou atender todo o %s." % (d["cidade"], d["uf"])
    else:
        local, dl = 0, "A obra fica em %s, fora da sua região de atendimento." % d["cidade"]
    crit = [
        {"rotulo": "Área de atuação", "peso": 40, "pontos": 40 if comuns else 0,
         "detalhe": ("Você atua em %s, que é o que a demanda exige." % " e ".join(comuns)) if comuns
         else "A demanda exige %s, fora das suas áreas." % " ou ".join(areas)},
        {"rotulo": "Acervo confirmado no Crea", "peso": 30, "pontos": round(30 * min(docs, 3) / 3),
         "detalhe": ("%d %s na área da demanda (ponto cheio a partir de 3)." %
                     (docs, "documento confirmado" if docs == 1 else "documentos confirmados")) if docs
         else "Nenhuma ART ou CAT confirmada nessa área."},
        {"rotulo": "Localização", "peso": 15, "pontos": local, "detalhe": dl},
        {"rotulo": "Avaliações recebidas", "peso": 15, "pontos": round(15 * nota / 5),
         "detalhe": ("Média %s em %d avaliações de contratos registrados." % (str(nota).replace(".", ","), qtd))
         if qtd else "Ainda sem avaliações na plataforma."},
    ]
    return sum(c["pontos"] for c in crit), crit


# Avaliações recebidas pelo Eduardo (Daniel já tem as dele)
AVALIACOES_EDUARDO = [
    ("av-ed-1", "TS", "TechSolut Engenharia", "Projeto elétrico e SPDA de galpão logístico", 4.9, "12/09/2026",
     "Projeto limpo, memorial completo e resposta rápida às dúvidas da obra."),
    ("av-ed-2", "SE", "Solimões Energia", "Usina solar fotovoltaica de 150 kWp", 4.8, "28/08/2026",
     "Dimensionou bem o sistema e entregou antes do prazo."),
    ("av-ed-3", "RC", "Rio Negro Construções", "Subestação abrigada de 500 kVA", 4.6, "02/08/2026",
     "Bom acompanhamento em obra; documentação entregue certinha."),
    ("av-ed-4", "CF", "Climatiza Norte", "Laudo de instalações elétricas industriais", 4.5, "15/07/2026",
     "Laudo claro, com prioridades de correção bem definidas."),
]
for ident, ini, autor, projeto, nota, data, texto in AVALIACOES_EDUARDO:
    pôr(avaliacoes, {"id": ident, "lado": "profissional", "sentido": "recebida", "autorIniciais": ini,
                     "autorNome": autor, "projeto": projeto, "nota": "%.1f" % nota, "data": data, "texto": texto,
                     "empresa": "sim", "usuarioId": "u-eduardo",
                     "criterios": js([{"rotulo": "Qualidade técnica", "nota": nota},
                                      {"rotulo": "Cumprimento de prazo", "nota": round(nota - 0.1, 1)},
                                      {"rotulo": "Comunicação", "nota": nota},
                                      {"rotulo": "Documentação entregue", "nota": round(nota - 0.2, 1)}])})

for prof, usuario_id in ((DANIEL, "u-daniel"), (EDUARDO, "u-eduardo")):
    nota, qtd = reputacao(usuario_id)
    linha = por_id(profissionais, prof["id"])
    linha["nota"], linha["avaliacoes"] = str(nota), str(qtd)

CANDIDATURAS = [
    ("cand-ap-01", "prof-001", "2026-120", "visualizada", "24/09/2026",
     "Fiz laudos de estruturas com fissuras em galpões do Distrito Industrial; posso começar pela vistoria esta semana."),
    ("cand-ap-02", "prof-001", "2026-175", "enviada", "25/09/2026",
     "Tenho projeto estrutural de edifício de 18 pavimentos no acervo e modelo em Revit Structure."),
    ("cand-ap-03", "prof-eduardo", "2026-118", "visualizada", "23/09/2026",
     "Projetei o SPDA e a malha de aterramento de um galpão logístico em 2026, com ART registrada."),
    ("cand-ap-04", "prof-eduardo", "2026-176", "enviada", "25/09/2026",
     "Tenho ART de usina fotovoltaica de 150 kWp e faço o estudo de sombreamento em BIM."),
    ("cand-ap-05", "prof-eduardo", "2026-124", "enviada", "22/09/2026",
     "Trabalho com usinas fotovoltaicas e posso visitar o local ainda esta semana."),
]
for ident, prof_id, dem_id, situacao, data, mensagem in CANDIDATURAS:
    prof = por_id(profissionais, prof_id)
    d = por_id(demandas, dem_id)
    total, crit = compatibilidade(prof, d)
    acervo = [a for a in json.loads(prof["acervo"]) if a["area"] in json.loads(d["areas"])][:2]
    pôr(candidaturas, {
        "id": ident, "demandaId": d["id"], "demandaTitulo": d["titulo"], "empresa": d["empresa"],
        "profissionalId": prof_id,
        "profissional": js({"nome": prof["nome"], "iniciais": prof["iniciais"], "cor": prof["cor"],
                            "titulo": prof["titulo"], "registro": prof["registro"], "cidade": prof["cidade"],
                            "uf": prof["uf"], "nota": float(prof["nota"]), "avaliacoes": int(prof["avaliacoes"]),
                            "verificado": True, "competencias": json.loads(prof["competencias"])}),
        "compatibilidade": str(total), "criterios": js(crit), "mensagem": mensagem,
        "acervo": js(acervo),
        "situacao": situacao, "data": data,
    })

# As candidaturas antigas acompanham a ficha nova: cartão e compatibilidade.
for c in candidaturas:
    if c["profissionalId"] in ("prof-001", "prof-eduardo"):
        prof = por_id(profissionais, c["profissionalId"])
        d = por_id(demandas, c["demandaId"])
        if d:
            total, crit = compatibilidade(prof, d)
            c["compatibilidade"], c["criterios"] = str(total), js(crit)
        cartao = json.loads(c["profissional"])
        cartao.update({"nome": prof["nome"], "iniciais": prof["iniciais"], "titulo": prof["titulo"],
                       "registro": prof["registro"], "nota": float(prof["nota"]),
                       "avaliacoes": int(prof["avaliacoes"]), "competencias": json.loads(prof["competencias"])})
        c["profissional"] = js(cartao)

# ---------------------------------------------------------------------------
# Portfólio do Eduardo: documentos, projetos e arquivos
# ---------------------------------------------------------------------------
documentos = tabelas["documentos"][1]
for i, a in enumerate(ACERVO_EDUARDO, 1):
    pôr(documentos, {"id": "doc-ed-%d" % i, "usuarioId": "u-eduardo", "tipo": a["tipo"], "numero": a["numero"],
                     "rnp": "", "titulo": a["atividade"],
                     "local": ["Galpão logístico Tarumã", "Cobertura Solimões Energia", "Fábrica Distrito Industrial",
                               "Indústria Rio Negro", "Centro de distribuição Aleixo", "Edifício Adrianópolis"][i - 1],
                     "situacao": "Validada", "confirmadoEm": "%02d/0%d/2026" % (10 + i, 9 if i < 3 else 8),
                     "origem": "Crea-AM", "criadoEm": "2026-09-06 1%d:00:00" % (i % 10)})

projetos = tabelas["projetos"][1]
for ident, nome, desc, area, periodo, capa in [
    ("proj-ed-1", "Galpão logístico Tarumã", "Projeto elétrico, SPDA e malha de aterramento para galpão de 5.000 m².",
     "Elétrica", "03/2026", "capa-ambar"),
    ("proj-ed-2", "Usina solar Solimões", "Usina fotovoltaica de 150 kWp em cobertura, com conexão à rede.",
     "Elétrica", "11/2025", ""),
    ("proj-ed-3", "Subestação Indústria Rio Negro", "Subestação abrigada de 500 kVA e quadro geral de baixa tensão.",
     "Elétrica", "06/2025", "capa-cinza"),
]:
    pôr(projetos, {"id": ident, "usuarioId": "u-eduardo", "nome": nome, "descricao": desc, "area": area,
                   "situacao": "Concluído", "periodo": periodo, "capa": capa, "criadoEm": "2026-09-06 15:00:00"})

arquivos = tabelas["arquivos"][1]
for ident, cat, nome, detalhe, tamanho in [
    ("arq-ed-cur", "curriculo", "curriculo-eduardo-negreiros.pdf", "Enviado em 06/09/2026 · lido pela análise", "760 KB"),
    ("arq-ed-dip", "certificado", "diploma-engenharia-eletrica-uea.pdf", "Universidade do Estado do Amazonas", "1,1 MB"),
    ("arq-ed-nr10", "certificado", "certificado-nr10-sep.pdf", "NR-10 básico e SEP · 2026", "420 KB"),
    ("arq-ed-bim", "certificado", "curso-revit-mep.pdf", "Certificação BIM · 2025", "580 KB"),
]:
    pôr(arquivos, {"id": ident, "usuarioId": "u-eduardo", "categoria": cat, "referenciaId": "", "nome": nome,
                   "detalhe": detalhe, "tamanho": tamanho, "criadoEm": "2026-09-06 16:00:00"})
for a in arquivos:
    if a["usuarioId"] == "u-daniel" and a["categoria"] == "curriculo":
        a["nome"] = "curriculo-daniel-silva-do-carmo.pdf"

# ---------------------------------------------------------------------------
# Conversas com a DW Engenharia (dos dois lados)
# ---------------------------------------------------------------------------
conversas = tabelas["conversas"][1]
mensagens = tabelas["mensagens"][1]
CONVERSAS = [
    ("pro-c-dw", "u-daniel", "u-dw-engenharia", "2026-120", "1", "09:40"),
    ("emp-c-dc", "u-dw-engenharia", "prof-001", "2026-120", "0", "09:40"),
    ("pro-c-dw-ed", "u-eduardo", "u-dw-engenharia", "2026-118", "1", "08:55"),
    ("emp-c-ed", "u-dw-engenharia", "prof-eduardo", "2026-118", "0", "08:55"),
]
for ident, dono, contato, dem, nao_lidas, quando in CONVERSAS:
    pôr(conversas, {"id": ident, "usuarioId": dono, "contato": contato, "demanda": dem, "naoLidas": nao_lidas,
                    "quando": quando, "atualizadaEm": "2026-09-26 %s:00" % quando})

FALAS = {
    ("pro-c-dw", "emp-c-dc"): [
        ("empresa", "Olá, Daniel! Vimos seus laudos estruturais e queremos você na vistoria do galpão.", "09:12"),
        ("prof", "Bom dia! Posso ir na quinta. O galpão tem o projeto original da estrutura?", "09:25"),
        ("empresa", "Temos as pranchas de 2014. Mando hoje com as fotos das fissuras.", "09:40"),
    ],
    ("pro-c-dw-ed", "emp-c-ed"): [
        ("empresa", "Olá, Eduardo! Seu SPDA do galpão Tarumã chamou atenção. Podemos conversar sobre o centro de distribuição?", "08:30"),
        ("prof", "Claro! Consigo fazer a visita técnica na segunda. Já existe laudo de aterramento?", "08:44"),
        ("empresa", "Ainda não. Seria parte do escopo. Envio a planta baixa por aqui.", "08:55"),
    ],
}
for (lado_prof, lado_emp), falas in FALAS.items():
    for n, (quem, texto, hora) in enumerate(falas, 1):
        for conversa, eu in ((lado_prof, "prof"), (lado_emp, "empresa")):
            pôr(mensagens, {"id": "msg-%s-%d" % (conversa, n), "conversaId": conversa,
                            "de": "eu" if quem == eu else "outro", "texto": texto, "hora": hora, "dia": "Hoje",
                            "anexo": "", "proposta": "", "link": "", "convite": "",
                            "criadoEm": "2026-09-26 %s:%02d" % (hora, n)})
# As mensagens antigas da conversa emp-c-dc (outra demanda) dão lugar às novas.
mensagens[:] = [m for m in mensagens if not (m["conversaId"] == "emp-c-dc" and not m["id"].startswith("msg-emp-c-dc-"))]

for nome, (colunas, linhas) in tabelas.items():
    gravar(nome + ".csv", colunas, linhas)

print("contas da apresentação: Daniel, Eduardo, DW Engenharia e Suporte · %d demandas · %d candidaturas"
      % (len(demandas), len(candidaturas)))
