#!/bin/bash

set -e

mode=${1}

ENV_FILE=".env.apigateway"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found."
    exit 1
fi

source $ENV_FILE

./build_spec.sh

timestamp=$(date +%s)

gcloud api-gateway api-configs create semar-api-gateway-config-${timestamp} \
    --api=${GCP_PROJECT_ID}-api-gateway \
    --openapi-spec=openapi2-run.yaml   \
    --project=${GCP_PROJECT_ID} \
    --backend-auth-service-account=${API_GATEWAY_SERVICE_ACCOUNT}

# Create or update the API Gateway depending on the mode
if [ "$mode" = "create" ]; then
    gcloud api-gateway gateways create semar-api-gateway \
        --api=${GCP_PROJECT_ID}-api-gateway \
        --api-config=semar-api-gateway-config-${timestamp} \
        --location=${API_GATEWAY_LOCATION} \
        --project=${GCP_PROJECT_ID}
elif [ "$mode" = "update" ]; then
    gcloud api-gateway gateways update semar-api-gateway \
        --api=${GCP_PROJECT_ID}-api-gateway \
        --api-config=semar-api-gateway-config-${timestamp} \
        --location=${API_GATEWAY_LOCATION} \
        --project=${GCP_PROJECT_ID}
else
    echo "Invalid mode. Please specify 'create' or 'update'."
    exit 1
fi