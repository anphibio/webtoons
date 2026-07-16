# Política de privacidade

## Processamento local

Por padrão, a extensão detecta as imagens e executa o OCR localmente. As imagens são mantidas em memória durante o processamento e não são enviadas a serviços externos pelo OCR local.

O cache do OCR e das traduções fica no IndexedDB do navegador. O OCR expira em sete dias e as traduções em trinta dias. Entradas expiradas são removidas quando a extensão inicia o processamento de uma página.

## Tradução remota

A tradução remota fica desativada por padrão. Para habilitá-la, o usuário precisa selecionar o provedor remoto e confirmar explicitamente o consentimento na página de configurações.

Quando habilitada, somente o texto reconhecido e os idiomas selecionados são enviados ao backend local configurado. O backend encaminha os segmentos de texto ao DeepL; as imagens não são enviadas ao DeepL.

O endereço do backend padrão é `127.0.0.1`. A chave `DEEPL_API_KEY` deve permanecer como variável de ambiente do backend e nunca deve ser colocada no código da extensão ou no repositório.

## Dados armazenados

- Preferências de idioma, fonte, opacidade e processamento: armazenamento local do Chrome.
- Token opcional do backend: armazenamento local do Chrome, usado somente no cabeçalho `X-Extension-Token`.
- OCR e traduções em cache: IndexedDB local, com expiração automática.
- Logs: apenas mensagens técnicas controladas, sem imagens, chaves ou cookies.

## Exclusão

Para remover as preferências, use as ferramentas de limpeza de dados do Chrome para a extensão. Para remover o cache de OCR e tradução, limpe os dados locais do site da extensão ou desinstale e reinstale a extensão.

O botão de cancelamento interrompe o processamento em andamento e remove os overlays, preservando as imagens originais da página.
