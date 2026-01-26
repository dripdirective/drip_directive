# 🚀 Dripdirective AWS Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying Dripdirective on AWS with **dripdirective.com** domain. The architecture is optimized for **10-20 concurrent users** with minimal cost (~$17-25/month during free tier).

---

## 🏗️ Architecture Overview

```
                    dripdirective.com
                           │
                           ▼
              ┌─────────────────────────┐
              │   Route 53 (DNS)        │
              │   $0.50/month           │
              └────────┬────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│  CloudFront CDN  │         │  ALB + SSL       │
│  dripdirective.com│         │  api.dripdirective│
│  FREE (50GB)     │         │  $16/month       │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
   S3 (Frontend)              EC2 t3.micro (Backend)
   5GB FREE                   750hrs FREE / $7/month
                                      │
          ┌────────────────────────────┼────────────────────┐
          │                            │                    │
          ▼                            ▼                    ▼
  RDS PostgreSQL              S3 (Uploads)        Secrets Manager
  db.t3.micro                 Pay per use          FREE
  750hrs FREE / $15/mo        ~$0.50-2/mo          
```

**Total Cost:**
- **Free Tier (First 12 months):** $17-25/month
- **After Free Tier:** $35-45/month

---

## 📦 Prerequisites

### 1. AWS Account Setup
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
pip install awscli  # Python

# Configure AWS credentials
aws configure
# Enter: 
# - AWS Access Key ID: (from IAM user)
# - AWS Secret Access Key: (from IAM user)
# - Default region: us-east-1
# - Default output format: json
```

### 2. Domain Configuration
- **Domain:** dripdirective.com (already registered)
- **Nameservers:** Will be updated to Route 53 nameservers

### 3. Local Tools
```bash
# Install required tools
pip install boto3 psycopg2-binary

# Verify installations
aws --version
python --version  # Should be 3.8+
```

---

## 🎯 Deployment Steps

### Phase 1: AWS Infrastructure Setup

#### Step 1.1: Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
    --name dripdirective.com \
    --caller-reference $(date +%s) \
    --hosted-zone-config Comment="Dripdirective production"

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --dns-name dripdirective.com \
    --query 'HostedZones[0].Id' \
    --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"

# Get name servers
aws route53 get-hosted-zone \
    --id $HOSTED_ZONE_ID \
    --query 'DelegationSet.NameServers' \
    --output table
```

**⚠️ IMPORTANT:** Update your domain registrar (e.g., GoDaddy, Namecheap) with the AWS nameservers from the output above.

#### Step 1.2: Request SSL Certificate

```bash
# Request certificate for domain and subdomains
aws acm request-certificate \
    --domain-name dripdirective.com \
    --subject-alternative-names "*.dripdirective.com" \
    --validation-method DNS \
    --region us-east-1

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
    --region us-east-1 \
    --query 'CertificateSummaryList[?DomainName==`dripdirective.com`].CertificateArn' \
    --output text)

echo "Certificate ARN: $CERT_ARN"

# Get validation records
aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

#### Step 1.3: Add DNS Validation Records

```bash
# Get validation details
VALIDATION_NAME=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Name' \
    --output text)

VALIDATION_VALUE=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Value' \
    --output text)

# Create validation record
cat > /tmp/validation-record.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "$VALIDATION_NAME",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "$VALIDATION_VALUE"}]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file:///tmp/validation-record.json

# Wait for validation (5-10 minutes)
echo "⏳ Waiting for certificate validation..."
aws acm wait certificate-validated \
    --certificate-arn $CERT_ARN \
    --region us-east-1

echo "✅ Certificate validated!"
```

#### Step 1.4: Create S3 Buckets

```bash
# Create unique bucket names (replace YOUR_UNIQUE_ID)
UPLOAD_BUCKET="dripdirective-uploads-$(date +%s)"
FRONTEND_BUCKET="dripdirective-frontend-$(date +%s)"

# Create uploads bucket
aws s3 mb s3://$UPLOAD_BUCKET --region us-east-1

# Create frontend bucket
aws s3 mb s3://$FRONTEND_BUCKET --region us-east-1

# Enable CORS for uploads bucket
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
    --bucket $UPLOAD_BUCKET \
    --cors-configuration file:///tmp/cors.json

# Enable static website hosting for frontend
aws s3 website s3://$FRONTEND_BUCKET \
    --index-document index.html \
    --error-document index.html

