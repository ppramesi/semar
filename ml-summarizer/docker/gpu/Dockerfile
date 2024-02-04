# Use an official Python runtime as a parent image
FROM nvidia/cuda:11.4.0-base-ubuntu20.04

# Set the working directory in the container
WORKDIR /usr/src

# Setting non-interactive frontend to avoid prompts
ARG DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update -y &&  \
    apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-dev

# Copy only the requirements files to leverage Docker cache
# This assumes you have separate requirements files for CPU and GPU
COPY requirements_cpu.txt requirements_gpu.txt ./

# Copy the install script
COPY install.sh ./
RUN chmod +x install.sh

# Install Python packages based on the ML_ENVIRONMENT variable
ARG ML_ENVIRONMENT=gpu
RUN ./install.sh

# Copy only preload.py (and any other files it depends on) before copying the entire application
# Adjust the path if preload.py depends on other specific files
ENV IN_DOCKER_CONTAINER true
COPY preload.py ./
RUN python3 preload.py

# Now copy the rest of your application
COPY app app/

# Define environment variable
ENV NAME World

# Run the application
CMD ["python3", "./app/index.py"]
