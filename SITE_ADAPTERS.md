# SITE_ADAPTERS.md

## Objetivo

Permitir suporte a diferentes sites sem acoplar o núcleo.

## Interface sugerida

```ts
interface SiteAdapter {
  id: string;
  matches(url: URL): boolean;
  findChapterRoot(document: Document): Element | null;
  findPageImages(root: Element): ImageCandidate[];
  observeDynamicContent(
    root: Element,
    callback: (images: ImageCandidate[]) => void
  ): () => void;
  normalizeImage(candidate: ImageCandidate): NormalizedImage;
}
```

## Adaptador genérico

Deve funcionar quando nenhum adaptador específico for encontrado.

## Adaptador específico

Pode definir:

- hostnames;
- caminho de capítulo;
- seletor do leitor;
- seletor de imagens;
- atributos lazy load;
- elementos ignorados;
- estratégia de carregamento;
- ordem de leitura;
- regras de SPA;
- permissões necessárias.

## Regras

- adaptadores não podem conter chaves;
- adaptadores não devem implementar OCR;
- adaptadores não devem implementar tradução;
- adaptadores não devem alterar imagens;
- adaptadores devem ser testáveis com fixtures.

## Testes

Cada adaptador deve possuir:

- HTML de exemplo sanitizado;
- teste de reconhecimento;
- teste de detecção de imagens;
- teste de exclusão;
- teste de conteúdo dinâmico.
