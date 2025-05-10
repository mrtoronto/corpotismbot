#!/bin/bash

# Get the PID of the current Gunicorn master process
OLD_PID=$(pgrep -f "gunicorn.*app:app")

if [ ! -z "$OLD_PID" ]; then
    echo "Sending graceful reload signal to Gunicorn..."
    kill -HUP $OLD_PID
else
    echo "No existing Gunicorn process found, starting new one..."
    cd /home/matt/corpotismbot
    poetry run gunicorn --workers 4 --bind 127.0.0.1:5001 app:app --daemon
fi

# Wait for new workers to start
sleep 5

# Verify the process is running
NEW_PID=$(pgrep -f "gunicorn.*app:app")
if [ ! -z "$NEW_PID" ]; then
    echo "Gunicorn successfully restarted/reloaded (PID: $NEW_PID)"
    exit 0
else
    echo "Failed to start/reload Gunicorn"
    exit 1
fi 