#!/bin/bash

# Load the .env file
source .env

# Construct the URL
URL="${SCHEDULER_URL}:${SCHEDULER_PORT}/stop"

# Execute the curl command
curl -X POST "$URL" -H "auth-token: ${AUTH_TOKEN}"
