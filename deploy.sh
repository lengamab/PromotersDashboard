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

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "TZ=Europe/Madrid"

echo "✅ Deployment completed successfully!"

