# ADR 0005 — PaddleOCR local como motor principal

## Status

Aceita.

## Decisão

Usar PaddleOCR/PP-OCRv5 no backend FastAPI vinculado a `127.0.0.1` como OCR principal. Em produção, usar o detector mobile e processar imagens longas em blocos verticais sobrepostos e sequenciais. O Tesseract.js permanece dentro da extensão como fallback automático.

## Motivos

- o detector do PaddleOCR localiza linhas antes do reconhecimento;
- o perfil server obteve CER de 6,52% e WER de 11,86%, mas apresentou consumo de memória incompatível com capítulos longos;
- o perfil mobile manteve CER de 9,80% e WER de 17,16%, processando o capítulo completo com pico de 1,26 GB;
- o processamento local preserva a privacidade e evita custo por imagem;
- o processo Python isolado suporta modelos maiores sem aumentar o pacote da extensão ou bloquear a página.

## Consequências

- o usuário precisa manter o backend local em execução;
- a primeira utilização baixa os pesos oficiais para o cache local;
- o processamento de OCR é serializado para impedir que várias inferências multipliquem o pico de memória;
- os blocos sobrepostos exigem deduplicação e recomposição das coordenadas na imagem original;
- as dimensões retornadas pelo backend são a referência para normalizar as caixas, pois imagens lazy podem ainda ter tamanho zero no DOM;
- caixas anormalmente altas são isoladas durante o agrupamento para não arrastar diálogos reais para regiões decorativas;
- leituras sobrepostas e contidas são deduplicadas antes da tradução;
- a normalização aceita pontuação expressiva e editorial legítima, como `~`, `:`, `/`, `+`, `&`, colchetes e marcadores, sem afrouxar os demais filtros de ruído;
- frases formadas por palavras curtas são avaliadas como uma unidade para preservar falas como “HOW FAR DID SHE GO?”;
- o Tesseract garante degradação controlada quando o serviço está indisponível;
- falhas transitórias do serviço local recebem uma única nova tentativa antes do fallback;
- um fallback sem regiões não transforma falha do serviço principal em sucesso vazio;
- o progresso distingue imagens renderizadas, imagens sem texto e falhas para não confundir tentativas concluídas com cobertura traduzida;
- imagens são processadas em memória local; somente texto pode ser enviado ao DeepL após consentimento.
