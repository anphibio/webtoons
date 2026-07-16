# CODE_STYLE.md

## TypeScript

- usar modo strict;
- evitar `any`;
- preferir tipos explícitos nas fronteiras;
- usar unions discriminadas para estados;
- validar dados externos;
- funções pequenas;
- nomes descritivos;
- evitar efeitos colaterais ocultos.

## Estrutura

- domínio separado da infraestrutura;
- interfaces em pacotes compartilhados;
- adaptadores independentes;
- UI sem lógica pesada;
- chamadas remotas fora do content script;
- workers para processamento intensivo.

## Erros

Criar erros tipados:

- `ImageAccessError`;
- `OcrError`;
- `TranslationError`;
- `OverlayError`;
- `PermissionError`;
- `ProviderTimeoutError`.

## Logs

Níveis:

- debug;
- info;
- warn;
- error.

Não registrar:

- chaves;
- conteúdo completo;
- cookies;
- tokens;
- imagens;
- dados pessoais.

## Commits

Padrão sugerido:

```text
feat:
fix:
refactor:
test:
docs:
chore:
perf:
security:
```

## Pull requests

Devem conter:

- objetivo;
- alterações;
- riscos;
- testes;
- screenshots quando houver UI;
- impacto em permissões;
- impacto em privacidade.
