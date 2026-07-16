# TEXT_OVERLAY.md

## Objetivo

Exibir a tradução de forma legível e reversível.

## Estratégias

### HTML Overlay

Camadas posicionadas sobre a imagem.

Vantagens:

- fácil edição;
- acessibilidade;
- seleção de texto;
- boa responsividade.

### Canvas Overlay

Adequado para composição mais próxima do desenho.

Vantagens:

- controle visual;
- exportação futura;
- melhor mascaramento.

## MVP

Usar HTML overlay com:

- contêiner absoluto;
- coordenadas relativas;
- fundo configurável;
- fonte ajustável;
- sombra;
- contorno;
- alinhamento;
- redimensionamento automático.

## Mascaramento

Inicialmente:

- fundo semitransparente;
- opção de desfoque;
- opção de manter original visível.

Evolução:

- preenchimento aproximado;
- inpainting;
- detecção do balão;
- reconstrução do fundo.

## Ajuste tipográfico

O motor deve:

1. calcular área disponível;
2. estimar tamanho;
3. quebrar linhas;
4. reduzir fonte progressivamente;
5. limitar overflow;
6. permitir expansão manual.

## Responsividade

Ao redimensionar:

- recalcular escala;
- reposicionar todas as regiões;
- manter vínculo com a imagem;
- não causar layout shift.

## Reversibilidade

A extensão deve poder:

- ocultar overlays;
- remover overlays;
- restaurar original;
- reaplicar cache.
