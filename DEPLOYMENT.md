# Deployment Guide

This guide will help you set up automatic deployment to your server using GitHub Actions and SSH.

## Prerequisites

- A server with SSH access
- Root or sudo access on the server
- A domain name (optional, can use IP address)

## Server Setup

### 1. Install nginx

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install nginx

# For CentOS/RHEL
sudo yum install nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Create deployment directory

```bash
sudo mkdir -p /var/www/relish-idle
sudo chown $USER:$USER /var/www/relish-idle
```

### 3. Configure nginx

```bash
sudo nano /etc/nginx/sites-available/relish-idle
```

Copy the contents from `nginx.conf.example` and update:
- Replace `your-domain.com` with your actual domain or IP address
- Adjust the `root` path if needed

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/relish-idle /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 4. Configure firewall (if needed)

```bash
# For UFW (Ubuntu)
sudo ufw allow 'Nginx Full'

# For firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## SSH Key Setup

### Option A: Generate key on your local machine (Recommended)

1. Generate SSH key pair:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_relish
```

2. Copy public key to your server:
```bash
ssh-copy-id -i ~/.ssh/github_deploy_relish.pub your-user@your-server.com
```

3. Test the connection:
```bash
ssh -i ~/.ssh/github_deploy_relish your-user@your-server.com
```

4. Get the private key content (you'll need this for GitHub):
```bash
cat ~/.ssh/github_deploy_relish
```

### Option B: Generate key on the server

1. On your server:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
```

2. Add public key to authorized_keys:
```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

3. Download the private key to your local machine:
```bash
# On your local machine
scp your-user@your-server.com:~/.ssh/github_deploy ~/github_deploy_relish
cat ~/github_deploy_relish  # Copy this for GitHub
```

## GitHub Repository Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `SSH_PRIVATE_KEY` | Your private key content (entire file) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | Your server's IP or domain | `123.45.67.89` or `game.example.com` |
| `SERVER_USER` | SSH username on the server | `ubuntu`, `root`, or your username |
| `DEPLOY_PATH` | Deployment directory path | `/var/www/relish-idle` |

### 2. Verify Workflow File

The workflow file at `.github/workflows/deploy.yml` should be configured to:
- Trigger on pushes to `main` branch (or your preferred branch)
- Build the project with `npm run build`
- Deploy the `dist/` folder to your server

### 3. Update Branch Name (if needed)

Edit `.github/workflows/deploy.yml` and change the branch name:

```yaml
on:
  push:
    branches:
      - main  # Change this to match your branch
```

## Testing the Deployment

### 1. Push to trigger deployment

```bash
git add .
git commit -m "Setup auto-deployment"
git push origin main  # or your configured branch
```

### 2. Monitor the deployment

- Go to your GitHub repository → Actions tab
- Click on the latest workflow run
- Watch the deployment steps execute

### 3. Verify the site is live

Visit `http://your-server-ip` or `http://your-domain.com` in your browser

## Optional: Enable HTTPS with Let's Encrypt

### 1. Install Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### 2. Get SSL certificate

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Auto-renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

## Troubleshooting

### Deployment fails with "Permission denied"

- Check that the SSH key is correctly added to GitHub secrets
- Verify the server user has write permissions to the deployment directory
- Test SSH connection manually: `ssh -i ~/.ssh/github_deploy_relish your-user@your-server.com`

### Site not loading

- Check nginx status: `sudo systemctl status nginx`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify files were deployed: `ls -la /var/www/relish-idle`
- Test nginx configuration: `sudo nginx -t`

### Build fails in GitHub Actions

- Check the Actions tab for detailed error messages
- Verify `package.json` scripts are correct
- Test build locally: `npm run build`

### rsync errors

- Verify the `DEPLOY_PATH` in GitHub secrets matches the server directory
- Check server disk space: `df -h`
- Ensure rsync is installed on the server: `sudo apt install rsync`

## Manual Deployment (Fallback)

If GitHub Actions isn't working, you can deploy manually:

```bash
# Build locally
npm run build

# Deploy to server
rsync -avz --delete dist/ your-user@your-server.com:/var/www/relish-idle/
```

## Deployment Flow

```
Developer pushes code
        ↓
GitHub Actions triggered
        ↓
Install dependencies (npm ci)
        ↓
Build project (npm run build)
        ↓
Connect to server via SSH
        ↓
rsync dist/ to /var/www/relish-idle
        ↓
nginx serves updated files
        ↓
Users see new version
```

## Next Steps

- Set up staging environment (optional)
- Add deployment notifications (Slack, Discord, email)
- Implement health checks
- Add rollback capability
- Monitor server resources
