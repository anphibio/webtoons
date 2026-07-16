# ARCHITECTURE.md

## Visão geral

```text
Popup / Options
      |
Service Worker
      |
Content Script
      |
Page Scanner
      |
Image Pipeline
  |      |       |
Detect  OCR   Translation
  \      |       /
    Overlay Engine
         |
      IndexedDB
```

## Componentes

### Popup

Responsável por:

- ativar e desativar;
- iniciar tradução;
- exibir progresso;
- pausar;
- cancelar;
- abrir configurações.

### Options Page

Responsável por:

- idioma;
- provedor OCR;
- provedor de tradução;
- chave de API;
- privacidade;
- estilo;
- desempenho;
- cache.

### Service Worker

Responsável por:

- ciclo de vida da extensão;
- comunicação;
- configuração;
- acesso seguro às credenciais;
- chamadas de rede;
- controle de permissões;
- coordenação de tarefas.

### Content Script

Responsável por:

- observar o DOM;
- identificar capítulo;
- coletar imagens;
- criar sobreposições;
- restaurar conteúdo;
- acompanhar rolagem.

### Page Scanner

Analisa:

- estrutura do documento;
- contêiner predominante;
- sequência vertical;
- dimensões;
- origem;
- distância entre imagens;
- densidade de imagens;
- elementos excluídos.

### Image Pipeline

Etapas:

1. validação;
2. carregamento seguro;
3. normalização;
4. geração de hash;
5. busca no cache;
6. detecção de regiões textuais;
7. OCR;
8. agrupamento;
9. tradução;
10. ajuste tipográfico;
11. renderização;
12. persistência.

### OCR Provider

Interface comum:

```ts
interface OcrProvider {
  recognize(input: OcrInput, signal?: AbortSignal): Promise<OcrResult>;
}
```

Implementações atuais:

- `BackendOcrProvider`: usa PaddleOCR/PP-OCRv5 no FastAPI local para detectar e reconhecer linhas com bounding boxes;
- `IframeOcrProvider`: usa Tesseract.js dentro da extensão como fallback quando o serviço local está indisponível ou não encontra texto;
- `RetryingOcrProvider`: repete uma vez falhas transitórias de comunicação com o PaddleOCR;
- `FallbackOcrProvider`: mantém a extensão funcional durante instalação, reinício ou falha do motor principal, mas preserva o erro original quando o fallback também retorna vazio.

As imagens enviadas para `127.0.0.1` são processadas em memória e não saem da máquina. Somente o texto reconhecido segue para o provedor de tradução quando o consentimento remoto está habilitado.

A normalização remove ruído e símbolos incompatíveis, mas preserva pontuação expressiva e editorial comum em quadrinhos, telas de sistema e créditos. Frases com várias palavras curtas são avaliadas pelo conjunto da fala, evitando que diálogos válidos sejam confundidos com glifos isolados.

### Translation Provider

```ts
interface TranslationProvider {
  translate(
    segments: TranslationSegment[],
    context: TranslationContext,
    signal?: AbortSignal
  ): Promise<TranslationResult>;
}
```

### Overlay Engine

Deve suportar:

- HTML overlay;
- canvas overlay;
- edição reversível;
- escalonamento responsivo;
- reposicionamento em resize;
- materialização progressiva de overlays pendentes durante scroll, resize e lazy-load;
- substituição de overlays órfãos pelo mesmo URL de imagem após recarga da extensão;
- múltiplas regiões por imagem.

## Comunicação

Usar mensagens tipadas entre:

- popup;
- service worker;
- content scripts;
- options page;
- workers.

## Persistência

### chrome.storage.sync

Somente configurações pequenas.

### chrome.storage.local

Metadados locais e preferências.

### IndexedDB

- hashes;
- OCR;
- traduções;
- regiões;
- versão do algoritmo;
- timestamps.

## Política de processamento

- prioridade para elementos visíveis;
- pré-carregamento moderado;
- concorrência configurável;
- cancelamento ao mudar de página;
- debounce do MutationObserver;
- IntersectionObserver para prioridade;
- uma única instância ativa do content script por contexto da extensão.
