#!/bin/bash

##############################################################################
# Dripdirective EC2 Setup Script
# 
# Run this script on your EC2 instance after SSH-ing in.
# This script installs dependencies and sets up the backend application.
#
# Usage: 
#   1. Upload this script to EC2: scp -i key.pem setup_ec2.sh ec2-user@IP:/tmp/
#   2. SSH to EC2: ssh -i key.pem ec2-user@IP
#   3. Run: bash /tmp/setup_ec2.sh
##############################################################################

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_step() {
    echo -e "\n${GREEN}==== $1 ====${NC}\n"
}

log_step "Step 1: System Update"
sudo yum update -y
log_info "System updated"

log_step "Step 2: Install Python 3.11"
sudo yum install python3.11 python3.11-pip git -y
log_info "Python 3.11 installed"

log_step "Step 3: Install System Dependencies"
sudo yum install gcc python3.11-devel postgresql-devel libjpeg-devel zlib-devel -y
log_info "System dependencies installed"

log_step "Step 4: Create Application Directory"
sudo mkdir -p /var/www/dripdirective
sudo chown ec2-user:ec2-user /var/www/dripdirective
cd /var/www/dripdirective
log_info "Application directory created"

log_step "Step 5: Clone Repository"
read -p "Enter your GitHub repository URL (or press Enter to skip): " repo_url
if [ -n "$repo_url" ]; then
    git clone $repo_url .
    log_info "Repository cloned"
else
    log_info "Skipped git clone. You can upload files manually with SCP."
fi

log_step "Step 6: Create Virtual Environment"
python3.11 -m venv venv
source venv/bin/activate
log_info "Virtual environment created"

log_step "Step 7: Install Python Dependencies"
if [ -f requirements.txt ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn uvicorn[standard]
    log_info "Python dependencies installed"
else
    log_info "No requirements.txt found. Skipping..."
fi

log_step "Step 8: Create Directory Structure"
mkdir -p chroma_data
mkdir -p uploads/user_images uploads/wardrobe_images uploads/generated uploads/tryon_images
log_info "Directory structure created"

log_step "Step 9: Create Environment File"
cat > .env << 'EOF'
# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database (will be fetched from Secrets Manager)
DATABASE_URL=postgresql://dbadmin:PASSWORD@ENDPOINT:5432/postgres

# Security
SECRET_KEY=YOUR_JWT_SECRET

# AWS S3
USE_S3=true
S3_BUCKET_NAME=YOUR_BUCKET_NAME
AWS_REGION=us-east-1

# CORS
CORS_ALLOW_ORIGINS=https://dripdirective.com,https://www.dripdirective.com,https://api.dripdirective.com

# AI Configuration
LLM_PROVIDER=google
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
LLM_MODEL=gemini-2.0-flash
IMAGE_MODEL=gemini-2.0-flash-exp

# Vector Store
VECTOR_STORE=chromadb
CHROMADB_PATH=/var/www/dripdirective/chroma_data
EOF
log_info "Environment file created (edit with actual values)"

log_step "Step 10: Fetch Secrets from AWS"
if command -v aws &> /dev/null; then
    DB_URL=$(aws secretsmanager get-secret-value --secret-id dripdirective/database-url --query SecretString --output text --region us-east-1 2>/dev/null || echo "")
    JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id dripdirective/jwt-secret --query SecretString --output text --region us-east-1 2>/dev/null || echo "")
    GOOGLE_KEY=$(aws secretsmanager get-secret-value --secret-id dripdirective/google-api-key --query SecretString --output text --region us-east-1 2>/dev/null || echo "")
    
    if [ -n "$DB_URL" ]; then
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
        log_info "Database URL fetched"
    fi
    
    if [ -n "$JWT_SECRET" ]; then
        sed -i "s|SECRET_KEY=.*|SECRET_KEY=$JWT_SECRET|" .env
        log_info "JWT secret fetched"
    fi
    
    if [ -n "$GOOGLE_KEY" ]; then
        sed -i "s|GOOGLE_API_KEY=.*|GOOGLE_API_KEY=$GOOGLE_KEY|" .env
        log_info "Google API key fetched"
    fi
    
    # Get S3 bucket name from environment or prompt
    read -p "Enter S3 bucket name (e.g., dripdirective-uploads-xxx): " bucket_name
    if [ -n "$bucket_name" ]; then
        sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=$bucket_name|" .env
        log_info "S3 bucket name updated"
    fi
else
    log_info "AWS CLI not found. Please edit .env manually."
fi

log_step "Step 11: Initialize Database"
if [ -f app/database.py ]; then
    python3 << 'PYTHON_SCRIPT'
from app.database import engine, Base
from app.models import *

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database initialized successfully!")
PYTHON_SCRIPT
    log_info "Database initialized"
else
    log_info "Database initialization skipped (app/database.py not found)"
fi

log_step "Step 12: Create Systemd Service"
sudo tee /etc/systemd/system/dripdirective.service << 'EOF'
[Unit]
Description=Dripdirective FastAPI Application
After=network.target

[Service]
Type=notify
User=ec2-user
Group=ec2-user
WorkingDirectory=/var/www/dripdirective
Environment="PATH=/var/www/dripdirective/venv/bin"
EnvironmentFile=/var/www/dripdirective/.env
ExecStart=/var/www/dripdirective/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 300 \
    --access-logfile /var/log/dripdirective-access.log \
    --error-logfile /var/log/dripdirective-error.log
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
KillSignal=SIGTERM
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo touch /var/log/dripdirective-access.log
sudo touch /var/log/dripdirective-error.log
sudo chown ec2-user:ec2-user /var/log/dripdirective-*.log

log_info "Systemd service created"

log_step "Step 13: Start Service"
sudo systemctl daemon-reload
sudo systemctl enable dripdirective
sudo systemctl start dripdirective

sleep 3
sudo systemctl status dripdirective --no-pager

log_step "Step 14: Test API"
sleep 5
curl http://localhost:8000/health || log_info "API not responding yet, check logs"

echo ""
log_step "Setup Complete!"
echo ""
log_info "Service Commands:"
echo "  Status:  sudo systemctl status dripdirective"
echo "  Restart: sudo systemctl restart dripdirective"
echo "  Logs:    sudo journalctl -u dripdirective -f"
echo "  Error:   sudo tail -f /var/log/dripdirective-error.log"
echo ""
log_info "Test API: curl http://localhost:8000/health"
