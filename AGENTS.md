# AGENTS.md

## Missão

Construir uma extensão profissional para Google Chrome capaz de traduzir textos incorporados em imagens de webtoons, mangás e quadrinhos.

A extensão deve detectar imagens de capítulos, localizar regiões de texto, executar OCR, traduzir para português e sobrepor a tradução de modo legível e visualmente coerente.

## Regra principal

O projeto não trabalha com vídeo.

Não implementar:

- captura de frames;
- legendas de vídeo;
- WebVTT;
- SRT;
- sincronização audiovisual;
- análise de áudio.

## Prioridades

1. Correção funcional.
2. Privacidade do usuário.
3. Qualidade do OCR.
4. Fidelidade da tradução.
5. Posicionamento visual.
6. Baixo consumo de recursos.
7. Arquitetura modular.
8. Testabilidade.
9. Segurança.
10. Boa experiência de uso.

## Comportamento esperado do agente

Antes de implementar:

1. Leia todos os arquivos Markdown do repositório.
2. Identifique dependências entre módulos.
3. Não invente requisitos incompatíveis com a documentação.
4. Evite soluções acopladas a um único site.
5. Prefira arquitetura orientada a adaptadores.
6. Preserve Manifest V3.
7. Não use APIs obsoletas do Chrome.
8. Não envie imagens a serviços externos sem consentimento explícito.
9. Não armazene imagens completas quando não for necessário.
10. Mantenha registro das decisões arquiteturais.

## Stack preferencial

### Extensão

- TypeScript
- React
- Vite
- Manifest V3
- Chrome Extension APIs
- IndexedDB
- Vitest
- Playwright

### Processamento local

- Canvas API
- OffscreenCanvas
- Web Workers
- OpenCV.js, quando necessário
- Tesseract.js para OCR local inicial

### Backend opcional

- Python
- FastAPI
- Pydantic
- PostgreSQL apenas se persistência remota for realmente necessária
- Redis opcional para cache distribuído
- Docker

## Organização esperada

```text
apps/
  extension/
  api/
packages/
  core/
  ocr/
  translation/
  overlay/
  site-adapters/
  shared/
docs/
tests/
```

## Regras de implementação

- Escrever código tipado.
- Evitar `any`.
- Criar interfaces para provedores de OCR e tradução.
- Separar detecção, OCR, tradução e renderização.
- Processar imagens progressivamente.
- Cancelar tarefas de imagens que saíram da janela de prioridade.
- Implementar retry com limite.
- Implementar timeout.
- Implementar cache por hash da imagem e região.
- Não bloquear a thread principal.
- Não alterar o DOM do site de forma destrutiva.
- Não substituir permanentemente a imagem original.
- Usar sobreposição reversível.
- Permitir restaurar o conteúdo original.

## Segurança

- Usar permissões mínimas.
- Evitar `<all_urls>` quando adaptadores específicos forem suficientes.
- Nunca registrar chaves de API.
- Nunca enviar cookies, tokens ou cabeçalhos de autenticação para o backend.
- Sanitizar textos e dados recebidos.
- Validar URLs antes de qualquer requisição.
- Aplicar CSP compatível com Manifest V3.
- Não executar código remoto.

## Qualidade

Toda entrega deve incluir:

- código;
- testes;
- tratamento de erro;
- logs controlados;
- documentação;
- atualização do `TASKS.md`;
- critérios de aceite verificados.

## Definition of Done

Uma tarefa somente está concluída quando:

- compila;
- passa no lint;
- passa nos testes;
- não bloqueia a página;
- não quebra sites sem suporte;
- mantém a imagem original recuperável;
- respeita as permissões mínimas;
- possui documentação suficiente.
