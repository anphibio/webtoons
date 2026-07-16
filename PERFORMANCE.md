# PERFORMANCE.md

## Objetivo

Processar capítulos longos sem travar o navegador.

## Estratégia

- processar primeiro imagens visíveis;
- priorizar imagens próximas;
- suspender imagens distantes;
- limitar concorrência;
- usar workers;
- evitar cópias desnecessárias;
- liberar canvases;
- comprimir dados no cache;
- evitar reprocessamento.

## Filas

Filas sugeridas:

1. descoberta;
2. carregamento;
3. pré-processamento;
4. OCR;
5. tradução;
6. renderização.

## Prioridade

```text
visível > próxima abaixo > próxima acima > distante
```

## Limites iniciais

- OCR concorrente: 1 ou 2 tarefas;
- tradução concorrente: 2 a 4;
- imagens pré-carregadas: configurável;
- limite máximo de pixels por processamento;
- timeout por provedor.

## Memória

- não manter imagem original duplicada;
- descartar buffers após OCR;
- usar thumbnails para detecção preliminar;
- processar regiões recortadas;
- limpar tarefas canceladas;
- evitar leaks em observadores.

## Métricas

Registrar localmente:

- tempo por imagem;
- tempo de OCR;
- tempo de tradução;
- quantidade de regiões;
- acertos de cache;
- erros;
- tarefas canceladas.

O cache local armazena apenas OCR, traduções e metadados estruturados. Imagens completas não são persistidas pelo cache.

Não registrar conteúdo reconhecido por padrão.
