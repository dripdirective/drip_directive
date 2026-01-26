#!/bin/bash

##############################################################################
# Dripdirective AWS Deployment Script
# 
# This script automates the deployment of Dripdirective to AWS.
# Run this from your local machine after configuring AWS CLI.
#
# Usage: ./scripts/deploy_aws.sh
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${GREEN}==== $1 ====${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install with: pip install awscli"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found. Please install Python 3.8+"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 14+"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    
    log_info "All prerequisites met"
}

# Save configuration
save_config() {
    cat > /tmp/dripdirective-deployment-config.sh << EOF
# Dripdirective AWS Deployment Configuration
# Generated: $(date)

# AWS Region
export AWS_REGION="us-east-1"

# Domain
export DOMAIN="dripdirective.com"
export HOSTED_ZONE_ID="$HOSTED_ZONE_ID"

# Certificate
export CERT_ARN="$CERT_ARN"

# S3 Buckets
export UPLOAD_BUCKET="$UPLOAD_BUCKET"
export FRONTEND_BUCKET="$FRONTEND_BUCKET"

# RDS Database
export DB_ENDPOINT="$DB_ENDPOINT"
export DB_PASSWORD="$DB_PASSWORD"
export RDS_SG_ID="$RDS_SG_ID"

# EC2 Instance
export INSTANCE_ID="$INSTANCE_ID"
export PUBLIC_IP="$PUBLIC_IP"
export EC2_SG_ID="$EC2_SG_ID"

# ALB
export ALB_ARN="$ALB_ARN"
export ALB_DNS="$ALB_DNS"
export ALB_SG_ID="$ALB_SG_ID"
export TARGET_GROUP_ARN="$TARGET_GROUP_ARN"

# CloudFront
export CF_DOMAIN="$CF_DOMAIN"
export CF_DIST_ID="$CF_DIST_ID"

# Secrets
export JWT_SECRET="$JWT_SECRET"
EOF

    log_info "Configuration saved to /tmp/dripdirective-deployment-config.sh"
}

# Step 1: Create Route 53 Hosted Zone
create_hosted_zone() {
    log_step "Step 1: Creating Route 53 Hosted Zone"
    
    # Check if hosted zone already exists
    HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
        --dns-name dripdirective.com \
        --query 'HostedZones[0].Id' \
        --output text 2>/dev/null | cut -d'/' -f3)
    
    if [ -z "$HOSTED_ZONE_ID" ] || [ "$HOSTED_ZONE_ID" == "None" ]; then
        aws route53 create-hosted-zone \
            --name dripdirective.com \
            --caller-reference $(date +%s) \
            --hosted-zone-config Comment="Dripdirective production"
        
        HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
            --dns-name dripdirective.com \
            --query 'HostedZones[0].Id' \
            --output text | cut -d'/' -f3)
        
        log_info "Hosted zone created: $HOSTED_ZONE_ID"
        
        # Show name servers
        log_warn "UPDATE YOUR DOMAIN REGISTRAR WITH THESE NAME SERVERS:"
        aws route53 get-hosted-zone \
            --id $HOSTED_ZONE_ID \
            --query 'DelegationSet.NameServers' \
            --output table
        
        read -p "Press Enter after updating name servers..."
    else
        log_info "Hosted zone already exists: $HOSTED_ZONE_ID"
    fi
}

# Step 2: Request SSL Certificate
request_certificate() {
    log_step "Step 2: Requesting SSL Certificate"
    
    # Check if certificate already exists
    CERT_ARN=$(aws acm list-certificates \
        --region us-east-1 \
        --query 'CertificateSummaryList[?DomainName==`dripdirective.com`].CertificateArn' \
        --output text 2>/dev/null)
    
    if [ -z "$CERT_ARN" ]; then
        aws acm request-certificate \
            --domain-name dripdirective.com \
            --subject-alternative-names "*.dripdirective.com" \
            --validation-method DNS \
            --region us-east-1
        
        sleep 5
        
        CERT_ARN=$(aws acm list-certificates \
            --region us-east-1 \
            --query 'CertificateSummaryList[?DomainName==`dripdirective.com`].CertificateArn' \
            --output text)
        
        log_info "Certificate requested: $CERT_ARN"
        
        # Auto-create validation records
        log_info "Creating DNS validation records..."
        
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
        
        log_info "Waiting for certificate validation (may take 5-10 minutes)..."
        aws acm wait certificate-validated \
            --certificate-arn $CERT_ARN \
            --region us-east-1
        
        log_info "Certificate validated!"
    else
        log_info "Certificate already exists: $CERT_ARN"
    fi
}

