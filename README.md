# Webtoon Image Translator

Extensão para Google Chrome que identifica imagens de capítulos de webtoon, mangá ou quadrinho, detecta textos incorporados às imagens, executa OCR, traduz o conteúdo para português e aplica a tradução sobre a página sem alterar permanentemente os arquivos originais.

## Objetivo

Permitir que o usuário leia capítulos compostos por imagens mesmo quando o texto está disponível apenas em outro idioma.

A extensão deve:

- detectar automaticamente as imagens do capítulo;
- processar somente imagens relevantes para leitura;
- localizar balões, caixas de narração, efeitos sonoros e demais regiões textuais;
- executar OCR;
- traduzir o texto para português;
- posicionar a tradução sobre a região correta;
- preservar o desenho, a estrutura da página e o funcionamento do site;
- processar novas imagens conforme a rolagem;
- usar cache para evitar retrabalho;
- permitir ativar, desativar e comparar a tradução.

## Escopo inicial

O MVP será desenvolvido exclusivamente para Google Chrome usando Manifest V3.

Não faz parte do escopo inicial:

- tradução de vídeo;
- legendas SRT ou WebVTT;
- captura de áudio;
- sincronização com reprodução;
- aplicativos para Safari, Firefox ou dispositivos móveis.

## Arquitetura resumida

A solução será dividida em:

1. Extensão Chrome.
2. Motor de detecção de imagens.
3. Motor de detecção de regiões textuais.
4. OCR.
5. Motor de tradução.
6. Camada de reconstrução e sobreposição.
7. Cache local.
8. Adaptadores por site.
9. Backend opcional para modelos e serviços pesados.

## Uso com Codex

Leia primeiro:

1. `AGENTS.md`
2. `GOAL.md`
3. `PRODUCT_REQUIREMENTS.md`
4. `ARCHITECTURE.md`
5. `TASKS.md`

O Codex deve seguir as regras desses arquivos antes de criar ou alterar código.
