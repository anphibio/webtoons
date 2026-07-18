# OCR_ENGINE.md

## Objetivo

Reconhecer texto com posição, confiança e estrutura.

## Provedores

### Local

Tesseract.js como opção inicial.

Vantagens:

- privacidade;
- operação sem backend;
- sem custo por chamada.

Limitações:

- maior consumo local;
- menor precisão em fontes estilizadas;
- dificuldade com texto curvo, vertical e efeitos sonoros.

### Remoto

Deve ser implementado por interface, nunca diretamente no componente visual.

Possíveis categorias:

- OCR em nuvem;
- modelo multimodal;
- backend próprio;
- modelo local servido por API.

## Contrato de saída

```ts
type OcrRegion = {
  id: string;
  text: string;
  confidence: number;
  bbox: BoundingBox;
  rotation: number;
  language?: string;
  words?: OcrWord[];
};
```

## Pré-processamento

Testar combinações de:

- escala;
- grayscale;
- threshold;
- binarização adaptativa;
- sharpen;
- remoção de ruído;
- correção de rotação;
- recorte com margem.

## Qualidade

Não traduzir automaticamente textos abaixo do limite de confiança sem marcar o resultado como incerto.

### Normalização de regiões

- usar a mediana da altura das linhas da imagem como referência para identificar caixas verticalmente anormais;
- limitar caixas superdimensionadas pela borda inferior, preservando o topo detectado do texto longo;
- centralizar apenas regiões curtas quando a altura original estiver contaminada por um efeito gráfico;
- remover efeitos sonoros anexados ao diálogo sem consumir a pontuação expressiva da fala;
- versionar o cache de OCR sempre que a geometria ou a sanitização das regiões mudar.

## Execução

- usar Web Worker;
- limitar concorrência;
- permitir cancelamento;
- publicar progresso;
- liberar memória após processamento.

## Privacidade

Quando remoto:

- pedir consentimento;
- informar o provedor;
- enviar apenas o recorte necessário;
- não enviar a página completa quando uma região for suficiente.
