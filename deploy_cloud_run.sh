#!/bin/bash

service=${1}
mode=${2:-development}
env_file_arg=${3:-.env.cloudrun}
version=${4}

if [ -z "$service" ]; then
    echo "Error: No service specified. Usage: ./deploy.sh [service] [mode] [env_file] [version]"
    exit 1
fi

# Path to the service directory
service_dir="./${service}"

# Function to increment version
increment_version() {
    local v=$1
    if [[ $v =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        major="${BASH_REMATCH[1]}"
        minor="${BASH_REMATCH[2]}"
        patch="${BASH_REMATCH[3]}"
        new_version="${major}.${minor}.$((patch + 1))"
        echo "$new_version"
    else
        echo "Error: Invalid version format in .versions file"
        exit 1
    fi
}

# Check for version or increment from .versions
if [ -z "$version" ]; then
    if [ -f "${service_dir}/.versions" ]; then
        last_version_line=$(tail -n 1 "${service_dir}/.versions")
        version=$(increment_version "$(echo $last_version_line | awk '{print $1}')")
    else
        echo "Error: .versions file not found. Cannot determine the version."
        exit 1
    fi
fi


# Use specified .env file if provided
if [ ! -z "$env_file_arg" ]; then
    env_file="$service_dir/$env_file_arg"
    secrets_env_file="$service_dir/$env_file_arg.secrets"
else
    env_file="$service_dir/.env.cloudrun"
    secrets_env_file="$service_dir/.env.cloudrun.secrets"
fi

# Load environment variables from .env file
set -o allexport
if [ -f "$env_file" ]; then
    source $env_file
else
    echo "Error: .env.cloudrun file not found in the service directory."
    exit 1
fi

if [ -f "$secrets_env_file" ]; then
    source $secrets_env_file
else
    echo "Error: .env.cloudrun.secrets file not found in the service directory."
    exit 1
fi
set +o allexport

# Load ML_ENVIRONMENT from the root .env file if it exists
if [ -f "./.env.cloudrun" ]; then
    source "./.env.cloudrun"
fi

# Check for essential environment variables
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID environment variable is missing."
    exit 1
fi

if [ "$mode" != "development" ] && [ "$mode" != "staging" ] && [ "$mode" != "production" ]; then
    echo "Error: Invalid mode. Allowed values: development, staging, production"
    exit 1
fi

dockerfile_path="$service_dir"
# Handle special case for ml-reranker and ml-zero-shot-classifier
if [[ "$service" == "ml-reranker" ]] || [[ "$service" == "ml-zero-shot-classifier" ]]; then
    if [ -z "$ML_ENVIRONMENT" ]; then
        echo "Error: ML_ENVIRONMENT is not set. It must be either 'cpu' or 'gpu'."
        exit 1
    fi
    dockerfile_path="$service_dir/$ML_ENVIRONMENT"
fi

if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    docker build -t asia.gcr.io/${GCP_PROJECT_ID}/${service}:${version} "$dockerfile_path"
    docker push asia.gcr.io/${GCP_PROJECT_ID}/${service}:${version}

    # Construct the env-vars string from the .env file
    env_vars=$(awk -F '=' 'NF==2 && $2!="" { gsub(",", "\\,", $2); if (env_vars != "") env_vars = env_vars "@@"; env_vars = env_vars $1 "=" $2 } END {print env_vars}' $env_file)
    secret_env_vars=$(awk -F '=' 'NF==2 && $2!="" { if (secret_vars != "") secret_vars = secret_vars ","; secret_vars = secret_vars $1 "=" $1 ":" $2 } END {print secret_vars}' $secrets_env_file)

    gcloud run deploy \
        --memory 4G \
        --cpu 2 \
        --execution-environment gen2 \
        --max-instances 3 \
        --image asia.gcr.io/${GCP_PROJECT_ID}/${service}:${version} \
        --update-env-vars "^@@^$env_vars" \
        --update-secrets "$secret_env_vars" \
        --service-account "${SERVICE_ACCOUNT}" \
        --port 8080 \
        --concurrency 80 \
        --allow-unauthenticated \
        --region asia-southeast2 \
        --project "${GCP_PROJECT_ID}"

    service_url=$(curl -X GET -H "Authorization: Bearer $(gcloud auth print-access-token)" "https://asia-southeast2-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${GCP_PROJECT_ID}/services/${service}" | grep url)

    extracted_url=$(echo "$service_url" | grep -oP 'https://[a-zA-Z0-9_.-]+\.run\.app')

    echo $extracted_url

    echo "$version - $(date +'%Y-%m-%d %H:%M:%S')" >> "$service_dir/.versions"
else
    echo "Invalid version string"
fi
