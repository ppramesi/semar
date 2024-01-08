#!/bin/bash

# Generate a random string of length 48
RANDOM_STRING=$(openssl rand -base64 48)

# Escape special characters in the random string
ESCAPED_RANDOM_STRING=$(printf '%s\n' "$RANDOM_STRING" | sed -e 's/[\/&]/\\&/g')

# Export ESCAPED_RANDOM_STRING so it's available in subshells
export ESCAPED_RANDOM_STRING

# Function to update AUTH_TOKEN in a given file
update_auth_token() {
    local file=$1
    echo "Checking file: $file"
    if grep -q "^AUTH_TOKEN=" "$file"; then
        echo "Updating AUTH_TOKEN in $file"
        sed -i'' -e "/^AUTH_TOKEN=/c AUTH_TOKEN=$ESCAPED_RANDOM_STRING" "$file"

        # Verify if the file has been updated
        if grep -q "^AUTH_TOKEN=$ESCAPED_RANDOM_STRING" "$file"; then
            echo "Successfully updated AUTH_TOKEN in $file"
        else
            echo "Failed to update AUTH_TOKEN in $file"
        fi
    else
        echo "No AUTH_TOKEN found in $file"
    fi
}

# Export the function so it's available to subshells
export -f update_auth_token

# Find .env files and update AUTH_TOKEN
find . -type f -name '.env' -exec bash -c 'update_auth_token "$0"' {} \;
