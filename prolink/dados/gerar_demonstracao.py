"""
Gera a base de DEMONSTRAÇÃO do ProLink (dados/demonstracao/*.csv).

Tudo aqui é fictício: pessoas, empresas, registros, documentos, demandas e
avaliações. Essa base só é usada no modo de demonstração; as contas reais
usam dados/*.csv, que começa vazia.

Como usar:
    python3 dados/gerar_demonstracao.py
    python3 build.py

O sorteio usa semente fixa: rodar de novo gera exatamente a mesma base.
Os três perfis de demonstração (u-prof-demo, u-emp-demo e u-admin-demo), o
portfólio do profissional de demonstração e as obras da empresa de
demonstração são mantidos como estão nos CSV atuais.
"""
import csv
import io
import json
import math
import os
import random

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(AQUI, "demonstracao")
rnd = random.Random(2026)

# ---------------------------------------------------------------------------
# CSV no formato do banco.js: ";" como separador, UTF-8 com BOM, CRLF.
# ---------------------------------------------------------------------------


def ler(nome):
    caminho = os.path.join(PASTA, nome + ".csv")
    with open(caminho, encoding="utf-8-sig") as f:
        texto = f.read()
    leitor = csv.DictReader(io.StringIO(texto), delimiter=";")
    return leitor.fieldnames, [dict(l) for l in leitor]


def celula(valor):
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "sim" if valor else "nao"
    if isinstance(valor, (list, dict)):
        valor = json.dumps(valor, ensure_ascii=False)
    texto = str(valor)
    if any(c in texto for c in ';"\r\n'):
        texto = '"' + texto.replace('"', '""') + '"'
    return texto


def gravar(nome, colunas, linhas):
    saida = [";".join(colunas)]
    for l in linhas:
        saida.append(";".join(celula(l.get(c, "")) for c in colunas))
    with open(os.path.join(PASTA, nome + ".csv"), "w", encoding="utf-8-sig", newline="") as f:
        f.write("\r\n".join(saida) + "\r\n")
    print("%-18s %4d linhas" % (nome, len(linhas)))


def arred(x):
    """Math.round do JavaScript (meio para cima)."""
    return int(math.floor(x + 0.5))


# ---------------------------------------------------------------------------
# Vocabulário
# ---------------------------------------------------------------------------
CIDADES = [("Manaus", "AM")] * 9 + [
    ("Itacoatiara", "AM"), ("Parintins", "AM"), ("Iranduba", "AM"), ("Manacapuru", "AM"),
    ("Presidente Figueiredo", "AM"), ("Tefé", "AM"), ("Coari", "AM"), ("Humaitá", "AM"),
    ("Maués", "AM"), ("Boa Vista", "RR"), ("Porto Velho", "RO"), ("Santarém", "PA"),
]

AREAS = {
    "Estrutural": {
        "titulo": ("Engenheiro civil", "Engenheira civil"),
        "comp": ["Cálculo estrutural", "Concreto armado", "Estruturas metálicas", "Fundações profundas",
                 "Laudos técnicos", "Reforço estrutural", "Alvenaria estrutural", "Fiscalização de obra"],
        "atividades": ["Projeto estrutural de edifício residencial", "Laudo de estrutura de concreto",
                       "Projeto de fundação profunda", "Reforço estrutural de galpão",
                       "Projeto de estrutura metálica", "Fiscalização de obra vertical"],
    },
    "Elétrica": {
        "titulo": ("Engenheiro eletricista", "Engenheira eletricista"),
        "comp": ["Projeto elétrico", "SPDA", "Subestação", "Automação predial", "Eficiência energética",
                 "Energia solar fotovoltaica", "Laudo de instalações elétricas"],
        "atividades": ["Projeto elétrico industrial", "SPDA de centro de distribuição",
                       "Subestação abrigada de 500 kVA", "Usina solar de 300 kWp",
                       "Laudo de instalações elétricas", "Retrofit de iluminação pública"],
    },
    "Hidráulica": {
        "titulo": ("Engenheiro sanitarista", "Engenheira sanitarista"),
        "comp": ["Saneamento", "Redes de água", "Drenagem urbana", "Estações de tratamento",
                 "Hidrossanitário predial", "Esgotamento sanitário"],
        "atividades": ["Projeto de rede de abastecimento", "Estação de tratamento de esgoto",
                       "Drenagem de loteamento", "Projeto hidrossanitário predial",
                       "Fiscalização de obra de saneamento"],
    },
    "Ambiental": {
        "titulo": ("Engenheiro ambiental", "Engenheira ambiental"),
        "comp": ["Licenciamento", "Estudos de impacto", "Outorga de água", "PGRS",
                 "Recuperação de áreas degradadas", "Monitoramento ambiental"],
        "atividades": ["Licenciamento ambiental de porto fluvial", "Estudo de impacto de loteamento",
                       "Plano de gerenciamento de resíduos", "Recuperação de área degradada",
                       "Outorga de captação de água"],
    },
    "Geotecnia": {
        "titulo": ("Geólogo", "Geóloga"),
        "comp": ["Sondagem", "Estabilidade de taludes", "Contenções", "Investigação geotécnica",
                 "Hidrogeologia"],
        "atividades": ["Sondagem SPT para edifício", "Estudo de estabilidade de talude",
                       "Projeto de contenção em encosta", "Investigação geotécnica de terreno"],
    },
    "Mecânica": {
        "titulo": ("Engenheiro mecânico", "Engenheira mecânica"),
        "comp": ["Climatização", "Tubulação industrial", "Vasos de pressão (NR-13)", "Montagem industrial",
                 "Manutenção industrial", "Sistemas de combate a incêndio"],
        "atividades": ["Projeto de climatização de hospital", "Inspeção de vasos de pressão",
                       "Montagem de tubulação industrial", "Sistema de combate a incêndio",
                       "Plano de manutenção industrial"],
    },
    "Agronomia": {
        "titulo": ("Engenheiro agrônomo", "Engenheira agrônoma"),
        "comp": ["Irrigação", "Manejo de solo", "Receituário agronômico", "Georreferenciamento rural",
                 "Sistemas agroflorestais"],
        "atividades": ["Projeto de irrigação de fruticultura", "Georreferenciamento de imóvel rural",
                       "Plano de manejo de solo", "Implantação de sistema agroflorestal"],
    },
    "BIM": {
        "titulo": ("Engenheiro civil", "Engenheira civil"),
        "comp": ["Modelagem BIM", "Compatibilização de projetos", "Revit", "Orçamento e SINAPI",
                 "Planejamento de obra"],
        "atividades": ["Compatibilização de hospital em BIM", "Modelagem BIM de edifício comercial",
                       "Orçamento de obra pública", "Planejamento 4D de obra"],
    },
}
LISTA_AREAS = list(AREAS)