# Step 3: Create S3 Buckets
create_s3_buckets() {
    log_step "Step 3: Creating S3 Buckets"
    
    UPLOAD_BUCKET="dripdirective-uploads-$(date +%s)"
    FRONTEND_BUCKET="dripdirective-frontend-$(date +%s)"
    
    # Create uploads bucket
    if ! aws s3 ls s3://$UPLOAD_BUCKET 2>/dev/null; then
        aws s3 mb s3://$UPLOAD_BUCKET --region us-east-1
        log_info "Created uploads bucket: $UPLOAD_BUCKET"
        
        # Enable CORS
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
    fi
    
    # Create frontend bucket
    if ! aws s3 ls s3://$FRONTEND_BUCKET 2>/dev/null; then
        aws s3 mb s3://$FRONTEND_BUCKET --region us-east-1
        log_info "Created frontend bucket: $FRONTEND_BUCKET"
        
        # Enable static website hosting
        aws s3 website s3://$FRONTEND_BUCKET \
            --index-document index.html \
            --error-document index.html
    fi
}

# Step 4: Create RDS Database
create_rds_database() {
    log_step "Step 4: Creating RDS PostgreSQL Database"
    
    # Check if database already exists
    DB_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier dripdirective-db \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text 2>/dev/null || echo "none")
    
    if [ "$DB_STATUS" == "none" ]; then
        # Create security group
        RDS_SG_ID=$(aws ec2 describe-security-groups \
            --group-names dripdirective-rds-sg \
            --query 'SecurityGroups[0].GroupId' \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$RDS_SG_ID" ]; then
            aws ec2 create-security-group \
                --group-name dripdirective-rds-sg \
                --description "Security group for Dripdirective RDS"
            
            RDS_SG_ID=$(aws ec2 describe-security-groups \
                --group-names dripdirective-rds-sg \
                --query 'SecurityGroups[0].GroupId' \
                --output text)
            
            aws ec2 authorize-security-group-ingress \
                --group-id $RDS_SG_ID \
                --protocol tcp \
                --port 5432 \
                --cidr 0.0.0.0/0
        fi
        
        # Generate strong password
        DB_PASSWORD="DripDir$(openssl rand -base64 12)!"
        echo "Database Password: $DB_PASSWORD" > ~/dripdirective-db-password.txt
        log_warn "Database password saved to: ~/dripdirective-db-password.txt"
        
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
        
        log_info "Creating RDS instance (may take 5-10 minutes)..."
        aws rds wait db-instance-available \
            --db-instance-identifier dripdirective-db
        
        DB_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier dripdirective-db \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text)
        
        log_info "Database created: $DB_ENDPOINT"
    else
        log_info "Database already exists"
        DB_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier dripdirective-db \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text)
        log_warn "Using existing database. Retrieve password from AWS Secrets Manager."
    fi
}

# Step 5: Store Secrets
store_secrets() {
    log_step "Step 5: Storing Secrets in AWS Secrets Manager"
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Get Google API key
    if [ -z "$GOOGLE_API_KEY" ]; then
        read -p "Enter your Google API Key: " GOOGLE_API_KEY
    fi
    
    # Store database URL
    aws secretsmanager create-secret \
        --name dripdirective/database-url \
        --secret-string "postgresql://dbadmin:$DB_PASSWORD@$DB_ENDPOINT:5432/postgres" \
        --region us-east-1 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id dripdirective/database-url \
        --secret-string "postgresql://dbadmin:$DB_PASSWORD@$DB_ENDPOINT:5432/postgres" \
        --region us-east-1
    
    # Store Google API key
    aws secretsmanager create-secret \
        --name dripdirective/google-api-key \
        --secret-string "$GOOGLE_API_KEY" \
        --region us-east-1 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id dripdirective/google-api-key \
        --secret-string "$GOOGLE_API_KEY" \
        --region us-east-1
    
    # Store JWT secret
    aws secretsmanager create-secret \
        --name dripdirective/jwt-secret \
        --secret-string "$JWT_SECRET" \
        --region us-east-1 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id dripdirective/jwt-secret \
        --secret-string "$JWT_SECRET" \
        --region us-east-1
    
    log_info "Secrets stored in AWS Secrets Manager"
}

# Main deployment function
main() {
    echo "=================================="
    echo "  Dripdirective AWS Deployment"
    echo "=================================="
    echo ""
    
    check_prerequisites
    
    # Ask for confirmation
    read -p "This will deploy Dripdirective to AWS. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Deployment cancelled"
        exit 1
    fi
    
    create_hosted_zone
    request_certificate
    create_s3_buckets
    create_rds_database
    store_secrets
    
    # Save configuration
    save_config
    
    log_step "Deployment Complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. SSH to EC2: ssh -i ~/dripdirective-key.pem ec2-user@\$PUBLIC_IP"
    echo "  2. Run backend setup script: scripts/setup_ec2.sh"
    echo "  3. Deploy frontend: scripts/deploy_frontend.sh"
    echo ""
    log_info "Configuration saved to: /tmp/dripdirective-deployment-config.sh"
    echo "  Load with: source /tmp/dripdirective-deployment-config.sh"
}

# Run main function
main
