# IMAGE_DETECTION.md

## Objetivo

Identificar imagens que pertencem ao capítulo e ignorar elementos irrelevantes.

## Estratégias

### Adaptador específico

Prioridade máxima.

O adaptador define seletores e regras conhecidas para o site.

### Detector genérico

Usado quando não existe adaptador.

Sinais positivos:

- imagens grandes;
- sequência vertical;
- largura semelhante;
- proximidade entre imagens;
- mesmo contêiner;
- posição central;
- lazy loading;
- proporção compatível com páginas de quadrinhos.

Sinais negativos:

- dimensões pequenas;
- cabeçalho;
- rodapé;
- avatar;
- logo;
- anúncio;
- botão;
- ícone;
- conteúdo lateral;
- carrossel promocional.

## Carregamento

Suportar:

- `src`;
- `srcset`;
- `data-src`;
- `data-lazy-src`;
- background-image;
- blobs;
- carregamento dinâmico.

## Observadores

Usar:

- `MutationObserver`;
- `IntersectionObserver`;
- evento de resize;
- observação de mudança de rota.

## Segurança e CORS

Nunca assumir que uma imagem pode ser lida via canvas.

Estratégias possíveis:

1. leitura direta quando permitida;
2. `fetch` pelo service worker com host permission autorizada;
3. captura da área visível, quando apropriado e autorizado;
4. backend opcional.

## Hash

O hash deve considerar:

- bytes da imagem quando disponíveis;
- URL normalizada;
- dimensões;
- versão do pré-processamento.

## Critério mínimo

Uma imagem só deve entrar na fila após passar pela validação do adaptador ou por uma pontuação mínima do detector genérico.
