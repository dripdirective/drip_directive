# 🚀 Dripdirective AWS Deployment Plan

## 📋 Overview

This document outlines the deployment strategy for Dripdirective on AWS, covering the FastAPI backend, React Native (Expo) web frontend, database, and file storage.

---

## ⚡ Lambda vs Non-Lambda: What Goes Where?

### Component Analysis

| Component | Lambda? | Reason |
|-----------|---------|--------|
| **Main API (FastAPI)** | ❌ No | Complex routing, JWT auth, needs warm connections |
| **AI Recommendations** | ✅ Yes | Long-running, sporadic, async background task |
| **Virtual Try-On** | ✅ Yes | Heavy AI workload, async, can take 30s+ |
| **Image Processing** | ✅ Yes | Event-driven (S3 trigger), stateless, quick |
| **User Image Analysis** | ✅ Yes | Background AI task, sporadic usage |
| **Auth/Login** | ❌ No | Fast, frequent, needs low latency |
| **CRUD Operations** | ❌ No | Simple, fast, frequent requests |

### 🎯 Recommended Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CloudFront (CDN)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
        ┌───────────────────┐                ┌───────────────────┐
        │   S3 (Frontend)   │                │   API Gateway     │
        │   React Web App   │                │                   │
        └───────────────────┘                └─────────┬─────────┘
                                                       │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                              ▼                         ▼                         ▼
                   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
                   │   EC2 / ECS      │     │   Lambda         │     │   Lambda         │
                   │   FastAPI Core   │     │   AI Processing  │     │   Image Process  │
                   │   - Auth         │     │   - Recommend    │     │   - Resize       │
                   │   - CRUD         │     │   - Try-On       │     │   - Compress     │
                   │   - Wardrobe     │     │   - Analysis     │     │   - Thumbnails   │
                   └────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
                            │                        │                        │
          ┌─────────────────┼────────────────────────┼────────────────────────┤
          │                 │                        │                        │
          ▼                 ▼                        ▼                        ▼
┌──────────────┐  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│     RDS      │  │   S3         │        │   SQS        │        │   S3 Trigger │
│  PostgreSQL  │  │   Images     │        │   Job Queue  │        │   Events     │
└──────────────┘  └──────────────┘        └──────────────┘        └──────────────┘
```

### Why This Split?

**Keep on EC2/ECS (Always Running):**
- ⚡ Low latency for frequent requests
- 🔐 JWT validation on every request
- 📊 Database connection pooling
- 🔄 WebSocket support (if needed later)

**Move to Lambda (Event-Driven):**
- 💰 Pay only when AI is actually running
- 📈 Auto-scale to handle spikes
- ⏱️ Long timeouts (up to 15 min)
- 🔄 Retry logic built-in

---

## 🏗️ Architecture Options

### Option A: Simple & Cost-Effective (Recommended for MVP/POC)
```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront (CDN)                         │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   S3 (Frontend)   │       │   ALB (Backend)   │
        │   Static Web App  │       │   Load Balancer   │
        └───────────────────┘       └─────────┬─────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │   EC2 Instance    │
                                    │   (FastAPI App)   │
                                    └─────────┬─────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
          ┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
          │   RDS PostgreSQL  │     │   S3 (Images)     │     │   Secrets Manager │
          │   (Database)      │     │   User Uploads    │     │   (API Keys)      │
          └───────────────────┘     └───────────────────┘     └───────────────────┘
```

**Estimated Cost: ~$50-100/month**

### Option B: Scalable & Production-Ready
```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront (CDN)                         │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   S3 (Frontend)   │       │   API Gateway     │
        └───────────────────┘       └─────────┬─────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │   ECS Fargate     │
                                    │   (Auto-scaling)  │
                                    └─────────┬─────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
          ┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
          │   RDS PostgreSQL  │     │   S3 (Images)     │     │   Secrets Manager │
          │   Multi-AZ        │     │   + CloudFront    │     │   + Parameter     │
          └───────────────────┘     └───────────────────┘     └───────────────────┘
```

**Estimated Cost: ~$150-300/month**

---

## 📦 Step-by-Step Deployment Guide

### Phase 1: Prerequisites & Setup

#### 1.1 AWS Account Setup
```bash
# Install AWS CLI
brew install awscli  # macOS
# or
pip install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1)
```

#### 1.2 Install Required Tools
```bash
# Install Terraform (Infrastructure as Code)
brew install terraform

# Install Docker
brew install docker

# Install EB CLI (if using Elastic Beanstalk)
pip install awsebcli
```

---

### Phase 2: Database Migration (SQLite → PostgreSQL)

#### 2.1 Update Database Configuration

Create `app/config_aws.py`:
```python
import os
from functools import lru_cache

class AWSSettings:
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@hostname:5432/smartwardrobe"
    )
    
    # AWS S3
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "smartwardrobe-uploads")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # API Keys
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    
    # App Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

@lru_cache()
def get_aws_settings():
    return AWSSettings()
