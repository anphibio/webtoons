# Relatório estruturado de processamento

O content script inclui no retorno de `GET_STATUS` um campo `report` com `schemaVersion: 1`.

O relatório contém:

- `status`: estado atual da tradução;
- `progress`: total, concluídas, falhas, imagens com texto e imagens sem texto;
- `failures`: até 20 falhas, com nome da imagem e motivo técnico truncado.

URLs completas não são expostas no relatório. O formato foi separado das mensagens do popup para permitir diagnóstico, modo de treinamento e exportação futura sem quebrar o contrato de mensagens existente.
