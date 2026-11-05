#!/bin/sh
set -e

echo "=== Starting Bus Ticket Reservation Management System ==="

# Wait for Database if DB_ENGINE is mysql
if [ "$DB_ENGINE" = "mysql" ] && [ -n "$DB_HOST" ]; then
    echo "Waiting for MySQL database at $DB_HOST:$DB_PORT..."
    python << 'EOF'
import socket
import time
import os
import sys

host = os.getenv('DB_HOST', 'db')
port = int(os.getenv('DB_PORT', 3306))
connected = False

for attempt in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"MySQL service is available at {host}:{port}!")
            connected = True
            break
    except OSError:
        time.sleep(2)

if not connected:
    print(f"Timeout waiting for database at {host}:{port}", file=sys.stderr)
    sys.exit(1)
EOF
fi

# Run database migrations
echo "Applying database migrations..."
python manage.py makemigrations core --noinput
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files for Nginx..."
python manage.py collectstatic --noinput

# Seed initial data if database is empty
echo "Checking & seeding initial sample data..."
python manage.py seed_data

echo "=== System initialization complete. Starting Gunicorn server ==="
exec "$@"