```

#### 2.2 Update Database Connection

Modify `app/database.py` for PostgreSQL:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use environment variable for database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./style_me.db"  # Fallback for local dev
)

# Handle PostgreSQL URL format from AWS
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

#### 2.3 Create RDS PostgreSQL Instance
```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier smartwardrobe-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxx \
    --publicly-accessible
```

---

### Phase 3: S3 Setup for Image Storage

#### 3.1 Create S3 Bucket
```bash
# Create bucket
aws s3 mb s3://smartwardrobe-uploads --region us-east-1

# Enable CORS for the bucket
aws s3api put-bucket-cors --bucket smartwardrobe-uploads --cors-configuration file://cors.json
```

Create `cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

#### 3.2 Update Image Upload Code

Create `app/s3_service.py`:
```python
import boto3
import os
from botocore.exceptions import ClientError
from fastapi import UploadFile
import uuid

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('AWS_S3_BUCKET', 'smartwardrobe-uploads')
        self.cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', '')
    
    async def upload_file(self, file: UploadFile, folder: str, user_id: int) -> str:
        """Upload file to S3 and return URL"""
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{folder}/{user_id}/{uuid.uuid4()}.{file_extension}"
        
        try:
            contents = await file.read()
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=contents,
                ContentType=file.content_type
            )
            
            # Return CloudFront URL if available, else S3 URL
            if self.cloudfront_domain:
                return f"https://{self.cloudfront_domain}/{unique_filename}"
            return f"https://{self.bucket_name}.s3.amazonaws.com/{unique_filename}"
            
        except ClientError as e:
            raise Exception(f"Failed to upload to S3: {e}")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from S3"""
        try:
            # Extract key from URL
            key = file_path.split('.com/')[-1]
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def generate_presigned_url(self, file_key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for secure access"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError:
            return None

s3_service = S3Service()
```

---

### Phase 4: Backend Deployment

#### Option A: EC2 Deployment (Simple)

##### 4A.1 Create EC2 Instance
```bash
# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \  # Amazon Linux 2
    --instance-type t3.small \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxx \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=smartwardrobe-api}]'
```

##### 4A.2 Setup Script for EC2
```bash
#!/bin/bash
# setup_ec2.sh

# Update system
sudo yum update -y

# Install Python 3.11
sudo amazon-linux-extras install python3.11 -y

# Install pip and venv
sudo yum install python3-pip -y

# Install nginx
sudo amazon-linux-extras install nginx1 -y

# Create app directory
sudo mkdir -p /var/www/smartwardrobe
sudo chown ec2-user:ec2-user /var/www/smartwardrobe

# Clone your repo (or upload files)
cd /var/www/smartwardrobe
git clone https://github.com/yourusername/smartwardrobe.git .

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn uvicorn[standard]

# Create systemd service
sudo tee /etc/systemd/system/smartwardrobe.service << EOF
[Unit]
Description=Dripdirective FastAPI App
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/var/www/smartwardrobe
Environment="PATH=/var/www/smartwardrobe/venv/bin"
Environment="DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/smartwardrobe"
Environment="GOOGLE_API_KEY=your-api-key"
Environment="AWS_S3_BUCKET=smartwardrobe-uploads"
ExecStart=/var/www/smartwardrobe/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable smartwardrobe
sudo systemctl start smartwardrobe
```

##### 4A.3 Nginx Configuration
```nginx
# /etc/nginx/conf.d/smartwardrobe.conf

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/smartwardrobe/static;
    }

    client_max_body_size 50M;
}
```

#### Option B: ECS Fargate Deployment (Scalable)

##### 4B.1 Create Dockerfile
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn uvicorn[standard]

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

##### 4B.2 Build and Push to ECR
```bash
# Create ECR repository
aws ecr create-repository --repository-name smartwardrobe-api

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t smartwardrobe-api .

# Tag image
docker tag smartwardrobe-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartwardrobe-api:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartwardrobe-api:latest
```

##### 4B.3 ECS Task Definition
```json
{
  "family": "smartwardrobe-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "smartwardrobe-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartwardrobe-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "AWS_REGION", "value": "us-east-1"},
        {"name": "AWS_S3_BUCKET", "value": "smartwardrobe-uploads"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:smartwardrobe/database-url"
        },
        {
          "name": "GOOGLE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:smartwardrobe/google-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/smartwardrobe-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

### Phase 5: Frontend Deployment

#### 5.1 Build Expo Web App
```bash
cd frontend

# Update API base URL for production
# Edit config/api.js:
# export const API_BASE_URL = 'https://api.smartwardrobe.com';

# Build for web
npx expo export:web

# This creates a 'web-build' directory
```

#### 5.2 Deploy to S3 + CloudFront

```bash
# Create S3 bucket for frontend
aws s3 mb s3://smartwardrobe-frontend --region us-east-1

# Enable static website hosting
aws s3 website s3://smartwardrobe-frontend --index-document index.html --error-document index.html

# Upload build files
aws s3 sync web-build/ s3://smartwardrobe-frontend --delete

