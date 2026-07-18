# Tratamento de erros

O pipeline mantém o erro técnico original para diagnóstico, mas o popup apresenta uma mensagem curta e orientada à ação. Isso evita expor detalhes internos do OCR, do backend ou do provedor de tradução durante o uso normal.

Mensagens específicas cobertas:

- dependências do OCR local ausentes;
- backend ou DeepL indisponível;
- imagem bloqueada pelo site (HTTP 403);
- timeout do OCR ou da tradução;
- falhas desconhecidas, com mensagem genérica segura.

O detalhe técnico continua sendo a origem do erro no pipeline e pode ser consultado nos logs de desenvolvimento. Nenhuma chave de API ou conteúdo da imagem é incluído na mensagem amigável.