NOMES_F = ["Ana", "Beatriz", "Camila", "Débora", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana",
           "Larissa", "Mariana", "Natália", "Priscila", "Raquel", "Sabrina", "Tatiane", "Vanessa",
           "Yasmin", "Aline", "Bruna", "Carolina", "Eduarda", "Letícia", "Paula", "Renata", "Simone"]
NOMES_M = ["André", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gustavo", "Henrique", "Igor",
           "João", "Leonardo", "Marcelo", "Nelson", "Otávio", "Pedro", "Rafael", "Sérgio", "Thiago",
           "Vinícius", "Wagner", "Arthur", "Caio", "Fábio", "Lucas", "Mateus", "Rodrigo"]
SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Carvalho", "Castro", "Costa", "Dias", "Farias",
              "Ferreira", "Freitas", "Gomes", "Lima", "Lopes", "Martins", "Melo", "Menezes", "Monteiro",
              "Moraes", "Nascimento", "Oliveira", "Pereira", "Pinheiro", "Queiroz", "Ramos", "Ribeiro",
              "Rocha", "Santana", "Santos", "Silva", "Soares", "Souza", "Tavares", "Teixeira", "Vieira"]
CORES = ["", "avatar-verde", "avatar-ambar", "avatar-roxo"]

EMPRESAS = [
    # id, nome, cidade, área principal, tipoConta
    ("emp-ts", "TechSolut Engenharia", "Manaus", "Elétrica", "empresa"),
    ("emp-ve", "Verde Engenharia", "Manaus", "Ambiental", "empresa"),
    ("emp-ca", "Construtora Alfa", "Itacoatiara", "Estrutural", "empresa"),
    ("emp-np", "Norte Projetos", "Parintins", "BIM", "empresa"),
    ("emp-pi", "Prefeitura de Iranduba", "Iranduba", "Hidráulica", "contratante"),
    ("emp-rn", "Rio Negro Construções", "Manaus", "Estrutural", "empresa"),
    ("emp-ae", "Amazônia Estruturas Metálicas", "Manaus", "Estrutural", "empresa"),
    ("emp-se", "Solimões Energia", "Manacapuru", "Elétrica", "empresa"),
    ("emp-ti", "Tarumã Incorporadora", "Manaus", "BIM", "empresa"),
    ("emp-ea", "Encontro das Águas Saneamento", "Manaus", "Hidráulica", "empresa"),
    ("emp-mi", "Madeira Infraestrutura", "Humaitá", "Geotecnia", "empresa"),
    ("emp-pn", "Ponta Negra Empreendimentos", "Manaus", "Estrutural", "empresa"),
    ("emp-ig", "Igarapé Consultoria Ambiental", "Manaus", "Ambiental", "empresa"),
    ("emp-fl", "Fluvial Logística do Norte", "Itacoatiara", "Mecânica", "empresa"),
    ("emp-ag", "AgroVale Amazonas", "Presidente Figueiredo", "Agronomia", "empresa"),
    ("emp-hc", "Hospital Cidade Nova", "Manaus", "Mecânica", "contratante"),
    ("emp-cf", "Climatiza Norte", "Manaus", "Mecânica", "empresa"),
    ("emp-pt", "Prefeitura de Tefé", "Tefé", "Hidráulica", "contratante"),
    ("emp-sl", "Sol da Amazônia Fotovoltaica", "Manaus", "Elétrica", "empresa"),
    ("emp-gm", "GeoMapa Levantamentos", "Manaus", "Geotecnia", "empresa"),
    ("emp-ci", "Condomínio Industrial Aleixo", "Manaus", "Elétrica", "contratante"),
    ("emp-mc", "Maués Cooperativa Agrícola", "Maués", "Agronomia", "contratante"),
    ("emp-bv", "Boa Vista Obras e Serviços", "Boa Vista", "Estrutural", "empresa"),
    ("emp-pv", "Porto Velho Engenharia", "Porto Velho", "Hidráulica", "empresa"),
]
EMPRESA_DEMO = ("u-emp-demo", "Daniel Tec", "Manaus", "Elétrica", "empresa")

