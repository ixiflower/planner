FROM python:3.11-alpine

# Set environment variables to reduce memory usage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONMALLOC=malloc

WORKDIR /app

# Install system dependencies including gcc for building packages
RUN apk add --no-cache \
    postgresql-client \
    gcc \
    musl-dev \
    libffi-dev

# Copy requirements and install Python dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make migrations and collect static files
RUN python manage.py makemigrations
RUN python manage.py migrate --no-input

EXPOSE 8000

# Run the application
CMD ["python", "manage.py", "runserver", "165.22.115.250:8000"]