# Set bucket policy for public access
aws s3api put-bucket-policy --bucket smartwardrobe-frontend --policy file://bucket-policy.json
```

Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::smartwardrobe-frontend/*"
    }
  ]
}
```

#### 5.3 Create CloudFront Distribution
```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

---

### Phase 6: Lambda Functions for AI Processing

#### 6.1 Lambda Function: AI Recommendations

Create `lambda/recommendations/handler.py`:
```python
import json
import boto3
import google.generativeai as genai
import os

# Initialize clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Triggered by SQS when user requests recommendations
    """
    try:
        # Parse request from SQS
        for record in event['Records']:
            body = json.loads(record['body'])
            user_id = body['user_id']
            occasion = body['occasion']
            wardrobe_items = body['wardrobe_items']
            
            # Configure Gemini
            genai.configure(api_key=os.environ['GOOGLE_API_KEY'])
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            # Generate recommendations
            prompt = f"""
            Create outfit recommendations for {occasion}.
            Available wardrobe items: {json.dumps(wardrobe_items)}
            Return JSON with recommended_outfits array.
            """
            
            response = model.generate_content(prompt)
            recommendations = json.loads(response.text)
            
            # Save to database
            save_recommendations(user_id, recommendations)
            
            # Notify user (via SNS or WebSocket)
            notify_user(user_id, "Recommendations ready!")
            
        return {'statusCode': 200, 'body': 'Success'}
        
    except Exception as e:
        print(f"Error: {e}")
        raise e

def save_recommendations(user_id, recommendations):
    # Save to RDS via API call or direct connection
    pass

def notify_user(user_id, message):
    # Send push notification or update status
    pass
```

#### 6.2 Lambda Function: Virtual Try-On

Create `lambda/tryon/handler.py`:
```python
import json
import boto3
import google.generativeai as genai
from PIL import Image
import io
import os
import base64

s3_client = boto3.client('s3')
BUCKET = os.environ['S3_BUCKET']

def lambda_handler(event, context):
    """
    Generate virtual try-on images
    Triggered by SQS or API Gateway
    """
    try:
        body = json.loads(event['body']) if 'body' in event else event
        
        user_id = body['user_id']
        user_image_key = body['user_image_key']
        outfit_description = body['outfit_description']
        recommendation_id = body['recommendation_id']
        
        # Download and compress user image from S3
        user_image = download_and_compress_image(user_image_key)
        
        # Configure Gemini for image generation
        genai.configure(api_key=os.environ['GOOGLE_API_KEY'])
        model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
        
        # Generate try-on image
        prompt = f"""
        Generate a realistic image of a person wearing this outfit:
        {outfit_description}
        
        The person should have similar features to the reference image.
        Create a full-body fashion photo.
        """
        
        response = model.generate_content([prompt, user_image])
        
        # Extract generated image
        for part in response.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                image_data = part.inline_data.data
                
                # Upload to S3
                output_key = f"generated/tryon/{user_id}/{recommendation_id}.png"
                s3_client.put_object(
                    Bucket=BUCKET,
                    Key=output_key,
                    Body=base64.b64decode(image_data),
                    ContentType='image/png'
                )
                
                # Return S3 URL
                url = f"https://{BUCKET}.s3.amazonaws.com/{output_key}"
                return {
                    'statusCode': 200,
                    'body': json.dumps({'image_url': url})
                }
        
        return {'statusCode': 500, 'body': 'No image generated'}
        
    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'body': str(e)}

def download_and_compress_image(s3_key):
    """Download from S3 and compress for AI"""
    response = s3_client.get_object(Bucket=BUCKET, Key=s3_key)
    image = Image.open(io.BytesIO(response['Body'].read()))
    
    # Resize to max 512px
    max_size = 512
    ratio = min(max_size / image.width, max_size / image.height)
    if ratio < 1:
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.LANCZOS)
    
    # Convert to bytes
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return buffer.read()
```

#### 6.3 Lambda Function: Image Processing (S3 Trigger)

Create `lambda/image_processor/handler.py`:
```python
import json
import boto3
from PIL import Image
import io
import os

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    """
    Automatically triggered when image is uploaded to S3
    Creates thumbnails and optimizes images
    """
    try:
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            # Skip if already processed
            if '/processed/' in key or '/thumbnails/' in key:
                continue
            
            # Download original image
            response = s3_client.get_object(Bucket=bucket, Key=key)
            image = Image.open(io.BytesIO(response['Body'].read()))
            
            # Create thumbnail (200x200)
            thumbnail = create_thumbnail(image, 200)
            thumbnail_key = key.replace('/user_images/', '/thumbnails/')
            upload_image(bucket, thumbnail_key, thumbnail)
            
            # Create optimized version (max 1024px)
            optimized = optimize_image(image, 1024)
            optimized_key = key.replace('/user_images/', '/processed/')
            upload_image(bucket, optimized_key, optimized)
            
            print(f"Processed: {key}")
            
        return {'statusCode': 200, 'body': 'Images processed'}
        
    except Exception as e:
        print(f"Error: {e}")
        raise e

def create_thumbnail(image, size):
    """Create square thumbnail"""
    img = image.copy()
    img.thumbnail((size, size), Image.LANCZOS)
    return img

def optimize_image(image, max_size):
    """Optimize image for web"""
    ratio = min(max_size / image.width, max_size / image.height)
    if ratio < 1:
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.LANCZOS)
    return image

def upload_image(bucket, key, image, quality=85):
    """Upload image to S3"""
    buffer = io.BytesIO()
    
    # Convert to RGB if necessary (for JPEG)
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    image.save(buffer, format='JPEG', quality=quality, optimize=True)
    buffer.seek(0)
    
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=buffer.getvalue(),
        ContentType='image/jpeg'
    )
```

#### 6.4 Deploy Lambda Functions

**Using AWS SAM (Recommended):**

Create `template.yaml`:
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Dripdirective Lambda Functions

Globals:
  Function:
    Timeout: 900  # 15 minutes for AI tasks
    MemorySize: 1024
    Runtime: python3.11
    Environment:
      Variables:
        S3_BUCKET: !Ref ImagesBucket
        GOOGLE_API_KEY: '{{resolve:secretsmanager:smartwardrobe/google-api-key}}'

Resources:
  # S3 Bucket for images
  ImagesBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: smartwardrobe-images

  # AI Recommendations Lambda
  RecommendationsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: smartwardrobe-recommendations
      CodeUri: lambda/recommendations/
      Handler: handler.lambda_handler
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt RecommendationsQueue.Arn
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref ImagesBucket
        - AmazonRDSDataFullAccess

  # Virtual Try-On Lambda
  TryOnFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: smartwardrobe-tryon
      CodeUri: lambda/tryon/
      Handler: handler.lambda_handler
      MemorySize: 2048  # More memory for image generation
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /tryon
            Method: post
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref ImagesBucket

  # Image Processor Lambda (S3 Trigger)
  ImageProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: smartwardrobe-image-processor
      CodeUri: lambda/image_processor/
      Handler: handler.lambda_handler
      MemorySize: 512
      Timeout: 60
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref ImagesBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: user_images/
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref ImagesBucket

  # SQS Queue for async recommendations
  RecommendationsQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: smartwardrobe-recommendations-queue
      VisibilityTimeout: 900  # Match Lambda timeout

Outputs:
  TryOnApiUrl:
    Description: Try-On API URL
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/tryon"
```

**Deploy with SAM:**
```bash
# Install SAM CLI
brew install aws-sam-cli

# Build
sam build

# Deploy
sam deploy --guided
```

#### 6.5 Update FastAPI to Use Lambda

Modify `app/ai_service.py` to call Lambda:
```python
import boto3
import json
import os

# Check if running in AWS
USE_LAMBDA = os.getenv('USE_LAMBDA', 'false').lower() == 'true'
lambda_client = boto3.client('lambda') if USE_LAMBDA else None
sqs_client = boto3.client('sqs') if USE_LAMBDA else None

async def generate_recommendations_async(user_id: int, occasion: str, wardrobe_items: list):
    """Queue recommendation generation to Lambda via SQS"""
    if USE_LAMBDA:
        # Send to SQS queue for Lambda processing
        sqs_client.send_message(
            QueueUrl=os.environ['RECOMMENDATIONS_QUEUE_URL'],
            MessageBody=json.dumps({
                'user_id': user_id,
                'occasion': occasion,
                'wardrobe_items': wardrobe_items
            })
        )
        return {'status': 'queued', 'message': 'Recommendations are being generated'}
    else:
        # Local processing (for development)
        return await generate_recommendations_local(user_id, occasion, wardrobe_items)

async def generate_tryon_lambda(user_id: int, user_image_key: str, outfit: dict, recommendation_id: int):
    """Call Lambda for try-on generation"""
    if USE_LAMBDA:
        response = lambda_client.invoke(
            FunctionName='smartwardrobe-tryon',
            InvocationType='RequestResponse',  # Sync call
            Payload=json.dumps({
                'user_id': user_id,
                'user_image_key': user_image_key,
                'outfit_description': outfit.get('description', ''),
                'recommendation_id': recommendation_id
            })
        )
        result = json.loads(response['Payload'].read())
        return json.loads(result.get('body', '{}'))
    else:
        # Local processing
        return await generate_tryon_local(user_id, user_image_key, outfit)
```

---

### Phase 7: Domain & SSL Setup

#### 6.1 Route 53 (DNS)
```bash
# Create hosted zone
aws route53 create-hosted-zone --name smartwardrobe.com --caller-reference $(date +%s)

# Add A record pointing to CloudFront/ALB
```

#### 6.2 ACM (SSL Certificate)
```bash
# Request certificate
aws acm request-certificate \
    --domain-name smartwardrobe.com \
    --subject-alternative-names "*.smartwardrobe.com" \
    --validation-method DNS
```

---

### Phase 7: Environment Variables & Secrets

#### 7.1 AWS Secrets Manager
```bash
# Store database credentials
aws secretsmanager create-secret \
    --name smartwardrobe/database-url \
    --secret-string "postgresql://user:password@rds-endpoint:5432/smartwardrobe"

# Store Google API key
aws secretsmanager create-secret \
    --name smartwardrobe/google-api-key \
    --secret-string "your-google-api-key"

# Store JWT secret
aws secretsmanager create-secret \
    --name smartwardrobe/jwt-secret \
    --secret-string "your-jwt-secret-key"
```

---

## 📊 Cost Estimation

### Option A: Simple Setup (MVP) - EC2 Only
| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| EC2 | t3.small (1 instance) | ~$15 |
| RDS | db.t3.micro (PostgreSQL) | ~$15 |
| S3 | 10GB storage + transfers | ~$5 |
| CloudFront | 50GB transfer | ~$5 |
| Route 53 | 1 hosted zone | ~$0.50 |
| **Total** | | **~$40-50/month** |

### Option B: Hybrid with Lambda (Recommended) ⭐
| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| EC2 | t3.micro (API only) | ~$8 |
| Lambda | AI Processing (~1000 invocations) | ~$5 |
| Lambda | Try-On (~500 invocations) | ~$10 |
| Lambda | Image Processing (~2000 invocations) | ~$2 |
| RDS | db.t3.micro (PostgreSQL) | ~$15 |
| S3 | 20GB storage + transfers | ~$5 |
| SQS | Message queue | ~$1 |
| CloudFront | 50GB transfer | ~$5 |
| **Total** | | **~$50-60/month** |

**Lambda Savings:**
- 💰 Pay only when AI is running (not 24/7)
- 📈 Auto-scales for traffic spikes
- 🔧 Smaller EC2 instance (just API)

### Option C: Production with Lambda
| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 1 task (0.5 vCPU, 1GB) | ~$25 |
| Lambda | AI Processing (~5000 invocations) | ~$25 |
| Lambda | Try-On (~2000 invocations) | ~$40 |
| Lambda | Image Processing (~10000 invocations) | ~$10 |
| RDS | db.t3.small (Multi-AZ) | ~$50 |
| S3 | 50GB storage + transfers | ~$10 |
| SQS | Message queue | ~$2 |
| CloudFront | 200GB transfer | ~$20 |
| ALB | Application Load Balancer | ~$20 |
| **Total** | | **~$200-250/month** |

### Lambda Pricing Breakdown
```
Lambda Pricing (us-east-1):
- $0.20 per 1M requests
- $0.0000166667 per GB-second

Example: Try-On Function (2GB RAM, 60s avg runtime)
- 500 invocations/month
- = 500 × 60s × 2GB = 60,000 GB-seconds
- = 60,000 × $0.0000166667 = ~$1.00
- + 500 × $0.0000002 = ~$0.0001
- Total: ~$1/month for 500 try-ons!

vs EC2 running 24/7 for same workload: ~$15-30/month
```

---

## 👥 Handling Concurrent Users & Processing

### Architecture for Concurrency

```
                                    ┌─────────────────────┐
                                    │   CloudFront (CDN)  │
                                    │   Cache + Edge      │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   API Gateway       │
                                    │   Rate Limiting     │
                                    │   Request Throttle  │
                                    └──────────┬──────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                              ▼                ▼                ▼
                    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                    │   ALB       │  │   Lambda    │  │   Lambda    │
                    │   (Auto)    │  │   (Auto)    │  │   (Auto)    │
                    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                           │                │                │
              ┌────────────┼────────────────┤                │
              │            │                │                │
              ▼            ▼                ▼                ▼
        ┌──────────┐ ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  ECS 1   │ │  ECS 2   │    │   SQS    │    │   S3     │
        │ FastAPI  │ │ FastAPI  │    │  Queue   │    │  Images  │
        └────┬─────┘ └────┬─────┘    └────┬─────┘    └──────────┘
             │            │               │
             └─────┬──────┘               │
                   │                      │
         ┌─────────▼─────────┐   ┌────────▼────────┐
         │  RDS PostgreSQL   │   │  ElastiCache    │
         │  Read Replicas    │   │  Redis Queue    │
         └───────────────────┘   └─────────────────┘
```

### 1️⃣ API Layer Concurrency

#### FastAPI with Gunicorn Workers
```python
# gunicorn.conf.py
import multiprocessing

# Workers = (2 × CPU cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
bind = "0.0.0.0:8000"

# Connection handling
worker_connections = 1000
max_requests = 5000
max_requests_jitter = 500
timeout = 120
keepalive = 5
```

```bash
# Run with Gunicorn
gunicorn app.main:app -c gunicorn.conf.py
```

#### Async FastAPI Handlers
```python
# app/main.py - Optimize for concurrency
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create connection pools
    app.state.db_pool = await create_db_pool()
    app.state.redis = await create_redis_pool()
    yield
    # Shutdown: Close pools
    await app.state.db_pool.close()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)

# Use async endpoints for I/O operations
@app.get("/api/wardrobe")
async def get_wardrobe(user_id: int, db: AsyncSession = Depends(get_async_db)):
    # Non-blocking database query
    result = await db.execute(select(WardrobeItem).where(WardrobeItem.user_id == user_id))
    return result.scalars().all()
```

### 2️⃣ Database Connection Pooling

#### SQLAlchemy Async Pool Configuration
```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Base connections
    max_overflow=30,        # Extra connections under load
    pool_timeout=30,        # Wait time for connection
    pool_recycle=1800,      # Recycle connections every 30 min
    pool_pre_ping=True,     # Check connection health
    echo=False,
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

#### RDS Configuration for Concurrency
```sql
-- PostgreSQL settings for high concurrency
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET effective_cache_size = '768MB';

-- Connection pooling with PgBouncer (optional)
-- Reduces DB connection overhead
```

### 3️⃣ AI Processing Queue (SQS + Lambda)

#### Queue-Based Processing for Heavy Tasks
```python
# app/services/queue_service.py
import boto3
import json
from typing import Dict, Any
import os

class QueueService:
    def __init__(self):
        self.sqs = boto3.client('sqs', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self.queues = {
            'recommendations': os.getenv('RECOMMENDATIONS_QUEUE_URL'),
            'tryon': os.getenv('TRYON_QUEUE_URL'),
            'image_analysis': os.getenv('IMAGE_ANALYSIS_QUEUE_URL'),
        }
    
    async def enqueue_task(self, queue_name: str, payload: Dict[str, Any], priority: int = 0):
        """Add task to queue for async processing"""
        try:
            response = self.sqs.send_message(
                QueueUrl=self.queues[queue_name],
                MessageBody=json.dumps(payload),
                MessageAttributes={
                    'Priority': {
                        'DataType': 'Number',
                        'StringValue': str(priority)
                    }
                },
                # Delay for rate limiting (0-900 seconds)
                DelaySeconds=0
            )
            return {
                'message_id': response['MessageId'],
                'status': 'queued'
            }
        except Exception as e:
            raise Exception(f"Failed to queue task: {e}")
    
    async def get_queue_depth(self, queue_name: str) -> int:
        """Check how many tasks are pending"""
        response = self.sqs.get_queue_attributes(
            QueueUrl=self.queues[queue_name],
            AttributeNames=['ApproximateNumberOfMessages']
        )
        return int(response['Attributes']['ApproximateNumberOfMessages'])

queue_service = QueueService()
```

#### API Endpoint with Queue
```python
# app/routers/recommendations.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.services.queue_service import queue_service

router = APIRouter()

@router.post("/recommendations/generate")
async def generate_recommendations(
    request: RecommendationRequest,
    current_user: User = Depends(get_current_user)
):
    # Check queue depth to prevent overload
    queue_depth = await queue_service.get_queue_depth('recommendations')
    
    if queue_depth > 100:
        raise HTTPException(
            status_code=503,
            detail="System is busy. Please try again in a few minutes."
        )
    
    # Create pending recommendation in DB
    recommendation = await create_pending_recommendation(current_user.id, request)
    
    # Queue for Lambda processing
    await queue_service.enqueue_task('recommendations', {
        'recommendation_id': recommendation.id,
        'user_id': current_user.id,
        'occasion': request.occasion,
        'style_preference': request.style_preference,
    })
    
    return {
        'recommendation_id': recommendation.id,
        'status': 'processing',
        'message': 'Your recommendation is being generated',
        'estimated_time': '30-60 seconds'
    }
```

### 4️⃣ Rate Limiting

#### API Gateway Rate Limiting
```yaml
# serverless.yml or SAM template
RateLimiting:
  Type: AWS::ApiGateway::UsagePlan
  Properties:
    UsagePlanName: DripdirectiveUsagePlan
    Throttle:
      BurstLimit: 100      # Max concurrent requests
      RateLimit: 50        # Requests per second
    Quota:
      Limit: 10000         # Requests per day
      Period: DAY
```

#### FastAPI Rate Limiting Middleware
```python
# app/middleware/rate_limit.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str):
        super().__init__(app)
        self.redis = redis.from_url(redis_url)
        self.limits = {
            '/api/recommendations/generate': {'limit': 10, 'window': 60},    # 10 per minute
            '/api/tryon': {'limit': 5, 'window': 60},                         # 5 per minute
            '/api/images/upload': {'limit': 20, 'window': 60},               # 20 per minute
            'default': {'limit': 100, 'window': 60},                          # 100 per minute
        }
    
    async def dispatch(self, request: Request, call_next):
        # Get user identifier
        user_id = request.state.user_id if hasattr(request.state, 'user_id') else request.client.host
        path = request.url.path
        
        # Get rate limit for this endpoint
        config = self.limits.get(path, self.limits['default'])
        
        # Check rate limit
        key = f"rate_limit:{user_id}:{path}"
        current = await self.redis.incr(key)
        
        if current == 1:
            await self.redis.expire(key, config['window'])
        
        if current > config['limit']:
            raise HTTPException(
                status_code=429,
                detail={
                    'error': 'Rate limit exceeded',
                    'limit': config['limit'],
                    'window': config['window'],
                    'retry_after': await self.redis.ttl(key)
                }
            )
        
        # Add rate limit headers
        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(config['limit'])
        response.headers['X-RateLimit-Remaining'] = str(config['limit'] - current)
        response.headers['X-RateLimit-Reset'] = str(await self.redis.ttl(key))
        
        return response

# Add to FastAPI app
from app.middleware.rate_limit import RateLimitMiddleware

app.add_middleware(RateLimitMiddleware, redis_url=os.getenv('REDIS_URL'))
```

### 5️⃣ Caching Strategy

#### Redis Cache for Frequent Data
```python
# app/services/cache_service.py
import redis.asyncio as redis
import json
from typing import Optional, Any
import os

class CacheService:
    def __init__(self):
        self.redis = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
        self.default_ttl = 300  # 5 minutes
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        value = await self.redis.get(key)
        return json.loads(value) if value else None
    
    async def set(self, key: str, value: Any, ttl: int = None):
        """Set cached value"""
        await self.redis.setex(
            key, 
            ttl or self.default_ttl, 
            json.dumps(value, default=str)
        )
    
    async def delete(self, key: str):
        """Delete cached value"""
        await self.redis.delete(key)
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern"""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

