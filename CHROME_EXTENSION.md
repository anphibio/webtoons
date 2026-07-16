# CHROME_EXTENSION.md

## Plataforma

Google Chrome com Manifest V3.

## Estrutura sugerida

```text
apps/extension/
  src/
    background/
    content/
    popup/
    options/
    workers/
    adapters/
    storage/
    messaging/
  public/
    icons/
  manifest.json
```

## Manifest

Permissões mínimas esperadas:

- `storage`
- `activeTab`
- `scripting`

Permissões adicionais somente quando justificadas.

## Content scripts

Devem:

- observar páginas suportadas;
- evitar execução destrutiva;
- usar Shadow DOM para isolar interface;
- identificar imagens;
- criar overlays;
- comunicar progresso.

## Service worker

Deve:

- manter credenciais fora do content script;
- controlar chamadas remotas;
- validar mensagens;
- aplicar timeout;
- limitar requisições;
- tratar indisponibilidade.

## Popup

Estados:

- página não suportada;
- pronta;
- analisando;
- traduzindo;
- pausada;
- concluída;
- concluída com erros;
- erro global.

## Options

Configurações mínimas:

- idioma de origem;
- idioma de destino;
- OCR local ou remoto;
- tradutor;
- chave;
- consentimento para envio remoto;
- tamanho de fonte;
- opacidade;
- concorrência;
- cache;
- depuração.

## Isolamento

Toda interface injetada deve usar Shadow DOM para reduzir conflitos com CSS da página.

## Navegação

Ao mudar de capítulo por SPA ou `history.pushState`, a extensão deve:

- cancelar tarefas anteriores;
- limpar overlays;
- recalcular o adaptador;
- reiniciar observadores.
