#!/bin/bash

# Load the .env file
source .env

# Check if a route is provided and if it matches allowed routes
case "$1" in
  "start"|"pause"|"unpause"|"kill")
    URL="${SCHEDULER_URL}:${SCHEDULER_PORT}/$1"
    # Execute the curl command
    curl -X POST "$URL" -H "auth-token: ${AUTH_TOKEN}"
    ;;
  *)
    echo "Error: Invalid route. Allowed routes are start, pause, unpause, and kill."
    exit 1
    ;;
esac