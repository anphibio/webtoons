# TASKS.md

## Fase 0 — Fundação

- [x] Criar monorepo.
- [x] Configurar TypeScript.
- [x] Configurar lint e format.
- [x] Configurar testes.
- [x] Criar extensão Manifest V3.
- [x] Criar popup básico.
- [x] Criar options page.
- [x] Criar messaging tipado.
- [x] Criar logging controlado.

## Fase 1 — Detecção

- [x] Criar detector genérico de capítulos.
- [x] Criar modelo de `ImageCandidate`.
- [x] Implementar filtros.
- [x] Implementar IntersectionObserver.
- [x] Implementar MutationObserver.
- [x] Processar imagens carregadas progressivamente durante a rolagem.
- [x] Enfileirar OCR quando uma imagem lazy entra na viewport.
- [x] Usar as dimensões reais do backend quando a imagem lazy ainda não possui tamanho no DOM.
- [x] Enfileirar todas as páginas do capítulo, priorizando as visíveis sem abandonar as distantes.
- [x] Drenar fila incremental sem descartar imagens durante OCR concorrente.
- [x] Processar também imagens distantes adicionadas pelo lazy-load após a descoberta inicial.
- [x] Impedir que uma requisição de imagem pendente bloqueie o restante da fila.
- [x] Acionar o proxy local quando o acesso direto ao CDN falhar ou expirar.
- [x] Revalidar imagens próximas com posição de scroll como fallback do IntersectionObserver.
- [x] Implementar mudança de rota.
- [x] Ignorar atualizações de histórico que não mudam a rota real do capítulo.
- [x] Manter a identidade da imagem estável quando o lazy-load revela suas dimensões.
- [x] Criar primeiro adaptador específico.
- [x] Criar fixtures.

## Fase 2 — OCR

- [x] Criar interface de OCR.
- [x] Integrar Tesseract.js.
- [x] Executar em worker.
- [x] Retornar bounding boxes.
- [x] Agrupar linhas OCR do mesmo parágrafo para preservar o contexto da fala.
- [x] Agrupar linhas OCR próximas quando o mecanismo retorna blocos separados.
- [x] Filtrar falsos positivos de OCR por confiança e ruído textual.
- [x] Usar segmentação OCR para texto esparso em páginas longas e multiquadro.
- [x] Rejeitar regiões OCR com tokens curtos, números isolados e caracteres inválidos.
- [x] Preservar o til usado como pontuação expressiva em diálogos de quadrinhos.
- [x] Preservar pontuação editorial de telas de sistema, créditos e caixas narrativas.
- [x] Diferenciar frases válidas com várias palavras curtas de falsos positivos curtos.
- [x] Preservar palavras únicas e nomes próprios ao filtrar alucinações de glifos estilizados.
- [x] Reexecutar OCR local quando a leitura principal retorna somente uma região.
- [x] Ignorar a marca d’água conhecida do site durante o OCR.
- [x] Evitar que regiões extras de baixa qualidade substituam uma leitura OCR principal válida.
- [x] Remover fragmentos corrompidos de linhas OCR sem descartar palavras válidas do mesmo balão.
- [x] Implementar pré-processamento e segunda leitura invertida para imagens com áreas escuras.
- [x] Reprocessar imagens longas em blocos verticais sobrepostos quando a leitura integral encontrar pouco texto.
- [x] Aplicar leitura binarizada de alto contraste como recuperação para imagens com baixa cobertura OCR.
- [x] Corrigir confusões recorrentes entre glifos semelhantes (`I/1`, `IS/15`, `SO/50`) em frases.
- [x] Filtrar regiões curtas de ruído OCR antes de enviá-las à tradução.
- [x] Criar métricas locais de avaliação CER/WER.
- [x] Criar avaliador dos três lotes de treinamento com relatório por amostra.
- [x] Comparar modos de segmentação do Tesseract nos recortes difíceis.
- [x] Impedir que overlays próximos ao rodapé invadam a imagem seguinte.
- [x] Detectar regiões de texto com PaddleOCR antes do reconhecimento.
- [x] Criar endpoint local de OCR com validação de MIME, tamanho e token opcional.
- [x] Integrar PaddleOCR local como motor principal com fallback para Tesseract.js.
- [x] Repetir uma vez falhas transitórias do PaddleOCR e impedir que fallback vazio oculte a falha principal.
- [x] Exibir separadamente imagens traduzidas, sem texto e com falha no progresso do capítulo.
- [x] Medir PP-OCRv5 nos 66 recortes revisados do conjunto `Treinamento`.
- [x] Agrupar linhas detectadas em regiões de fala antes da tradução contextual.
- [x] Processar imagens longas em blocos verticais sobrepostos e sequenciais.
- [x] Remover detecções duplicadas nas emendas dos blocos OCR.
- [x] Remover detecções sobrepostas cujo texto está contido em uma leitura mais completa.
- [x] Impedir que caixas OCR anormalmente altas expandam e desloquem regiões de diálogo.
- [x] Adotar o detector mobile para limitar o consumo de memória no macOS.
- [x] Implementar cancelamento.
- [x] Implementar progresso.
- [x] Exibir no popup a página e a etapa atuais, o total processado e as falhas.
- [x] Expor os assets do worker Tesseract para páginas suportadas no Manifest V3.
- [x] Executar OCR em documento interno da extensão para isolar a CSP do site.
- [x] Orquestrar carregamento, OCR, tradução e overlay por imagem.
- [x] Carregar imagens com validação de URL, MIME e tamanho.

