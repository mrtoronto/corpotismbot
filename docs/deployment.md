# Corpotism Bot Deployment Guide

## Overview
Corpotism Bot is deployed using:
- Gunicorn as the WSGI server (running on port 5001)
- Nginx as the reverse proxy (port 80)
- Cloudflare for DNS and SSL
- GitHub Actions for automated deployment

## Repository Structure
```
corpotismbot/
├── app.py              # Main Flask application
├── generate_content.py # Content generation logic
├── llm_utils.py       # LLM utilities
├── requirements.txt   # Python dependencies
├── scripts/          # Deployment and maintenance scripts
│   └── graceful_restart.sh  # Gunicorn process management
├── static/           # Static files served by Nginx
└── templates/        # Flask templates
```

## Deployment Workflow

The application uses GitHub Actions for automated deployment. The workflow is triggered on pushes to the main branch.

### Workflow Steps:
1. **Code Checkout**: Latest code is fetched from the repository
2. **SSH Setup**: Configures SSH access to the production server
3. **Static File Sync**: Uses rsync to ensure all static assets are up to date
4. **Code Deployment**: Pulls latest changes and updates dependencies
5. **Application Restart**: Gracefully restarts the Gunicorn process

### Key Files

1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Production

on:
  push:
    branches: ["main"]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.8.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_KEY }}
      - name: Deploy to server
        env:
          HOST: ${{ secrets.DEPLOY_HOST }}
          USERNAME: ${{ secrets.DEPLOY_USER }}
        run: |
          # Sync static files and deploy
          rsync -av --delete static/ $USERNAME@$HOST:/home/matt/corpotismbot/static/
          ssh $USERNAME@$HOST "
            cd /home/matt/corpotismbot &&
            git pull origin main &&
            source venv/bin/activate &&
            pip install -r requirements.txt &&
            ./scripts/graceful_restart.sh
          "
```

2. **Graceful Restart Script** (`scripts/graceful_restart.sh`):
```bash
#!/bin/bash
# Manages Gunicorn process restart/reload
OLD_PID=$(pgrep -f "gunicorn.*app:app")

if [ ! -z "$OLD_PID" ]; then
    kill -HUP $OLD_PID  # Graceful reload
else
    cd /home/matt/corpotismbot
    source venv/bin/activate
    gunicorn --workers 4 --bind 127.0.0.1:5001 app:app --daemon
fi
```

3. **Nginx Configuration** (`/etc/nginx/sites-available/corpotismbot`):
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

    location /static/ {
        alias /home/matt/corpotismbot/static/;
    }
}
```

## Initial Server Setup

1. **Clone Repository and Setup Environment**:
   ```bash
   git clone https://github.com/yourusername/corpotismbot.git
   cd corpotismbot
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Setup Deployment Scripts**:
   ```bash
   chmod +x scripts/graceful_restart.sh
   ```

3. **Configure Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/corpotismbot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Start Application**:
   ```bash
   ./scripts/graceful_restart.sh
   ```

## GitHub Repository Setup

1. **Required Secrets**:
   - `DEPLOY_KEY`: SSH private key for server access
   - `DEPLOY_HOST`: Server hostname or IP
   - `DEPLOY_USER`: SSH username for deployment

2. **SSH Key Setup**:
   - Generate deployment key pair: `ssh-keygen -t ed25519 -C "github-actions-deploy"`
   - Add private key to GitHub repository secrets
   - Add public key to server's `~/.ssh/authorized_keys`

## Troubleshooting

1. **Check Application Status**:
   ```bash
   pgrep -f "gunicorn.*app:app"  # Check if process is running
   tail -f /var/log/nginx/error.log  # Check Nginx errors
   ```

2. **Manual Deployment**:
   If GitHub Actions deployment fails, you can manually deploy:
   ```bash
   cd /home/matt/corpotismbot
   git pull origin main
   source venv/bin/activate
   pip install -r requirements.txt
   ./scripts/graceful_restart.sh
   ```

3. **Common Issues**:
   - **Static Files Not Updated**: Check rsync output in GitHub Actions logs
   - **Application Not Restarting**: Check if graceful_restart.sh is executable
   - **502 Bad Gateway**: Verify Gunicorn is running on port 5001

## Security Notes

- The application runs without root privileges
- Static file serving is handled by Nginx
- Cloudflare provides SSL/TLS encryption
- SSH keys are used for secure deployment
- No direct systemd interaction required 