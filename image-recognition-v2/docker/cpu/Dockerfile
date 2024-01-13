# Use an official PyTorch runtime as a parent image
FROM python:3.8-slim

# Set the working directory in the container
WORKDIR /usr/src

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
