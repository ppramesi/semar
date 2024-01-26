#!/bin/bash

# need to deploy:
# - pub sub topic (if not exists)
# - cloud functions
# - cloud scheduler

set -o allexport
if [ -f ".env.invoker" ]; then
    source .env.invoker
else
    echo "Error: .env.cloudrun file not found in the service directory."
    exit 1
fi

# deploy pub sub topic
gcloud pubsub topics create $TOPIC_NAME

# deploy cloud functions
gcloud functions deploy invoker \
    --runtime python38 \
    --trigger-topic $TOPIC_NAME \
    --entry-point main \
    --region asia-southeast2 \
    --memory 128MB \
    --timeout 3600s \
    --max-instances 1 \
    --service-account $INVOKER_SERVICE_ACCOUNT

# deploy cloud scheduler (every 1 hour)
gcloud scheduler jobs create pubsub invoker \
   --schedule "0 * * * *" \
   --topic $TOPIC_NAME \
   --message-body "" \
   --time-zone "Asia/Singapore" \
   --description "Harvest tweets every 1 hour" \
   --project $GCP_PROJECT_ID \
   --region asia-southeast2