# Deploy no GCP (Cloud Build + Cloud Run)

Projeto GCP: `caldas-projects-dev`

## Setup inicial (uma vez)

```bash
gcloud config set project caldas-projects-dev

gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Artifact Registry

```bash
gcloud artifacts repositories create quark-web \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Quark web Docker images"
```

### Permissões do Cloud Build

O service account padrão do Cloud Build precisa publicar imagens e fazer deploy no Cloud Run:

```bash
PROJECT_NUMBER=$(gcloud projects describe caldas-projects-dev --format='value(projectNumber)')

gcloud projects add-iam-policy-binding caldas-projects-dev \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding caldas-projects-dev \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding caldas-projects-dev \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Trigger no Cloud Build (GitHub)

1. Console GCP → **Cloud Build** → **Repositories** → conectar o GitHub
2. **Triggers** → **Create trigger**
3. Evento: push na branch `main` (ou a branch desejada)
4. Configuração: **Cloud Build configuration file**
5. Local: `cloudbuild.yaml` (raiz do repositório)

Substituições opcionais no trigger (já têm default no arquivo):

| Variável | Default | Descrição |
|----------|---------|-----------|
| `_REGION` | `southamerica-east1` | Região do Cloud Run e Artifact Registry |
| `_SERVICE_NAME` | `quark-web` | Nome do serviço Cloud Run |
| `_AR_REPOSITORY` | `quark-web` | Repositório Docker no Artifact Registry |
| `_AR_HOSTNAME` | `southamerica-east1-docker.pkg.dev` | Host do registry |

## Deploy manual (teste)

Na raiz do repositório:

```bash
gcloud builds submit --project=caldas-projects-dev
```

## Após o deploy

URL do serviço:

```bash
gcloud run services describe quark-web \
  --region=southamerica-east1 \
  --format='value(status.url)'
```

## Arquivos de deploy

| Arquivo | Função |
|---------|--------|
| `Dockerfile` | Build multi-stage (pnpm monorepo → Next.js standalone) |
| `cloudbuild.yaml` | Build da imagem, push e deploy no Cloud Run |
| `.dockerignore` | Exclui cache e artefatos locais do contexto Docker |
| `apps/web/next.config.ts` | `output: "standalone"` para container |
