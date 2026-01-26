# Frontend Deployment Runbook (what we did)

This document captures the exact working deployment flow used for **Dripdirective frontend (Expo Web)** using:
- **Build**: `expo export --platform web`
- **Hosting**: S3 (bucket prefix) + CloudFront
- **Custom domain + HTTPS**: Route 53 + ACM (us-east-1) attached to CloudFront

---

## Values used in this deployment

- **Frontend domain**: `https://dripdirective.com` (+ `https://www.dripdirective.com`)
- **Backend API**: `https://api.dripdirective.com` (frontend uses this in production)
- **AWS region (S3 bucket)**: `ap-south-1`
- **S3 bucket**: `drip-directive`
- **S3 prefix for frontend**: `frontend/` (i.e. `s3://drip-directive/frontend/`)
- **CloudFront distribution name**: `dripdirective`
- **CloudFront distribution id**: `EMG6EMUDGTE7R`
- **CloudFront distribution domain**: `d21sb6b8f12cbg.cloudfront.net`
- **Route 53 hosted zone name**: `dripdirective.com`
- **Route 53 hosted zone id**: `Z0208136L9EURRZ3BSW9`
- **CloudFront hosted zone id (constant)**: `Z2FDTNDATAQYW2`
- **ACM certificate region for CloudFront**: `us-east-1`
- **ACM certificate ARN**: `arn:aws:acm:us-east-1:279586434283:certificate/a0faaf9f-f819-479a-bb64-99e2e7bf691a`
- **CloudFront origin**: `drip-directive.s3.amazonaws.com`
- **CloudFront origin path**: `/frontend`
- **Default root object**: `index.html`

---

## 0) One-time prerequisites

### 0.1) Ensure your domain uses Route 53 nameservers (via GoDaddy)

In Route 53 hosted zone `dripdirective.com`, the NS values are:
- `ns-644.awsdns-16.net.`
- `ns-1195.awsdns-21.org.`
- `ns-433.awsdns-54.com.`
- `ns-1717.awsdns-22.co.uk.`

In GoDaddy, set **custom nameservers** using **NO trailing dots**:
- `ns-644.awsdns-16.net`
- `ns-1195.awsdns-21.org`
- `ns-433.awsdns-54.com`
- `ns-1717.awsdns-22.co.uk`

Verify from your laptop:

```bash
dig NS dripdirective.com +short
```

---

## 1) Build the frontend (on your laptop)

Project folder:

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend
```

Install deps:

```bash
npm install
```

Build production web:

```bash
NODE_ENV=production npx expo export --platform web
```

Output directory (Expo SDK 54): `frontend/dist/`

---

## 2) Create zip (optional backup)

S3 cannot unzip files automatically, so this zip is only for backup/archiving.

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend
zip -r "frontend_dist.zip" dist
```

---

## 3) Upload the built site files to S3

Important: you must upload the **unzipped files**, not just the zip.

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend
aws s3 sync dist/ "s3://drip-directive/frontend/" --delete --region ap-south-1
```

Confirm `index.html` exists in the prefix:

```bash
aws s3 ls "s3://drip-directive/frontend/" --region ap-south-1 | head
```

---

## 4) CloudFront distribution

Create a CloudFront distribution with:
- **Origin**: `drip-directive.s3.amazonaws.com`
- **Origin path**: `/frontend`
- **Grant CloudFront access to origin**: Yes (private bucket access recommended)
- **Default root object**: `index.html`

After creation, we used:
- Distribution id: `EMG6EMUDGTE7R`
- Distribution domain: `d21sb6b8f12cbg.cloudfront.net`

---

## 5) Add custom domains + TLS certificate to CloudFront

CloudFront requires ACM certs in **us-east-1**.

ACM certificate (us-east-1):
- Covers: `dripdirective.com`, `www.dripdirective.com`
- ARN: `arn:aws:acm:us-east-1:279586434283:certificate/a0faaf9f-f819-479a-bb64-99e2e7bf691a`

Attach to CloudFront distribution:
- Alternate domain names (CNAMEs): `dripdirective.com`, `www.dripdirective.com`
- Custom SSL certificate: select the above ACM cert

---

## 6) Route 53 records (point domain to CloudFront)

We used Route 53 Alias A records (root + www) to the CloudFront distribution:

### 6.1) Verify records (laptop)

```bash
aws route53 list-resource-record-sets --hosted-zone-id Z0208136L9EURRZ3BSW9
```

Example expected (high-signal):
- `dripdirective.com.` `A` Alias → `d21sb6b8f12cbg.cloudfront.net.`
- `www.dripdirective.com.` `A` Alias → `d21sb6b8f12cbg.cloudfront.net.`

### 6.2) Create/Update records by CLI (UPSERT)

```bash
HOSTED_ZONE_ID="Z0208136L9EURRZ3BSW9"
CF_HOSTED_ZONE_ID="Z2FDTNDATAQYW2"
CF_DOMAIN="d21sb6b8f12cbg.cloudfront.net"

cat > /tmp/drip_frontend_alias.json <<EOF
{
  "Comment": "Point root + www to CloudFront",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "dripdirective.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CF_HOSTED_ZONE_ID",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.dripdirective.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CF_HOSTED_ZONE_ID",
          "DNSName": "$CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch file:///tmp/drip_frontend_alias.json
```

Verify DNS:

```bash
dig +short dripdirective.com
dig +short www.dripdirective.com
```

Seeing multiple `99.86.x.x` IPs is normal (CloudFront).

---

## 7) Force HTTP → HTTPS

In CloudFront:
- Distribution → **Behaviors** → edit **Default (*)**
- Set **Viewer protocol policy** = **Redirect HTTP to HTTPS**

Quick test:
- `http://dripdirective.com` should redirect to `https://dripdirective.com`

---

## 8) SPA routing fix (only if refresh/deep links 403/404)

If refreshing a route (or opening a deep link) gives 403/404, add CloudFront error pages:
- **403** → response page path `/index.html`, response code **200**
- **404** → response page path `/index.html`, response code **200**

---

## 9) Final verification

- Open:
  - `https://dripdirective.com`
  - `https://www.dripdirective.com`
- Confirm frontend API calls go to:
  - `https://api.dripdirective.com`

---

## 10) Deploy update (how to ship a new frontend version)

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend
npm install
NODE_ENV=production npx expo export --platform web
aws s3 sync dist/ "s3://drip-directive/frontend/" --delete --region ap-south-1
```

If changes don’t appear immediately, invalidate CloudFront:

```bash
aws cloudfront create-invalidation --distribution-id EMG6EMUDGTE7R --paths "/*"
```