cache = CacheService()

# Usage in endpoints
@router.get("/wardrobe")
async def get_wardrobe(current_user: User = Depends(get_current_user)):
    cache_key = f"wardrobe:{current_user.id}"
    
    # Try cache first
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch from DB
    items = await fetch_wardrobe_items(current_user.id)
    
    # Cache result
    await cache.set(cache_key, items, ttl=600)  # 10 min cache
    
    return items
```

#### CloudFront Caching for Static Assets
```json
{
  "CacheBehaviors": [
    {
      "PathPattern": "/static/*",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "TTL": {
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "MinTTL": 0
      }
    },
    {
      "PathPattern": "/api/*",
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "TTL": {
        "DefaultTTL": 0,
        "MaxTTL": 0,
        "MinTTL": 0
      }
    }
  ]
}
```

### 6️⃣ Auto-Scaling Configuration

#### ECS Auto-Scaling
```yaml
# CloudFormation / SAM
AutoScaling:
  Type: AWS::ApplicationAutoScaling::ScalableTarget
  Properties:
    MaxCapacity: 10
    MinCapacity: 2
    ResourceId: !Sub service/${ECSCluster}/${ECSService}
    ScalableDimension: ecs:service:DesiredCount
    ServiceNamespace: ecs

ScaleUpPolicy:
  Type: AWS::ApplicationAutoScaling::ScalingPolicy
  Properties:
    PolicyName: ScaleUp
    PolicyType: TargetTrackingScaling
    TargetTrackingScalingPolicyConfiguration:
      TargetValue: 70.0
      PredefinedMetricSpecification:
        PredefinedMetricType: ECSServiceAverageCPUUtilization
      ScaleInCooldown: 300
      ScaleOutCooldown: 60
