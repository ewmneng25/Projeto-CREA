# ProLink — protótipo web

Versão desktop das telas do app, em HTML, CSS e JavaScript, sem framework e sem
servidor. A base de dados fica inteira em arquivos CSV na pasta `dados/`, lidos e
gravados pela própria página.
Nada vem da internet: ícones são SVG inline, as imagens da Miranda ficam em
`assets/img/`, e todas as telas funcionam offline — inclusive na apresentação do
Demo Day. As exceções são a conversa com a Miranda (por texto e, no modo de acessibilidade, por voz),
que chama a API do Gemini e por isso precisa de internet; as dicas de tela dela funcionam offline.




## Acessibilidade (leitor de tela e teclado)

Todas as 33 telas foram auditadas com o **axe-core** (WCAG 2.1 níveis A e AA e boas práticas), nas contas
reais, nas contas de profissional, empresa e administrador e com diálogos, tour e notificações abertos:
**nenhuma violação**. O módulo `app/views/acessibilidade.js`, carregado em todas as telas, cuida do que vale
para o sistema inteiro:

- **Diálogos** (denúncia, editar perfil, manifestar interesse, encerrar demanda, avaliação,
  chave do Gemini e o tour da Miranda): o foco entra no diálogo, fica preso nele com Tab e Shift+Tab, Esc fecha
  e o foco volta para o botão que o abriu.
- **Títulos**: hierarquia sem saltos para o leitor de tela (ajustada com `aria-level`, sem mudar o visual).
- **Grupos de opção** (tipo de conta, ): as setas do teclado trocam a opção.
- **Regiões vivas**: erros e situações do cadastro e do portfólio são lidos assim que aparecem.
- **Áreas com rolagem** (conversa, notificações) recebem foco pelo teclado.
- **Olhinho nas senhas** (`app/views/ver-senha.js`): todo campo de senha — entrar, criar conta, recuperar acesso,
  trocar senha e a chave do Gemini — tem um botão para mostrar ou esconder o que foi digitado. É um botão de verdade,
  com nome fixo ("Mostrar senha") e estado em `aria-pressed`; funciona com Enter e Espaço e não tira o foco do
  campo ao ser clicado. O campo fica marcado com `data-senha`, então, mesmo visível, a assistente de voz nunca lê nem
  repete a senha.

Além disso: o tour da Miranda entrega a fala inteira ao leitor de tela (a digitação letra por letra é só
visual); a resposta da Miranda é lida quando termina de ser escrita (`aria-busy`); ao trocar de etapa no
cadastro, o foco vai para o título da etapa; campos obrigatórios têm `aria-required`; o campo de documento
com erro fica `aria-invalid` e aponta para o aviso; as notificações são links de verdade; o contraste dos
contadores do menu e da hora das mensagens enviadas passou de 3,4:1 para mais de 4,5:1; o foco é sempre
visível; e quem ativa "reduzir movimento" no sistema operacional não vê animações longas.

## Modo de acessibilidade por voz (Gemini Live API)

O ProLink **começa com a voz ligada**. Na página inicial, assim que o splash sai, o **modo de acessibilidade**
já liga sozinho, e uma caixinha pergunta se a pessoa quer **continuar usando a voz ou desativar** — a Miranda faz
a mesma pergunta em voz alta, e dá para responder clicando ou falando (a resposta falada chega pela ferramenta
`responder_pergunta_da_voz`). A pergunta aparece uma vez por sessão do navegador. Quem desativa não tem a voz
ligada sozinha de novo naquela sessão (Alt + M oferece o modo outra vez). Ligada, a Miranda conversa **por voz, em
tempo real**, e acompanha a pessoa em todas as telas — e nas próximas visitas — até o modo ser desativado.

Os navegadores só deixam uma página tocar som depois de um toque de tecla ou clique nela: aberto sem nenhum toque,
a caixinha já está na tela e a voz da Miranda sai no primeiro toque (qualquer tecla, inclusive Tab, ou clique).
Pelo F5 do VS Code, com a configuração do projeto, a voz sai sozinha. A ideia é que quem tem deficiência visual
consiga usar o sistema inteiro só falando: pesquisar oportunidades, profissionais e empresas, entrar na conta ou
entrar na conta, preencher e enviar formulários, publicar demandas, ler notificações e ouvir o resumo da conta.

**API e modelo.** Usa o bate-papo de áudio ao vivo da Gemini API (Live API, WebSocket
`BidiGenerateContent`), com modelos do **nível gratuito**, em ordem de tentativa:

```js
var MODELOS_LIVE = ["gemini-3.8-live", "gemini-3.1-flash-live-preview"];
```

Se o primeiro recusar (modelo indisponível ou sem cota), a moldura tenta o segundo. A chave é a mesma da conversa por texto: a colada com **Ctrl + Espaço** (fica só no `sessionStorage`). Quem ativa o modo sem chave vê a caixinha da chave logo em seguida; ao clicar em "Usar esta chave", a voz conecta.
Sem chave, com a chave recusada ou sem internet, a Miranda avisa com gentileza — pela voz do próprio
navegador — que o assistente de voz não está funcionando no momento, e o sistema continua pelo teclado e pelo
leitor de tela.

**Como funciona.** `acessivel.html` é uma moldura: mostra a tela do ProLink num quadro e mantém, fora dele, a
conexão de áudio aberta — por isso a voz não cai ao trocar de tela. Com o modo ligado, qualquer tela aberta
direto no navegador é levada para dentro da moldura (um script no `<head>` de cada página faz isso antes de
ela aparecer).

| Arquivo | Papel |
|---|---|
| `app/views/boas-vindas.js` | Caixinha de boas-vindas depois do splash; atalho Alt + M para ativar em qualquer tela |
| `app/views/voz-moldura.js` | Conexão com a Live API, microfone (PCM 16 kHz), reprodução (24 kHz), reconexão e barra de voz |
| `app/views/voz-agente.js` | A "mão" da Miranda dentro da tela: lê a tela, clica, preenche, navega e pesquisa na base |

A moldura e a tela conversam por `postMessage`, então tudo funciona igual pelo Live Server, pelo
`Abrir ProLink.bat`, pelo **F5 do VS Code** e com o `index.html` aberto direto (endereço `file://`).

**Som e F5.** O navegador só deixa uma página tocar som depois de um clique ou tecla nela. Por isso:
- ao clicar em "Ativar", a moldura é montada na própria tela, sem trocar de página, e o clique libera o som na hora;
- depois de um F5 (ou abrindo uma tela direto com o modo ligado), a Miranda já conecta sozinha e fica pronta; a
  primeira tecla ou clique em qualquer lugar — inclusive dentro da tela — libera a voz, e ela avisa que continua
  ouvindo. O botão "Iniciar assistente de voz" vem focado, para o leitor de tela anunciar;
- pelo **F5 do VS Code**, a pasta `.vscode/launch.json` (na raiz do projeto e na pasta de fora) abre o Chrome ou
  o Edge com `--autoplay-policy=no-user-gesture-required` e `--use-fake-ui-for-media-stream`: a voz sai sozinha e o
  microfone é liberado sem perguntar, a cada F5.
  Escolha "ProLink no Chrome (voz da Miranda sem clique)" na aba Executar e Depurar.

Aberto como arquivo (`file://`), o Chrome recusa o módulo de captura de áudio carregado de `blob:`; a moldura
tenta então `data:` e, se preciso, o `ScriptProcessor`, que funciona em qualquer origem. O microfone envia o
mesmo PCM de 16 kHz nos três caminhos.

**O que a Miranda pode fazer** (ferramentas declaradas para o modelo): `ler_tela` (título, conta, diálogo
aberto, avisos, texto e a lista numerada de elementos), `navegar`, `voltar`, `clicar`, `preencher`, `focar`,
`rolar`, `pesquisar` (oportunidades com a compatibilidade, profissionais e empresas, direto na base),
`resumo_da_conta`, `ler_notificacoes` e `desativar_modo_acessibilidade`.

**Salvaguardas.**
- Botões que publicam, enviam, salvam, excluem, manifestam interesse ou criam conta só são clicados com
  `confirmado=true`, depois de a pessoa confirmar em voz; sem isso a ferramenta responde `precisa_confirmar`.
- Escolher arquivo exige a própria pessoa (o navegador não abre a janela de arquivos por script): a Miranda leva
  o foco até o botão e pede um Enter.
- Senhas são preenchidas sem voltar para o modelo e nunca são repetidas em voz alta.
- `navegar` só aceita páginas do próprio ProLink.
- Enquanto a Miranda fala, o microfone não envia áudio (evita que ela ouça a própria voz pelo alto-falante).

**Atalho em todas as telas.** Alt + M é escutado por dois caminhos: pelo agente de cada tela e, direto, pela
moldura, que escuta o teclado dentro do quadro — o atalho funciona mesmo numa tela em que algo tenha falhado ao
carregar. O manual em PDF e endereços de fora abrem em outra aba, para a voz e o atalho continuarem na tela.
Depois de um F5, o primeiro Alt + M libera o som e já silencia o microfone. Foi conferido nas 33 telas (público,
profissional, empresa e administração), com o foco no conteúdo ou num campo, com o tour da Miranda aberto, com o
painel de notificações aberto e com o foco na barra de voz.

**Controles.** A barra de voz, embaixo, mostra o estado (ouvindo, falando, mexendo na tela, microfone
silenciado), a legenda da fala, a **transcrição** da conversa (onde também dá para escrever para ela) e
**Desativar modo**. **Alt + M** silencia ou liga o microfone e, com a Miranda falando, interrompe a fala — funciona
com o foco dentro da tela também. A sessão é retomada ao recarregar (`sessionResumption`), a janela de contexto
é comprimida para conversas longas e a conexão é refeita sozinha se o servidor pedir (`goAway`) ou cair.

**Funciona em qualquer PC: modo compatível.** A voz ao vivo depende de uma conexão contínua (WebSocket) com o
Google, que alguns antivírus (inspeção de HTTPS), extensões do navegador, redes de escola ou empresa e proxies
bloqueiam — e a cota gratuita da Live API é separada da cota da conversa por texto. Por isso, se a voz ao vivo não
abrir em 12 segundos, for recusada, cair várias vezes, ficar sem resposta duas vezes ou estourar a cota, a Miranda
passa sozinha para o **modo compatível**, pelo mesmo caminho HTTPS da conversa por texto (que funciona onde o
site funciona):