echo "✅ S3 buckets created:"
echo "   Uploads: $UPLOAD_BUCKET"
echo "   Frontend: $FRONTEND_BUCKET"
```

#### Step 1.5: Create RDS PostgreSQL Database

```bash
# Create security group for RDS
aws ec2 create-security-group \
    --group-name dripdirective-rds-sg \
    --description "Security group for Dripdirective RDS" \
    --region us-east-1

# Get security group ID
RDS_SG_ID=$(aws ec2 describe-security-groups \
    --group-names dripdirective-rds-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow PostgreSQL from anywhere (will restrict later)
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0

# Set a strong password
DB_PASSWORD="DripDir$(openssl rand -base64 12)!"
echo "Database Password: $DB_PASSWORD" > /tmp/db-password.txt
echo "⚠️ Save this password! Stored in: /tmp/db-password.txt"

# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier dripdirective-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username dbadmin \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --vpc-security-group-ids $RDS_SG_ID \
    --backup-retention-period 7 \
    --publicly-accessible \
    --no-multi-az \
    --storage-type gp2

# Wait for database (takes 5-10 minutes)
echo "⏳ Creating RDS instance (this may take 5-10 minutes)..."
aws rds wait db-instance-available \
    --db-instance-identifier dripdirective-db

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier dripdirective-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "✅ Database created!"
echo "   Endpoint: $DB_ENDPOINT"
```

#### Step 1.6: Store Secrets in AWS Secrets Manager

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Store database URL
aws secretsmanager create-secret \
    --name dripdirective/database-url \
    --secret-string "postgresql://dbadmin:$DB_PASSWORD@$DB_ENDPOINT:5432/postgres" \
    --region us-east-1

# Store Google API key (replace with your actual key)
read -p "Enter your Google API Key: " GOOGLE_API_KEY
aws secretsmanager create-secret \
    --name dripdirective/google-api-key \
    --secret-string "$GOOGLE_API_KEY" \
    --region us-east-1

# Store JWT secret
aws secretsmanager create-secret \
    --name dripdirective/jwt-secret \
    --secret-string "$JWT_SECRET" \
    --region us-east-1

echo "✅ Secrets stored in AWS Secrets Manager"
```

#### Step 1.7: Create EC2 Instance

```bash
# Create security group for EC2
aws ec2 create-security-group \
    --group-name dripdirective-ec2-sg \
    --description "Security group for Dripdirective EC2"

EC2_SG_ID=$(aws ec2 describe-security-groups \
    --group-names dripdirective-ec2-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow SSH and HTTP
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 8000 \
    --cidr 0.0.0.0/0

# Create key pair
aws ec2 create-key-pair \
    --key-name dripdirective-key \
    --query 'KeyMaterial' \
    --output text > ~/dripdirective-key.pem

chmod 400 ~/dripdirective-key.pem

# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name dripdirective-key \
    --security-group-ids $EC2_SG_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=dripdirective-backend}]' \
    --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp2}' \
    --iam-instance-profile Name=EC2-SecretsManager-Role

# Wait for instance to be running
echo "⏳ Launching EC2 instance..."
sleep 30

# Get instance details
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=dripdirective-backend" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ EC2 instance created!"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
```

---

### Phase 2: Backend Deployment

#### Step 2.1: Connect to EC2 and Setup Environment

```bash
# SSH into EC2 instance
ssh -i ~/dripdirective-key.pem ec2-user@$PUBLIC_IP

# Once inside EC2, run these commands:

# Update system
sudo yum update -y

# Install Python 3.11
sudo yum install python3.11 python3.11-pip git -y

# Install system dependencies
sudo yum install gcc python3.11-devel postgresql-devel libjpeg-devel zlib-devel -y

# Create application directory
sudo mkdir -p /var/www/dripdirective
sudo chown ec2-user:ec2-user /var/www/dripdirective
cd /var/www/dripdirective

# Clone repository (or upload files)
git clone https://github.com/YOUR_USERNAME/drip_directive.git .

# OR upload from local machine (in a new terminal):
# scp -i ~/dripdirective-key.pem -r /Users/suvom/Desktop/POC/drip_directive/* ec2-user@$PUBLIC_IP:/var/www/dripdirective/

# Back in EC2, create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn[standard]
```

#### Step 2.2: Create Environment File

```bash
# On EC2, create .env file
cat > .env << 'EOF'
# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database (will be loaded from Secrets Manager by systemd)
DATABASE_URL=postgresql://dbadmin:PASSWORD@ENDPOINT:5432/postgres

# Security
SECRET_KEY=YOUR_JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AWS S3
USE_S3=true
S3_BUCKET_NAME=YOUR_UPLOAD_BUCKET_NAME
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

# Fetch secrets from AWS Secrets Manager
DB_URL=$(aws secretsmanager get-secret-value --secret-id dripdirective/database-url --query SecretString --output text --region us-east-1)
JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id dripdirective/jwt-secret --query SecretString --output text --region us-east-1)
GOOGLE_KEY=$(aws secretsmanager get-secret-value --secret-id dripdirective/google-api-key --query SecretString --output text --region us-east-1)

# Update .env with actual values
sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
sed -i "s|SECRET_KEY=.*|SECRET_KEY=$JWT_SECRET|" .env
sed -i "s|GOOGLE_API_KEY=.*|GOOGLE_API_KEY=$GOOGLE_KEY|" .env
sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=$UPLOAD_BUCKET|" .env

# Create necessary directories
mkdir -p chroma_data
mkdir -p uploads/user_images uploads/wardrobe_images uploads/generated uploads/tryon_images
```

#### Step 2.3: Initialize Database

```bash
# Initialize database tables
python3 << 'PYTHON_SCRIPT'
from app.database import engine, Base
from app.models import *

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database initialized successfully!")
PYTHON_SCRIPT
```

#### Step 2.4: Create Systemd Service

```bash
# Create systemd service file
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

# Create log files
sudo touch /var/log/dripdirective-access.log
sudo touch /var/log/dripdirective-error.log
sudo chown ec2-user:ec2-user /var/log/dripdirective-*.log

# Start service
sudo systemctl daemon-reload
sudo systemctl enable dripdirective
sudo systemctl start dripdirective

# Check status
sudo systemctl status dripdirective

# Test API
curl http://localhost:8000/health
```

#### Step 2.5: Setup Application Load Balancer

```bash
# Exit EC2 and run on local machine

# Get VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=isDefault,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text)

SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[0:2].SubnetId' \
    --output text)

# Create ALB security group
aws ec2 create-security-group \
    --group-name dripdirective-alb-sg \
    --description "Security group for Dripdirective ALB" \
    --vpc-id $VPC_ID

ALB_SG_ID=$(aws ec2 describe-security-groups \
    --group-names dripdirective-alb-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Create ALB
aws elbv2 create-load-balancer \
    --name dripdirective-alb \
    --subnets $SUBNET_IDS \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application

# Get ALB details
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names dripdirective-alb \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names dripdirective-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# Create target group
aws elbv2 create-target-group \
    --name dripdirective-backend-tg \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --health-check-path /health \
    --health-check-interval-seconds 30

TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --names dripdirective-backend-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Register EC2 instance
aws elbv2 register-targets \
    --target-group-arn $TARGET_GROUP_ARN \
    --targets Id=$INSTANCE_ID

# Create HTTPS listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

# Create HTTP redirect listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# Update EC2 security group to allow ALB
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 8000 \
    --source-group $ALB_SG_ID

echo "✅ ALB created: $ALB_DNS"
```

#### Step 2.6: Create DNS Record for API

```bash
# Create A record for api.dripdirective.com
cat > /tmp/api-record.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.dripdirective.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --names dripdirective-alb --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file:///tmp/api-record.json

echo "✅ API domain configured: https://api.dripdirective.com"

# Test after DNS propagation (may take 5-10 minutes)
sleep 60
curl https://api.dripdirective.com/health
```

---

### Phase 3: Frontend Deployment

#### Step 3.1: Build Frontend

```bash
# On your local machine
cd /Users/suvom/Desktop/POC/drip_directive/frontend

# Install dependencies
npm install --legacy-peer-deps
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0

# Build for production
NODE_ENV=production npx expo export:web

# This creates a 'web-build' directory
```

#### Step 3.2: Upload to S3

```bash
# Upload build files
aws s3 sync web-build/ s3://$FRONTEND_BUCKET --delete --acl public-read

echo "✅ Frontend uploaded to S3"
```

#### Step 3.3: Create CloudFront Distribution

```bash
# Create Origin Access Identity
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
    --cloud-front-origin-access-identity-config \
    CallerReference=$(date +%s),Comment="Dripdirective OAI" \
    --query 'CloudFrontOriginAccessIdentity.Id' \
    --output text)

# Update S3 bucket policy
cat > /tmp/frontend-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$FRONTEND_BUCKET/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $FRONTEND_BUCKET \
    --policy file:///tmp/frontend-bucket-policy.json

# Create CloudFront distribution (simplified)
aws cloudfront create-distribution \
    --origin-domain-name $FRONTEND_BUCKET.s3-website-us-east-1.amazonaws.com \
    --default-root-object index.html \
    --enabled

# Get CloudFront domain
CF_DOMAIN=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?DomainName=='$FRONTEND_BUCKET.s3-website-us-east-1.amazonaws.com']].DomainName" \
    --output text)

echo "CloudFront Domain: $CF_DOMAIN"
```

#### Step 3.4: Create DNS Records for Frontend

```bash
# CloudFront Hosted Zone ID (constant)
CF_HOSTED_ZONE="Z2FDTNDATAQYW2"

# Create A records
cat > /tmp/frontend-records.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "dripdirective.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CF_HOSTED_ZONE",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.dripdirective.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CF_HOSTED_ZONE",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file:///tmp/frontend-records.json

echo "✅ Frontend domains configured"
echo "   https://dripdirective.com"
echo "   https://www.dripdirective.com"
```

---

## ✅ Testing & Verification

### Test Backend

```bash
# Health check
curl https://api.dripdirective.com/health

# Create test user
curl -X POST https://api.dripdirective.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Test Frontend

```bash
# Open in browser
open https://dripdirective.com
```

### Monitor Logs

```bash
# SSH to EC2
ssh -i ~/dripdirective-key.pem ec2-user@$PUBLIC_IP

# View logs
sudo tail -f /var/log/dripdirective-error.log
sudo journalctl -u dripdirective -f
```

---

## 💰 Cost Monitoring

### Setup Billing Alerts

```bash
# Enable billing alerts
aws cloudwatch put-metric-alarm \
    --alarm-name dripdirective-cost-alert \
    --alarm-description "Alert when costs exceed $25" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold 25 \
    --comparison-operator GreaterThanThreshold \
    --region us-east-1
```

### Monitor Costs

```bash
# Check current month costs
aws ce get-cost-and-usage \
    --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
    --granularity MONTHLY \
    --metrics "BlendedCost"
```

---

## 🔧 Maintenance & Updates

### Update Backend Code

```bash
# SSH to EC2
ssh -i ~/dripdirective-key.pem ec2-user@$PUBLIC_IP

# Pull latest code
cd /var/www/dripdirective
git pull origin main

# Activate venv and install updates
source venv/bin/activate
pip install -r requirements.txt

# Restart service
sudo systemctl restart dripdirective
```

### Update Frontend

```bash
# Build locally
cd /Users/suvom/Desktop/POC/drip_directive/frontend
NODE_ENV=production npx expo export:web

# Upload to S3
aws s3 sync web-build/ s3://$FRONTEND_BUCKET --delete

# Invalidate CloudFront cache
CF_DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?DomainName=='$FRONTEND_BUCKET.s3-website-us-east-1.amazonaws.com']].Id" \
    --output text)

