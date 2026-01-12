FROM python:3.11-slim

WORKDIR /app

# Copy requirements from the root or backend folder
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything
COPY . .

# Set the working directory to where main.py actually lives
WORKDIR /app/backend

# Use Port 8080 to match your App Runner Service Settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]