## Fase 3 — Tradução

- [x] Criar interface de tradução.
- [x] Criar provedor mock.
- [x] Criar primeiro provedor real (DeepL).
- [x] Criar endpoint backend protegido para o provedor remoto.
- [x] Criar cliente da extensão para o endpoint backend.
- [x] Implementar glossário.
- [x] Implementar agrupamento por contexto.
- [ ] Implementar JSON estruturado.
- [x] Implementar retry e timeout.

## Fase 4 — Overlay

- [x] Criar camada por imagem.
- [x] Renderizar regiões.
- [x] Recalcular em resize.
- [x] Adiar o overlay de imagens lazy até que possuam tamanho visual.
- [x] Reavaliar overlays lazy pendentes durante scroll e resize mesmo sem novo evento `load`.
- [x] Impedir duas instâncias simultâneas do content script e substituir overlays órfãos de uma versão anterior.
- [x] Ajustar fonte.
- [x] Criar controle de opacidade.
- [x] Criar comparação original/tradução.
- [x] Restaurar conteúdo.

## Fase 5 — Cache

- [x] Criar IndexedDB.
- [x] Definir schemas.
- [x] Gerar hash.
- [x] Cachear OCR por versão, URL, dimensões e hash dos bytes da imagem.
- [x] Cachear tradução por idioma e conteúdo reconhecido.
- [x] Implementar invalidação.
- [x] Implementar limpeza automática de entradas expiradas.
- [x] Permitir ignorar leitura e gravação do cache por preferência do usuário.

## Fase 6 — Segurança

- [ ] Revisar permissões.
- [x] Implementar consentimento remoto.
- [ ] Proteger credenciais.
- [x] Sanitizar mensagens.
- [x] Aplicar CSP compatível com o WebAssembly local do OCR.
- [x] Criar política de privacidade.

## Fase 7 — Qualidade

- [ ] Testes E2E.
- [x] Teste integrado do fluxo imagem → OCR → tradução → overlay.
- [x] Testes de adaptadores.
- [ ] Regressão visual.
- [x] Repetir OCR localmente em resultados de baixa cobertura, mesmo quando o detector retornar várias caixas de ruído, limitando o fallback a páginas com pouca evidência confiável.
- [x] Invalidar o cache de OCR ao alterar a estratégia de recuperação de balões.
- [x] Invalidar novamente o cache de OCR após corrigir o ambiente de execução local usado no teste.
- [x] Invalidar o cache de tradução após detectar resultados antigos incompletos sendo reutilizados.
- [x] Reprocessar uma vez imagens com falha transitória antes de contabilizar erro definitivo.
- [x] Benchmark de capítulos longos.
- [x] Auditoria de memória do OCR local.
- [x] Manter overlays ancorados no bounding box original para evitar deslocamento entre balões e imagens.
- [x] Filtrar alucinações OCR recorrentes de efeitos sonoros sem descartar interjeições como “Haah”.
- [x] Invalidar novamente os caches de OCR e tradução para reprocessar o capítulo 12 sem resultados antigos.
- [x] Deduplicar regiões OCR com o mesmo texto e sobreposição forte, preservando falas iguais em balões distintos.
- [x] Invalidar o cache ao ampliar o filtro de efeitos sonoros e grafismos recorrentes.
- [x] Rejeitar variações compostas de efeitos sonoros e falsos positivos de texto em faixas gráficas largas.
- [ ] Tratamento de erros.
- [x] Documentação de instalação.

## Fase 8 — Evolução

- [ ] Modelo especializado de text detection.
- [ ] Detecção de balões.
- [ ] Suporte a texto vertical.
- [ ] Inpainting.
- [ ] Tradução local.
- [ ] Exportação opcional.