DEMANDAS_POR_AREA = {
    "Estrutural": [
        ("Projeto estrutural de edifício residencial", "Edifício de {n} pavimentos em concreto armado.",
         "Projeto estrutural completo de edifício residencial com {n} pavimentos, fundação profunda e memorial de cálculo."),
        ("Laudo de estrutura de concreto", "Vistoria e laudo de estrutura com fissuras em galpão de {m} m².",
         "Vistoria técnica, ensaios não destrutivos e laudo de estrutura de concreto com fissuras em galpão de {m} m²."),
        ("Reforço de cobertura metálica", "Reforço e recuperação de cobertura metálica com {m} m².",
         "Diagnóstico, projeto de reforço e acompanhamento da recuperação de cobertura metálica com {m} m²."),
        ("Fiscalização de obra vertical", "Acompanhamento semanal de obra de {n} pavimentos.",
         "Fiscalização técnica semanal com relatório fotográfico e medições de obra residencial de {n} pavimentos."),
    ],
    "Elétrica": [
        ("Projeto elétrico industrial", "Galpão de {m} m² com subestação própria.",
         "Projeto elétrico completo para galpão de {m} m², incluindo subestação, SPDA e memorial de cálculo."),
        ("SPDA e aterramento", "Projeto de SPDA para centro de distribuição de {m} m².",
         "Projeto e laudo de SPDA e malha de aterramento para centro de distribuição de {m} m²."),
        ("Usina solar fotovoltaica", "Usina de {k} kWp em cobertura de galpão.",
         "Projeto executivo e homologação junto à concessionária de usina fotovoltaica de {k} kWp."),
        ("Laudo de instalações elétricas", "Inspeção e laudo das instalações de prédio comercial.",
         "Inspeção termográfica, laudo e plano de adequação das instalações elétricas de prédio comercial."),
    ],
    "Hidráulica": [
        ("Fiscalização de obra de saneamento", "Acompanhamento mensal de obra de saneamento.",
         "Fiscalização mensal de obra de rede coletora de esgoto, com emissão de relatórios e medições."),
        ("Projeto de rede de abastecimento", "Rede de água para loteamento com {n} lotes.",
         "Projeto de rede de distribuição de água e reservatório para loteamento com {n} lotes."),
        ("Drenagem urbana", "Projeto de drenagem de {k} km de vias.",
         "Projeto de microdrenagem e dimensionamento de galerias para {k} km de vias urbanas."),
    ],
    "Ambiental": [
        ("Consultoria para licenciamento", "Licenciamento de empreendimento às margens do rio Negro.",
         "Acompanhamento do licenciamento ambiental, com estudo de impacto e resposta a exigências do órgão."),
        ("Plano de gerenciamento de resíduos", "PGRS de obra com {n} meses de duração.",
         "Elaboração e acompanhamento do plano de gerenciamento de resíduos de obra com {n} meses de duração."),
        ("Recuperação de área degradada", "PRAD para área de {k} hectares.",
         "Plano de recuperação de área degradada de {k} hectares, com cronograma de plantio e monitoramento."),
    ],
    "Geotecnia": [
        ("Sondagem SPT", "{n} furos de sondagem para edifício comercial.",
         "Execução e laudo de {n} furos de sondagem SPT para projeto de fundação de edifício comercial."),
        ("Estabilidade de talude", "Estudo de talude às margens de rodovia.",
         "Estudo de estabilidade e projeto de contenção de talude com {k} metros de extensão."),
    ],
    "Mecânica": [
        ("Projeto de climatização", "Climatização de {n} salas com controle central.",
         "Projeto de climatização com VRF para {n} salas, incluindo renovação de ar e controle central."),
        ("Inspeção de vasos de pressão", "Inspeção NR-13 de {n} vasos de pressão.",
         "Inspeção de segurança conforme NR-13 de {n} vasos de pressão, com prontuário e relatório."),
        ("Sistema de combate a incêndio", "Projeto de hidrantes e sprinklers para galpão de {m} m².",
         "Projeto de sistema de hidrantes e sprinklers para galpão de {m} m², com aprovação no Corpo de Bombeiros."),
    ],
    "Agronomia": [
        ("Projeto de irrigação", "Irrigação localizada para {k} hectares de fruticultura.",
         "Projeto de irrigação por gotejamento para {k} hectares de fruticultura, com outorga de água."),
        ("Georreferenciamento rural", "Georreferenciamento de imóvel rural de {k} hectares.",
         "Levantamento e georreferenciamento de imóvel rural de {k} hectares para certificação no Incra."),
    ],
    "BIM": [
        ("Compatibilização de projetos em BIM", "Compatibilização de hospital de {n} pavimentos.",
         "Compatibilização de projetos arquitetônico, estrutural e de instalações de hospital com {n} pavimentos."),
        ("Orçamento de obra pública", "Orçamento com base no SINAPI para escola de {m} m².",
         "Orçamento analítico com composições SINAPI e cronograma físico-financeiro para escola de {m} m²."),
    ],
}
TIPOS = ["Projeto", "Serviço", "Parceria", "Projeto", "Serviço", "Vaga fixa"]
FAIXAS = ["A combinar", "Até R$ 5 mil", "R$ 5 mil a R$ 20 mil", "R$ 20 mil a R$ 50 mil", "Acima de R$ 50 mil"]
EXIGENCIAS = ["ART de projeto", "ART de execução", "CAT em obra semelhante", "Registro ativo no Crea", "Anuidade em dia"]
MESES = ["Outubro de 2026", "Novembro de 2026", "Dezembro de 2026", "Imediato", "Janeiro de 2027"]


