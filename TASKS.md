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
- [x] Remover interjeições/efeitos sonoros corrompidos sem apagar frases válidas contaminadas por OCR, ampliar a recuperação local de imagens longas e invalidar o cache OCR anterior.
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
- [x] Criar verificação automática de regressão da linha de base OCR para uso antes de releases.
- [x] Comparar modos de segmentação do Tesseract nos recortes difíceis.
- [x] Impedir que overlays próximos ao rodapé invadam a imagem seguinte.
- [x] Detectar regiões de texto com PaddleOCR antes do reconhecimento.
- [x] Criar endpoint local de OCR com validação de MIME, tamanho e token opcional.
- [x] Integrar PaddleOCR local como motor principal com fallback para Tesseract.js.
- [x] Preservar o OCR principal quando o fallback Tesseract falhar dentro do WASM.
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
- [x] Implementar JSON estruturado.
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

- [x] Revisar permissões.
- [x] Implementar consentimento remoto.
- [x] Proteger credenciais.
- [x] Sanitizar mensagens.
- [x] Aplicar CSP compatível com o WebAssembly local do OCR.
- [x] Criar política de privacidade.

## Fase 7 — Qualidade

- [ ] Testes E2E.
- [x] Teste integrado do fluxo imagem → OCR → tradução → overlay.
- [x] Testes de adaptadores.
- [x] Regressão visual determinística do overlay.
- [x] Repetir OCR localmente em resultados de baixa cobertura, mesmo quando o detector retornar várias caixas de ruído, limitando o fallback a páginas com pouca evidência confiável.
- [x] Invalidar o cache de OCR ao alterar a estratégia de recuperação de balões.
- [x] Invalidar novamente o cache de OCR após corrigir o ambiente de execução local usado no teste.
- [x] Invalidar o cache de tradução após detectar resultados antigos incompletos sendo reutilizados.
- [x] Reprocessar uma vez imagens com falha transitória antes de contabilizar erro definitivo.
- [x] Manter o estado `completed-with-errors` quando uma falha ocorrer em lote anterior de imagens.
- [x] Normalizar o resumo exibido para impedir progresso concluído maior que o total conhecido.
- [x] Implementar relatório JSON estruturado de processamento, com progresso e falhas sanitizadas.
- [x] Comparar o token opcional do backend sem revelar a credencial em respostas ou logs.
- [x] Benchmark de capítulos longos.
- [x] Auditoria de memória do OCR local.
- [x] Manter overlays ancorados no bounding box original para evitar deslocamento entre balões e imagens.
- [x] Recortar caixas OCR que ultrapassam os limites da imagem antes de renderizar o overlay.
- [x] Separar efeitos sonoros curtos detectados junto ao diálogo para evitar caixas OCR artificialmente altas.
- [x] Cobrir no fluxo integrado o caso de ruído fora do balão sem criar overlay deslocado.
- [x] Filtrar alucinações OCR recorrentes de efeitos sonoros sem descartar interjeições como “Haah”.
- [x] Invalidar novamente os caches de OCR e tradução para reprocessar o capítulo 12 sem resultados antigos.
- [x] Deduplicar regiões OCR com o mesmo texto e sobreposição forte, preservando falas iguais em balões distintos.
- [x] Invalidar o cache ao ampliar o filtro de efeitos sonoros e grafismos recorrentes.
- [x] Rejeitar variações compostas de efeitos sonoros e falsos positivos de texto em faixas gráficas largas.
- [x] Filtrar novas variantes isoladas de efeitos sonoros reconhecidas como palavras inglesas.
- [x] Invalidar automaticamente o cache OCR após ampliar novamente o filtro de ruídos.
- [x] Filtrar variantes com pontuação e grafismos `Steips`/`Wighs` identificados no ToonGod20.
- [x] Invalidar o cache OCR após corrigir variantes adicionais de ruído.
- [x] Acionar recuperação OCR local em detecções escassas ou fracas e mesclar regiões sem perder resultados válidos.
- [x] Rejeitar regiões OCR sem área e novas variantes de grafismos (`KROH`, `SSIN`, `btok OTof`, `brop`) antes da tradução.
- [x] Deduplicar diálogos OCR sobrepostos e rejeitar fragmentos falsos (`NUNCA SW.`, `btop`, `btor`, `bror`, `de de`) observados no capítulo 61.
- [x] Filtrar efeitos sonoros isolados recorrentes e limitar regiões OCR verticalmente anormais observadas em `Beautiful Days`.
- [x] Remover efeitos sonoros misturados ao diálogo (`SWISH`, `SLURP`, `TWITCH` e variantes) sem descartar a fala restante.
- [x] Cobrir ruídos repetidos e variantes corrompidas observados em `Beautiful Days` (`TWITCH TWITCH`, `RUB TWITCH`, `SPLATER WICH`).
- [x] Filtrar efeitos residuais (`FLINCH`, `SWOOSH`, `LURP` e variantes `NNGH`) sem remover o diálogo adjacente.
- [x] Filtrar variantes estilizadas residuais de efeitos sonoros e sufixos corrompidos observados no `Beautiful Days` antes da tradução.
- [x] Invalidar o cache OCR após ampliar o filtro de ruído do `Beautiful Days`.
- [x] Não criar overlay quando a tradução preservar o mesmo conteúdo do OCR, evitando caixas sobre marcas e interjeições sem tradução.
- [x] Rejeitar o falso `WITH` de baixa confiança recortado na borda observado no `Beautiful Days`, preservando ocorrências legítimas em frases.
- [x] Invalidar o cache OCR após corrigir o falso positivo recortado na borda.
- [x] Limitar pela borda inferior caixas OCR longas superdimensionadas, preservando a âncora superior do texto.
- [x] Remover efeitos finais `HNN` e hífens órfãos sem apagar a pontuação expressiva do diálogo.
- [x] Invalidar o cache OCR após corrigir geometria e resíduos observados no `Beautiful Days` ToonGod07.
- [x] Tratamento de erros com mensagens amigáveis no popup e diagnóstico técnico preservado nos logs.
- [x] Documentação de instalação.
- [x] Checklist de teste E2E manual para página local.
- [x] Gerar pacote distribuível da extensão sem credenciais ou dados de teste.
- [x] Preparar instalador do backend como serviço automático do macOS.

## Fase 8 — Evolução

- [ ] Modelo especializado de text detection.
- [ ] Detecção de balões.
- [ ] Suporte a texto vertical.
- [ ] Inpainting.
- [ ] Tradução local.
- [ ] Exportação opcional.