```

#### Lambda Concurrency Limits
```yaml
# Prevent Lambda from overwhelming downstream services
RecommendationsFunction:
  Type: AWS::Serverless::Function
  Properties:
    ReservedConcurrentExecutions: 10  # Max 10 concurrent executions
    
TryOnFunction:
  Type: AWS::Serverless::Function
  Properties:
    ReservedConcurrentExecutions: 5   # Max 5 concurrent (expensive operation)
```

### 7️⃣ Handling Concurrent AI Requests

#### Semaphore for Local AI Processing
```python
# app/ai_service.py
import asyncio
from contextlib import asynccontextmanager

class AIService:
    def __init__(self, max_concurrent: int = 3):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.queue = asyncio.Queue()
    
    @asynccontextmanager
    async def rate_limited(self):
        """Limit concurrent AI requests"""
        async with self.semaphore:
            yield
    
    async def generate_recommendations(self, user_id: int, params: dict):
        async with self.rate_limited():
            # Only 3 concurrent AI calls at a time
            return await self._call_gemini(params)
    
    async def process_queue(self):
        """Background worker for AI queue"""
        while True:
            task = await self.queue.get()
            try:
                async with self.rate_limited():
                    result = await self._process_task(task)
                    await self._save_result(task['id'], result)
            except Exception as e:
                await self._mark_failed(task['id'], str(e))
            finally:
                self.queue.task_done()

