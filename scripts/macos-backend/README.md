# Backend automático no macOS

Os scripts desta pasta instalam o backend como um serviço do usuário usando
`launchd`. O serviço inicia automaticamente quando o usuário entra no macOS,
reinicia após uma falha e permanece vinculado a `127.0.0.1`.

## Instalação

Na raiz do projeto:

```bash
./scripts/macos-backend/install.sh
```

Na primeira execução, o script cria:

```text
~/Library/Application Support/WebtoonImageTranslator/backend.env
```

Edite esse arquivo e preencha `DEEPL_API_KEY`. Depois execute o instalador
novamente. O arquivo recebe permissão `600` e não fica dentro do repositório.

O serviço será registrado como:

```text
com.webtoon.image-translator.api
```

Os logs ficam em:

```text
~/Library/Application Support/WebtoonImageTranslator/logs/
```

## Remoção

```bash
./scripts/macos-backend/uninstall.sh
```

A remoção desliga somente o serviço. A configuração e os logs são preservados
para evitar perda acidental da chave e do diagnóstico.

## Segurança

- a chave não é copiada para a extensão;
- o backend continua aceitando somente conexões locais;
- cookies e tokens do navegador não são encaminhados;
- o arquivo de configuração fica fora do projeto e com permissão restrita.
