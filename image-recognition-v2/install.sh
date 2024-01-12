#!/bin/bash

# Check the environment variable
if [ "$PROJECT_ENV" = "GPU" ]; then
    echo "Installing GPU requirements..."
    pip install -r requirements_gpu.txt
else
    echo "Installing CPU requirements..."
    pip install -r requirements_cpu.txt
fi