ai_service = AIService(max_concurrent=3)
```

### 8️⃣ Monitoring & Alerts

#### CloudWatch Metrics
```python
# app/middleware/metrics.py
import boto3
import time
from fastapi import Request

cloudwatch = boto3.client('cloudwatch')

async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000  # ms
    
    # Send custom metrics
    cloudwatch.put_metric_data(
        Namespace='Dripdirective',
        MetricData=[
            {
                'MetricName': 'RequestLatency',
                'Value': duration,
                'Unit': 'Milliseconds',
                'Dimensions': [
                    {'Name': 'Endpoint', 'Value': request.url.path},
                    {'Name': 'Method', 'Value': request.method}
                ]
            },
            {
                'MetricName': 'RequestCount',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'StatusCode', 'Value': str(response.status_code)}
                ]
            }
        ]
    )
    
    return response
```

#### Alert Configuration
```bash
# High latency alert
aws cloudwatch put-metric-alarm \
    --alarm-name "Dripdirective-HighLatency" \
    --metric-name RequestLatency \
    --namespace Dripdirective \
    --statistic Average \
    --period 300 \
    --threshold 5000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alerts

# Queue backup alert
aws cloudwatch put-metric-alarm \
    --alarm-name "Dripdirective-QueueBacklog" \
    --metric-name ApproximateNumberOfMessagesVisible \
    --namespace AWS/SQS \
    --statistic Average \
    --period 300 \
    --threshold 50 \
    --comparison-operator GreaterThanThreshold
