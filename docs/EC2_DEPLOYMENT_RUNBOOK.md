# EC2 Deployment Runbook (what we did)

This document captures the exact working deployment flow used for **Dripdirective backend** on **EC2 (Ubuntu, ap-south-1)** using:
- **Artifact upload**: zip → S3
- **Runtime**: Docker Compose on EC2
- **API access**: Nginx reverse proxy (80/443) → backend bound to `127.0.0.1:8001`
- **Database**: RDS Postgres (same VPC)

---

## Values used in this deployment

- **Region**: `ap-south-1`
- **EC2 public IP**: `13.234.202.219`
- **EC2 public DNS**: `ec2-13-234-202-219.ap-south-1.compute.amazonaws.com`
- **EC2 instance id**: `i-03730a4d5286a26cd`
- **EC2 security group**: `sg-05095c8e653335048` (`launch-wizard-1`)
- **RDS security group**: `sg-0319bfe6ca9544ce3` (VPC default SG in this setup)
- **S3 bucket (artifacts/uploads)**: `drip-directive`
- **Backend local bind**: `127.0.0.1:8001 -> container:8000`
- **Planned API domain**: `api.dripdirective.com`
- **Frontend domain**: `dripdirective.com`

---

## 0) One-time safety checklist (do this before going public)

- **Do not commit `.env`**. Create production `.env` only on the server.
- **Rotate any exposed keys** (OpenAI keys, AWS access keys) if they ever lived in a local `.env` checked into git or shared.
- Prefer **EC2 IAM Role** for AWS access (S3), not long-term `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on the instance.

---

## 1) Prepare the deployment zip (on your laptop)

From the repo root:

```bash
cd /Users/suvom/Desktop/POC/drip_directive

ARTIFACT="drip_directive_backend_$(date +%Y%m%d_%H%M%S).zip"

# Backend-only zip (recommended)
zip -r "$ARTIFACT" \
  app \
  run.py \
  requirements.txt \
  Dockerfile \
  docker-compose.yml \
  docker-compose.ec2.yml \
  -x ".env" \
  -x "*/__pycache__/*" "*/*/__pycache__/*" "*/*/*/__pycache__/*" \
  -x "*.pyc" "*.pyo" \
  -x ".DS_Store" "*/.DS_Store" \
  -x "*.db"
```

---

## 2) Upload the zip to S3 (on your laptop)

```bash
aws s3 cp "$ARTIFACT" "s3://drip-directive/releases/$ARTIFACT" --region ap-south-1
aws s3 ls "s3://drip-directive/releases/" --region ap-south-1
```

---

## 3) Connect to EC2 (from your laptop)

```bash
chmod 400 "drip_ec2.pem"
ssh -i "drip_ec2.pem" ubuntu@ec2-13-234-202-219.ap-south-1.compute.amazonaws.com
```

If SSH times out, ensure EC2 SG inbound has **22** from **your current IP (/32)**.

---

## 4) Download + unzip on EC2

On EC2:

```bash
sudo apt update -y
sudo apt install -y unzip

mkdir -p ~/drip_release/backend
cd ~/drip_release/backend

aws s3 cp "s3://drip-directive/releases/drip_directive_backend.zip" ./drip_directive_backend.zip --region ap-south-1
unzip -o drip_directive_backend.zip
ls
```

You should see `app/`, `Dockerfile`, `docker-compose.yml`, `docker-compose.ec2.yml`, `requirements.txt`, `run.py`.

---

## 5) Create production `.env` on EC2

Create/edit `~/drip_release/backend/.env`:

```bash
cd ~/drip_release/backend
nano .env
```

Minimum recommended (example template; fill real values):

```env
ENVIRONMENT=production
SECRET_KEY=<generate-and-paste>

DATABASE_URL=postgresql://postgres:<PASSWORD>@drip-directive-db.c38qwws8itbz.ap-south-1.rds.amazonaws.com:5432/postgres

# Frontend origins (CORS is based on FRONTEND origins)
CORS_ALLOW_ORIGINS=https://dripdirective.com,https://www.dripdirective.com

