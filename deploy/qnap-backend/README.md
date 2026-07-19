# Backend no QNAP

Esta implantação mantém o OCR e a integração com o DeepL em um container sempre ativo na rede local. O Mac e o iPad não precisam manter um terminal aberto; apenas o QNAP e o container precisam estar ligados.

## Requisitos

- QNAP com Container Station e suporte a aplicações Docker Compose;
- pelo menos 4 GB de memória disponíveis para o container;
- repositório copiado ou clonado em uma pasta compartilhada do QNAP;
- chave da API DeepL;
- endereço IP reservado para o QNAP no roteador.

## Configuração

Na raiz do repositório no QNAP:

```sh
cp deploy/qnap-backend/.env.example deploy/qnap-backend/.env
openssl rand -hex 32
```

Edite `deploy/qnap-backend/.env`:

```env
DEEPL_API_KEY=sua-chave-do-deepl
API_ACCESS_TOKEN=token-gerado-pelo-openssl
BACKEND_PORT=8000
```

O arquivo `.env` é ignorado pelo Git e pelo contexto Docker. Não coloque a chave do DeepL na extensão.
Se adicionar outro site compatível, inclua sua origem em `CORS_ALLOW_ORIGINS`, separada por vírgulas.

## Subir pelo terminal do QNAP

Execute a partir da raiz do repositório:

```sh
docker compose \
  --env-file deploy/qnap-backend/.env \
  -f deploy/qnap-backend/compose.yaml \
  up -d --build
```

Teste na rede local:

```sh
curl http://IP-DO-QNAP:8000/health
```

O resultado esperado é `{"status":"ok"}`.

## Subir pelo Container Station

No Container Station, crie uma nova **Application** a partir do arquivo `deploy/qnap-backend/compose.yaml`. A pasta de projeto precisa preservar a estrutura completa do repositório, pois o contexto de build aponta para a raiz. Configure as mesmas variáveis do `.env` no projeto e inicie a aplicação.

O primeiro OCR pode demorar mais porque os modelos do PaddleOCR são baixados no volume persistente `paddle-models`. O container usa um único worker e limite padrão de 4 GB para evitar a multiplicação do consumo de memória.

## Operação

```sh
# Estado
docker compose --env-file deploy/qnap-backend/.env -f deploy/qnap-backend/compose.yaml ps

# Logs
docker compose --env-file deploy/qnap-backend/.env -f deploy/qnap-backend/compose.yaml logs -f api

# Reiniciar
docker compose --env-file deploy/qnap-backend/.env -f deploy/qnap-backend/compose.yaml restart api

# Atualizar depois de um git pull
docker compose --env-file deploy/qnap-backend/.env -f deploy/qnap-backend/compose.yaml up -d --build
```

## Rede e segurança

- Não encaminhe a porta `8000` diretamente no roteador para a internet.
- Para uso apenas em casa, configure a extensão com `http://IP-DO-QNAP:8000`.
- Para uso fora da rede, prefira VPN ou um proxy HTTPS com certificado confiável.
- Use um `API_ACCESS_TOKEN` longo e diferente da chave do DeepL.
- Informe esse token somente na tela de configurações da extensão.
