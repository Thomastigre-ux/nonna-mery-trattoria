# Painel de conteúdo — Nonna Mery

O site usa o próprio repositório GitHub como armazenamento de conteúdo.

Na Vercel, configure estas variáveis de ambiente em Production, Preview e Development:

- `CMS_ADMIN_PASSWORD`: PIN/senha que o restaurante usará no painel.
- `CMS_GITHUB_TOKEN`: token Fine-grained do GitHub com acesso apenas ao repositório `Thomastigre-ux/nonna-mery-trattoria` e permissão **Contents: Read and write**.

O repositório e a branch já têm padrão embutido. Opcionalmente:
- `CMS_GITHUB_REPO=Thomastigre-ux/nonna-mery-trattoria`
- `CMS_GITHUB_BRANCH=main`

Depois de salvar as variáveis, faça um Redeploy na Vercel. A área “Área do restaurante” passa a publicar textos, preços, fotos e PDF para todos os visitantes.