def iniciais(nome):
    partes = [p for p in nome.replace("de ", "").replace("do ", "").replace("da ", "").split() if p]
    return (partes[0][0] + (partes[-1][0] if len(partes) > 1 else "")).upper()


def cpf_ficticio():
    n = [rnd.randint(0, 9) for _ in range(9)]
    for _ in range(2):
        s = sum((len(n) + 1 - i) * v for i, v in enumerate(n))
        d = 11 - s % 11
        n.append(0 if d >= 10 else d)
    t = "".join(map(str, n))
    return "%s.%s.%s-%s" % (t[:3], t[3:6], t[6:9], t[9:])


def cnpj_ficticio():
    base = [rnd.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    for pesos in ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]):
        s = sum(p * v for p, v in zip(pesos, base))
        d = 11 - s % 11
        base.append(0 if d >= 10 else d)
    t = "".join(map(str, base))
    return "%s.%s.%s/%s-%s" % (t[:2], t[2:5], t[5:8], t[8:12], t[12:])


def data_setembro(dia_min=1, dia_max=23):
    dia = rnd.randint(dia_min, dia_max)
    return dia, "%02d/09/2026" % dia


# ---------------------------------------------------------------------------
# 1. Profissionais: os 5 atuais + 55 gerados
# ---------------------------------------------------------------------------
col_prof, profs = ler("profissionais")
profs = [p for p in profs if p["id"] in ("prof-001", "prof-002", "prof-003", "prof-004", "prof-005")]
for p in profs:
    for chave in ("areas", "acervoPorArea", "competencias", "acervo"):
        p[chave] = json.loads(p[chave]) if p[chave] else ([] if chave != "acervoPorArea" else {})
    p["nota"] = float(p["nota"]) if p["nota"] else 0
    p["avaliacoes"] = int(p["avaliacoes"]) if p["avaliacoes"] else 0
    p["verificado"] = p["verificado"] == "sim"
    p["atendeEstado"] = p["atendeEstado"] == "sim"

usados = {p["nome"] for p in profs}
numero_art = 130000
for i in range(6, 61):
    feminino = rnd.random() < 0.45
    while True:
        nome = "%s %s %s" % (rnd.choice(NOMES_F if feminino else NOMES_M), rnd.choice(SOBRENOMES), rnd.choice(SOBRENOMES))
        if nome not in usados and nome.split()[1] != nome.split()[2]:
            usados.add(nome)
            break
    principal = rnd.choice(LISTA_AREAS)
    areas = [principal]
    if rnd.random() < 0.45:
        extra = rnd.choice([a for a in LISTA_AREAS if a != principal])
        areas.append(extra)
    cidade, uf = rnd.choice(CIDADES)
    verificado = rnd.random() < 0.85
    acervo = []
    acervo_por_area = {}
    if verificado:
        for area in areas:
            qtd = rnd.randint(1, 6) if area == principal else rnd.randint(0, 2)
            for _ in range(qtd):
                numero_art += rnd.randint(7, 900)
                ano = rnd.choice([2022, 2023, 2024, 2025, 2026])
                tipo = "CAT" if rnd.random() < 0.3 else "ART"
                numero = ("%d/%06d" % (ano, numero_art)) if tipo == "ART" else ("%d/%04d" % (ano, numero_art % 9000))
                acervo.append({"tipo": tipo, "numero": numero, "atividade": rnd.choice(AREAS[area]["atividades"]), "area": area})
            if qtd:
                acervo_por_area[area] = qtd
    comp = rnd.sample(AREAS[principal]["comp"], k=min(len(AREAS[principal]["comp"]), rnd.randint(2, 4)))
    for extra in areas[1:]:
        comp.append(rnd.choice(AREAS[extra]["comp"]))
    n_av = rnd.choice([0, 0, 2, 4, 6, 9, 12, 15, 18, 24, 31]) if verificado else rnd.choice([0, 0, 1, 3])
    nota = round(rnd.uniform(3.9, 5.0), 1) if n_av else 0
    registro = ("CREA-%s %06d/D" % (uf, rnd.randint(10000, 59999))) if verificado else "Registro em regularização"
    resumo = "%s com atuação em %s%s. %s" % (
        AREAS[principal]["titulo"][1 if feminino else 0],
        comp[0].lower(), (" e " + comp[1].lower()) if len(comp) > 1 else "",
        ("%d documentos confirmados no Crea." % len(acervo)) if acervo else "Acervo ainda em formação.")
    profs.append({
        "id": "prof-%03d" % i, "nome": nome, "iniciais": iniciais(nome), "cor": rnd.choice(CORES),
        "titulo": AREAS[principal]["titulo"][1 if feminino else 0], "registro": registro,
        "rnp": str(rnd.randint(2600000000, 2699999999)) if verificado else "",
        "cidade": cidade, "uf": uf, "nota": nota, "avaliacoes": n_av, "verificado": verificado,
        "atendeEstado": rnd.random() < 0.5, "areas": areas, "acervoPorArea": acervo_por_area,
        "competencias": comp, "acervo": acervo, "resumo": resumo,
    })
