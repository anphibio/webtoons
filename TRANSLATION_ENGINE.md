# TRANSLATION_ENGINE.md

## Objetivo

Traduzir segmentos preservando contexto narrativo e consistência.

## Idioma padrão

Origem: detecção automática com preferência para inglês.

Destino: português brasileiro.

## Regras de tradução

- preservar nomes próprios;
- manter honoríficos quando configurado;
- evitar tradução literal inadequada;
- preservar intenção emocional;
- manter consistência de termos;
- não adicionar explicações;
- não censurar conteúdo;
- não alterar números;
- não inventar falas ausentes;
- respeitar o tamanho disponível na região.

## Contexto

Sempre que possível, enviar:

- falas próximas;
- ordem de leitura;
- tipo da região;
- texto anterior;
- texto seguinte;
- glossário;
- nomes detectados.

## Agrupamento

Traduzir pequenos lotes para preservar contexto, mas manter vínculo de cada resultado com sua região.

## Contrato

```ts
type TranslationSegment = {
  id: string;
  text: string;
  regionType?: string;
  order: number;
};

type TranslatedSegment = {
  id: string;
  sourceText: string;
  translatedText: string;
  confidence?: number;
};
```

## Provedores

Criar adapters para:

- tradução local;
- API de tradução;
- LLM;
- backend próprio.

## Prompt-base para LLM

O modelo deve receber instruções para:

- traduzir somente o texto;
- devolver JSON estruturado;
- manter os IDs;
- não acrescentar comentários;
- preservar nomes;
- usar português brasileiro natural;
- limitar expansão excessiva.

## Cache

Chave sugerida:

```text
hash(texto + idioma_origem + idioma_destino + provedor + versao_prompt)
```
