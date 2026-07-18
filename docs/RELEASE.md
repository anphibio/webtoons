# Pacote distribuível

## Gerar o pacote

Na raiz do projeto:

```bash
npm run build
mkdir -p releases
(cd dist && zip -q -r ../releases/webtoon-image-translator-v0.1.0-chrome.zip . -x '*.DS_Store')
```

O arquivo gerado contém somente o conteúdo compilado da extensão, com
`manifest.json` na raiz do ZIP. Não inclua
`.env`, chaves de API, a pasta `SiteTeste` ou a pasta `Treinamento` no pacote.

## Instalar no Chrome

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Para desenvolvimento, use **Carregar sem compactação** e selecione `dist/`.
4. Para arquivar ou compartilhar o build, mantenha o `.zip` em `releases/`.
5. Após um novo build, use **Atualizar** na extensão e recarregue a página do
   capítulo.

## Verificações antes de entregar

- `npm test -- --run`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- conferir que o pacote não contém credenciais;
- testar manualmente um capítulo real e uma página de `SiteTeste`.

O backend local continua sendo executado separadamente e nunca é incluído no
pacote da extensão.
