#!/bin/bash

# The path to the .env file and the stub file
ENV_FILE=".env.cloudrun"
STUB_FILE="openapi2-run.yaml.stub"
OUTPUT_FILE="openapi2-run.yaml"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found."
    exit 1
fi

# Copy the stub file to the output file
cp "$STUB_FILE" "$OUTPUT_FILE"

# Read each line from .env file
while IFS='=' read -r key value; do
    # Replace placeholder in the output file with value from .env file
    # Using sed to handle the replacement
    sed -i "s|\${$key}|$value|g" "$OUTPUT_FILE"
done < "$ENV_FILE"

echo "Processing complete. Output available in $OUTPUT_FILE"
