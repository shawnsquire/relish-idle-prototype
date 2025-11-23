# Deployment Guide

This guide covers deploying the Relish Idle Prototype using Docker with automatic builds via GitHub Actions.

## 🐳 Docker Setup

### Quick Start with Docker Compose

```bash
# Build and run locally
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The application will be available at `http://localhost:3030`

### Manual Docker Build

```bash
# Build the image
docker build -t relish-idle-prototype .

# Run the container
docker run -d -p 3030:80 --name relish-idle-prototype relish-idle-prototype

# View logs
docker logs -f relish-idle-prototype

# Stop and remove
docker stop relish-idle-prototype
docker rm relish-idle-prototype
```

## 🚀 GitHub Actions Auto-Deployment

The repository includes a GitHub Actions workflow that automatically:
- Builds the Docker image on every push to `main`/`master`
- Pushes the image to GitHub Container Registry (ghcr.io)
- Tags images with branch name, commit SHA, and `latest`

### Setup

1. **Enable GitHub Packages**: The workflow uses `GITHUB_TOKEN` (automatically available)
2. **Manual Trigger**: You can also trigger builds manually from the Actions tab

### Pull the Pre-built Image

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull the latest image
docker pull ghcr.io/OWNER/REPO:latest

# Run it
docker run -d -p 3030:80 ghcr.io/OWNER/REPO:latest
```

Replace `OWNER/REPO` with your GitHub username and repository name.

## 🔧 Server Deployment with Nginx Reverse Proxy

### On Your Server

1. **Pull and run the container**:
   ```bash
   docker pull ghcr.io/OWNER/REPO:latest
   docker run -d \
     --name relish-idle \
     --restart unless-stopped \
     -p 127.0.0.1:3030:80 \
     ghcr.io/OWNER/REPO:latest
   ```

2. **Configure Nginx reverse proxy**:

   Create `/etc/nginx/sites-available/relish-idle`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:3030;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/relish-idle /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Optional: Setup SSL with Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Auto-Update Script

Create a script to automatically pull and restart:

```bash
#!/bin/bash
# update-relish-idle.sh

echo "Pulling latest image..."
docker pull ghcr.io/OWNER/REPO:latest

echo "Stopping old container..."
docker stop relish-idle
docker rm relish-idle

echo "Starting new container..."
docker run -d \
  --name relish-idle \
  --restart unless-stopped \
  -p 127.0.0.1:3030:80 \
  ghcr.io/OWNER/REPO:latest

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x update-relish-idle.sh
```

### Setup Auto-Update with Webhook (Optional)

You can use [webhook](https://github.com/adnanh/webhook) to automatically update when GitHub pushes:

1. Install webhook:
   ```bash
   sudo apt-get install webhook
   ```

2. Create webhook configuration and point it to your update script

3. Add the webhook URL to your GitHub repository settings

## 🏥 Health Checks

The container includes a health check endpoint:
```bash
curl http://localhost:3030/health
```

Check Docker health status:
```bash
docker ps
# Look for (healthy) in the STATUS column
```

## 📝 Environment Configuration

Currently, the app doesn't require environment variables. If you need to add them in the future:

### Docker Run
```bash
docker run -d -p 3030:80 \
  -e NODE_ENV=production \
  -e API_URL=https://api.example.com \
  relish-idle-prototype
```

### Docker Compose
Add to `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - API_URL=https://api.example.com
```

## 🔍 Troubleshooting

### View container logs
```bash
docker logs relish-idle
```

### Check if container is running
```bash
docker ps -a | grep relish-idle
```

### Rebuild without cache
```bash
docker build --no-cache -t relish-idle-prototype .
```

### Test nginx config in container
```bash
docker exec relish-idle nginx -t
```

## 🔄 Development Workflow

1. **Local development**: `npm run dev`
2. **Test Docker build**: `docker-compose up`
3. **Push to GitHub**: Triggers automatic build and push to registry
4. **Deploy to server**: Pull latest image and restart container

## 📊 Monitoring

The nginx container logs all requests. View them with:
```bash
docker logs -f relish-idle
```

For production monitoring, consider:
- Docker health checks (already configured)
- External monitoring (UptimeRobot, Pingdom, etc.)
- Log aggregation (if running multiple services)
