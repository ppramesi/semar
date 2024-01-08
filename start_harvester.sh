#!/bin/bash

# Load the .env file
source .env

# Construct the URL
URL="http://localhost:${HARVESTER_PORT}/start"

# Execute the curl command
curl -X POST "$URL" -H "auth-token: ${AUTH_TOKEN}"
