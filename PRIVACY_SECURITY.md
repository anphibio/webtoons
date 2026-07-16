# PRIVACY_SECURITY.md

## Princípios

- processamento local por padrão;
- consentimento explícito para envio remoto;
- coleta mínima;
- retenção mínima;
- transparência;
- permissões mínimas;
- nenhum código remoto.

## Imagens

Quando um provedor remoto for usado:

- enviar somente recortes necessários;
- evitar imagem completa;
- remover metadados;
- não enviar cookies;
- não enviar URL completa quando não for necessária;
- usar HTTPS;
- aplicar timeout;
- permitir exclusão do cache.

## Credenciais

- armazenar com `chrome.storage.local`;
- nunca expor ao content script;
- nunca registrar em console;
- mascarar na interface;
- permitir remoção;
- não versionar.

## Mensagens internas

Toda mensagem deve:

- possuir tipo;
- ser validada;
- ter schema;
- rejeitar campos inesperados;
- limitar tamanho;
- validar origem.

## Backend

Quando existir:

- autenticação;
- rate limiting;
- CORS restrito;
- validação de payload;
- limites de tamanho;
- logs sem conteúdo sensível;
- segredo via variável de ambiente;
- atualização de dependências;
- containers sem root quando possível.

## Permissões

Evitar permissões amplas.

Permissões por host devem ser solicitadas sob demanda sempre que possível.

## Conteúdo remoto

A extensão não pode:

- executar scripts remotos;
- usar `eval`;
- carregar módulos remotos;
- injetar HTML não sanitizado;
- confiar em conteúdo retornado pelo modelo.

## Retenção

O cache deve possuir:

- validade configurável;
- limpeza manual;
- limite de tamanho;
- política LRU;
- opção de desativar.
