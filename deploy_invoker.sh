#!/bin/bash

# need to deploy:
# - pub sub topic (if not exists)
# - cloud functions
# - cloud scheduler
set -e

set -o allexport
if [ -f "./invoker/.env" ]; then
    source .env.invoker
else
    echo "Error: .env.cloudrun file not found in the service directory."
    exit 1
fi

env_vars=$(awk -F '=' 'NF==2 && $2!="" { gsub(",", "\\,", $2); if (env_vars != "") env_vars = env_vars "@@"; env_vars = env_vars $1 "=" $2 } END {print env_vars}' .env.invoker)
secret_env_vars=$(awk -F '=' 'NF==2 && $2!="" { if (secret_vars != "") secret_vars = secret_vars ","; secret_vars = secret_vars $1 "=" $1 ":" $2 } END {print secret_vars}' './invoker/.env.secrets')

yarn workspace invoker run build

RESULT=$(\
  gcloud pubsub topics list \
    --filter="name.scope(topics)=${TOPIC_NAME}" \
    --format="value(name)" 2>/dev/null)

if [ "${RESULT}" == "" ]; then
  echo "Topic ${TOPIC_NAME} does not exist, creating..."
  gcloud pubsub topics create ${TOPIC_NAME}
fi

# deploy cloud functions
gcloud functions deploy invoker \
    --entry-point=invokePipeline \
    --runtime nodejs18 \
    --trigger-topic $TOPIC_NAME \
    --update-env-vars "^@@^$env_vars" \
    --update-secrets "$secret_env_vars" \
    --source "./invoker/" \
    --region asia-southeast2 \
    --memory 128Mi \
    --timeout 540s \
    --max-instances 1

# deploy cloud scheduler (every 1 hour)
gcloud scheduler jobs create pubsub invoker \
   --schedule "0 * * * *" \
   --topic $TOPIC_NAME \
   --message-body "harvest" \
   --time-zone "Asia/Singapore" \
   --description "Harvest tweets every 1 hour" \
   --project $GCP_PROJECT_ID \
   --location asia-southeast2