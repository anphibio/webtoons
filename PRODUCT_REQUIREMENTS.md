# PRODUCT_REQUIREMENTS.md

## Personas

### Leitor

Deseja ler capítulos em português sem modificar o site original e sem executar procedimentos técnicos.

### Administrador técnico

Configura provedores de tradução, políticas de privacidade e parâmetros de processamento.

## Jornada principal

1. O usuário abre um capítulo.
2. A extensão identifica que a página contém imagens de leitura.
3. O usuário clica em “Traduzir capítulo”.
4. A extensão detecta imagens visíveis e próximas.
5. Cada imagem passa por pré-processamento.
6. Regiões textuais são localizadas.
7. O OCR reconhece o texto.
8. O tradutor converte o conteúdo para português.
9. A extensão aplica a tradução.
10. Novas imagens são processadas durante a rolagem.

## Requisitos funcionais

### RF-001 — Ativação

A extensão deve permitir ativar e desativar a tradução na guia atual.

### RF-002 — Detecção de capítulo

A extensão deve localizar o contêiner principal e as imagens do capítulo.

### RF-003 — Filtragem

A extensão deve descartar imagens pequenas, decorativas, promocionais ou fora do fluxo principal.

### RF-004 — OCR

A extensão deve extrair texto de regiões incorporadas às imagens.

### RF-005 — Tradução

A extensão deve traduzir para português brasileiro preservando sentido, nomes e contexto.

### RF-006 — Sobreposição

A extensão deve posicionar o texto traduzido sobre a área correspondente.

### RF-007 — Reversibilidade

A extensão deve restaurar a visualização original sem recarregar a página.

### RF-008 — Rolagem infinita

A extensão deve detectar imagens adicionadas dinamicamente.

### RF-009 — Cache

A extensão deve reutilizar resultados para imagens já processadas.

### RF-010 — Configuração

O usuário deve poder configurar idioma de origem, destino, provedor, fonte, tamanho e opacidade.

### RF-011 — Erros

Falhas parciais não devem impedir a leitura das demais imagens.

### RF-012 — Privacidade

O usuário deve saber quando uma imagem será enviada a um serviço remoto.

## Requisitos não funcionais

- não bloquear a interface;
- evitar consumo excessivo de memória;
- processar por prioridade de visibilidade;
- limitar concorrência;
- manter compatibilidade com Chrome atual;
- funcionar em páginas longas;
- manter o código modular;
- registrar erros sem expor dados sensíveis;
- preservar qualidade visual.

## Critérios de aceite do MVP

- extensão instala sem erros;
- popup abre;
- botão de tradução funciona;
- imagens relevantes são detectadas;
- ao menos um provedor de OCR local funciona;
- ao menos um provedor de tradução funciona;
- traduções aparecem na posição correta;
- desativação restaura a página;
- cache evita repetir o mesmo processamento;
- processamento continua durante a rolagem.
