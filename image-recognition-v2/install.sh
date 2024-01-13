#!/bin/bash

# Load the .env file
source .env

# Check the environment variable
if [ "$IR_ENVIRONMENT" = "gpu" ]; then
    echo "Installing GPU requirements..."
    pip3 install -r requirements_gpu.txt
else
    echo "Installing CPU requirements..."
    pip3 install -r requirements_cpu.txt
fi
