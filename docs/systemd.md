# Systemd Service Configuration

The application runs as a systemd service for automatic startup and management.

## Service File

Location: `/etc/systemd/system/corpotismbot.service`

```ini
[Unit]
Description=Corpotism Bot
After=network.target

[Service]
User=matt
Group=matt
WorkingDirectory=/home/matt/corpotismbot
Environment="PATH=/home/matt/corpotismbot/venv/bin"
ExecStart=/home/matt/corpotismbot/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5001 app:app

[Install]
WantedBy=multi-user.target
```

## Managing the Service

```bash
# Start the service
sudo systemctl start corpotismbot

# Stop the service
sudo systemctl stop corpotismbot

# Restart the service
sudo systemctl restart corpotismbot

# Enable service to start on boot
sudo systemctl enable corpotismbot

# Check service status
sudo systemctl status corpotismbot

# View service logs
sudo journalctl -u corpotismbot -n 50
```

## Common Issues

1. **Service Won't Start**:
   - Check logs: `sudo journalctl -u corpotismbot -n 50`
   - Verify paths in service file
   - Check permissions on directories
   - Ensure virtual environment is activated

2. **Permission Issues**:
   - Verify User/Group settings
   - Check file ownership: `ls -l /home/matt/corpotismbot`
   - Check directory permissions: `ls -ld /home/matt/corpotismbot`

3. **Port Already in Use**:
   - Check if another process is using port 5001: `sudo netstat -tulpn | grep 5001`
   - Stop conflicting process or change port in service file 