# Regressão visual

O overlay possui testes determinísticos para proteger os problemas observados nos capítulos reais:

- cada legenda permanece ancorada na imagem e na região OCR de origem;
- caixas recuperadas que ultrapassam a imagem são recortadas;
- o overlay não pode vazar para a próxima imagem de uma página longa;
- o tamanho da fonte continua limitado ao espaço disponível.

Os testes ficam em `tests/overlay-regression.test.ts` e são executados junto com `npm test`.

Essa verificação não substitui uma captura visual em navegador. Ela mantém o contrato geométrico estável sem adicionar dependências ou armazenar imagens de capítulos do usuário no repositório.
