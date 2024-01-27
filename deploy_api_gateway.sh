#!/bin/bash

set -e

ENV_FILE=".env.apigateway"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found."
    exit 1
fi

./build_spec.sh

gcloud api-gateway api-configs create semar-api-gateway-config \
    --api=${GCP_PROJECT_ID}-api-gateway \
    --openapi-spec=openapi2-run.yaml   \
    --project=${GCP_PROJECT_ID} \
    --backend-auth-service-account=${API_GATEWAY_SERVICE_ACCOUNT}

gcloud api-gateway gateways create semar-api-gateway \
    --api=${GCP_PROJECT_ID}-api-gateway \
    --api-config=semar-api-gateway-config \
    --location=${API_GATEWAY_LOCATION} \
    --project=${GCP_PROJECT_ID}