```

### 📊 Concurrency Limits Summary

| Component | Concurrent Limit | Why |
|-----------|-----------------|-----|
| **API (ECS)** | 2-10 instances | Auto-scale on CPU |
| **DB Connections** | 50 per instance | Pool size |
| **Lambda Recommendations** | 10 concurrent | Rate limit Gemini API |
| **Lambda Try-On** | 5 concurrent | Heavy + expensive |
| **Lambda Image Process** | 20 concurrent | Lightweight |
| **Rate Limit (User)** | 100 req/min | Prevent abuse |
| **AI Rate Limit** | 10 req/min | Cost control |

### 🚦 Traffic Flow Under Load

```
100 concurrent users
        │
        ▼
┌─────────────────┐
│   CloudFront    │  ← Caches static (90% served from edge)
└────────┬────────┘
         │ 10 API requests/sec
         ▼
┌─────────────────┐
│   API Gateway   │  ← Rate limiting (throttle abusers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ALB           │  ← Distributes to healthy instances
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ ECS1 │  │ ECS2 │  ← Auto-scales 2→10 instances
└──┬───┘  └──┬───┘
   │         │
   └────┬────┘
        │
        ▼
┌─────────────────┐
│  Redis Cache    │  ← 80% cache hit, reduces DB load
└────────┬────────┘
         │ 20% cache miss
         ▼
┌─────────────────┐
│  RDS (50 conn)  │  ← Connection pooling
└─────────────────┘

AI Requests → SQS Queue → Lambda (max 10 concurrent)
```

---

## 🔐 Security Checklist

- [ ] Enable HTTPS everywhere (ACM certificates)
- [ ] Use IAM roles instead of access keys
- [ ] Store secrets in Secrets Manager
- [ ] Enable VPC for database (not publicly accessible)
- [ ] Configure security groups properly
- [ ] Enable CloudWatch logging
- [ ] Set up WAF for API protection
- [ ] Enable S3 bucket versioning
- [ ] Configure backup retention for RDS
- [ ] Use environment-specific configurations

---

## 🚀 Quick Start Commands

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/smartwardrobe.git
cd smartwardrobe

# 2. Setup AWS resources (using Terraform - optional)
cd terraform
terraform init
terraform plan
terraform apply

# 3. Build and push Docker image
docker build -t smartwardrobe-api .
docker tag smartwardrobe-api:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# 4. Deploy backend
aws ecs update-service --cluster smartwardrobe --service api --force-new-deployment

# 5. Build and deploy frontend
cd frontend
npm run build:web
aws s3 sync web-build/ s3://smartwardrobe-frontend --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

---

## 📱 Alternative: AWS Amplify (Easiest)

For the **simplest deployment**, use AWS Amplify:

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify in frontend
cd frontend
amplify init

# Add hosting
amplify add hosting
# Select: Hosting with Amplify Console

# Deploy
amplify publish
```

Amplify handles:
- ✅ Automatic builds on git push
- ✅ SSL certificates
- ✅ CDN distribution
- ✅ Custom domains
- ✅ Preview environments

---

## 📞 Support & Monitoring

### CloudWatch Alarms
```bash
# CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "Dripdirective-High-CPU" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2
```

### Health Check Endpoint
Add to `app/main.py`:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

---

## 🎯 Recommended Approach

For your **Dripdirective POC**, I recommend:

1. **Start with Option A (EC2)** - Simple, cost-effective, easy to debug
2. **Use RDS PostgreSQL** - Production-ready database
3. **Use S3 for images** - Scalable storage
4. **Add CloudFront** - Fast global delivery
5. **Migrate to ECS Fargate** when you need auto-scaling

This gives you a solid foundation that can scale as your user base grows! 🚀