PROF = {p["id"]: p for p in profs}

# ---------------------------------------------------------------------------
# 2. Usuários: perfis de demonstração + empresas + profissionais
# ---------------------------------------------------------------------------
col_usu, usuarios_atuais = ler("usuarios")
demo = [u for u in usuarios_atuais if u["id"] in ("u-prof-demo", "u-emp-demo", "u-admin-demo")]
usuarios = list(demo)
for eid, nome, cidade, area, tipo in EMPRESAS:
    verificada = tipo == "empresa"
    extras = {
        "situacaoConta": "Verificado" if verificada else "Sem registro",
        "registroExibicao": ("CREA-AM %d" % rnd.randint(100000000, 999999999)) if verificada else "—",
        "cadastroEm": "%02d/%02d/2026" % (rnd.randint(1, 28), rnd.randint(3, 8)),
        "areasAtuacao": [area] + ([rnd.choice(LISTA_AREAS)] if rnd.random() < 0.5 else []),
        "telefone": "(92) 3%03d-%04d" % (rnd.randint(100, 999), rnd.randint(0, 9999)),
        "perfilDemonstracao": True,
    }
    usuarios.append({
        "id": eid, "tipoConta": tipo, "nome": nome,
        "email": "contato@" + nome.lower().split()[0].replace("ã", "a").replace("õ", "o").replace("é", "e") + ".exemplo.com",
        "documento": cnpj_ficticio(), "registro": "", "ufRegistro": "AM", "rnp": "", "rne": "",
        "titulo": ("Empresa de " if verificada else "") + area.lower() if verificada else "Contratante",
        "situacao": "Ativa" if verificada else "", "cidadeExibicao": cidade + ", AM",
        "sobre": "%s atua em %s na região de %s e contrata profissionais registrados pelo ProLink." % (nome, area.lower(), cidade),
        "verificado": verificada, "identidadeVerificada": "", "primeiroAcesso": False, "demonstracao": True,
        "profissionalId": "", "criadoEm": "2026-%02d-%02d 09:00:00" % (rnd.randint(3, 8), rnd.randint(1, 28)),
        "extras": extras,
    })
for p in profs:
    if p["id"] == "prof-001":
        continue
    usuarios.append({
        "id": "u-" + p["id"], "tipoConta": "profissional", "nome": p["nome"],
        "email": p["nome"].split()[0].lower() + "." + p["nome"].split()[-1].lower() + "@exemplo.com",
        "documento": cpf_ficticio(), "registro": p["registro"].split(" ")[-1] if p["verificado"] else "",
        "ufRegistro": p["uf"], "rnp": p["rnp"], "rne": "", "titulo": p["titulo"],
        "situacao": "Ativo" if p["verificado"] else "Em regularização", "cidadeExibicao": p["cidade"] + ", " + p["uf"],
        "sobre": p["resumo"], "verificado": p["verificado"], "identidadeVerificada": "", "primeiroAcesso": False,
        "demonstracao": True, "profissionalId": p["id"],
        "criadoEm": "2026-%02d-%02d 10:00:00" % (rnd.randint(3, 9), rnd.randint(1, 20)),
        "extras": {"situacaoConta": "Verificado" if p["verificado"] else "Não verificado",
                   "registroExibicao": p["registro"], "perfilDemonstracao": True},
    })

# ---------------------------------------------------------------------------
# 3. Demandas: da empresa de demonstração e das outras empresas
# ---------------------------------------------------------------------------
demandas = []
seq = [117]


def nova_demanda(eid, empresa, cidade, area, situacao, dia_pub):
    seq[0] += 1
    titulo, resumo, escopo = rnd.choice(DEMANDAS_POR_AREA[area])
    valores = {"n": rnd.choice([4, 6, 8, 9, 12, 18]), "m": rnd.choice(["1.800", "2.400", "3.600", "4.200", "6.000"]),
               "k": rnd.choice([12, 25, 40, 75, 120, 300])}
    exig = ["Registro ativo no Crea"] + rnd.sample([e for e in EXIGENCIAS if e != "Registro ativo no Crea"], k=rnd.randint(0, 2))
    areas = [area] + ([rnd.choice(LISTA_AREAS)] if rnd.random() < 0.15 else [])
    dia_prazo = rnd.randint(1, 30)
    d = {
        "id": "2026-%d" % seq[0], "titulo": titulo, "tipo": rnd.choice(TIPOS), "empresa": empresa,
        "empresaIniciais": iniciais(empresa), "empresaUsuarioId": eid, "cidade": cidade, "uf": "AM",
        "local": cidade + ", AM", "modalidade": rnd.choice(["Presencial", "Presencial", "Híbrido", "Remoto"]),
        "prazo": "%02d/%02d/2026" % (dia_prazo, rnd.choice([10, 11])), "inicio": rnd.choice(MESES),
        "faixa": rnd.choice(FAIXAS), "areas": list(dict.fromkeys(areas)), "exigencias": exig,
        "resumo": resumo.format(**valores), "escopo": escopo.format(**valores), "situacao": situacao,
        "publicadaEm": "2026-09-%02d %02d:00" % (dia_pub, rnd.randint(8, 19)), "desfecho": "", "contratadoId": "",
    }
    demandas.append(d)
    return d


