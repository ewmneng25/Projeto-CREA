A versão a seguir difere da que foi enviada no site do projeto apenas na chave
de acesso à API do Gemini. O código, as telas e a base de dados são os
mesmos da entrega.

Até o momento da entrega, a integração com o Gemini funcionava
normalmente: a Miranda respondia às perguntas usando a chave que estava
em chave_api_gemini.txt, e o mesmo credencial era usado nos demais
projetos sem qualquer erro.

Hoje, sem alteração alguma no código, todas as requisições passaram a
ser recusadas com 401 UNAUTHENTICATED ("Request had invalid
authentication credentials. Expected OAuth 2 access token, login cookie
or other valid authentication credential"). A causa é externa ao
projeto: o Google descontinuou as chaves de tráfego (prefixo AIza) em
favor das novas chaves de autenticação (prefixo AQ), e parte dessas
chaves deixou de ser aceita pelo endpoint generativelanguage.googleapis.com,
que é o utilizado pela assistente.

Correção aplicada: geração de uma nova chave no Google AI Studio e
substituição do conteúdo de chave_api_gemini.txt, com o consequente
reempacotamento de app/core/arquivos-locais.js, que guarda a cópia dos
arquivos de texto lidos pelo sistema. Nenhuma linha de lógica foi
alterada para isso.

Observação para a banca avaliadora: a versão submetida continua íntegra
e correta; caso a chave nela registrada volte a ser recusada, basta
substituir o conteúdo de chave_api_gemini.txt por uma chave válida, sem
qualquer outra intervenção no projeto.

Segue o link da pasta do Google Drive que contém a versão do projeto que possui a assistente virtual com a API do Google Gemini funcionando integralmente: [https://drive.google.com/drive/folders/17pwXTjzIygtUbKh9XQoVkqMtISz2Kkbs?usp=sharing]
