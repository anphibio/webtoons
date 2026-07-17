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

O pipeline usa o IndexedDB para reutilizar OCR por versão, URL, dimensões e hash dos bytes da imagem. As traduções são reutilizadas por versão, idiomas e texto reconhecido. O OCR expira em sete dias e a tradução em trinta dias; entradas expiradas são removidas quando o content script inicia. Falhas no cache são ignoradas para não interromper o processamento.

O glossário é configurado localmente como um objeto JSON de termos de origem e preferências de tradução. Ele é aplicado após a resposta do provedor, incluído na chave do cache de tradução e limitado a termos curtos para evitar uso abusivo.

O teste integrado do pipeline executa o fluxo completo em um documento simulado e verifica que a imagem original permanece intacta, a tradução é renderizada e a posição da região é preservada.

Cada região de overlay usa alinhamento flexível centralizado e calcula um tamanho de fonte compatível com sua largura e altura visuais. O tamanho configurado continua sendo o limite superior, enquanto traduções mais longas podem reduzir a fonte para permanecer dentro da região.

Antes da tradução, o OCR normaliza caixas anormalmente altas com pouco texto sem descartar automaticamente o conteúdo, rejeita sequências com fragmentos e números típicas de ruído e impede que onomatopeias curtas sejam agrupadas ao diálogo vizinho. Isso mantém efeitos como “Haah...” em uma região independente, evita retângulos que cobrem balões inteiros e preserva falas válidas detectadas em caixas com dimensões ruins.

O normalizador também rejeita padrões conhecidos de alucinação latina produzidos quando o motor inglês tenta interpretar glifos coreanos ou efeitos visuais, além de sequências com números sem contexto e a marca d’água conhecida do site. Fragmentos corrompidos podem ser removidos de uma linha quando ainda resta uma palavra válida, como em “HEUGHI WAIT – WAJU –”. Palavras isoladas válidas e nomes próprios, como “MONDAYS.”, “OVERTIME...” e “NAMWOO.”, continuam elegíveis; tokens conhecidos como “botor”, “tokor” e “Heugho Leuol” são tratados como ruído. Quando o OCR principal retorna somente uma região, o provedor local faz uma leitura de recuperação, mas regiões extras só vencem a leitura principal quando também são plausíveis.

O overlay calcula uma área mínima para a tradução e permite uma expansão vertical moderada quando o texto traduzido precisa de mais linhas. A fonte não é reduzida abaixo de 12px, evitando legendas ilegíveis causadas por caixas OCR estreitas.

## Política de processamento

- prioridade para elementos visíveis;
- pré-carregamento moderado;
- concorrência configurável;
- cancelamento ao mudar de página;
- debounce do MutationObserver;
- IntersectionObserver para prioridade;
- uma única instância ativa do content script por contexto da extensão.
