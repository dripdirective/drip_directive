# Frontend Deployment Runbook

This runbook is for the current web frontend in `frontend_v2/`.

It assumes:

- frontend hosting: S3 + CloudFront
- backend API: separate FastAPI deployment
- frontend build tool: Vite

## Build locally

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend_v2
cp .env.example .env
```

Set the production backend URL:

```env
VITE_API_BASE_URL=https://api.dripdirective.com
```

Build:

```bash
npm install
npm run build
```

Output directory:

```text
frontend_v2/dist/
```

## Upload to S3

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend_v2
aws s3 sync dist/ "s3://drip-directive/frontend/" --delete --region ap-south-1
```

## Invalidate CloudFront

```bash
aws cloudfront create-invalidation \
  --distribution-id EMG6EMUDGTE7R \
  --paths "/*"
```

## CloudFront Settings

- Origin: `drip-directive.s3.amazonaws.com`
- Origin path: `/frontend`
- Default root object: `index.html`
- Viewer protocol policy: `Redirect HTTP to HTTPS`

For SPA routing, map `403` and `404` to `/index.html` with response code `200`.

## Verify

- `https://dripdirective.com`
- `https://www.dripdirective.com`

Confirm the app is calling:

- `https://api.dripdirective.com`

## Repeat Deploy

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend_v2
npm install
npm run build
aws s3 sync dist/ "s3://drip-directive/frontend/" --delete --region ap-south-1
aws cloudfront create-invalidation --distribution-id EMG6EMUDGTE7R --paths "/*"
```
