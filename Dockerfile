FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir gunicorn
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Set Python path so imports work correctly
ENV PYTHONPATH="/app/backend:${PYTHONPATH}"

# Run Gunicorn on the port specified by Cloud Run
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.app:app
