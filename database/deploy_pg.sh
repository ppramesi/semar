#!/bin/bash

# Define the name of the image and container as in docker-compose
IMAGE_NAME="semar-db"
CONTAINER_NAME="db"

# Define the volume name
VOLUME_NAME="db-data"

# Build the Docker image
docker build -t $IMAGE_NAME ./database

# Check if a volume with the specified name exists, if not, create it
if [ $(docker volume ls -q | grep -w $VOLUME_NAME | wc -l) -eq 0 ]; then
    echo "Creating volume $VOLUME_NAME."
    docker volume create $VOLUME_NAME
fi

# Check if a container with the same name already exists
if [ $(docker ps -a -f name=$CONTAINER_NAME | grep -w $CONTAINER_NAME | wc -l) -eq 1 ]; then
    echo "Container with the name $CONTAINER_NAME already exists. Removing it."
    docker rm -f $CONTAINER_NAME
fi

# Run the Docker container with environment variables from the .env file and volume
docker run -d --name $CONTAINER_NAME --env-file .env -p 5432:5432 -v $VOLUME_NAME:/var/lib/postgresql/data $IMAGE_NAME