# AI provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-5.2-2025-12-11
IMAGE_MODEL=gpt-5.2-2025-12-11

# Storage
USE_S3=true
S3_BUCKET_NAME=drip-directive
AWS_REGION=ap-south-1
S3_PRESIGN_URLS=false
S3_PRESIGN_EXPIRES_SECONDS=3600
```

Generate a strong secret:

```bash
openssl rand -hex 32
```

Important `.env` formatting rules:
- **No spaces around `=`**
- Avoid inline comments on value lines (ex: avoid `KEY=value # comment`)

---

## 6) Install Docker + Compose plugin (EC2, Ubuntu)

```bash
sudo apt update -y
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

---

## 7) Fix RDS connectivity (critical)

Symptom in backend logs:
- `psycopg2.OperationalError ... port 5432 failed: Connection timed out`

Fix: allow RDS inbound 5432 from the EC2 security group.

From your laptop (AWS CLI configured):

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0319bfe6ca9544ce3 \
  --region ap-south-1 \
  --ip-permissions 'IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=sg-05095c8e653335048}]'
```

---

## 8) Start the backend (EC2)

We run backend container with EC2 override so it binds to localhost only:
- Host `127.0.0.1:8001` → container `8000`

On EC2:

```bash
cd ~/drip_release/backend
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build
docker compose ps
docker compose logs -f backend
```

Health check (on EC2):

```bash
curl -f http://127.0.0.1:8001/health
```

Expected:

```json
{"status":"healthy","database":"connected", ...}
```

---

## 9) Nginx reverse proxy (public HTTP → private backend)

Open inbound rules on EC2 SG:
- 80: `0.0.0.0/0`
- 443: `0.0.0.0/0`
- 22: **your IP** only

On EC2:

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Create API site (proxy to `127.0.0.1:8001`):

```bash
sudo tee /etc/nginx/sites-available/dripdirective-api > /dev/null <<'EOF'
server {
  listen 80;
  server_name api.dripdirective.com;

  location / {
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dripdirective-api /etc/nginx/sites-enabled/dripdirective-api
sudo nginx -t && sudo systemctl reload nginx
```

Test from your laptop (by IP, but using Host header):

```bash
curl -H "Host: api.dripdirective.com" http://13.234.202.219/health
```

Note: visiting `http://13.234.202.219/docs` in a browser may show the default site unless DNS is set (because the Host header is the IP).

---

## 10) Domain + DNS (GoDaddy → Route 53) + API record

### 10.1) Point GoDaddy to Route 53 nameservers

In Route 53 hosted zone `dripdirective.com`, copy the 4 NS values.
In GoDaddy, set **custom nameservers** with **NO trailing dots**.

Example format (NO trailing `.`, GoDaddy will reject dotted hostnames):
- `ns-644.awsdns-16.net`
- `ns-1195.awsdns-21.org`
- `ns-433.awsdns-54.com`
- `ns-1717.awsdns-22.co.uk`

Verify from your laptop:

```bash
dig NS dripdirective.com +short
```

### 10.2) Create the API DNS record in Route 53

Route 53 → Hosted zone → `dripdirective.com` → **Create record**:
- Name: `api`
- Type: `A`
- Value: `13.234.202.219`
- TTL: `300`

Verify:

```bash
dig +short api.dripdirective.com
curl -f http://api.dripdirective.com/health
```

---

## 11) HTTPS (Let’s Encrypt)

After DNS works (`api.dripdirective.com` resolves to the EC2 IP):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.dripdirective.com
```

Verify:

```bash
curl -f https://api.dripdirective.com/health
```

---

## 12) Useful commands (EC2)

```bash
cd ~/drip_release/backend

docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose down

sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

---

## 13) Optional hardening: restrict Swagger docs

Goal: keep API public but protect `/docs`, `/redoc`, `/openapi.json`.

Recommended approach: Nginx basic auth (password prompt) for docs routes.

---