# Empresa de demonstração: 6 demandas próprias (uma encerrada com contratação).
for area, situacao, dia in [("Elétrica", "Aberta", 22), ("Ambiental", "Aberta", 20), ("Estrutural", "Em análise", 18),
                            ("Elétrica", "Aberta", 15), ("Mecânica", "Encerrando", 10), ("Estrutural", "Encerrada", 3)]:
    nova_demanda("u-emp-demo", EMPRESA_DEMO[1], "Manaus", area, situacao, dia)
for eid, nome, cidade, area, tipo in EMPRESAS:
    for _ in range(rnd.randint(1, 3)):
        a = area if rnd.random() < 0.7 else rnd.choice(LISTA_AREAS)
        nova_demanda(eid, nome, cidade, a, rnd.choice(["Aberta", "Aberta", "Aberta", "Em análise", "Encerrando"]),
                     rnd.randint(1, 23))

# ---------------------------------------------------------------------------
# 4. Compatibilidade (mesma regra de app/models/demandas.js)
# ---------------------------------------------------------------------------


def compatibilidade(p, d):
    crit = []
    comum = [a for a in d["areas"] if a in p["areas"]]
    crit.append({"rotulo": "Área de atuação", "peso": 40, "pontos": 40 if comum else 0,
                 "detalhe": ("Você atua em " + " e ".join(comum) + ", que é o que a demanda exige.") if comum
                 else ("A demanda exige " + " ou ".join(d["areas"]) + ", fora das suas áreas.")})
    docs = sum(p["acervoPorArea"].get(a, 0) for a in d["areas"])
    crit.append({"rotulo": "Acervo confirmado no Crea", "peso": 30, "pontos": arred(30 * min(docs, 3) / 3),
                 "detalhe": ("%d %s na área da demanda (ponto cheio a partir de 3)." %
                             (docs, "documento confirmado" if docs == 1 else "documentos confirmados")) if docs
                 else "Nenhuma ART ou CAT confirmada nessa área."})
    if p["cidade"] == d["cidade"]:
        pl, dl = 15, "Você atende %s, onde fica a obra." % d["cidade"]
    elif p["uf"] == d["uf"] and p["atendeEstado"]:
        pl, dl = arred(15 * 0.6), "A obra é em %s; você declarou atender todo o %s." % (d["cidade"], d["uf"])
    else:
        pl, dl = 0, "A obra fica em %s, fora da sua região de atendimento." % d["cidade"]
    crit.append({"rotulo": "Localização", "peso": 15, "pontos": pl, "detalhe": dl})
    crit.append({"rotulo": "Avaliações recebidas", "peso": 15, "pontos": arred(15 * (p["nota"] or 0) / 5),
                 "detalhe": ("Média %s em %d avaliações de contratos registrados." % (str(p["nota"]).replace(".", ","), p["avaliacoes"]))
                 if p["avaliacoes"] else "Ainda sem avaliações na plataforma."})
    return sum(c["pontos"] for c in crit), crit


def instantaneo(p):
    return {"nome": p["nome"], "iniciais": p["iniciais"], "cor": p["cor"], "titulo": p["titulo"],
            "registro": p["registro"], "cidade": p["cidade"], "uf": p["uf"], "nota": p["nota"],
            "avaliacoes": p["avaliacoes"], "verificado": p["verificado"], "competencias": p["competencias"]}


MENSAGENS_CAND = ["Tenho acervo em obra semelhante e disponibilidade imediata.",
                  "Posso apresentar memorial de projetos parecidos.",
                  "Atuo na região e tenho equipe para começar no prazo.",
                  "Já trabalhei com esse tipo de serviço em 2025, com ART registrada.",
                  "Tenho interesse e posso visitar o local nesta semana.", ""]
candidaturas = []
cid = [0]


def candidatar(p, d, situacao):
    cid[0] += 1
    total, crit = compatibilidade(p, d)
    candidaturas.append({
        "id": "cand-%04d" % cid[0], "demandaId": d["id"], "demandaTitulo": d["titulo"], "empresa": d["empresa"],
        "profissionalId": p["id"], "profissional": instantaneo(p), "compatibilidade": total, "criterios": crit,
        "mensagem": rnd.choice(MENSAGENS_CAND), "acervo": [], "situacao": situacao,
        "data": "%02d/09/2026" % rnd.randint(int(d["publicadaEm"][8:10]), 24 if int(d["publicadaEm"][8:10]) < 24 else 24),
    })


for d in demandas:
    afins = [p for p in profs if p["id"] != "prof-001" and set(p["areas"]) & set(d["areas"])]
    outros = [p for p in profs if p["id"] != "prof-001" and p not in afins]
    qtd = rnd.randint(4, 9) if d["empresaUsuarioId"] == "u-emp-demo" else rnd.randint(0, 5)
    escolhidos = rnd.sample(afins, k=min(len(afins), qtd))
    if rnd.random() < 0.4 and outros:
        escolhidos.append(rnd.choice(outros))
    for p in escolhidos:
        candidatar(p, d, rnd.choice(["enviada", "enviada", "visualizada", "conversa", "recusada"]))

