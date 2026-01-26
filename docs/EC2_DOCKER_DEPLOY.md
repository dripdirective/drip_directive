# EC2 Docker Deployment (Backend on EC2 + Domain + HTTPS)

This guide deploys the backend container on an EC2 instance and serves it securely via Nginx + HTTPS.

## Assumptions

- OS: Ubuntu 22.04/24.04 (commands below are Ubuntu-friendly)
- You have an EC2 instance with inbound SG rules:
  - 22 from **My IP**
  - 80 from 0.0.0.0/0
  - 443 from 0.0.0.0/0
- You will use a subdomain like `api.yourdomain.com` for the backend.

## 1) SSH into EC2

```bash
ssh -i drip_ec2.pem ubuntu@13.234.202.219
```

## 2) Install Docker + Compose plugin

```bash
sudo apt update -y
sudo apt install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

## 3) Get the code on the instance

Option A (Git):

```bash
git clone YOUR_REPO_URL
cd drip_directive
```

Option B (SCP upload from your laptop):

```bash
# run from your laptop (not EC2)
scp -i drip_ec2.pem -r ./drip_directive ubuntu@13.234.202.219:/home/ubuntu/
```

## 4) Create `.env` on EC2 (do NOT commit this)

```bash
cp docs/env.example .env
nano .env
```

Minimum required values:
- `DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@<RDS_ENDPOINT>:5432/postgres`
- `SECRET_KEY=<random-long-string>`
- One AI key: `GOOGLE_API_KEY` or `OPENAI_API_KEY`
- If using S3: `USE_S3=true`, `S3_BUCKET_NAME=...`, `AWS_REGION=ap-south-1`

## 5) Start backend container (binds to localhost:8000 on EC2)

```bash
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build
docker compose ps
docker compose logs -f backend
```

Health check (run on EC2):

```bash
curl -f http://127.0.0.1:8000/health
```

## 6) Point DNS to EC2

In your DNS provider / Route 53:
- Create **A record**: `api` → `YOUR_EC2_PUBLIC_IP`

Wait for DNS to propagate:

```bash
nslookup api.yourdomain.com
```

## 7) Install Nginx + HTTPS (Let’s Encrypt)

```bash
sudo apt install -y nginx
sudo nginx -t
sudo systemctl enable --now nginx
```

Create Nginx site:

```bash
sudo tee /etc/nginx/sites-available/dripdirective-api > /dev/null <<'EOF'
server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dripdirective-api /etc/nginx/sites-enabled/dripdirective-api
sudo nginx -t
sudo systemctl reload nginx
```

Install Certbot and issue certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Verify:

```bash
curl -f https://api.yourdomain.com/health
```

## Useful commands

```bash
docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose down
```

