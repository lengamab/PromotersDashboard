FROM python:3.11-slim

WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir gunicorn
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Install node dependencies
RUN npm install

# Set Python path so imports work correctly
ENV PYTHONPATH="/app/backend:${PYTHONPATH}"

# Run Gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.app:app