# O profissional de demonstração se candidatou a 5 demandas de outras empresas.
alvos = [d for d in demandas if d["empresaUsuarioId"] != "u-emp-demo" and d["situacao"] != "Encerrada"
         and set(d["areas"]) & set(PROF["prof-001"]["areas"])][:5]
for d, sit in zip(alvos, ["visualizada", "conversa", "enviada", "enviada", "recusada"]):
    candidatar(PROF["prof-001"], d, sit)

# Contratação na demanda encerrada da empresa de demonstração.
encerrada = [d for d in demandas if d["empresaUsuarioId"] == "u-emp-demo" and d["situacao"] == "Encerrada"][0]
cands = [c for c in candidaturas if c["demandaId"] == encerrada["id"]]
cands.sort(key=lambda c: -c["compatibilidade"])
if cands:
    encerrada["desfecho"] = "Contratei um profissional pela plataforma"
    encerrada["contratadoId"] = cands[0]["profissionalId"]
    cands[0]["situacao"] = "conversa"

# ---------------------------------------------------------------------------
# 5. Avaliações ligadas a cada conta de demonstração
# ---------------------------------------------------------------------------
TEXTOS_REC_PROF = [
    "Entregou no prazo, com memorial claro e ART registrada.", "Documentação completa e ótima comunicação.",
    "Resolveu um problema antigo da obra com uma solução simples.", "Muito técnico e disponível para reuniões.",
    "Bom trabalho; houve um pequeno atraso na vistoria inicial.", "Projeto bem detalhado, reduziu retrabalho.",
    "Acompanhou a obra de perto e registrou tudo.", "Recomendo: seguro nas decisões e cuidadoso com normas."]
TEXTOS_REC_EMP = [
    "Escopo bem definido e pagamento em dia.", "Equipe de obra colaborativa e acesso fácil ao canteiro.",
    "Boa comunicação durante todo o contrato.", "Contrato claro; o acesso à cobertura atrasou dois dias.",
    "Empresa organizada, com documentação pronta para a ART."]


def criterios_nota(nota):
    base = [("Qualidade técnica", 0.0), ("Cumprimento de prazo", -0.2), ("Comunicação", 0.1), ("Documentação entregue", -0.3)]
    return [{"rotulo": r, "nota": max(1.0, min(5.0, round(nota + d + rnd.uniform(-0.2, 0.2), 1)))} for r, d in base]


avaliacoes = []
av = [0]


def avaliar(usuario_id, lado, sentido, autor, projeto, nota, texto, eh_empresa, mes):
    av[0] += 1
    avaliacoes.append({
        "id": "av-%03d" % av[0], "lado": lado, "sentido": sentido, "autorIniciais": iniciais(autor), "autorNome": autor,
        "projeto": projeto, "nota": nota, "data": "%02d/%02d/2026" % (rnd.randint(1, 28), mes), "texto": texto,
        "empresa": eh_empresa, "usuarioId": usuario_id, "criterios": criterios_nota(nota) if sentido == "recebida" else [],
    })


empresas_nomes = [e[1] for e in EMPRESAS]
notas_prof = []
for i in range(23):
    nota = rnd.choice([5.0, 5.0, 5.0, 4.5, 4.5, 4.0, 5.0, 3.5])
    notas_prof.append(nota)
    avaliar("u-prof-demo", "profissional", "recebida", rnd.choice(empresas_nomes),
            rnd.choice(AREAS["Estrutural"]["atividades"] + AREAS["Elétrica"]["atividades"]), nota,
            rnd.choice(TEXTOS_REC_PROF), True, 9 - (i % 8))
for i in range(6):
    avaliar("u-prof-demo", "profissional", "realizada", rnd.choice(empresas_nomes),
            rnd.choice(AREAS["Estrutural"]["atividades"]), rnd.choice([5.0, 4.5, 4.0]), rnd.choice(TEXTOS_REC_EMP), True, 8 - i)
for i in range(14):
    p = rnd.choice(profs[1:])
    avaliar("u-emp-demo", "empresa", "recebida", p["nome"], rnd.choice(AREAS["Elétrica"]["atividades"]),
            rnd.choice([5.0, 5.0, 4.5, 4.5, 4.0]), rnd.choice(TEXTOS_REC_EMP), False, 9 - (i % 7))
for i in range(8):
    p = rnd.choice(profs[1:])
    avaliar("u-emp-demo", "empresa", "realizada", p["nome"], rnd.choice(AREAS[p["areas"][0]]["atividades"]),
            rnd.choice([5.0, 4.5, 4.0, 5.0]), rnd.choice(TEXTOS_REC_PROF), False, 8 - (i % 7))

# O profissional de demonstração tem a nota das avaliações que recebeu.
PROF["prof-001"]["avaliacoes"] = len(notas_prof)
PROF["prof-001"]["nota"] = round(sum(notas_prof) / len(notas_prof), 1)

# ---------------------------------------------------------------------------
# 6. Conversas e mensagens: mantém as atuais e liga as da empresa às demandas dela
# ---------------------------------------------------------------------------
col_conv, conversas = ler("conversas")
col_msg, mensagens = ler("mensagens")
demo_emp = [d for d in demandas if d["empresaUsuarioId"] == "u-emp-demo"]
for c in conversas:
    if c["usuarioId"] == "u-emp-demo":
        c["demanda"] = demo_emp[0]["id"] if c["contato"] in ("prof-001", "prof-002") else (
            demo_emp[1]["id"] if c["contato"] == "prof-003" else demo_emp[2]["id"])
    elif c["demanda"]:
        # As demandas antigas (2026-118…) viraram demandas das empresas da conversa.
        dono = c["contato"]
        das = [d for d in demandas if d["empresaUsuarioId"] == dono]
        c["demanda"] = das[0]["id"] if das else ""
