# GOAL.md

## Visão

Criar uma experiência de leitura traduzida para webtoons, mangás e quadrinhos publicados como imagens em páginas web.

## Resultado esperado

Ao abrir um capítulo compatível, o usuário poderá ativar a extensão e visualizar o texto traduzido para português diretamente sobre as imagens, sem precisar baixar manualmente o capítulo ou copiar textos.

## Objetivos funcionais

- detectar as imagens que formam o capítulo;
- ignorar logos, banners, avatares e anúncios;
- localizar regiões com texto;
- reconhecer textos em inglês no MVP;
- traduzir para português brasileiro;
- posicionar a tradução na região correspondente;
- permitir alternar entre original e traduzido;
- permitir reprocessamento;
- indicar progresso e erros;
- suportar páginas longas carregadas por rolagem;
- suportar imagens carregadas dinamicamente.

## Objetivos de experiência

- ativação simples;
- leitura contínua;
- baixa interferência no site;
- traduções legíveis;
- controle de tamanho da fonte;
- controle de opacidade;
- opção de manter o texto original visível;
- feedback claro sobre processamento.

## Meta de arquitetura

O núcleo não deve depender de um domínio específico.

Cada site deve ser suportado por adaptadores que descrevem:

- seletor do contêiner do capítulo;
- critérios para identificar imagens;
- elementos que devem ser ignorados;
- regras de carregamento;
- possíveis restrições de CORS;
- estratégia de observação do DOM.

## MVP

O MVP deve oferecer:

- extensão Chrome Manifest V3;
- processamento manual por botão;
- detecção de imagens;
- OCR local;
- tradução por provedor configurável;
- sobreposição simples;
- cache local;
- suporte inicial por adaptador genérico e adaptadores específicos.
