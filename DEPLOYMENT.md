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
- **Automatically deploys to your server** (pulls new image and restarts container)

### Setup

1. **Enable GitHub Packages**: The workflow uses `GITHUB_TOKEN` (automatically available)

2. **Configure Server Secrets**: Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):
   - `SSH_PRIVATE_KEY`: Your SSH private key for server access
   - `SERVER_HOST`: Your server's hostname or IP address
   - `SERVER_USER`: SSH username (e.g., `root` or your user)

3. **Ensure Docker is installed on your server**: The deployment job expects Docker to be available

4. **Manual Trigger**: You can also trigger builds and deployments manually from the Actions tab

### How Auto-Deploy Works

When you push to `main`/`master`:
1. GitHub Actions builds the Docker image
2. Image is pushed to `ghcr.io/OWNER/REPO:latest`
3. GitHub Actions SSHs into your server
4. Pulls the latest image
5. Stops the old `relish-idle` container
6. Starts a new container with the updated image
7. Cleans up old Docker images

No manual intervention required! 🎉

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

> **Note**: This section covers **initial setup only**. After the first deployment, GitHub Actions will automatically handle updates when you push to `main`/`master`.

### On Your Server

1. **Initial container deployment** (only needed once):
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

### Manual Update Script (Optional)

> **Note**: With GitHub Actions auto-deploy enabled, this script is **no longer needed** for regular updates. Keep it as a fallback for manual deployments if needed.

Create a script to manually pull and restart:

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

### Alternative: Watchtower (Not Recommended)

> **Note**: With GitHub Actions auto-deploy, Watchtower is **not recommended** as it may cause conflicts. GitHub Actions provides better control and visibility.

If you prefer container-based auto-updates, you can use [Watchtower](https://containrrr.dev/watchtower/):

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  relish-idle \
  --interval 300
```

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