mensagens = [m for m in mensagens if m["conversaId"] in {c["id"] for c in conversas}]

# ---------------------------------------------------------------------------
# 7. Denúncias e trilha de auditoria
# ---------------------------------------------------------------------------
denuncias = []
MOTIVOS = [
    ("Informação profissional enganosa", "O perfil descreve experiência em obra que não consta no acervo técnico."),
    ("Exigência possivelmente discriminatória", "O texto da demanda restringe candidatos por faixa etária."),
    ("Contato fora da plataforma com pressão", "O denunciante relata insistência para fechar contrato sem registro."),
    ("Documento de terceiro no portfólio", "Foto de obra atribuída a outra empresa no portfólio."),
    ("Demanda com valor incompatível", "Valor anunciado muito abaixo do mínimo praticado para o serviço."),
    ("Avaliação ofensiva", "Comentário com linguagem ofensiva em avaliação recebida."),
    ("Perfil duplicado", "Duas contas com o mesmo nome e registro."),
    ("Anúncio de serviço sem registro", "Demanda pede assinatura de ART por quem não tem registro."),
]
for i, (titulo, motivo) in enumerate(MOTIVOS):
    fila = i < 4
    alvo = rnd.choice(profs[1:])["nome"] if i % 2 == 0 else "Demanda " + rnd.choice(demandas)["id"].replace("-", "/")
    denuncias.append({
        "id": "den-%d" % (i + 1), "protocolo": "2026/%04d" % (341 - i * 3), "titulo": titulo, "alvo": alvo,
        "denunciante": rnd.choice(empresas_nomes + [p["nome"] for p in profs[:10]]), "motivo": motivo,
        "situacao": "Na fila" if fila else "Decidida",
        "recebida": ["recebida há 2 dias", "recebida ontem", "recebida hoje", "recebida há 3 dias"][i % 4] if fila else "",
        "decisao": "" if fila else rnd.choice(["Conteúdo mantido", "Conteúdo removido", "Autor bloqueado"]),
        "fundamento": "" if fila else "Analisado pela equipe do Crea-AM conforme os termos de uso.",
        "decididaEm": "" if fila else "%02d/09/2026" % rnd.randint(1, 20),
        "criadoEm": "2026-09-%02d 09:00:00" % (20 - i),
    })

auditoria = []
ACOES = [("Autenticação", "{email}", "{nome}"), ("Consulta ao Crea", "{email}", "ART {art} · RNP {rnp}"),
         ("Publicação de demanda", "{emp}", "{dem}"), ("Manifestação de interesse", "{email}", "{nome} → {dem}"),
         ("Alteração de privacidade", "{email}", "Visibilidade do acervo"), ("Bloqueio", "admin@crea-am.org.br", "{nome}"),
         ("Decisão de denúncia", "admin@crea-am.org.br", "Protocolo 2026/{proto}")]
for i in range(60):
    p = rnd.choice(profs)
    acao, autor, alvo = rnd.choice(ACOES)
    d = rnd.choice(demandas)
    campos = {"email": p["nome"].split()[0].lower() + "@exemplo.com", "nome": p["nome"],
              "art": "2026/%06d" % rnd.randint(100000, 199999), "rnp": p["rnp"] or "—",
              "emp": "contato@" + d["empresa"].split()[0].lower() + ".exemplo.com", "dem": d["titulo"],
              "proto": "%04d" % rnd.randint(300, 341)}
    dia = 23 - i // 4
    auditoria.append({"id": "aud-%03d" % (200 - i), "data": "%02d/09/2026 %02d:%02d" % (max(dia, 1), rnd.randint(8, 19), rnd.randint(0, 59)),
                      "acao": acao, "autor": autor.format(**campos), "alvo": alvo.format(**campos),
                      "origem": "%d.***.***.%d" % (rnd.randint(170, 201), rnd.randint(2, 250))})

# ---------------------------------------------------------------------------
# 8. Gravação
# ---------------------------------------------------------------------------
gravar("profissionais", col_prof, profs)
gravar("usuarios", col_usu, usuarios)
_, _ = ler("demandas")
gravar("demandas", ["id", "titulo", "tipo", "empresa", "empresaIniciais", "empresaUsuarioId", "cidade", "uf", "local",
                    "modalidade", "prazo", "inicio", "faixa", "areas", "exigencias", "resumo", "escopo", "situacao",
                    "publicadaEm", "desfecho", "contratadoId"], demandas)
col_cand, _ = ler("candidaturas")
gravar("candidaturas", col_cand, candidaturas)
gravar("avaliacoes", ["id", "lado", "sentido", "autorIniciais", "autorNome", "projeto", "nota", "data", "texto",
                      "empresa", "usuarioId", "criterios"], avaliacoes)
gravar("conversas", col_conv, conversas)
gravar("mensagens", col_msg, mensagens)
col_den, _ = ler("denuncias")
gravar("denuncias", col_den, denuncias)
col_aud, _ = ler("auditoria")
gravar("auditoria", col_aud, auditoria)
