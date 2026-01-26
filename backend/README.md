# Dental Clinic Backend

Express backend for the dental clinic management system, designed to work with AWS RDS (PostgreSQL) and AWS Cognito for authentication.

## Architecture

- **Database**: AWS RDS PostgreSQL
- **Authentication**: AWS Cognito
- **API**: Express.js REST API
- **Deployment**: Docker container (suitable for ECS, EKS, or EC2)

## Prerequisites

1. **AWS RDS PostgreSQL Instance**
   - Create a PostgreSQL database instance in AWS RDS
   - Note the endpoint, port, username, and password
   - Ensure the security group allows connections from your backend

2. **AWS Cognito User Pool**
   - Create a User Pool in AWS Cognito
   - Create an App Client (without client secret for public apps)
   - Create user groups: `admin`, `staff`, `dentist`
   - Note the User Pool ID, Client ID, and Region

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_HOST`: RDS endpoint
- `DATABASE_PORT`: Usually 5432
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database username
- `DATABASE_PASSWORD`: Database password
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `COGNITO_CLIENT_ID`: Cognito App Client ID
- `COGNITO_REGION`: AWS region (e.g., us-east-1)

### 2. Database Migration

Run the initial schema migration on your RDS instance:

```bash
psql -h your-rds-endpoint -U postgres -d dental_clinic -f src/migrations/001_initial_schema.sql
```

Or use a database management tool like pgAdmin or DBeaver.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build and Run

```bash
docker build -t dental-clinic-backend .
docker run -p 3001:3001 --env-file .env dental-clinic-backend
```

### AWS ECS Deployment

1. Push to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker tag dental-clinic-backend:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/dental-clinic-backend:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/dental-clinic-backend:latest
```

2. Create ECS Task Definition with environment variables from Secrets Manager
3. Create ECS Service with appropriate security groups

## API Endpoints

All endpoints require a valid Cognito JWT token in the Authorization header.

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Appointments
- `GET /api/appointments` - List all appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/:id` - Get single doctor
- `POST /api/doctors` - Create doctor (admin only)
- `PUT /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor

### Treatment Types
- `GET /api/treatment-types` - List treatment types
- `POST /api/treatment-types` - Create treatment type (admin only)
- `PUT /api/treatment-types/:id` - Update treatment type (admin only)
- `DELETE /api/treatment-types/:id` - Delete treatment type (admin only)

### Chart Records
- `GET /api/chart-records/patient/:patientId` - Get patient's chart records
- `GET /api/chart-records/:id` - Get single chart record
- `POST /api/chart-records` - Create chart record
- `PUT /api/chart-records/:id` - Update chart record
- `DELETE /api/chart-records/:id` - Delete chart record

### Settings
- `GET /api/settings/:key` - Get setting by key
- `POST /api/settings` - Upsert setting (admin only)

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/me/roles` - Get current user roles
- `PUT /api/users/profile/:userId` - Update profile
- `GET /api/users/profiles` - List all profiles (admin only)
- `GET /api/users/roles` - List all user roles (admin only)
- `POST /api/users/roles` - Add role to user (admin only)
- `DELETE /api/users/roles/:id` - Remove role from user (admin only)

## Security Considerations

1. **Network Security**: Place RDS in a private subnet, backend in public/private subnet with NAT
2. **Secrets Management**: Use AWS Secrets Manager for database credentials
3. **HTTPS**: Always use HTTPS in production (terminate at ALB)
4. **IAM Roles**: Use IAM roles for ECS tasks instead of access keys
