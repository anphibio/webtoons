# ADR 0006 — Backend no QNAP e variante Safari para iPad

## Status

Aceita.

## Contexto

A extensão Chrome está estável e o usuário quer utilizar o mesmo fluxo no iPad sem manter o Mac ligado ou um terminal aberto. O Chrome para iPad não carrega extensões Chrome de desktop; o caminho suportado pela plataforma é uma Safari Web Extension empacotada e assinada como aplicativo iOS.

## Decisão

1. O backend FastAPI será empacotado em Docker para execução contínua no QNAP.
2. O container executará um único worker, terá reinício automático, healthcheck, limite de memória e volume persistente para modelos OCR.
3. Segredos serão fornecidos somente pelo `.env` do QNAP e nunca incorporados à imagem ou à extensão.
4. A variante iPad ficará em `apps/ipad-safari-extension`.
5. A variante será gerada a partir de uma cópia de `dist/`; não haverá fork do código-fonte da extensão Chrome.
6. A cópia removerá permissões para `localhost` e receberá a origem explícita do backend QNAP.
7. O empacotamento iOS será feito pelo Xcode com o utilitário oficial `safari-web-extension-packager`.

## Consequências

- O projeto Chrome permanece funcionalmente intocado.
- Correções futuras continuam sendo feitas em uma única base de código.
- O QNAP precisa permanecer ligado e acessível pelo iPad.
- A instalação no iPad exige assinatura Apple; distribuição ampla exige TestFlight ou App Store.
- Acesso remoto deve usar VPN ou HTTPS, sem expor diretamente a porta do container.
