FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy data samples for standalone testing
# In production, data comes from Catalyst Data Store
COPY ../../data/samples /app/data/samples

EXPOSE 8080

CMD ["python", "main.py"]
