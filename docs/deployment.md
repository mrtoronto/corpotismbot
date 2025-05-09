# Corpotism Bot Deployment Guide

## Overview
Corpotism Bot is deployed using:
- Gunicorn as the WSGI server (running on port 5001)
- Nginx as the reverse proxy (port 80)
- Cloudflare for DNS and SSL

## Repository Structure
```
corpotismbot/
├── app.py              # Main Flask application
├── generate_content.py # Content generation logic
├── llm_utils.py       # LLM utilities
├── requirements.txt   # Python dependencies
├── static/           # Static files served by Nginx
└── templates/        # Flask templates
```

## Production Server Configuration

The following files and configurations exist ONLY on the production server and are NOT tracked in the repository:

### Server-Only Files

1. **Nginx Configuration** (`/etc/nginx/sites-available/corpotismbot`):
```nginx
server {
    listen 80;
    server_name corpotism.com www.corpotism.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

2. **Gunicorn Service** (`/etc/systemd/system/corpotismbot.service`):
See [systemd.md](systemd.md) for the complete service configuration.

3. **Virtual Environment**:
```
/home/matt/corpotismbot/venv/
```

### Cloudflare Configuration

1. **DNS Settings**:
   - A records for `corpotism.com` and `www.corpotism.com`
   - Both pointing to server IP: `134.199.220.81`
   - Proxy status: Enabled (orange cloud)

2. **SSL/TLS Settings**:
   - Encryption mode: Flexible
   - SSL certificate provided by Cloudflare

## Initial Server Setup

1. **Server Setup**:
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install python3-venv nginx

   # Clone repository
   git clone https://github.com/yourusername/corpotismbot.git
   cd corpotismbot

   # Create and activate virtual environment
   python3 -m venv venv
   source venv/bin/activate

   # Install Python packages
   pip install -r requirements.txt
   ```

2. **Configure Nginx**:
   ```bash
   # Create and edit Nginx config
   sudo vim /etc/nginx/sites-available/corpotismbot

   # Enable the site
   sudo ln -s /etc/nginx/sites-available/corpotismbot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **Setup Systemd Service**:
   ```bash
   # Create service file
   sudo vim /etc/systemd/system/corpotismbot.service
   
   # Enable and start service
   sudo systemctl enable corpotismbot
   sudo systemctl start corpotismbot
   ```

## Troubleshooting

1. **Check Gunicorn**:
   ```bash
   sudo systemctl status corpotismbot
   sudo journalctl -u corpotismbot -n 50
   ```

2. **Check Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check Connectivity**:
   ```bash
   # Test Gunicorn directly
   curl -v http://127.0.0.1:5001
   
   # Test Nginx
   curl -v http://134.199.220.81
   ```

## Security Notes

- Port 80 must be open in the firewall
- Cloudflare handles SSL/TLS encryption
- The application runs behind Nginx which provides an additional security layer 