aws cloudfront create-invalidation \
    --distribution-id $CF_DIST_ID \
    --paths "/*"
```

---

## 🚨 Troubleshooting

### Backend not responding

```bash
# Check service status
ssh -i ~/dripdirective-key.pem ec2-user@$PUBLIC_IP
sudo systemctl status dripdirective

# Check logs
sudo journalctl -u dripdirective -n 50

# Restart service
sudo systemctl restart dripdirective
```

### Database connection errors

```bash
# Test database connectivity
ssh -i ~/dripdirective-key.pem ec2-user@$PUBLIC_IP
cd /var/www/dripdirective
source venv/bin/activate

python << EOF
from app.database import engine
try:
    engine.connect()
    print("✅ Database connected")
except Exception as e:
    print(f"❌ Database error: {e}")
EOF
```

### SSL certificate issues

```bash
# Check certificate status
aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --query 'Certificate.Status'

# Verify DNS records
dig api.dripdirective.com
dig dripdirective.com
```

---

## 📞 Support

For issues:
1. Check CloudWatch logs
2. Review application logs on EC2
3. Verify security group rules
4. Check AWS service health dashboard

---

## 🎯 Next Steps

1. ✅ Monitor costs for 1 week
2. ✅ Setup CloudWatch alarms
3. ⬜ Configure automated backups
4. ⬜ Setup CI/CD pipeline (GitHub Actions)
5. ⬜ Add monitoring (CloudWatch + Datadog)
6. ⬜ Configure auto-scaling (when traffic grows)

---

**Deployment Complete! 🎉**

Your Dripdirective app is now live at:
- **Frontend:** https://dripdirective.com
- **API:** https://api.dripdirective.com
