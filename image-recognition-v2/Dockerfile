# Use an official PyTorch runtime as a parent image
FROM nvcr.io/nvidia/pytorch:23.12-py3

# Set the working directory in the container
WORKDIR /src/app

# Copy the current directory contents into the container at /usr/src/app
COPY . .

# Install any needed packages specified in requirements files
ARG PROJECT_ENV
COPY install.sh /src/app/install.sh
RUN chmod +x /src/app/install.sh && /src/app/install.sh

# Define environment variable
ENV NAME World

# Run the application
CMD ["python", "./server.py"]
