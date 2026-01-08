# 🐳 Docker Deployment Guide

Complete guide for running Dripdirective with Docker and Docker Compose.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB free disk space

## Quick Start (3 minutes)

```bash
# 1. Clone and navigate to directory
cd drip_directive

# 2. Create environment file
cp .env.example .env

# 3. Edit .env and add your API keys
nano .env
# Required: Add OPENAI_API_KEY or GOOGLE_API_KEY

# 4. Build and start containers
docker-compose up --build

# 5. Access the application
# Backend: http://localhost:8000
# Frontend: http://localhost:8081
# API Docs: http://localhost:8000/docs
```

That's it! 🎉

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐      ┌──────────────────────┐  │
│  │  Backend Container │      │ Frontend Container   │  │
│  │  (FastAPI)         │◄─────┤ (React Native/Expo)  │  │
│  │  Port: 8000        │      │ Port: 8081           │  │
│  └────────┬───────────┘      └──────────────────────┘  │
│           │                                              │
│  ┌────────▼───────────────────────────────────────┐    │
│  │         Persistent Volumes                     │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • uploads/        - User & wardrobe images    │    │
│  │  • chroma_data/    - Vector database (NEW!)    │    │
│  │  • style_me.db     - SQLite database           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Volume Configuration

### Backend Volumes

```yaml
volumes:
  - ./uploads:/app/uploads              # Image storage
  - ./style_me.db:/app/style_me.db      # Database
  - ./chroma_data:/app/chroma_data      # ✨ Vector database (ChromaDB)
```

### Why Volumes Matter

| Volume | Purpose | Persistence |
|--------|---------|-------------|
| `uploads/` | User photos & wardrobe | ✅ Critical - Required |
| `style_me.db` | User accounts & metadata | ✅ Critical - Required |
| `chroma_data/` | Vector embeddings for AI search | ✅ Critical - Required |

**⚠️ Important**: All volumes are persistent across container restarts. If you delete them, you'll lose your data!

## ChromaDB Vector Database

### What is ChromaDB?

ChromaDB stores vector embeddings for:
- User profiles (body type, style preferences)
- Wardrobe items (colors, styles, occasions)
- Past recommendations (for diversity)

### Directory Structure

```
chroma_data/
├── {collection_id}/           # One per user/collection
│   ├── data_level0.bin       # Vector data
│   ├── header.bin            # Collection metadata
│   ├── length.bin            # Vector lengths
│   └── link_lists.bin        # HNSW index
└── chroma.sqlite3            # ChromaDB metadata
```

### Verification

Check if ChromaDB is working:

```bash
# 1. Check logs for ChromaDB initialization
docker-compose logs backend | grep -i chroma

# Expected output:
# ✓ ChromaDB initialized at /app/chroma_data

# 2. Check volume contents
docker exec dripdirective-backend ls -la /app/chroma_data

# 3. Check collection exists (after processing images)
docker exec dripdirective-backend ls -la /app/chroma_data/
```

## Environment Variables

### Required

```bash
# At least one AI provider
OPENAI_API_KEY=sk-...          # OpenAI
# OR
GOOGLE_API_KEY=...             # Google AI
```

### Optional

```bash
# Database
DATABASE_URL=sqlite:///./style_me.db

# Vector Store
VECTOR_STORE=chromadb          # chromadb, pgvector, none
CHROMADB_PATH=/app/chroma_data # Docker path (auto-configured)

# Security
SECRET_KEY=your-random-secret-key
```

## Commands

### Basic Operations

```bash
# Start services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop services
docker-compose down

# Rebuild images
docker-compose up --build

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Restart a service
docker-compose restart backend
```

### Data Management

```bash
# Backup data
docker-compose down
tar -czf backup-$(date +%Y%m%d).tar.gz uploads/ chroma_data/ style_me.db

# Restore data
tar -xzf backup-20260109.tar.gz

# Clear all data (DANGEROUS!)
docker-compose down
rm -rf uploads/* chroma_data/* style_me.db
```

### Debugging

```bash
# Check container status
docker-compose ps

# Check container health
docker inspect dripdirective-backend | grep -A 10 Health

# Enter backend container
docker exec -it dripdirective-backend bash

# Check ChromaDB files
docker exec dripdirective-backend ls -lah /app/chroma_data

# Check logs for errors
docker-compose logs backend | grep -i error
docker-compose logs backend | grep -i chroma
```

## Production Considerations

### 1. Database

For production, use PostgreSQL instead of SQLite:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dripdirective
      POSTGRES_USER: drip_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    environment:
      - DATABASE_URL=postgresql://drip_user:${DB_PASSWORD}@postgres/dripdirective

volumes:
  postgres_data:
```

### 2. Vector Store

For production, consider using pgvector with PostgreSQL:

```bash
# In .env
VECTOR_STORE=pgvector
DATABASE_URL=postgresql://...
```

### 3. Security

```bash
# Generate strong secret key
openssl rand -hex 32

# Add to .env
SECRET_KEY=<generated-key>
```

### 4. Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 5. HTTPS/SSL

Use a reverse proxy (Nginx/Traefik) for SSL:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Missing API key
#    → Add OPENAI_API_KEY or GOOGLE_API_KEY to .env

# 2. Port already in use
docker-compose down
sudo lsof -i :8000  # Find process using port
# → Change port in docker-compose.yml

# 3. Permission errors
sudo chown -R $(whoami):$(whoami) uploads/ chroma_data/
```

### ChromaDB errors

```bash
# Check if volume is mounted
docker inspect dripdirective-backend | grep -A 10 Mounts

# Check permissions
docker exec dripdirective-backend ls -la /app/chroma_data

# Reset ChromaDB (DELETES ALL VECTORS!)
docker-compose down
rm -rf chroma_data/*
docker-compose up
```

### Frontend can't connect

```bash
# Check backend is running
curl http://localhost:8000/health

# Check API_BASE_URL in frontend
docker exec dripdirective-frontend cat /app/config/api.js

# For local browser access, backend should be:
# API_BASE_URL=http://localhost:8000
```

### Database is locked

```bash
# SQLite doesn't support multiple writers
# Solution: Use single worker (already configured)
# Or upgrade to PostgreSQL for production
```

## Performance Tips

1. **Use BuildKit** for faster builds:
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **Layer caching**: Dependencies install before code copy (already optimized)

3. **Health checks**: Ensure services are ready before use (already configured)

4. **Resource limits**: Set appropriate CPU/memory limits

5. **Multi-stage builds**: Consider for smaller images (optional)

## Migration from Local to Docker

```bash
# 1. Copy existing data
cp -r uploads/ docker-uploads/
cp style_me.db docker-style_me.db
cp -r chroma_data/ docker-chroma_data/

# 2. Update paths in docker-compose.yml
volumes:
  - ./docker-uploads:/app/uploads
  - ./docker-style_me.db:/app/style_me.db
  - ./docker-chroma_data:/app/chroma_data

# 3. Start Docker
docker-compose up
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)

---

**Questions?** Open an issue on GitHub!
