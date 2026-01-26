# AWS Migration Guide

This guide explains how to migrate the dental clinic application from Supabase to AWS (RDS + Cognito + Lambda).

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Express API    │────▶│   AWS RDS       │
│   (Frontend)    │     │  (ECS/Lambda)   │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  AWS Cognito    │     │  AWS Lambda     │
│  (Auth)         │     │  (SMS/Cron)     │
└─────────────────┘     └─────────────────┘
```

## Migration Steps

### 1. Set Up AWS RDS

1. Create a PostgreSQL RDS instance in AWS Console
2. Configure security groups to allow connections
3. Run the migration script:
   ```bash
   psql -h your-rds-endpoint -U postgres -d dental_clinic \
     -f backend/src/migrations/001_initial_schema.sql
   ```

### 2. Set Up AWS Cognito

1. Create a User Pool in Cognito
2. Configure:
   - Email as username
   - Password requirements
   - Email verification (or auto-confirm for development)
3. Create App Client (without client secret)
4. Create groups: `admin`, `staff`, `dentist`
5. Enable `USER_PASSWORD_AUTH` flow

### 3. Deploy Express Backend

#### Option A: AWS ECS (Recommended)

1. Build and push Docker image:
   ```bash
   cd backend
   docker build -t dental-clinic-backend .
   aws ecr get-login-password | docker login --username AWS --password-stdin ECR_URL
   docker tag dental-clinic-backend:latest ECR_URL/dental-clinic-backend:latest
   docker push ECR_URL/dental-clinic-backend:latest
   ```

2. Create ECS Task Definition with environment variables
3. Create ECS Service with ALB

#### Option B: AWS Lambda (Serverless)

1. Use `aws-serverless-express` or `@vendia/serverless-express`
2. Package and deploy with SAM or Serverless Framework

### 4. Deploy Lambda Functions

The SMS Lambda functions are already in `/lambda`:
- `create-user/index.js`
- `send-immediate-sms/index.js`
- `send-sms-reminder/index.js`

Deploy using AWS CLI or SAM:
```bash
cd lambda/send-sms-reminder
zip -r function.zip .
aws lambda update-function-code \
  --function-name send-sms-reminder \
  --zip-file fileb://function.zip
```

### 5. Update Frontend Configuration

Add to your `.env`:
```
VITE_USE_AWS_BACKEND=true
VITE_AWS_API_URL=https://your-api-gateway-url
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
```

### 6. Data Migration

Export from Supabase:
```sql
-- Connect to Supabase and export tables
\copy patients TO 'patients.csv' WITH CSV HEADER;
\copy doctors TO 'doctors.csv' WITH CSV HEADER;
\copy appointments TO 'appointments.csv' WITH CSV HEADER;
\copy chart_records TO 'chart_records.csv' WITH CSV HEADER;
\copy treatment_types TO 'treatment_types.csv' WITH CSV HEADER;
\copy app_settings TO 'app_settings.csv' WITH CSV HEADER;
```

Import to RDS:
```sql
-- Connect to RDS and import
\copy patients FROM 'patients.csv' WITH CSV HEADER;
\copy doctors FROM 'doctors.csv' WITH CSV HEADER;
\copy appointments FROM 'appointments.csv' WITH CSV HEADER;
\copy chart_records FROM 'chart_records.csv' WITH CSV HEADER;
\copy treatment_types FROM 'treatment_types.csv' WITH CSV HEADER;
\copy app_settings FROM 'app_settings.csv' WITH CSV HEADER;
```

### 7. User Migration

For users, you'll need to:
1. Export user emails from Supabase Auth
2. Create users in Cognito (bulk import or invite)
3. Migrate profiles and roles tables
4. Update `user_id` columns (Supabase UUID → Cognito sub)

## File Structure

```
├── backend/                    # Express API for RDS
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts    # RDS connection
│   │   ├── middleware/
│   │   │   └── auth.ts        # Cognito JWT verification
│   │   ├── routes/            # API routes
│   │   ├── migrations/        # SQL schema
│   │   └── index.ts           # Express app
│   ├── Dockerfile
│   └── package.json
│
├── lambda/                     # AWS Lambda functions
│   ├── create-user/
│   ├── send-immediate-sms/
│   └── send-sms-reminder/
│
├── src/
│   ├── config/
│   │   └── api.ts             # Backend toggle config
│   ├── lib/
│   │   ├── cognito.ts         # Cognito auth client
│   │   └── aws-api.ts         # AWS API client
│   └── ...
```

## Rollback

To switch back to Supabase:
1. Set `VITE_USE_AWS_BACKEND=false` in `.env`
2. Rebuild frontend

## Cost Comparison

| Service | Supabase (Pro) | AWS (estimated) |
|---------|---------------|-----------------|
| Database | $25/mo | $15-50/mo (RDS) |
| Auth | Included | ~$0.01/user/mo (Cognito) |
| Functions | Included | Pay per request (Lambda) |
| Total | ~$25/mo | ~$20-60/mo |

## Security Checklist

- [ ] RDS in private subnet
- [ ] Backend in private/public subnet with NAT
- [ ] Secrets in AWS Secrets Manager
- [ ] HTTPS via ALB/CloudFront
- [ ] IAM roles for ECS tasks
- [ ] Cognito MFA enabled (optional)
- [ ] WAF on API Gateway (optional)
