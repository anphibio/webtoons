# INSTALLATION.md

## Desenvolvimento

Requisitos:

- Node.js LTS;
- npm, pnpm ou yarn;
- Google Chrome;
- Python, somente se o backend for utilizado;
- Docker, opcional.

Comandos da fundação:

```text
npm install
npm test
npm run lint
npm run build
```

O build da extensão é gerado em `dist/`.

## Fluxo esperado

1. instalar dependências;
2. compilar a extensão;
3. abrir `chrome://extensions`;
4. habilitar modo desenvolvedor;
5. clicar em “Carregar sem compactação”;
6. selecionar a pasta de build;
7. abrir uma página de capítulo;
8. executar os testes.

## Produção

A extensão deve ser empacotada sem:

- sourcemaps públicos contendo segredos;
- arquivos de desenvolvimento;
- chaves;
- fixtures;
- dependências não utilizadas.

## Configuração

As chaves de tradução devem ser configuradas pela página de opções.

Para testar novamente um capítulo sem reaproveitar resultados anteriores, marque
“Ignorar cache nesta tradução” no popup antes de iniciar. A opção também pode ser
mantida pela página de configurações; desmarque-a para voltar ao comportamento
normal, com cache local.

Nunca colocar chaves diretamente no repositório.