microfone → detecção de fala (por energia, adaptada ao ruído da sala) → WAV 16 kHz → `generateContent` com as mesmas
ferramentas (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`) → resposta lida pela voz do
próprio sistema (`speechSynthesis`, voz pt-BR do Windows).

Ela avisa na transcrição por que mudou, e o modo vale até fechar a aba (depois de um F5 já começa nele, sem
esperar). A diferença para quem usa: responde logo depois que a pessoa para de falar, em vez de em tempo real, e a
voz é a do computador. Se o Windows não tiver a voz em português instalada, a fala sai com outra voz — instale em
Configurações > Hora e idioma > Fala.

**Microfone em qualquer PC.** Se o driver recusar as opções de áudio, o pedido é refeito da forma mais simples; se
o microfone trabalhar numa taxa diferente da saída de som (Firefox, fones Bluetooth), a captura ganha um contexto
de áudio próprio na taxa do microfone. Microfone bloqueado, ausente ou ocupado por outro programa (Teams, Discord,
Zoom) gera um aviso que diz exatamente o que fazer, incluindo a permissão do Windows em Privacidade > Microfone.

**Ela ouve você?** A barra de voz tem um medidor do nível do microfone (a barrinha verde ao lado das ondas): se ele
não se mexe quando você fala, o som não está chegando. A moldura confere isso sozinha:
- **microfone mudo ou errado** (Windows usando um fone desconectado, "Mixagem estéreo" ou a entrada da webcam como
  padrão, ou o microfone mudo): 9 segundos de silêncio absoluto fazem ela testar os outros microfones do computador,
  um por um, e guardar o que funcionar; se nenhum captar som, ela explica o que conferir no Windows;
- **a captura tem um motor de áudio só dela**, criado depois de o microfone abrir (o de reprodução nasce antes, no
  clique; em alguns PCs — fone Bluetooth que muda de modo, placa de som que troca de dispositivo — ele passava a
  receber só silêncio). Um medidor independente confere o som: se ele ouve e o caminho principal não, a captura troca
  de método sozinha (módulo de áudio ↔ ScriptProcessor);
- **escuta do navegador:** se a página continuar recebendo só silêncio depois de testar até dois outros microfones,
  a Miranda passa a ouvir pelo reconhecimento de voz do próprio Chrome ou Edge, que capta o microfone por conta
  própria. O texto reconhecido vai para ela (na voz ao vivo ou no modo compatível). Se nem assim o som chegar, o
  aviso lista o que conferir no Windows (Privacidade > Microfone e Som > Entrada) e no cadeado do endereço;
- **o microfone é pedido uma vez só.** Aberto como arquivo (F5 do VS Code, duplo clique), o Chrome não guarda a
  permissão e perguntaria de novo a cada pedido. Por isso a moldura só testa outros microfones, religa um microfone
  desconectado ou usa a escuta do navegador sozinha quando o navegador já guardou a permissão (Live Server,
  `Abrir ProLink.bat`). Se a pessoa recusar, ela não insiste: o botão do microfone ou Alt + M pedem de novo. O
  `launch.json` do VS Code abre o navegador já com a permissão concedida (`--use-fake-ui-for-media-stream`);
- **escolher o microfone:** em Transcrição > Microfone há a lista dos microfones do computador; a escolha fica salva;
- **falou e a voz ao vivo não reagiu:** a moldura também detecta a fala por conta própria. Se o servidor não der
  nenhum sinal (nem a transcrição) em 7 segundos, a Miranda passa para o modo compatível e responde **àquela mesma
  fala**, sem pedir para repetir;
- o que você disse aparece na legenda da barra assim que é transcrito.

**Se ela parar de responder.** A moldura se recupera sozinha dos travamentos conhecidos: resposta descartada
depois de uma interrupção (corrigido), som do navegador congelado (troca de fone), microfone desconectado, conexão
que cai e fala sem resposta por 20 segundos (refaz a conexão retomando a sessão e pede para repetir). Cada queda
aparece na transcrição com o código. Se o limite gratuito da API acabar, ela avisa isso em vez de ficar muda. Para
investigar, abra o console (F12) e rode `VozDiagnostico()`: mostra modelo, estado do WebSocket, do som e do
microfone, blocos de áudio enviados, segundos desde a última mensagem da API, as últimas quedas com o motivo, o modo em uso,
o erro do microfone, as taxas de áudio e se há voz em português instalada.

**Testes.** Com a Live API simulada e microfone falso no Chromium: boas-vindas depois do splash, ativação,
conexão e setup, áudio enviado em blocos de 100 ms, fala e interrupção, todas as ferramentas (inclusive entrar na
entrar na conta só pela voz), confirmação de ações, modo permanente, retomada, reconexão, modelo reserva, chave
recusada e desativação — nas duas formas de abrir (servidor local e duplo clique). A caixinha e a moldura passam
no axe-core sem violações, em desktop e celular.

## Chave do Gemini pela interface

Esta versão pode ir para um repositório público: **a chave do Gemini não está em nenhum arquivo**.

1. Em qualquer tela (inclusive a da Miranda), aperte **Ctrl + Espaço**. Se o sistema operacional
   capturar esse atalho (no macOS ele troca o idioma do teclado), use **Ctrl + Shift + Espaço** ou abra
   `index.html#chave`.
2. Cole a chave e clique em **Usar esta chave** (ou Enter).
3. A chave fica no `sessionStorage` do navegador: vale em todas as telas enquanto o site estiver
   aberto e some quando a aba ou o navegador é fechado. Nada vai para a base CSV nem para o `localStorage`.
4. Para trocar ou remover, aperte Ctrl + Espaço de novo.
5. Se existir um `chave_api_gemini.txt` sobrando de versão anterior, o `build.py` apaga o arquivo.

Sem chave, ou com uma chave recusada pelo Google, a Miranda responde com gentileza que a conversa está
indisponível no momento. O tour guiado não usa IA e continua funcionando. O detalhe técnico fica no console.

Recomendado no Google Cloud: restringir a chave à API Generative Language, aos endereços do site e com cota baixa.

## Contas da apresentação e base de dados

O modo de demonstração foi retirado. O sistema tem **uma base só** (`dados/*.csv`): a população de
exemplo (60 profissionais, 24 empresas e contratantes, 59 demandas, 200 candidaturas, avaliações,
uma fila de denúncias e a trilha de auditoria), as contas da equipe para apresentar o sistema e as
contas criadas no cadastro.

**Contas para apresentar** (tela Entrar: CPF, CNPJ ou e-mail, e a senha):

| Perfil | Nome | Entrar com | Senha |
|---|---|---|---|
| Profissional | Daniel Silva do Carmo (engenheiro civil) | CPF `037.590.362-36` ou `danicarmo240306@gmail.com` | `daniel123` |
| Profissional | Eduardo Weber Martins Negreiros (engenheiro eletricista) | CPF `034.082.532-42` ou `ewmn.eng25@uea.edu.br` | `eduardo123` |
| Empresa | DW Engenharia | CNPJ `12.345.678/0001-95` ou `contato@dwengenharia.com.br` | `dwengenharia123` |
| Suporte (administrativo) | Suporte ProLink | `admsuporte@prolink.com.br` | `admsuporte123` |

Os dois profissionais têm currículo fictício completo: resumo, competências, ARTs e CATs confirmadas,
projetos, arquivos (currículo, diploma, certificados) e avaliações. Por isso o painel de cada um já
sugere oportunidades com compatibilidade alta — inclusive as da DW Engenharia —, e a DW já recebe as
candidaturas dos dois, ordenadas por compatibilidade, com conversa aberta com cada um.

As contas são criadas por `dados/contas_apresentacao.py` (idempotente). As senhas ficam só como hash
SHA-256 com sal (`senhaSal` e `senhaHash` em `usuarios.csv`), como as do cadastro. Nenhuma outra conta de
exemplo entra com senha. Troque as senhas antes de publicar o projeto em algum lugar aberto.

**Primeira abertura desta versão:** a base guardada no navegador é trocada inteira pela base do projeto
(contas e dados de testes anteriores saem, e a sessão aberta é encerrada). Nas atualizações seguintes, a
base volta a ser mesclada: o que foi criado no navegador fica, e só os registros novos do projeto entram.
Se o navegador ainda mostrar a tela antiga, recarregue uma vez com Ctrl + Shift + R.

**Cada conta nas suas telas.** Profissional só abre as telas de profissional; empresa e contratante, as de
empresa; o suporte, as administrativas. Se uma conta cair na tela de outro tipo (link antigo, aba
esquecida, botão Voltar), a página leva para o início certo em vez de mostrar um painel misturado.

**Fila do setor administrativo.** São 28 denúncias, 21 delas na fila, para o suporte decidir em
Denúncias: manter conteúdo, remover conteúdo ou bloquear o autor. Toda decisão entra na trilha de auditoria.

- As telas internas não têm números nem nomes fixos no HTML: painéis, perfis, avaliações,
  cartão da lateral e contagens são montados por `app/controllers/conta.js` com os dados da conta da sessão.
- Todo profissional que se cadastra ganha uma ficha em `profissionais.csv`, e é por ela que aparece nas
  buscas das empresas e entra no cálculo de compatibilidade.

## Como abrir

Abra o `index.html` com duplo clique. Não há servidor, instalação nem tela de
configuração: a base de dados já vem pronta.

**Sem conta:** o botão **Entrar como visitante** mostra oportunidades e perfis, sem publicar, candidatar-se nem conversar. Para apresentar, use as contas da seção anterior.

**Entrar com conta:** com o **documento do cadastro (CPF ou CNPJ)** ou o **e-mail**, e a senha. O
botão **Entrar** valida os campos, procura a conta em `usuarios.csv` pelo documento,
confere a senha e abre o painel. Documento ou senha errados recebem a mesma
mensagem, para não revelar quem tem conta. O e-mail não é login.

**E-mail de contato:** pedido no cadastro só para compor o perfil. Aparece em Meu
perfil e no perfil da empresa, e no perfil público do profissional quando ele liga
essa opção em Privacidade e dados. Não recebe código nem confirmação.

**Recuperar acesso:** sem envio de código. A pessoa informa o documento, o e-mail de
contato cadastrado e a nova senha; se os dois conferem, a senha é trocada e a troca
entra na trilha de auditoria. A resposta é a mesma quando algo não confere. A senha nunca
fica em texto no CSV: a conta guarda um sal e o hash SHA-256 (`senhaSal` e
`senhaHash`). As contas nascem no cadastro, já com senha própria.

O painel administrativo, inclusive **Configurações → Base de dados CSV** (baixar
as tabelas e restaurar a base inicial), é acessado pela conta do suporte
(`admsuporte@prolink.com.br`).

**Manual do usuário.** O PDF `manual-do-usuario.pdf` abre pelo ícone de documento na
barra superior de qualquer tela interna, pelo rodapé das telas públicas e por um link
na tela de entrar. Ele foi escrito antes das últimas mudanças, então descreve a
comprovação de documento no cadastro, o login por e-mail, o código de recuperação e as
seis contas de demonstração, que não existem mais.

## Arquitetura MVC

O front-end é organizado em Model, View e Controller, dentro de `app/`. As
páginas HTML continuam na raiz, porque são os pontos de entrada do site.

```
app/
├── core/                    Infraestrutura
│   ├── banco.js             Lê e grava os CSV (IndexedDB), sessão e fila de gravação
│   ├── app.js               Núcleo compartilhado: sessão, troca de página, hash de senha
│   └── arquivos-locais.js   Chaves e manual da Miranda (gerado pelo build)
├── models/                  Dados e regras de negócio
│   ├── repositorios.js      Um repositório por tabela (ProLinkModelos.demandas, .usuarios…)
│   ├── demandas.js          Compatibilidade, candidaturas e privacidade
│   └── crea-api.js          Integração com a API do Crea-AM
├── views/                   Apresentação
│   ├── paginas.py           Templates: gera todas as páginas HTML da raiz
│   ├── componentes.js       Aviso, caixa de diálogo, download, formatação
│   └── transicao.js         Splash e transição entre páginas
└── controllers/             Um por área: eventos da tela + models + views
    ├── sessao.js            Entrar, recuperar, sair, visitante e tela certa por tipo de conta
    ├── cadastro.js          Cadastro com consulta ao Crea
    ├── oportunidades.js     Oportunidades abertas e salvas
    ├── demandas.js          Minhas demandas, publicar e encerrar
    ├── candidaturas.js      Manifestar interesse e candidaturas
    ├── busca.js             Buscas de profissionais e filtros laterais
    ├── portfolio.js         Projetos, documentos técnicos, currículo e certificados
    ├── perfil.js            Editar perfil, perfil da empresa, e-mail de contato
    ├── perfil-publico.js    Prévia do perfil público
    ├── mensagens.js         Conversas
    ├── avaliacoes.js        Avaliações e pedidos
    ├── admin.js             Usuários, trilha de auditoria e denúncias
    ├── painel.js            Números dos painéis e contadores do menu
    ├── notificacoes.js      Painel de notificações
    ├── denuncias.js         Registrar denúncia
    ├── configuracoes.js     Configurações e base de dados
    ├── privacidade.js       Visibilidade, consentimentos e descarte
    ├── miranda.js           Conversa com a Miranda
    ├── miranda-guia.js      Tutorial das telas
    ├── layout.js            Busca da barra superior, preferências, entrada social
    ├── interface.js         Comportamentos gerais (abas, anexos)
    └── abas.js              Filtros em abas (depois das listas desenhadas)
```

**Regras da separação**

- **Controllers não acessam a base diretamente.** Pedem os dados aos repositórios:
  `ProLinkModelos.demandas.listar(...)`, `ProLinkModelos.usuarios.porDocumento(...)`,
  `ProLinkModelos.sessao.atual()`, `ProLinkModelos.auditoria.registrar(...)`. Só
  `app/core/banco.js` sabe que os dados são CSV no IndexedDB.
- **Models não mexem na tela.** Repositórios, regras de compatibilidade e a
  integração com o Crea só recebem e devolvem dados.
- **Views não têm regra de negócio.** Os templates geram o HTML; os componentes
  desenham avisos e diálogos.

**Ordem de carregamento.** Cada página carrega `app/core/banco.js` com a lista
`data-scripts`. Ele abre a base e só então carrega, nesta ordem, repositórios,
núcleo, componentes e controllers. Os controllers que desenham listas vêm antes
de `abas.js` e dos filtros, que trabalham sobre o que foi desenhado.

**Build.** `python build.py` continua sendo o comando: ele executa
`app/views/paginas.py`, que gera as páginas e empacota a base inicial.

## Anexos no cadastro e no perfil

**Profissional.** A etapa **Experiência** do cadastro pede currículo, diplomas e
certificados, projetos e arquivos dos projetos (plantas, memoriais, fotos). Ao criar a
conta, tudo é gravado: projetos em `projetos.csv` e arquivos em `arquivos.csv`, ligados
ao projeto. No portfólio, cada projeto mostra quantos arquivos tem, e "Adicionar
projeto" também aceita arquivos.

**Empresa.** Empresa não tem currículo nem diploma: a etapa vira **Sua empresa** e pede
logotipo, apresentação ("Sobre a empresa"), áreas de atuação e uma obra ou serviço
executado, com fotos e atestado de capacidade técnica. Registro, quadro técnico e
acervo operacional vêm do Crea e só são exibidos. No perfil da empresa:

- **Trocar logotipo** (a imagem é reduzida e guardada na conta);
- **Áreas de atuação**;
- **Obras e serviços executados**, com "Adicionar obra" e "Anexar fotos ou atestado";
- **Certificações e documentos**: ISO e PBQP-H, apresentação institucional, estrutura
  disponível e licenças. Contrato social e documentos financeiros não são pedidos.

O perfil público da empresa mostra logotipo, áreas e obras, com a indicação de fotos e
de atestado. Contratante sem registro continua sem essa etapa.

**Na conta da DW Engenharia**, a empresa já vem com logotipo, apresentação, cinco
áreas, três obras com fotos e atestados e três documentos; o profissional, com seis
projetos (dois com arquivos anexados), currículo e certificados.

## Base de dados em CSV

Toda a base do ProLink é feita de arquivos CSV, um por tabela. **Não há servidor,
banco de dados nem programa rodando, e ninguém escolhe pasta:** o próprio sistema
guarda os CSV dentro do navegador.

- **Base inicial:** `dados/*.csv`, na pasta do projeto. O `build.py` empacota esses
  arquivos em `dados/base-inicial.js`, porque uma página aberta com duplo clique
  não pode ler arquivos do disco, mas pode carregar um script.
- **Base em uso:** na primeira abertura, cada CSV inicial é copiado para o
  armazenamento interno do navegador (IndexedDB, banco `prolink-base-csv`, um
  registro por tabela com o texto do CSV). Todas as páginas leem e gravam ali.
- **Ver os dados:** entre como administrador em **Configurações → Base de dados
  CSV** para baixar qualquer tabela como arquivo `.csv` (abre no Excel) ou
  restaurar a base inicial.

O navegador guarda só o id de quem entrou (`prolink_sessao`): no `localStorage` com
**Manter conectado** marcado, ou no `sessionStorage` (só aquela aba, até fechar o
navegador) com a opção desmarcada.

| Tabela | O que guarda |
|---|---|
| `usuarios.csv` | Contas: as da apresentação, as de exemplo, as criadas no cadastro, situação (verificado, bloqueado, encerrada) |
| `profissionais.csv` | Profissionais fictícios com áreas, competências e acervo |
| `demandas.csv` | Demandas publicadas pelas empresas, com situação (aberta, encerrada) |
| `candidaturas.csv` | Manifestações de interesse, com a compatibilidade calculada e os critérios |
| `privacidade.csv` | O que cada usuário escolheu mostrar e os consentimentos |
| `configuracoes.csv` | Avisos, exibição e as telas em que a Miranda já apresentou o tour |
| `buscas_salvas.csv` | Buscas salvas e alertas (coluna `tipo`) |
| `conversas.csv` e `mensagens.csv` | Caixa de mensagens de cada conta e cada fala, com anexo, proposta ou convite |
| `miranda_mensagens.csv` | Histórico da conversa com a Miranda |
| `projetos.csv` | Projetos do portfólio do profissional |
| `obras.csv` | Obras e serviços executados pela empresa (cliente, cidade, período, área, porte) |
| `arquivos.csv` | Currículo, certificados, arquivos de projetos, fotos de obras, atestados, certificações e documentos da empresa. A coluna `referenciaId` liga o arquivo ao projeto ou à obra. Guarda nome, tamanho e data, não o arquivo |
| `documentos.csv` | ARTs e CATs do portfólio; as vinculadas pelo número entram aqui depois de confirmadas pela API |
| `salvos.csv` | Oportunidades que cada usuário marcou como salvas |
| `avaliacoes.csv` e `pedidos_avaliacao.csv` | Avaliações recebidas e realizadas, e os pedidos de avaliação |
| `denuncias.csv` | Denúncias registradas e a decisão da moderação |
| `auditoria.csv` | Trilha de auditoria: login, cadastro, publicação, bloqueio, decisões |

**Como a página usa a base.** O `app/core/banco.js` é carregado antes dos outros
scripts de cada página. Ele lê os CSV para a memória e só então carrega o resto
(listado no atributo `data-scripts`). As telas leem da memória na hora; cada
alteração muda a memória e regrava o CSV da tabela em seguida. Antes de trocar
de página, o sistema espera as gravações terminarem.

**Formato.** Separador `;` e UTF-8 com BOM, para abrir direto no Excel em
português. A primeira linha é o cabeçalho. Listas e objetos (acervo, critérios,
anexos) ficam como texto JSON dentro da célula; verdadeiro e falso, como `sim` e
`nao`. Nas tabelas com coluna `extras`, campos que não têm coluna própria vão
para ela, também em JSON.

**Mudar a base inicial.** Edite os CSV de `dados/` (no Excel ou num editor) e
rode `python build.py`. Na próxima abertura, o navegador percebe que a base
inicial mudou e passa a usar a nova (o que tinha sido gravado a partir da antiga
é substituído).

**Chaves e manual.** Pelo mesmo motivo, o `build.py` copia `chave_api_crea.txt`
e `manual-prolink.txt` para `app/core/arquivos-locais.js`. A chave do Gemini
**não** é copiada: veja a seção "Chave do Gemini pela interface".
Mudou uma chave? Rode o build de novo.

**Limites.** Os dados ficam no navegador e no computador em que foram criados:
outro navegador começa da base inicial, e limpar os dados do site apaga o que foi
gravado (baixe os CSV antes). Duas abas gravando a mesma tabela ao mesmo tempo
podem sobrescrever uma à outra. Arquivos anexados ficam só pelo nome.

**Telas montadas a partir da base:** oportunidades (com as salvas), minhas demandas,
publicar demanda, candidaturas, mensagens, portfólio (projetos, documentos técnicos
e arquivos), avaliações, privacidade, configurações, Miranda, as três buscas de
profissionais, usuários, denúncias e trilha de auditoria. Também saem da base os
contadores do menu lateral, os números dos painéis iniciais e as notificações do
sino.

**Na migração para PHP e MariaDB,** cada CSV vira uma tabela com as mesmas
colunas, e o `banco.js` troca o armazenamento do navegador por chamadas aos controladores.

## Estrutura

```
prolink/
├── index.html          Página pública (hero + como funciona)
├── login.html          Entrar (split: vitrine + formulário)
├── buscar.html         Busca pública de profissionais, sem conta
├── cadastro.html       Criar conta, fluxo linear de 4 ou 5 telas
├── inicio.html         Painel do profissional
├── oportunidades.html  Busca com filtros laterais
├── miranda.html        Assistente virtual (bate-papo com IA)
├── acessivel.html      Modo de acessibilidade: telas + Miranda por voz (Gemini Live)
├── portfolio.html      Meu portfólio: projetos, documentos técnicos e certificados
├── empresa-inicio.html       Painel de quem contrata
├── empresa-demandas.html     Demandas publicadas e candidaturas
├── empresa-publicar.html     Formulário de nova demanda
├── empresa-profissionais.html Busca de profissionais, com filtros por acervo
├── empresa-perfil.html       Perfil da empresa
├── empresa-mensagens.html    Caixa de entrada da empresa
├── empresa-avaliacoes.html   Avaliações da empresa
├── admin-inicio.html         Painel administrativo do Crea-AM
├── admin-usuarios.html       Gestão de usuários e bloqueio
├── admin-denuncias.html      Fila de denúncias e moderação
├── admin-auditoria.html      Trilha de auditoria (só leitura)
├── oportunidade.html         Detalhe da demanda e manifestação de interesse
├── candidaturas.html         Minhas candidaturas (profissional)
├── profissionais.html        Busca de parceiros, dentro do sistema
├── dados/                    Base inicial: um CSV por tabela (+ base-inicial.js, gerado)
├── privacidade.html          Visibilidade, consentimentos, portabilidade e descarte
├── configuracoes.html        Configurações do profissional (engrenagem da barra superior)
├── empresa-configuracoes.html Configurações da empresa
├── admin-configuracoes.html  Configurações do administrador
├── perfil-publico.html       Prévia do perfil como um visitante vê
├── empresa-candidaturas.html Fila de candidaturas de uma demanda
├── profissional.html         Perfil público visto pela empresa
├── mensagens.html      Caixa de entrada em 3 colunas
├── avaliacoes.html     Reputação e notas por critério
├── perfil.html         Perfil profissional
├── chave_api_crea.txt  Token da API do Crea-AM
├── manual-do-usuario.pdf     Manual do usuário (abre pelo ícone da barra superior)
├── manual-prolink.txt  O que a Miranda sabe sobre o sistema
├── assets/
│   ├── css/prolink.css       Folha de estilo única e comentada
│   ├── img/miranda.png       Miranda de corpo inteiro (tela do chat)
│   ├── img/miranda-avatar.png Rosto da Miranda (menu, balões, botão)
│   └── js/miranda-guia.js    Dicas de tela, texto fixo e sem IA
└── build.py            Gerador das páginas (mantém sidebar/topbar iguais em todas)
```

## Sobre o build.py

As páginas são HTML puro e podem ser editadas direto. O `build.py` existe porque
a sidebar e a topbar se repetem em 9 arquivos: alterar o menu em um só lugar e
rodar `python3 build.py` evita esquecer uma página. Se preferir editar o HTML na
mão, é só ignorar o script.

Páginas com script próprio recebem o arquivo pelo parâmetro `scripts` da função
`shell` — é assim que só `miranda.html` carrega o `miranda.js`.

## O que mudou do mobile para o web

| Tela | Adaptação |
|---|---|
| Splash | Virou landing com hero, números e seção de benefícios |
| — | Nova tela de cadastro, linear (não existia no mobile) |
| Login | Split screen: vitrine da marca à esquerda, formulário à direita |
| Início | Banner + 4 indicadores em linha + duas colunas (recomendações / atividade) |
| Oportunidades | Filtros persistentes na lateral, cards horizontais com % de compatibilidade |
| Perfil | Capa, cabeçalho com ações e duas colunas (sobre/experiência + registro) |
| Documentos | Tabela com colunas Obra, Registro e Situação + área de upload lateral |
| Portfólio | Virou **Meu portfólio**: análise concluída, currículo, certificados e projetos |
| Mensagens | 3 colunas: lista, conversa e contexto da demanda |
| Avaliações | Resumo com distribuição de notas + notas por critério |

## A marca: uma treliça

A treliça junta as duas coisas que a plataforma faz. Em engenharia, é a estrutura
que ganha rigidez pela triangulação — nenhuma barra sozinha sustenta, o conjunto
sustenta. Em rede, é exatamente um grafo: nós ligados por arestas.

São quatro nós. Três nas pontas, e um no centro com anel — o Crea. Todo vínculo
passa por ele, e é isso que dá rigidez ao conjunto. A leitura funciona nos dois
sentidos: quem vê engenharia vê uma estrutura, quem vê tecnologia vê uma rede.

É SVG inline, gerado por `logo()` no `build.py`, sem arquivo de imagem: escala
de 28 px na barra lateral a 96 px no splash sem perder nitidez, e acompanha as
cores do tema.

Um detalhe que só apareceu no teste: o gradiente precisou de
`gradientUnits="userSpaceOnUse"`. No padrão, a caixa de cada traço define o
gradiente — e a barra inferior, sendo horizontal, tem caixa de altura zero. O
gradiente degenerava e a barra sumia.

## Splash e transições

Duas coisas, com propósitos diferentes.

**O splash** aparece uma vez por sessão do navegador, só na porta de entrada. As
barras da treliça se desenham uma a uma e os nós aparecem depois: a marca sendo
montada é literalmente o que ela significa. Dura 1,7 s e sai sozinha.

**As transições** aparecem quando a pessoa troca de contexto — entra, sai, cria
conta, muda de perfil. Não são enfeite: são o aviso de que o chão mudou.
Navegar entre telas do mesmo contexto não mostra transição nenhuma, senão
viraria atraso.

Onde elas entram:

| Ação | O que aparece |
|---|---|
| Entrar | "Entrando como DW Engenharia…" |
| Entrar como visitante | "Entrando como visitante…" |
| Criar conta, ao finalizar | "Criando sua conta…" |
| Sair | "Encerrando sua sessão…" |
| Abrir o cadastro ou a Miranda | "Abrindo seu cadastro…", "Chamando a Miranda…" |

Nos dois casos a marca aparece grande: 180 px no splash e 128 px na transição, porque é o único momento em que ela não divide espaço com nada. Em tamanho grande o traço fino sumia, então a espessura das barras acompanha.

Três cuidados que evitam o pior defeito desse tipo de tela — ficar presa:

- um limite de segurança remove a transição depois de 4 s, aconteça o que
  acontecer com a navegação;
- voltar pelo histórico traz a página do cache com a transição visível, então
  ela é removida no `pageshow`;
- na transição, que é curta, a marca já aparece montada e só pulsa. Desenhar
  pela metade pareceria travamento.

Com `prefers-reduced-motion`, o splash dura 400 ms sem animação e as transições
passam quase direto.

## Tema escuro

Todo o sistema usa tema escuro. As cores ficam em `:root` no CSS — trocar esse
bloco troca o tema inteiro, sem mexer em nenhum HTML.

| Token | Valor | Uso |
|---|---|---|
| `--fundo` | `#0b1220` | fundo da página |
| `--superficie` | `#131c2e` | cartões, sidebar, topbar |
| `--superficie-2` | `#1a2437` | cabeçalho de tabela, balão recebido, upload |
| `--linha` | `#24304a` | divisórias e bordas |
| `--tinta` | `#e9eefb` | texto principal |
| `--tinta-2` | `#a7b6cd` | texto secundário |
| `--tinta-3` | `#7b8da9` | metadados |
| `--azul-600` | `#2563eb` | preenchimento de botões (texto branco em cima) |
| `--azul-texto` | `#8ab4ff` | links e ícones sobre fundo escuro |
| `--azul-hover` | `#3b82f6` | estado hover do botão primário |

A separação entre `--azul-600` (preenchimento) e `--azul-texto` (texto) é o
detalhe que faz o tema escuro funcionar: o azul que dá bom contraste com texto
branco por cima é escuro demais para servir de cor de texto sobre fundo escuro.

Contrastes conferidos (WCAG AA pede 4,5:1 para texto normal):

- texto principal sobre cartão — 14,7:1
- texto secundário sobre cartão — 8,3:1
- metadados sobre cartão — 5,1:1
- links azuis sobre cartão — 8,2:1
- branco sobre botão azul — 5,2:1
- etiquetas verde, âmbar, roxa e azul — entre 8,1:1 e 9,6:1

## Cadastro

Fluxo **linear**: uma coisa por tela, sem alternar entre abas. O indicador do
topo mostra onde a pessoa está, mas não é clicável — só se avança pelo botão
Continuar.

Não existe botão "Consultar no Crea" na primeira tela. **Avançar É a consulta**:
ao tocar em Continuar, o ProLink procura o documento na base do Crea e a
resposta escolhe a tela seguinte.

| Resposta do Crea | Caminho |
|---|---|
| Encontrou o registro | Tipo de conta → Documento → **Registro** → **Acesso** → Experiência |
| Pessoa física não encontrada (sem registro) | Tipo de conta → Documento → **Seus dados e seu perfil** (obrigatórios: nome, profissão, cidade, estado, telefone, e-mail; opcionais: formação, nascimento, habilidades, sobre) → **Acesso** → Experiência |
| Pessoa jurídica não encontrada (sem registro) | Tipo de conta → Documento → **Dados e perfil da empresa** (obrigatórios: razão social, cidade, estado, telefone, e-mail; opcionais: nome fantasia, porte, área, site, sobre) → **Acesso** |
| Consulta indisponível | Tipo de conta → Documento → **Seus dados** (pode declarar o registro) → **Acesso** → Experiência |

Antes do documento, a pessoa escolhe o **tipo de conta**: **pessoa física**
(engenheiro ou profissional técnico) ou **pessoa jurídica** (empresa). A escolha
define o documento: pessoa física entra **só com CPF** (11 dígitos) e pessoa
jurídica **só com CNPJ** (14 dígitos). O RNP e o número de registro não são
aceitos como documento de cadastro nem de login. Um documento do tipo errado
ou incompleto é recusado na própria tela.

### O que a API do Crea tem — e o que não tem

Conferido no MER do desafio: `api_profissional` e `api_empresa` **não têm
e-mail, telefone, cidade nem UF**, e o CPF é *input apenas* — serve para buscar
e nunca volta na resposta. Isso decidiu três coisas no cadastro:

- os dados do registro aparecem **logo depois da busca**, porque não há contato
  para mandar código antes;
- a prova de que o registro é da pessoa passa a ser o **documento anexado**;
- o **e-mail de login é informado pela pessoa**, em todos os caminhos.

### As telas

1. **Tipo de conta** — pessoa física (engenheiro) ou pessoa jurídica (empresa).
   Trocar o tipo depois limpa o documento e a consulta anterior.
2. **Documento** — CPF (pessoa física) ou CNPJ (pessoa jurídica).
   Trocar o documento depois de uma consulta descarta o resultado anterior;
   repetir o mesmo documento não refaz a chamada.
2. **Registro** *(quando encontra)* — os principais dados do Crea, em leitura:
   - profissional: nome, RNP, registro, título (modalidade), situação e o acervo
     técnico importado (ARTs e CATs pelo RNP);
   - empresa: razão social, nome fantasia, CNPJ, registro, data de registro,
     quadro técnico e acervo operacional (as ARTs da CAO).

   A pessoa marca *Confirmo que esses dados são meus* para seguir, ou volta pelo
   atalho "Não é você nesses dados?".
4. **Seus dados** *(quando não encontra)* — se o Crea responde que o documento
   não tem registro, é alguém que nunca se registrou: a tela pede só o que não
   depende do Crea (nome completo ou razão social, cidade, estado, telefone e
   e-mail), sem escolha de caminho, e a conta nasce como contratante, sem selo.
   Se a consulta estiver indisponível, a pessoa pode ter registro: aí continua
   podendo declarar título, registro e RNP, e o perfil fica sem o selo.
5. **Acesso** — e-mail (só no caminho com registro; no declarado ele já foi
   pedido), senha, confirmação e consentimentos.
6. **Experiência** — currículo, diplomas e certificados, projetos do portfólio
   e arquivos das obras.

## Nenhum botão sem destino

Uma auditoria automática abriu cada tela com a sessão certa (profissional,
empresa ou administrador), clicou em cada botão e anotou os que não mudavam
nada. O que ela encontrou, e como ficou:

| Onde | Antes | Agora |
|---|---|---|
| Engrenagem da barra superior | Sem destino | Tela **Configurações** de cada lado: conta e senha, avisos por evento e canal, buscas salvas e alertas, texto maior, menos animação, dicas da Miranda e sessão |
| "Ver perfil público" | Sem destino | **perfil-publico.html**, a prévia com o cabeçalho público. Para profissional, respeita Privacidade e dados |
| "Ver perfil" nos cartões | `href="#"` ou sempre o Daniel | `profissional.html?p=` abre a pessoa do cartão, com o acervo dela |
| "Enviar mensagem" nos cartões | Caixa de entrada genérica | `?com=` abre ou cria a conversa com aquela pessoa |
| Abas de filtro (10 grupos) | Só trocavam o botão marcado | Filtram a lista e avisam quando fica vazia |
| Filtros laterais das buscas | Sem efeito | Aplicar, limpar, salvar a busca e criar alerta. Atalhos por área (`?area=`) e a busca da barra superior (`?q=`) chegam filtrados |
| Mensagens | Trocar de conversa não mudava nada; a empresa via as conversas do profissional | Cada conversa tem seus balões e seu contexto; nova conversa, anexo, proposta, portfólio e convite para demanda |
| Admin | Filtrar, exportar, desbloquear, manter e remover sem efeito | Filtros ao vivo, CSV do que está na tela, bloqueio com motivo, decisão de denúncia que muda de aba. Tudo entra na trilha de auditoria |
| Avaliações | "Solicitar" sem efeito, "Realizadas" sem lista | Pedido por contrato e lista das avaliações feitas pela conta |
| Portfólio | Adicionar projeto, substituir currículo e adicionar certificado sem efeito | Funcionam e ficam guardados no navegador |
| Perfil da empresa | "Editar perfil" sem efeito | Edita nome de exibição, cidade e apresentação |
| Entrar com Google ou LinkedIn | Sem efeito | Explica que depende de servidor (OAuth) e leva ao e-mail de demonstração |
| Notificações | Itens sem destino | Cada aviso abre a tela do assunto, conforme o lado |

Tudo o que essas ações criam ou alteram é gravado na base CSV (veja
**Base de dados em CSV**). Anexos e arquivos ficam só pelo nome: o arquivo em si
não sai do computador. A troca de senha valida as regras, mas não tem o que
conferir sem autenticação real.

## Meu portfólio

As telas de triagem e de documentos deixaram de existir. O que estava nelas foi
para onde faz sentido: o resultado da análise para o painel inicial, os
documentos técnicos para o portfólio.

A tela tem três seções, na ordem do que pesa para quem contrata:

1. **Projetos** — a grade de cartões, com abas por situação.
2. **Documentos técnicos** — ARTs e CATs **no mesmo formato dos projetos**:
   cartões numa grade de três colunas, com abas por tipo. Do ponto de vista de
   quem contrata, projeto e ART respondem à mesma pergunta — já fez isso antes?
   —, então merecem o mesmo tratamento visual. A diferença de origem aparece no
   próprio cartão: a capa mostra o tipo e o número, e o rodapé diz que a
   confirmação veio do Crea-AM.
3. **Currículo e certificados** — o que o Crea não emite. Reforça o perfil e
   alimenta a análise, mas não recebe selo.

O vínculo por número (ART e CAT) ficou recolhido em dois `<details>` no fim da
seção de documentos: é a exceção, não o caminho normal, já que o acervo é
importado no cadastro.

## A análise no painel inicial

O resultado fica logo abaixo dos quatro indicadores, antes das oportunidades
recomendadas — é status, e status pertence ao painel. Traz a compatibilidade, as
competências identificadas, as quatro barras do que sustenta a nota e três
ações: ver as oportunidades compatíveis, ir para o portfólio e refazer a análise.

**A tela nunca abre em "analisando".** Ela mostra o resultado da última rodada;
ninguém precisa disparar nada para saber como está. Refazer é decisão da pessoa,
com o botão — rodar sozinho a cada alteração no portfólio gastaria chamada de
API e faria o número mudar na frente de quem está editando.

## Acervo técnico: importado, não digitado

Não há campo para informar números de ART e CAT. Assim que a consulta encontra
o profissional, `listarAcervo()` pede as listas ao Crea com o RNP
(`?p=profissionais/{rnp}/arts` e `/cats`, seguindo as páginas) e a tela de
registro mostra o acervo junto dos demais dados. Para empresa, a mesma tela
usa `quadroTecnico()` e `acervoOperacional()`.

O item 8.4 descreve conferência de **ART por RNP + número** — isso é um endpoint
de *conferência*, não de *listagem*. Se a API do desafio não tiver rota de
listagem, `listarAcervo()` devolve `ok: false`, a tela explica que o acervo não
veio e a conta é criada normalmente. **Em nenhuma hipótese o sistema tenta
descobrir números iterando** (2026/000001, 2026/000002...): isso é enumeração da
base do Crea, gera tráfego indevido na API do desafio e derrubaria a proposta.

O aviso da tela Seus dados distingue duas coisas que não são a mesma: **registro que não
existe** (a API respondeu 404) e **consulta que não deu para fazer** (API fora do
ar ou ainda não configurada). O texto do cabeçalho muda conforme o `modo` que
vem do `crea-api.js`.

O caminho é decidido em `recalcularFluxo()`, no `prolink.js`: um array de ids de
etapa, recalculado quando a consulta responde. Quem desenha o indicador e quem
mostra a tela leem esse mesmo array, então não há como as duas coisas
discordarem.

## Identidade do titular

O ProLink confere se o registro existe no Crea, mas não comprova que quem se
cadastra é o titular. A primeira versão pedia o envio de um documento de identidade
analisado por IA; ela foi retirada, porque foto ou PDF de documento não prova
titularidade, o edital veda documentos reais (item 11.2) e pede supervisão humana
no uso de IA (item 12.3). Em produção, a titularidade seria comprovada no servidor
pelo login gov.br (selo prata ou ouro) ou por certificado ICP-Brasil. Esse é um risco
declarado do protótipo.

## Conformidade com o edital

Três ajustes finais para alinhar a interface ao Edital nº 03/2026.

### Busca de profissionais, dentro e fora

A busca existe em dois lugares, com propósitos diferentes:

| Onde | Para quem | O que muda |
|---|---|---|
| `buscar.html` | Visitante, sem conta | Consulta aberta. Ver perfil; contato exige conta |
| `profissionais.html` | Profissional logado | Mesma busca, com mensagem e convite para demanda |
| `empresa-profissionais.html` | Empresa logada | Ordenada por correspondência com a demanda aberta |

O painel inicial traz um bloco de busca logo abaixo do banner, com campo e
atalhos por área, que leva à busca completa.

**Por que um profissional procura profissional:** obra multidisciplinar precisa
de quem assine a disciplina que ele não assina. Parceria já era um dos tipos de
demanda do sistema desde o começo — faltava o caminho para encontrar com quem
fazê-la.

### Perfil "Público" (Anexo I, item 3)

`buscar.html` é consulta aberta, sem conta: filtros por especialidade,
experiência, nome, situação no Crea e cidade, com acesso ao perfil do
profissional. Era o único dos quatro perfis do Anexo I sem tela própria.

Só aparece ali quem autorizou aparecer nas buscas, e só os campos que autorizou
mostrar — a tela de Privacidade e dados controla isso campo a campo.

### Correspondência indicativa (itens 10.1 e 10.2)

O ProLink **não classifica pessoas**. Onde há percentual — painel inicial, lista
de oportunidades, busca de profissionais, fila de candidaturas — aparece o aviso
de que a correspondência é indicativa e de que cabe às partes verificar
habilitação, atribuições, regularidade, escopo, preços e contratos.

Também saiu a palavra "ordenados por compatibilidade" das listas: virou
"correspondências", que descreve o que o sistema faz sem sugerir ranking
institucional, vedado pelo item 10.1.

O rodapé das telas públicas traz o limite do item 2.3: ambiente de divulgação
voluntária, que não substitui contratação, habilitação, licitação, seleção,
fiscalização ou verificação documental.

### Declaração de uso de IA (item 12.3)

No topo da tela da Miranda, um bloco recolhido declara o que a assistente faz, o
que **não** faz, os riscos assumidos, o que acontece com os dados da conversa e
como reclamar de uma resposta.

No modo de acessibilidade a declaração ganha um parágrafo próprio: por voz, a Miranda recebe o áudio da
fala e o texto da tela aberta (que pode ter nome, e-mail e dados da conta) para agir a pedido da pessoa, e
pergunta antes de publicar, enviar, salvar ou excluir.

O ponto central da declaração: a Miranda explica, a regra ordena. Ela não
participa de nenhuma decisão sobre pessoas — quem ordena é a regra de pesos
fixos, auditável linha a linha. Essa separação é o que permite atender ao 12.3
sem abrir mão da assistente.

### A conversa com IA e os modelos

A Miranda conversacional usa a API do Gemini, com uma **lista de modelos**, não
um só:

```js
var MODELOS_GEMINI = [
  "gemini-3.5-flash-lite",   // mais recente da linha Lite, alto volume
  "gemini-3.1-flash-lite",   // o anterior, ainda estável
  "gemini-3-flash-preview"   // tem camada gratuita na API do Gemini
];
```

Quando um modelo responde **429** (cota ou fila) ou **503** (sobrecarregado), a
Miranda insiste duas vezes, com quase um segundo de intervalo, e só então passa
para o próximo da lista. Se todos falharem, ela avisa que os modelos estão
congestionados em vez de mostrar erro técnico.

A razão é de demonstração, não de engenharia: num pitch ao vivo, dez segundos de
pico no provedor não podem derrubar a assistente na frente da banca.

Também saíram os parâmetros `temperature`, `top_p` e `top_k`, que foram
descontinuados na API do Gemini.

O **tour guiado não depende disso**: é texto fixo e funciona offline. Mesmo com a
API fora do ar, a Miranda continua apresentando as telas — o que cai é só a
conversa livre.

## Acessibilidade (item 12.1)

As abas que não controlam painel deixaram de usar `role="tab"`: viraram botões
de filtro com `aria-pressed`. Uma aba anunciada por leitor de tela que não leva
a painel nenhum é armadilha, não recurso.

A barra lateral e a superior ganharam `aria-label`, e a navegação pública
declara sua função. Somados ao que já existia — link de pular para o conteúdo,
foco visível, rótulo em todo campo, contraste conferido e `prefers-reduced-motion`
respeitado —, cobrem os requisitos básicos do item 12.1.

## Os dois lados da plataforma

O ProLink tem duas faces, e o mesmo esqueleto serve as duas: mesma barra
lateral, mesma topbar, mesmos componentes. Quem conhece um lado não precisa
reaprender o outro — o que muda é a navegação e o trabalho a fazer.

| | Profissional | Empresa |
|---|---|---|
| Grupo 1 | **Trabalho**: Início, Meu portfólio, Mensagens | **Contratação**: Início, Minhas demandas, Buscar profissionais, Mensagens |
| Grupo 2 | **Minha carreira**: Meu perfil, Avaliações | **Minha empresa**: Perfil da empresa, Avaliações |
| O que faz | Mantém acervo, recebe demanda compatível | Publica demanda, lê candidatura, escolhe quem contratar |

`shell()` recebe `lado="empresa"` e troca as duas listas de navegação, os títulos
dos grupos, o destino da logo e o cartão do rodapé da lateral. Nenhuma tela do
lado profissional foi duplicada à toa: mensagens e avaliações são a mesma função,
chamada com o outro lado.

### O argumento que só aparece deste lado

A verificação do Crea é vendida ao profissional como selo. Para a empresa, ela é
outra coisa: **candidatura que chega com o registro já conferido**. Ninguém pede
documento, ninguém confere número, ninguém descobre depois que o registro estava
suspenso. Por isso o cartão de profissional traz o selo verde em destaque e a
busca tem um filtro de *acervo comprovado* — é o filtro mais forte da tela, o que
separa quem já fez daquilo de quem diz que faz.

O cartão de Rafael Souza, na busca, aparece de propósito com "Registro não
verificado" em âmbar: mostra que a plataforma não esconde quem não está regular,
só deixa claro quem é quem.

## Os dois lados, conectados (RF05)

Esta é a parte que faz o sistema ser um sistema, e não dois painéis que não se
falam. O ciclo completo funciona:

1. O profissional abre a demanda em `oportunidade.html` e vê **por que** combina.
2. Manifesta interesse, escolhendo quais ARTs e CATs anexar.
3. A candidatura aparece na fila da empresa em `empresa-candidaturas.html`.
4. A empresa abre `profissional.html` — e a etiqueta do profissional muda de
   *Interesse enviado* para *Perfil visualizado*.

É o cenário mínimo do Anexo I, item 7: "profissional manifesta interesse e a
empresa visualiza o perfil".

### Onde isso fica guardado

Em `dados/candidaturas.csv`. As colunas já estão nomeadas pensando na migração:
vira a tabela `pro_candidaturas`, com chave estrangeira para a demanda e para o
usuário.

### A compatibilidade é calculada

O item 12.3 exige critérios de recomendação explicáveis. O percentual sai de uma
regra fixa, em `app/models/demandas.js`, com pesos declarados que somam 100:

| Critério | Peso | O que mede |
|---|---|---|
| Área de atuação | 40 | Tem atribuição na área que a obra exige |
| Acervo confirmado no Crea | 30 | ARTs e CATs naquela área, ponto cheio a partir de 3 |
| Localização | 15 | Atende a cidade da obra; 60% se atende o estado |
| Avaliações recebidas | 15 | Média de contratos registrados na plataforma |

Nenhum critério usa raça, gênero, idade, origem ou condição social — item 12.2.
E a conta é aberta nas duas pontas: o profissional vê o detalhamento antes de se
candidatar, a empresa vê no cartão da candidatura.

Isso também separa as duas IAs do projeto: a Miranda **explica**, a regra
**ordena**. Um modelo de linguagem não conseguiria justificar por que colocou o
engenheiro A antes do B — esta regra consegue, linha a linha.

### O aviso do item 10.2

Onde há percentual, há o aviso de que a correspondência é apenas indicativa e de
que cabe às partes verificar habilitação, atribuições, regularidade e contrato.
O ProLink não contrata, não intermedia e não ranqueia pessoas.

## Perfil administrador (RF06)

O Anexo I lista quatro perfis, e o quarto é o Crea-AM operando a plataforma.
Cinco telas, em dois grupos na lateral:

**Administração** — Painel (indicadores e eventos recentes), Usuários (busca,
filtro por perfil e situação, bloqueio reversível) e Denúncias (fila com
protocolo, prazo e as três decisões: manter, remover ou bloquear).

**Governança** — Trilha de auditoria.

A declaração de uso de IA exigida pelo item 12.3 fica na tela da Miranda, aberta
a qualquer usuário — não escondida numa área administrativa.

### Por que a trilha é só leitura

A trilha aparece três vezes no edital: itens 11.1 (responsabilização), 11.3
(registros de auditoria) e 8.5 (g). E é um dos cenários mínimos de demonstração
do Anexo I, item 7.

A tela não tem botão de editar nem de apagar, de propósito: registro de auditoria
que pode ser alterado não serve para nada. Os IPs aparecem mascarados — consultar
não exige ver o dado inteiro, e isso é a minimização do item 11.1. O valor
completo fica no banco, sob requisição formal.

### A denúncia tem origem

A fila não funciona sem alguém para alimentá-la. O botão *Denunciar* está no
perfil profissional e nos cartões de profissional da busca da empresa; abre uma
caixa com motivo, relato e devolve protocolo. Fecha o cenário mínimo "usuário
corrige ou restringe dados e registra denúncia".

### Integrações sem chave na tela

A tela mostra o **nome da variável de ambiente**, nunca o valor: `CREA_API_TOKEN`,
`SMTP_HOST`, `IA_API_KEY`. Chave em tela é chave vazada, e o item 8.3.1 (j) manda
guardá-las fora do código.

É também onde mora a **declaração de uso de IA** exigida pelo item 12.3: qual
provedor, para quê, quem supervisiona e — o mais importante — que a assistente
explica mas **não decide**. Ela não ordena profissionais nem calcula
compatibilidade; isso é regra determinística e auditável.

## Contas da apresentação

Daniel e Eduardo (profissionais), DW Engenharia (empresa) e o suporte administrativo — veja **Contas da apresentação e base de dados**. As demais contas nascem no cadastro.

## Privacidade e dados (RF01 e item 11.3)

A tela onde o titular controla o que a plataforma mostra. Cobre o que o edital
pede em quatro lugares: o RF01 (gerenciamento de consentimentos), o item 11.3
(consentimento, correção, portabilidade, descarte e revogação), o item 3.2
(participação voluntária) e o cenário mínimo "usuário corrige ou restringe dados".

Cinco blocos: visibilidade campo a campo, consentimentos com data, o que se
corrige aqui e o que só muda no Crea, download dos dados em JSON e encerramento
de conta com exclusão lógica.

### Restringir muda a nota — e isso é proposital

Desligar *acervo técnico* ou *avaliações* derruba a compatibilidade na hora, e o
painel lateral mostra o novo número antes de a pessoa sair da tela. Na conta do
Daniel, a média cai de 76% para 56% sem o acervo, e para 42% sem os dois.

A razão é simples: **se um dado não pode ser mostrado, ele também não pode pesar
a favor de quem o escondeu**. Continuar pontuando com informação restrita seria
usar o dado pelas costas do titular — exatamente o oposto do que o item 11.1 pede.

O efeito é real, não decorativo: `compatibilidade()` no `demandas.js` lê a
configuração de privacidade antes de calcular, então a tela da oportunidade e a
fila da empresa já veem o número reduzido.

### Revogar tem consequência declarada

Revogar o uso dos dados do Crea pede confirmação e desliga o acervo junto —
porque o acervo vem de lá. E o texto diz o que **não** acontece: candidaturas já
enviadas continuam com as empresas que as receberam. Revogação vale daqui para
frente, não apaga o passado.

### Descarte

O encerramento lista, antes de confirmar, o que acontece com cada coisa: perfil
sai das buscas, candidaturas enviadas permanecem, registro recebe exclusão lógica
recuperável por 30 dias, trilha de auditoria preservada por obrigação legal — e o
registro no Crea não é afetado, porque isto aqui é o ProLink, não o Conselho.

## Perfil Terceiros: quem contrata sem registro

O Anexo I lista quatro perfis, e um deles é a pessoa física ou jurídica **sem
registro no Crea** que quer contratar serviço técnico: *"criar perfil; publicar
demandas; pesquisar profissionais; verificar informações; registrar interesse"*.

Isso não é detalhe. Só quem **presta** serviço técnico é obrigado a ter registro.
Quem **contrata** muitas vezes não tem: um condomínio que precisa de laudo
estrutural, uma loja que quer projeto elétrico, uma prefeitura pequena. Sem esse
perfil, o profissional verificado entra num mural alimentado só por empresas de
engenharia, e metade da demanda real fica de fora.

### Onde entra no cadastro

Quando a consulta ao Crea não encontra o documento, a tela de dados oferece dois
caminhos, lado a lado: *ofertar serviço técnico* (tenho registro, vou declarar) e
*contratar serviço técnico* (não tenho registro). Escolher o segundo troca o
formulário — nome ou razão social, cidade, telefone e e-mail, sem RNP, sem título
profissional — e **remove a etapa de experiência do caminho**, porque currículo e
acervo são de quem executa a obra.

### A distinção fica visível

O Anexo I pede, com estas palavras, "preservando a distinção entre usuários
registrados e não registrados". No ProLink isso aparece em três lugares:

- a conta nasce com `verificado: false` e sem selo;
- uma faixa fixa no topo das telas internas diz que é conta de contratante sem
  registro, e o que isso limita;
- o menu lateral troca *Minha empresa* por *Minha conta* e *Perfil da empresa*
  por *Meu perfil* — ele usa as telas de quem contrata, mas não é empresa
  registrada.

### A assimetria é deliberada

Sem registro não há verificação de posse possível: um contratante pode se
cadastrar com nome inventado. A mitigação é dar-lhe menos poder na plataforma —
não recebe selo, não aparece nas buscas de profissionais — e deixar o controle
por conta da denúncia, que tem fila, decisão registrada e trilha de auditoria.
Isso é escolha de projeto, não esquecimento.

## Modo visitante

Conta é para quem tem registro no Crea — é o que o edital valoriza. Quem não tem
entra como visitante pelo botão da página inicial: navega, vê oportunidades e
perfis, mas não publica demanda, não envia proposta e não conversa. Nenhum CPF
fica atrelado a essa sessão.

Uma faixa fixa no topo de todas as telas do app lembra o limite e oferece o
caminho para criar conta. Ela é inserida por JS a partir da sessão salva, então
não precisa existir no HTML de cada página.

## Sem base própria e sem credencial no código

O arquivo de dados fictícios do Crea foi **removido**: o Anexo I, item 8.4, veda
criar base própria para simular os dados da API oficial, e um fixture isolado
continua sendo exatamente isso. Sem `CREA_API_BASE` e `CREA_API_TOKEN`
preenchidos, a consulta responde que não está disponível e o cadastro segue pelo
caminho de dados declarados, sem selo — que é a limitação honesta.

Também saíram do projeto: o arquivo com a chave de API e os documentos reais. O
que restou são valores claramente fictícios (`000.000.000-00`), conforme os itens
11.2 e 13.6 (c), e o checklist do Anexo VI.

Credencial agora mora só no `.ENV`, que não vai para o repositório. O que se
entrega é o `.ENV.example`, sem valor nenhum.

## Back-end: `backend/`

O protótipo estático virou também uma aplicação executável. Sobe com dois
comandos:

```bash
cp backend/.ENV.example backend/.ENV
cd backend && docker compose up --build
```

O banco é criado e populado sozinho na primeira subida, pelo `_arq/estrutura.sql`.
A carga inicial traz só perfis de acesso e áreas de atuação — nenhum usuário,
porque entregar sistema com senha padrão publicada é vulnerabilidade, não
conveniência.

### O que atende ao Anexo I

| Exigência | Onde está |
|---|---|
| Arquitetura MVC com camadas separadas | `backend/app/` |
| Padrão Repository | `backend/app/core/repositorio.js` |
| MariaDB 10.11, utf8mb4 | `backend/docker-compose.yml` |
| Configuração central e `.ENV.example` | `backend/config.js` |
| Pasta `_arq/` com SQL, MER, README, arquitetura e licenças | `backend/_arq/` |
| Docker para execução reproduzível | `Dockerfile` e `docker-compose.yml` |
| Hash de senha, CSRF, XSS, SQL Injection, perfis, auditoria | `backend/app/core/` |
| Nomenclatura `sis_`, `pro_`, `aud_` e exclusão lógica | `backend/_arq/estrutura.sql` |
| Template engine sem regra de negócio no HTML | `backend/app/core/template.js` |

São 18 tabelas, 27 chaves estrangeiras, 25 índices e exclusão lógica em todas.

### A divergência que precisa ser declarada

O item 8.1.1 pede **PHP 8.2**. Esta implementação usa **Node.js 20**. É uma
divergência real do Termo Técnico, e o critério *Viabilidade técnica* mede
justamente fidelidade a ele — então isso custa ponto.

O que foi preservado, item por item:

| Exigido em PHP | Implementado em Node |
|---|---|
| `password_hash()` / `password_verify()` | `crypto.scryptSync`, sal por senha, comparação em tempo constante |
| PDO com prepared statements | `mysql2` com placeholders nomeados |
| Sessão do PHP | cookie assinado com HMAC-SHA256, `HttpOnly`, `SameSite=Lax` |
| Composer | npm |
| Template engine (Twig, Blade…) | mecanismo próprio, permitido pelo item 8.2 |

A decisão está registrada em `backend/_arq/arquitetura.md`, numa seção própria.
Divergência declarada e justificada pesa menos do que divergência descoberta pela
banca.

### Uma dependência só

Além do Node e do MariaDB, o projeto usa apenas `mysql2`. Servidor HTTP,
roteador, template, repositório e segurança usam módulos nativos. Nada que
envolve segredo passa por biblioteca de terceiro.

### O que já roda e o que falta

Rodam: autenticação com hash e rehash, sessão assinada, CSRF em todo POST,
controle de perfil por rota, trilha de auditoria, regra de compatibilidade
calculada e o cliente da API do Crea.

Falta: portar as 28 telas do front para views. Hoje são quatro views mostrando o
padrão. É trabalho mecânico, mas é trabalho.

## Documentos: ARTs e CATs não são anexadas

O Anexo I, item 8.4, prevê consulta de **ART por RNP + número** e **CAT por RNP +
número**, e o RF03 manda validar por meio da API oficial. Então o fluxo é: o
profissional digita o número, o sistema consulta o Crea, e a confirmação entra
no acervo. O documento continua no Crea — o ProLink guarda só a confirmação.

Não há upload de ART nem de CAT, de propósito. Arquivo enviado por quem tem
interesse no resultado é declaração; número conferido na base é comprovação. É
essa diferença que sustenta o selo, e o item 10.3 ainda lembra que a solução não
pode substituir nem recriar documento oficial.

Upload sobrou para a aba **Outros**: diploma, certificação, comprovante de
curso. Coisas que o Crea não emite e a API não consulta — aceitam anexo, mas não
recebem selo de verificado.

## Sessão

Entra-se com uma das contas da apresentação ou com uma conta criada no cadastro. Os perfis são inventados para a apresentação: o item 11.2 do edital proíbe dados pessoais reais de terceiros.

A conta fica em `dados/usuarios.csv`; o navegador guarda só o id da sessão. Ela alimenta o
nome, as iniciais, o registro e o RNP em todas as telas — inclusive o campo RNP
dos formulários de validação de ART e CAT. O botão **Sair** fica na barra
superior, à direita do nome, e só aparece quando há sessão ativa.

O login procura o e-mail em `dados/usuarios.csv` e registra a entrada na trilha
de auditoria. Conta bloqueada não entra; conta encerrada é reativada.

## Integração com a API do Crea-AM

Toda a conversa com a API fica em `app/models/crea-api.js`. O resto do sistema
não sabe como a consulta é feita — chama `ProLinkCrea.localizar()`,
`consultar()`, `listarAcervo()`, `quadroTecnico()` ou `acervoOperacional()` e
recebe o resultado.

O token fica em `chave_api_crea.txt`, na raiz, lido com `fetch` como a chave da
Miranda. Sem o arquivo, a consulta responde que está indisponível e o cadastro
segue sem o selo. Nenhum dado de profissional ou empresa é inventado — o item
8.4 do edital veda criar base própria para simular a API oficial.

| Uso no ProLink | Rota |
|---|---|
| Profissional por CPF | `?p=profissionais&cpf=` |
| Profissional por RNP | `?p=profissionais` (a documentação não tem busca por RNP; a lista é conferida pelo `pro_rnp`) |
| Empresa por CNPJ | `?p=empresas&cnpj=` |
| Empresa por registro | `?p=empresas` (conferida pelo `emp_registro_crea`) |
| ARTs e CATs do profissional | `?p=profissionais/{rnp}/arts` e `/cats` |
| Quadro técnico e CAO | `?p=empresas/{registro}/quadro-tecnico` e `/cao` |
| Conferência de ART e CAT no portfólio | `?p=arts&rnp=&art_numero=` e `?p=cats&rnp=&cat_numero=` |

O MER e os exemplos da documentação divergem em dois pontos — quadro técnico
(`qut_*` no MER, `eqt_*` no exemplo) e CAO (`arts` no MER, `cao_arts` no
exemplo). O `crea-api.js` aceita os dois formatos.

**Atenção para a versão final:** em produção, token e chaves não podem viver no
JavaScript do navegador. O item 8.3.1 do edital manda guardá-los em `.ENV` e o
8.1.1 pede PHP 8.2 com MVC — ou seja, a chamada à API precisa sair do
front-end e virar um endpoint do back-end.

### Contas criadas no cadastro

O botão **Criar conta** grava uma linha nova em `dados/usuarios.csv`, com os dados
do Crea ou os declarados, e registra o cadastro na trilha de auditoria. E-mail já
usado por outra conta é recusado. A nova conta já entra logada.

### Editar perfil

Em `perfil.html`, o botão **Editar perfil** abre um modal para alterar nome,
título profissional, cidade/estado e o texto "Sobre". Ao salvar, os dados são
gravados em `dados/usuarios.csv` e a tela é
atualizada na hora, sem recarregar a página.

## Miranda — assistente virtual

`miranda.html` é um bate-papo com IA, no mesmo esquema do aplicativo BiblIA:
o navegador fala direto com a API do Gemini (Google), sem PHP, sem back-end e
sem biblioteca externa.

Ela responde sobre duas coisas: como usar o ProLink e dúvidas de engenharia e
do Sistema Confea/Crea (ART, CAT, acervo técnico, registro, anuidade).

### Os dois arquivos que você edita

| Arquivo | Para quê |
|---|---|
| (sem arquivo) | A chave da API é digitada na tela inicial com Ctrl + Espaço e vale só enquanto o site estiver aberto. |
| `manual-prolink.txt` | O que a Miranda sabe sobre o sistema. É enviado junto de cada pergunta. |

Nenhum dos dois é código. Para ensinar algo novo à Miranda — uma tela nova, uma
regra que mudou, uma pergunta frequente — escreva no manual e pronto. Ela é
instruída a responder "não consta no manual" em vez de inventar tela, botão,
prazo ou número que não esteja lá.

O modelo usado fica na constante `MODELO_GEMINI`, no topo de
`app/controllers/miranda.js`.

### Tour guiado: a Miranda apresenta cada área

Isso é separado da conversa e **não usa a API**: são textos fixos em
`app/controllers/miranda-guia.js`, que funcionam sem internet e sem chave.

Ela escurece a tela, **ilumina só a área da vez** e fala ao lado dela. A cada
passo o recorte se move para a próxima parte: o menu, o banner, os indicadores,
o cartão de análise. Quem está aprendendo olha uma coisa por vez, e não a tela
inteira de uma vez.

São 57 passos escritos, em 30 telas.

### Como um passo é descrito

```js
{
  alvo: ".grade-4",              // seletor da área a iluminar
  titulo: "Seus números",
  texto: "O resumo da sua situação…",
  pontos: ["…", "…"]             // opcional, aparecem depois da fala
}
```

Sem `alvo`, o passo aparece no centro com a Miranda inteira — é o formato das
aberturas e das explicações conceituais, que não dependem de olhar um canto
específico da tela.

### O escurecimento

Um elemento só, com `box-shadow: 0 0 0 9999px`. A sombra gigante escurece tudo
em volta e o interior do elemento fica limpo — sem máscara, sem canvas, sem
recortar imagem. Uma camada transparente por baixo engole cliques, para ninguém
navegar sem querer no meio de uma explicação.

### O balão acha o próprio lugar

`posicionarBalao()` testa oito posições — os quatro lados e os quatro cantos — e
fica com a primeira que cabe inteira na tela **e não toca a área iluminada**. Se
nenhuma servir, porque o destaque ocupa quase tudo, escolhe a de menor
sobreposição: melhor cobrir um pedaço do que sair da tela.

Ele se reposiciona quando a digitação termina e o balão cresce, quando a janela
muda de tamanho e quando a página rola. Área fora da vista é trazida para o
centro antes de ser medida.

Os 57 passos foram verificados um a um: nenhum balão cobre o próprio destaque e
nenhum fica fora da tela.

### Digitação letra a letra

O texto é escrito com cursor piscando, a 2 caracteres por tique de 14 ms. Clicar
em qualquer lugar do balão completa na hora — a animação não pode virar espera.
Com `prefers-reduced-motion`, o texto aparece inteiro.

### Onde o tour não aparece

Página inicial, entrar e criar conta ficaram de fora, e o botão flutuante da
Miranda também. Quem está nessas telas tem uma tarefa curta e clara na frente:
criar conta, entrar, olhar a proposta. Um tour ali interrompe em vez de ajudar.

O tour existe onde a pessoa já entrou e precisa entender um sistema.

### Quando aparece

Na primeira visita a cada tela interna, e de novo para quem entra como visitante: a
memória fica em `prolink_miranda_vistas_conta` e
`prolink_miranda_vistas_visitante`, separadas, então um tour não consome o outro.
O visitante ganha um primeiro passo próprio, dizendo o que pode e o que não pode.

Setas do teclado navegam entre os passos, Esc fecha, e o botão com o rosto dela
reabre o tour do começo a qualquer momento.

## A conversa com IA e os modelos

A Miranda conversacional usa a API do Gemini, com uma **lista de modelos**, não
um só:

```js
var MODELOS_GEMINI = [
  "gemini-3.5-flash-lite",   // mais recente da linha Lite, alto volume
  "gemini-3.1-flash-lite",   // o anterior, ainda estável
  "gemini-3-flash-preview"   // tem camada gratuita na API do Gemini
];
```

Quando um modelo responde **429** (cota ou fila) ou **503** (sobrecarregado), a
Miranda insiste duas vezes, com quase um segundo de intervalo, e só então passa
para o próximo da lista. Se todos falharem, ela avisa que os modelos estão
congestionados em vez de mostrar erro técnico.

A razão é de demonstração, não de engenharia: num pitch ao vivo, dez segundos de
pico no provedor não podem derrubar a assistente na frente da banca.

Também saíram os parâmetros `temperature`, `top_p` e `top_k`, que foram
descontinuados na API do Gemini.

O **tour guiado não depende disso**: é texto fixo e funciona offline. Mesmo com a
API fora do ar, a Miranda continua apresentando as telas — o que cai é só a
conversa livre.

## Acessibilidade (item 12.1)

As abas que não controlam painel deixaram de usar `role="tab"`: viraram botões
de filtro com `aria-pressed`. Uma aba anunciada por leitor de tela que não leva
a painel nenhum é armadilha, não recurso.

A barra lateral e a superior ganharam `aria-label`, e a navegação pública
declara sua função. Somados ao que já existia — link de pular para o conteúdo,
foco visível, rótulo em todo campo, contraste conferido e `prefers-reduced-motion`
respeitado —, cobrem os requisitos básicos do item 12.1.

## Os dois lados da plataforma

O ProLink tem duas faces, e o mesmo esqueleto serve as duas: mesma barra
lateral, mesma topbar, mesmos componentes. Quem conhece um lado não precisa
reaprender o outro — o que muda é a navegação e o trabalho a fazer.

| | Profissional | Empresa |
|---|---|---|
| Grupo 1 | **Trabalho**: Início, Meu portfólio, Mensagens | **Contratação**: Início, Minhas demandas, Buscar profissionais, Mensagens |
| Grupo 2 | **Minha carreira**: Meu perfil, Avaliações | **Minha empresa**: Perfil da empresa, Avaliações |
| O que faz | Mantém acervo, recebe demanda compatível | Publica demanda, lê candidatura, escolhe quem contratar |

`shell()` recebe `lado="empresa"` e troca as duas listas de navegação, os títulos
dos grupos, o destino da logo e o cartão do rodapé da lateral. Nenhuma tela do
lado profissional foi duplicada à toa: mensagens e avaliações são a mesma função,
chamada com o outro lado.

### O argumento que só aparece deste lado

A verificação do Crea é vendida ao profissional como selo. Para a empresa, ela é
outra coisa: **candidatura que chega com o registro já conferido**. Ninguém pede
documento, ninguém confere número, ninguém descobre depois que o registro estava
suspenso. Por isso o cartão de profissional traz o selo verde em destaque e a
busca tem um filtro de *acervo comprovado* — é o filtro mais forte da tela, o que
separa quem já fez daquilo de quem diz que faz.

O cartão de Rafael Souza, na busca, aparece de propósito com "Registro não
verificado" em âmbar: mostra que a plataforma não esconde quem não está regular,
só deixa claro quem é quem.

## Os dois lados, conectados (RF05)

Esta é a parte que faz o sistema ser um sistema, e não dois painéis que não se
falam. O ciclo completo funciona:

1. O profissional abre a demanda em `oportunidade.html` e vê **por que** combina.
2. Manifesta interesse, escolhendo quais ARTs e CATs anexar.
3. A candidatura aparece na fila da empresa em `empresa-candidaturas.html`.
4. A empresa abre `profissional.html` — e a etiqueta do profissional muda de
   *Interesse enviado* para *Perfil visualizado*.

É o cenário mínimo do Anexo I, item 7: "profissional manifesta interesse e a
empresa visualiza o perfil".

### Onde isso fica guardado

Em `dados/candidaturas.csv`. As colunas já estão nomeadas pensando na migração:
vira a tabela `pro_candidaturas`, com chave estrangeira para a demanda e para o
usuário.

### A compatibilidade é calculada

O item 12.3 exige critérios de recomendação explicáveis. O percentual sai de uma
regra fixa, em `app/models/demandas.js`, com pesos declarados que somam 100:

| Critério | Peso | O que mede |
|---|---|---|
| Área de atuação | 40 | Tem atribuição na área que a obra exige |
| Acervo confirmado no Crea | 30 | ARTs e CATs naquela área, ponto cheio a partir de 3 |
| Localização | 15 | Atende a cidade da obra; 60% se atende o estado |
| Avaliações recebidas | 15 | Média de contratos registrados na plataforma |

Nenhum critério usa raça, gênero, idade, origem ou condição social — item 12.2.
E a conta é aberta nas duas pontas: o profissional vê o detalhamento antes de se
candidatar, a empresa vê no cartão da candidatura.

Isso também separa as duas IAs do projeto: a Miranda **explica**, a regra
**ordena**. Um modelo de linguagem não conseguiria justificar por que colocou o
engenheiro A antes do B — esta regra consegue, linha a linha.

### O aviso do item 10.2

Onde há percentual, há o aviso de que a correspondência é apenas indicativa e de
que cabe às partes verificar habilitação, atribuições, regularidade e contrato.
O ProLink não contrata, não intermedia e não ranqueia pessoas.

## Perfil administrador (RF06)

O Anexo I lista quatro perfis, e o quarto é o Crea-AM operando a plataforma.
Cinco telas, em dois grupos na lateral:

**Administração** — Painel (indicadores e eventos recentes), Usuários (busca,
filtro por perfil e situação, bloqueio reversível) e Denúncias (fila com
protocolo, prazo e as três decisões: manter, remover ou bloquear).

**Governança** — Trilha de auditoria.

A declaração de uso de IA exigida pelo item 12.3 fica na tela da Miranda, aberta
a qualquer usuário — não escondida numa área administrativa.

### Por que a trilha é só leitura

A trilha aparece três vezes no edital: itens 11.1 (responsabilização), 11.3
(registros de auditoria) e 8.5 (g). E é um dos cenários mínimos de demonstração
do Anexo I, item 7.

A tela não tem botão de editar nem de apagar, de propósito: registro de auditoria
que pode ser alterado não serve para nada. Os IPs aparecem mascarados — consultar
não exige ver o dado inteiro, e isso é a minimização do item 11.1. O valor
completo fica no banco, sob requisição formal.

### A denúncia tem origem

A fila não funciona sem alguém para alimentá-la. O botão *Denunciar* está no
perfil profissional e nos cartões de profissional da busca da empresa; abre uma
caixa com motivo, relato e devolve protocolo. Fecha o cenário mínimo "usuário
corrige ou restringe dados e registra denúncia".

### Integrações sem chave na tela

A tela mostra o **nome da variável de ambiente**, nunca o valor: `CREA_API_TOKEN`,
`SMTP_HOST`, `IA_API_KEY`. Chave em tela é chave vazada, e o item 8.3.1 (j) manda
guardá-las fora do código.

É também onde mora a **declaração de uso de IA** exigida pelo item 12.3: qual
provedor, para quê, quem supervisiona e — o mais importante — que a assistente
explica mas **não decide**. Ela não ordena profissionais nem calcula
compatibilidade; isso é regra determinística e auditável.

## Contas da apresentação

Daniel e Eduardo (profissionais), DW Engenharia (empresa) e o suporte administrativo — veja **Contas da apresentação e base de dados**. As demais contas nascem no cadastro.

## Privacidade e dados (RF01 e item 11.3)

A tela onde o titular controla o que a plataforma mostra. Cobre o que o edital
pede em quatro lugares: o RF01 (gerenciamento de consentimentos), o item 11.3
(consentimento, correção, portabilidade, descarte e revogação), o item 3.2
(participação voluntária) e o cenário mínimo "usuário corrige ou restringe dados".

Cinco blocos: visibilidade campo a campo, consentimentos com data, o que se
corrige aqui e o que só muda no Crea, download dos dados em JSON e encerramento
de conta com exclusão lógica.

### Restringir muda a nota — e isso é proposital

Desligar *acervo técnico* ou *avaliações* derruba a compatibilidade na hora, e o
painel lateral mostra o novo número antes de a pessoa sair da tela. Na conta do
Daniel, a média cai de 76% para 56% sem o acervo, e para 42% sem os dois.

A razão é simples: **se um dado não pode ser mostrado, ele também não pode pesar
a favor de quem o escondeu**. Continuar pontuando com informação restrita seria
usar o dado pelas costas do titular — exatamente o oposto do que o item 11.1 pede.

O efeito é real, não decorativo: `compatibilidade()` no `demandas.js` lê a
configuração de privacidade antes de calcular, então a tela da oportunidade e a
fila da empresa já veem o número reduzido.

### Revogar tem consequência declarada

Revogar o uso dos dados do Crea pede confirmação e desliga o acervo junto —
porque o acervo vem de lá. E o texto diz o que **não** acontece: candidaturas já
enviadas continuam com as empresas que as receberam. Revogação vale daqui para
frente, não apaga o passado.

### Descarte

O encerramento lista, antes de confirmar, o que acontece com cada coisa: perfil
sai das buscas, candidaturas enviadas permanecem, registro recebe exclusão lógica
recuperável por 30 dias, trilha de auditoria preservada por obrigação legal — e o
registro no Crea não é afetado, porque isto aqui é o ProLink, não o Conselho.

## Perfil Terceiros: quem contrata sem registro

O Anexo I lista quatro perfis, e um deles é a pessoa física ou jurídica **sem
registro no Crea** que quer contratar serviço técnico: *"criar perfil; publicar
demandas; pesquisar profissionais; verificar informações; registrar interesse"*.

Isso não é detalhe. Só quem **presta** serviço técnico é obrigado a ter registro.
Quem **contrata** muitas vezes não tem: um condomínio que precisa de laudo
estrutural, uma loja que quer projeto elétrico, uma prefeitura pequena. Sem esse
perfil, o profissional verificado entra num mural alimentado só por empresas de
engenharia, e metade da demanda real fica de fora.

### Onde entra no cadastro

Quando a consulta ao Crea não encontra o documento, a tela de dados oferece dois
caminhos, lado a lado: *ofertar serviço técnico* (tenho registro, vou declarar) e
*contratar serviço técnico* (não tenho registro). Escolher o segundo troca o
formulário — nome ou razão social, cidade, telefone e e-mail, sem RNP, sem título
profissional — e **remove a etapa de experiência do caminho**, porque currículo e
acervo são de quem executa a obra.

### A distinção fica visível

O Anexo I pede, com estas palavras, "preservando a distinção entre usuários
registrados e não registrados". No ProLink isso aparece em três lugares:

- a conta nasce com `verificado: false` e sem selo;
- uma faixa fixa no topo das telas internas diz que é conta de contratante sem
  registro, e o que isso limita;
- o menu lateral troca *Minha empresa* por *Minha conta* e *Perfil da empresa*
  por *Meu perfil* — ele usa as telas de quem contrata, mas não é empresa
  registrada.

### A assimetria é deliberada

Sem registro não há verificação de posse possível: um contratante pode se
cadastrar com nome inventado. A mitigação é dar-lhe menos poder na plataforma —
não recebe selo, não aparece nas buscas de profissionais — e deixar o controle
por conta da denúncia, que tem fila, decisão registrada e trilha de auditoria.
Isso é escolha de projeto, não esquecimento.

## Modo visitante

Conta é para quem tem registro no Crea — é o que o edital valoriza. Quem não tem
entra como visitante pelo botão da página inicial: navega, vê oportunidades e
perfis, mas não publica demanda, não envia proposta e não conversa. Nenhum CPF
fica atrelado a essa sessão.

Uma faixa fixa no topo de todas as telas do app lembra o limite e oferece o
caminho para criar conta. Ela é inserida por JS a partir da sessão salva, então
não precisa existir no HTML de cada página.

## Sem base própria e sem credencial no código

O arquivo de dados fictícios do Crea foi **removido**: o Anexo I, item 8.4, veda
criar base própria para simular os dados da API oficial, e um fixture isolado
continua sendo exatamente isso. Sem `CREA_API_BASE` e `CREA_API_TOKEN`
preenchidos, a consulta responde que não está disponível e o cadastro segue pelo
caminho de dados declarados, sem selo — que é a limitação honesta.

Também saíram do projeto: o arquivo com a chave de API e os documentos reais. O
que restou são valores claramente fictícios (`000.000.000-00`), conforme os itens
11.2 e 13.6 (c), e o checklist do Anexo VI.

Credencial agora mora só no `.ENV`, que não vai para o repositório. O que se
entrega é o `.ENV.example`, sem valor nenhum.

## Back-end: `backend/`

O protótipo estático virou também uma aplicação executável. Sobe com dois
comandos:

```bash
cp backend/.ENV.example backend/.ENV
cd backend && docker compose up --build
```

O banco é criado e populado sozinho na primeira subida, pelo `_arq/estrutura.sql`.
A carga inicial traz só perfis de acesso e áreas de atuação — nenhum usuário,
porque entregar sistema com senha padrão publicada é vulnerabilidade, não
conveniência.

### O que atende ao Anexo I

| Exigência | Onde está |
|---|---|
| Arquitetura MVC com camadas separadas | `backend/app/` |
| Padrão Repository | `backend/app/core/repositorio.js` |
| MariaDB 10.11, utf8mb4 | `backend/docker-compose.yml` |
| Configuração central e `.ENV.example` | `backend/config.js` |
| Pasta `_arq/` com SQL, MER, README, arquitetura e licenças | `backend/_arq/` |
| Docker para execução reproduzível | `Dockerfile` e `docker-compose.yml` |
| Hash de senha, CSRF, XSS, SQL Injection, perfis, auditoria | `backend/app/core/` |
| Nomenclatura `sis_`, `pro_`, `aud_` e exclusão lógica | `backend/_arq/estrutura.sql` |
| Template engine sem regra de negócio no HTML | `backend/app/core/template.js` |

São 18 tabelas, 27 chaves estrangeiras, 25 índices e exclusão lógica em todas.

### A divergência que precisa ser declarada

O item 8.1.1 pede **PHP 8.2**. Esta implementação usa **Node.js 20**. É uma
divergência real do Termo Técnico, e o critério *Viabilidade técnica* mede
justamente fidelidade a ele — então isso custa ponto.

O que foi preservado, item por item:

| Exigido em PHP | Implementado em Node |
|---|---|
| `password_hash()` / `password_verify()` | `crypto.scryptSync`, sal por senha, comparação em tempo constante |
| PDO com prepared statements | `mysql2` com placeholders nomeados |
| Sessão do PHP | cookie assinado com HMAC-SHA256, `HttpOnly`, `SameSite=Lax` |
| Composer | npm |
| Template engine (Twig, Blade…) | mecanismo próprio, permitido pelo item 8.2 |

A decisão está registrada em `backend/_arq/arquitetura.md`, numa seção própria.
Divergência declarada e justificada pesa menos do que divergência descoberta pela
banca.

### Uma dependência só

Além do Node e do MariaDB, o projeto usa apenas `mysql2`. Servidor HTTP,
roteador, template, repositório e segurança usam módulos nativos. Nada que
envolve segredo passa por biblioteca de terceiro.

### O que já roda e o que falta

Rodam: autenticação com hash e rehash, sessão assinada, CSRF em todo POST,
controle de perfil por rota, trilha de auditoria, regra de compatibilidade
calculada e o cliente da API do Crea.

Falta: portar as 28 telas do front para views. Hoje são quatro views mostrando o
padrão. É trabalho mecânico, mas é trabalho.

## Documentos: ARTs e CATs não são anexadas

O Anexo I, item 8.4, prevê consulta de **ART por RNP + número** e **CAT por RNP +
número**, e o RF03 manda validar por meio da API oficial. Então o fluxo é: o
profissional digita o número, o sistema consulta o Crea, e a confirmação entra
no acervo. O documento continua no Crea — o ProLink guarda só a confirmação.

Não há upload de ART nem de CAT, de propósito. Arquivo enviado por quem tem
interesse no resultado é declaração; número conferido na base é comprovação. É
essa diferença que sustenta o selo, e o item 10.3 ainda lembra que a solução não
pode substituir nem recriar documento oficial.

Upload sobrou para a aba **Outros**: diploma, certificação, comprovante de
curso. Coisas que o Crea não emite e a API não consulta — aceitam anexo, mas não
recebem selo de verificado.

## Sessão

Entra-se com uma das contas da apresentação ou com uma conta criada no cadastro. Os perfis são inventados para a apresentação: o item 11.2 do edital proíbe dados pessoais reais de terceiros.

A conta fica em `dados/usuarios.csv`; o navegador guarda só o id da sessão. Ela alimenta o
nome, as iniciais, o registro e o RNP em todas as telas — inclusive o campo RNP
dos formulários de validação de ART e CAT. O botão **Sair** fica na barra
superior, à direita do nome, e só aparece quando há sessão ativa.

O login procura o e-mail em `dados/usuarios.csv` e registra a entrada na trilha
de auditoria. Conta bloqueada não entra; conta encerrada é reativada.

## Integração com a API do Crea-AM

Toda a conversa com a API fica em `app/models/crea-api.js`. O resto do sistema
não sabe como a consulta é feita — chama `ProLinkCrea.localizar()`,
`consultar()`, `listarAcervo()`, `quadroTecnico()` ou `acervoOperacional()` e
recebe o resultado.

O token fica em `chave_api_crea.txt`, na raiz, lido com `fetch` como a chave da
Miranda. Sem o arquivo, a consulta responde que está indisponível e o cadastro
segue sem o selo. Nenhum dado de profissional ou empresa é inventado — o item
8.4 do edital veda criar base própria para simular a API oficial.

| Uso no ProLink | Rota |
|---|---|
| Profissional por CPF | `?p=profissionais&cpf=` |
| Profissional por RNP | `?p=profissionais` (a documentação não tem busca por RNP; a lista é conferida pelo `pro_rnp`) |
| Empresa por CNPJ | `?p=empresas&cnpj=` |
| Empresa por registro | `?p=empresas` (conferida pelo `emp_registro_crea`) |
| ARTs e CATs do profissional | `?p=profissionais/{rnp}/arts` e `/cats` |
| Quadro técnico e CAO | `?p=empresas/{registro}/quadro-tecnico` e `/cao` |
| Conferência de ART e CAT no portfólio | `?p=arts&rnp=&art_numero=` e `?p=cats&rnp=&cat_numero=` |

O MER e os exemplos da documentação divergem em dois pontos — quadro técnico
(`qut_*` no MER, `eqt_*` no exemplo) e CAO (`arts` no MER, `cao_arts` no
exemplo). O `crea-api.js` aceita os dois formatos.

**Atenção para a versão final:** em produção, token e chaves não podem viver no
JavaScript do navegador. O item 8.3.1 do edital manda guardá-los em `.ENV` e o
8.1.1 pede PHP 8.2 com MVC — ou seja, a chamada à API precisa sair do
front-end e virar um endpoint do back-end.

### Contas criadas no cadastro

O botão **Criar conta** grava uma linha nova em `dados/usuarios.csv`, com os dados
do Crea ou os declarados, e registra o cadastro na trilha de auditoria. E-mail já
usado por outra conta é recusado. A nova conta já entra logada.

### Editar perfil

Em `perfil.html`, o botão **Editar perfil** abre um modal para alterar nome,
título profissional, cidade/estado e o texto "Sobre". Ao salvar, os dados são
gravados em `dados/usuarios.csv` e a tela é
atualizada na hora, sem recarregar a página.

## Miranda — assistente virtual

`miranda.html` é um bate-papo com IA, no mesmo esquema do aplicativo BiblIA:
o navegador fala direto com a API do Gemini (Google), sem PHP, sem back-end e
sem biblioteca externa.

Ela responde sobre duas coisas: como usar o ProLink e dúvidas de engenharia e
do Sistema Confea/Crea (ART, CAT, acervo técnico, registro, anuidade).

### Os dois arquivos que você edita

| Arquivo | Para quê |
|---|---|
| (sem arquivo) | A chave da API é digitada na tela inicial com Ctrl + Espaço e vale só enquanto o site estiver aberto. |
| `manual-prolink.txt` | O que a Miranda sabe sobre o sistema. É enviado junto de cada pergunta. |

Nenhum dos dois é código. Para ensinar algo novo à Miranda — uma tela nova, uma
regra que mudou, uma pergunta frequente — escreva no manual e pronto. Ela é
instruída a responder "não consta no manual" em vez de inventar tela, botão,
prazo ou número que não esteja lá.

O modelo usado fica na constante `MODELO_GEMINI`, no topo de
`app/controllers/miranda.js`.

### Tutorial de tela: a Miranda te acompanha

Isso é separado da conversa e **não usa a API**: são textos fixos em
`app/controllers/miranda-guia.js`, então funcionam sem internet e sem chave.

Em vez de um balão único, cada tela tem um **roteiro de passos**, com Continuar,
Pular e bolinhas de progresso. Cada passo declara onde aparece:

| `posicao` | Quando | Como fica |
|---|---|---|
| `"centro"` | A mensagem é uma ideia — não adianta olhar a tela enquanto lê | Miranda grande no meio, fundo escurecido |
| `"canto"` | A mensagem manda olhar algo (os indicadores, os filtros, a coluna da direita) | Balão no canto inferior direito, sem escurecer nada |

Os roteiros alternam de propósito: ideia no centro, o que olhar no canto, ideia
seguinte no centro. A regra não é estética — uma caixa grande no meio da tela
enquanto a Miranda diz "repare nos quatro números do topo" esconderia justamente
os números.

**Digitação letra a letra.** O texto é escrito na tela com um cursor piscando,
a 2 caracteres por tique de 14 ms. Clicar em qualquer lugar da caixa completa o
texto na hora — ninguém precisa esperar a animação para ler. Com
`prefers-reduced-motion`, o texto aparece inteiro, sem animação.

**Quando aparece.** Na primeira visita a cada tela, e de novo para quem entra
como visitante: a memória fica em `prolink_miranda_vistas_conta` e
`prolink_miranda_vistas_visitante`, separadas, então um tour não consome o outro.
O visitante ainda ganha um primeiro passo próprio, que diz o que ele pode e o
que não pode antes de qualquer explicação de funcionalidade.

O botão redondo com o rosto dela fica no canto inferior direito de **todas** as
telas e reabre o tutorial do começo a qualquer momento — inclusive depois de
desligado na caixinha do último passo.

## A conversa com IA e os modelos

A Miranda conversacional usa a API do Gemini, com uma **lista de modelos**, não
um só:

```js
var MODELOS_GEMINI = [
  "gemini-3.5-flash-lite",   // mais recente da linha Lite, alto volume
  "gemini-3.1-flash-lite",   // o anterior, ainda estável
  "gemini-3-flash-preview"   // tem camada gratuita na API do Gemini
];
```

Quando um modelo responde **429** (cota ou fila) ou **503** (sobrecarregado), a
Miranda insiste duas vezes, com quase um segundo de intervalo, e só então passa
para o próximo da lista. Se todos falharem, ela avisa que os modelos estão
congestionados em vez de mostrar erro técnico.

A razão é de demonstração, não de engenharia: num pitch ao vivo, dez segundos de
pico no provedor não podem derrubar a assistente na frente da banca.

Também saíram os parâmetros `temperature`, `top_p` e `top_k`, que foram
descontinuados na API do Gemini.

O **tour guiado não depende disso**: é texto fixo e funciona offline. Mesmo com a
API fora do ar, a Miranda continua apresentando as telas — o que cai é só a
conversa livre.

## Acessibilidade

Contraste conferido, foco visível, link "pular para o conteúdo", `aria-current`
na navegação, rótulos em todos os campos e `prefers-reduced-motion` respeitado.
