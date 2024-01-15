# Use an official PyTorch runtime as a parent image
FROM python:3.8

# Set the working directory in the container
WORKDIR /usr/src

ARG DEBIAN_FRONTEND=noninteractive

# Install Libaries
RUN apt-get update -y &&  \
    apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-dev

# Copy the current directory contents into the container at /usr/src
COPY . .

# Install any needed packages specified in requirements files
ARG IR_ENVIRONMENT
COPY install.sh /usr/src/install.sh
RUN chmod +x /usr/src/install.sh && /usr/src/install.sh

ENV IR_ENVIRONMENT=cpu

RUN python preload.py

# Define environment variable
ENV NAME World

# Run the application
CMD ["python3", "./app/index.py"]
