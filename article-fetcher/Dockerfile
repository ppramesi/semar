# Use the official Python base image
FROM python:3.8

# Set the working directory in the container
WORKDIR /usr/src

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the content of the local src directory to the working directory
COPY . .

# Command to run the Python script that starts Uvicorn
CMD ["python3", "./app/index.py"]