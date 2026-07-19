# Extensão Safari para iPad

Esta pasta cria uma variante para o Safari do iPad sem alterar o código ou o build usado pelo Chrome. O processo copia `dist/`, remove as permissões do backend local do Mac e adiciona somente a origem configurada para o QNAP.

O Chrome no iPad não instala extensões Chrome de desktop. No iPad, este projeto precisa ser empacotado como uma **Safari Web Extension** dentro de um aplicativo iOS.

## Requisitos

- Mac com a versão completa do Xcode instalada e aberta ao menos uma vez;
- Apple ID configurado no Xcode para assinatura;
- iPad com Safari compatível com Safari Web Extensions;
- backend do QNAP acessível pelo iPad;
- token definido em `API_ACCESS_TOKEN` no QNAP.

## Gerar a extensão isolada

Escolha a origem pela qual o iPad alcança o QNAP:

```sh
export IPAD_BACKEND_ORIGIN="http://192.168.1.50:8000"
npm run build:ipad
```

O resultado fica em `apps/ipad-safari-extension/build/web-extension`. A pasta `dist/` do Chrome não é modificada.

## Criar o projeto iOS

```sh
export IPAD_BACKEND_ORIGIN="http://192.168.1.50:8000"
./apps/ipad-safari-extension/scripts/package-xcode.sh
```

O script usa `safari-web-extension-packager` e cria o projeto em `apps/ipad-safari-extension/xcode`.

Depois:

1. Abra o projeto criado no Xcode.
2. Selecione sua equipe em **Signing & Capabilities**.
3. Conecte o iPad, selecione-o como destino e execute o aplicativo.
4. No iPad, habilite a extensão nos ajustes do Safari e permita acesso ao ToonGod.
5. Abra as configurações da extensão e informe o mesmo `API_ACCESS_TOKEN` configurado no QNAP.

Para distribuir a outras pessoas sem depender do Xcode, será necessário assinar e distribuir o aplicativo iOS por TestFlight ou App Store.

## HTTPS

HTTP pode ser usado para um primeiro teste dentro da mesma rede. Para uma instalação mais confiável e para acesso remoto, exponha o backend por HTTPS com certificado aceito pelo iPad e gere novamente o pacote com essa origem. Não exponha a porta bruta do container à internet.
