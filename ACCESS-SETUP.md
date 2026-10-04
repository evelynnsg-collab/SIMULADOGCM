# Acesso por chave

Variáveis privadas na Vercel:

- `DATABASE_URL`: conexão Postgres fornecida pela integração Neon.
- `ADMIN_USERNAME`: `evelyn.saints`.
- `ADMIN_PASSWORD_HASH`: hash scrypt gerado por `scripts/hash-password.js`, recebendo a senha via stdin. Nunca salvar senha ou hash no GitHub.
- `APP_ORIGIN`: `https://simuladogcm.vercel.app` (sem barra final). Para preview, definir o domínio específico do preview.

A migração cria apenas tabelas `gcm_*` e é serializada por lock transacional. O deploy encaminha todas as rotas à função, incluindo os arquivos do material. Sem configuração, falha fechado. Não promover para produção antes de configurar os segredos e verificar o preview.

Administradora entra por `/login` e usa `/admin` para gerar, bloquear e substituir chaves. A chave completa aparece somente na criação/substituição; o banco guarda SHA-256. Substituir invalida a chave antiga e permite vincular outro navegador. Bloquear invalida sessões existentes. Sessões expiram em sete dias. A página aberta verifica revogação a cada 15 segundos.

O vínculo usa cookie HttpOnly/Secure por perfil de navegador: limpar cookies, usar navegação anônima ou trocar navegador exige substituir a chave. Não é identificação física infalível do aparelho. Conteúdo já baixado não pode ser recolhido. O histórico do repositório público e deployments anteriores contém o material anteriormente público.

Verificação local: `npm ci && npm test`. Teste usa PostgreSQL PGlite isolado e cobre autenticação, acesso aos arquivos, autorização administrativa, CSRF, corrida de primeiro vínculo, revogação e substituição.
