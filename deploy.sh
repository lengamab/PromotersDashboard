#!/usr/bin/env bash
# Deploy Promoter Dashboard & Instagram Social Studio to Google Cloud Run
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Defaults (can be overridden via environment variables)
SERVICE_NAME="${CLOUD_RUN_SERVICE:-promoters-dashboard}"
REGION="${CLOUD_RUN_REGION:-europe-west1}"

echo "======================================================================"
echo "🚀 Deploying La French Promoter Dashboard to Google Cloud Run"
echo "📍 Service: $SERVICE_NAME | Region: $REGION"
echo "======================================================================"

# Load local .env if present
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

ENV_VARS="TZ=Europe/Madrid"
[ -n "$FOURVENUES_API_KEY" ] && ENV_VARS="$ENV_VARS,FOURVENUES_API_KEY=$FOURVENUES_API_KEY"
[ -n "$INSTAGRAM_ACCOUNT_ID" ] && ENV_VARS="$ENV_VARS,INSTAGRAM_ACCOUNT_ID=$INSTAGRAM_ACCOUNT_ID"
[ -n "$INSTAGRAM_ACCESS_TOKEN" ] && ENV_VARS="$ENV_VARS,INSTAGRAM_ACCESS_TOKEN=$INSTAGRAM_ACCESS_TOKEN,IG_ACCESS_TOKEN=$INSTAGRAM_ACCESS_TOKEN"
[ -n "$IG_ACCESS_TOKEN" ] && [ -z "$INSTAGRAM_ACCESS_TOKEN" ] && ENV_VARS="$ENV_VARS,INSTAGRAM_ACCESS_TOKEN=$IG_ACCESS_TOKEN,IG_ACCESS_TOKEN=$IG_ACCESS_TOKEN"
[ -n "$GEMINI_API_KEY" ] && ENV_VARS="$ENV_VARS,GEMINI_API_KEY=$GEMINI_API_KEY"
[ -n "$RECIPIENT_EMAIL" ] && ENV_VARS="$ENV_VARS,RECIPIENT_EMAIL=$RECIPIENT_EMAIL"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "^##^$(echo "$ENV_VARS" | tr ',' '##')"

echo "✅ Deployment completed successfully!"

