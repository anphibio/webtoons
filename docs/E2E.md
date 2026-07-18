# Teste E2E manual

## Objetivo

Validar o fluxo completo da extensão em uma página local, sem depender de um
site externo ou enviar imagens de teste para um provedor remoto.

## Preparação

1. Execute `npm run build`.
2. Abra `chrome://extensions`.
3. Ative o modo do desenvolvedor.
4. Carregue ou atualize a pasta `dist/` como extensão descompactada.
5. Abra um HTML de `SiteTeste/` em uma página local.
6. Abra o popup da extensão e confirme que a opção **Ignorar cache nesta
   tradução** está disponível.

## Checklist

- [ ] O popup inicia em estado `ready`.
- [ ] O capítulo é descoberto sem duplicar imagens.
- [ ] O progresso não ultrapassa o total conhecido.
- [ ] Uma imagem sem texto não cria overlay.
- [ ] Um balão traduzido permanece ancorado à imagem original após rolagem e
  resize.
- [ ] Ruído fora do balão não cria uma caixa deslocada.
- [ ] A imagem original continua recuperável pelo comando de comparação.
- [ ] A opção de ignorar cache força uma nova leitura.
- [ ] Falhas de OCR ou tradução aparecem como erro específico, sem deixar a
  interface presa em `processing`.

## Limite atual

O teste automatizado do navegador real permanece pendente. Os testes Vitest
em `tests/e2e-flow.test.ts` cobrem o fluxo imagem → OCR → tradução → overlay
em ambiente determinístico, mas não substituem a validação manual de uma
extensão instalada no Chrome.

Não automatizamos o site externo usado nos testes porque a política de
automação do navegador bloqueia esse domínio. O bloqueio é respeitado; não há
tentativa de contorná-lo.
