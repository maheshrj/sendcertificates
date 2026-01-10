# Certificate Application - Complete Configuration Guide

**Last Updated**: 2026-01-10
**Application**: Certificate Generation Platform
**Technology Stack**: Next.js 15.5.6, PostgreSQL, Redis, AWS (S3 + SES)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [AWS Services Setup](#aws-services-setup)
7. [Redis Setup](#redis-setup)
8. [Email Configuration](#email-configuration)
9. [Installation Steps](#installation-steps)
10. [API Endpoints](#api-endpoints)
11. [Key Features](#key-features)
12. [Security Best Practices](#security-best-practices)
13. [Troubleshooting](#troubleshooting)
14. [File Reference](#file-reference)

---

## Project Overview

This is a production-ready certificate generation application that allows users to:
- Create custom certificate templates with fonts, signatures, and QR codes
- Generate certificates in bulk from CSV data
- Send certificates via email with retry logic
- Use custom email domains with DKIM authentication
- Access via REST API with API key authentication
- Track usage with token-based system
- View analytics and manage batches

---

## Technology Stack

### Core Framework
- **Next.js**: 15.5.6 (React 18, TypeScript)
- **Node.js**: ^18.17.0 or ^20.3.0 or >=21.0.0

### Database & ORM
- **PostgreSQL**: Primary database
- **Prisma**: 6.2.2 (ORM with 17 migrations)

### Authentication & Security
- **JWT**: JSON Web Token authentication
- **bcrypt**: Password hashing
- **NextAuth**: 5.0.0-beta.25

### Cloud Services
- **AWS S3**: Certificate image storage
- **AWS SES**: Email delivery service
- **AWS Route53**: Domain management (optional)

### Job Queue & Caching
- **Redis**: In-memory data store
- **BullMQ**: 5.37.0 (Job queue management)

### Image Processing
- **Canvas**: 2.11.2 (Certificate generation)
- **QR Code**: qrcode 1.5.4

### Email
- **Nodemailer**: 6.9.16 (SMTP client)
- **AWS SDK SES**: @aws-sdk/client-ses 3.730.0

### UI Framework
- **Tailwind CSS**: 3.4.17
- **shadcn/ui**: Component library
- **Radix UI**: Headless UI components

### Additional Libraries
- **Zod**: Schema validation
- **Papa Parse**: CSV parsing
- **date-fns**: Date manipulation
- **Recharts**: Analytics charts

---

## Project Structure

```
certificate-app-master/
├── app/
│   ├── (protected)/              # Protected routes (requires authentication)
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── templates/            # Template management
│   │   ├── generate/             # Certificate generation UI
│   │   ├── batches/              # Batch management
│   │   ├── settings/             # User settings
│   │   └── api-keys/             # API key management
│   │
│   ├── (public)/                 # Public routes (no auth)
│   │   ├── certificate/          # Certificate validation
│   │   └── page.tsx              # Landing page
│   │
│   ├── api/                      # API endpoints
│   │   ├── v1/                   # Public API v1 (API key auth)
│   │   │   └── generate/         # External certificate generation
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── templates/            # Template CRUD
│   │   ├── generate-certificates/ # Main generation logic
│   │   ├── batches/              # Batch operations
│   │   ├── email-config/         # Email settings
│   │   ├── domain-config/        # Custom domain & DKIM
│   │   ├── analytics/            # Usage analytics
│   │   ├── api-keys/             # API key management
│   │   ├── tokens/               # Token transactions
│   │   ├── register/             # User registration
│   │   ├── login/                # User login
│   │   ├── forgot-password/      # Password reset
│   │   └── validate/             # Certificate validation
│   │
│   ├── lib/                      # Shared utilities
│   │   ├── db.ts                 # Prisma client
│   │   ├── s3.ts                 # S3 upload utilities
│   │   └── utils.ts              # Helper functions
│   │
│   ├── config/                   # Configuration
│   │   └── rate-limit.ts         # Rate limiting config
│   │
│   ├── components/               # React components
│   │   └── ui/                   # shadcn/ui components
│   │
│   └── middleware.ts             # Auth middleware
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Database migrations (17 files)
│   │   ├── 20241211142301_init/
│   │   ├── 20241211145743_add_qr_position/
│   │   ├── 20241212062154_add_user_model/
│   │   ├── ... (14 more migrations)
│   │   └── 20250106114622_add_bounce_model/
│   └── scripts/
│       └── update-admin.ts       # Admin user setup
│
├── public/
│   └── fonts/                    # Custom certificate fonts
│       ├── MonteCarlo-Regular.ttf
│       ├── AlexBrush-Regular.ttf
│       ├── Birthstone-Regular.ttf
│       ├── DancingScript-VariableFont_wght.ttf
│       └── LibreBaskerville-Regular.ttf
│
├── components/                   # Shared UI components
│   └── ui/                       # shadcn/ui components
│
├── lib/                          # Shared utilities
│   └── utils.ts
│
├── .env.example                  # Environment template (CREATED)
├── package.json                  # Dependencies & scripts
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
├── components.json               # shadcn/ui config
├── postcss.config.mjs            # PostCSS config
└── README.md                     # Basic documentation
```

---

## Environment Variables

### Complete `.env` Configuration

Create a `.env` file in the root directory with these variables:

```env
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DATABASE_URL=postgresql://username:password@localhost:5432/certificate_app

# ==========================================
# JWT & AUTHENTICATION
# ==========================================
JWT_SECRET=your-very-secure-jwt-secret-key-minimum-32-characters-long
ADMIN_EMAIL=admin@example.com

# ==========================================
# AWS CREDENTIALS
# ==========================================
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-certificate-bucket-name
NEXT_PUBLIC_AWS_REGION=ap-south-1

# ==========================================
# APPLICATION URL
# ==========================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ==========================================
# REDIS CONFIGURATION
# ==========================================
REDIS_URL=redis://localhost:6379

# ==========================================
# SMTP CONFIGURATION
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_SECURE=false

# ==========================================
# EMAIL CONFIGURATION
# ==========================================
EMAIL_FROM=noreply@yourdomain.com
EMAIL_LIMIT=10

# ==========================================
# ENVIRONMENT
# ==========================================
NODE_ENV=production
```

### Environment Variable Reference

| Variable | Required | Type | Purpose | Example |
|----------|----------|------|---------|---------|
| `DATABASE_URL` | ✅ Yes | String | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ Yes | String (32+ chars) | JWT token signing secret | `08b28e1943b3e8ac4be09f3d...` |
| `ADMIN_EMAIL` | ✅ Yes | Email | Admin user email address | `admin@company.com` |
| `AWS_REGION` | ✅ Yes | String | AWS service region | `ap-south-1`, `us-east-1` |
| `AWS_ACCESS_KEY_ID` | ✅ Yes | String | AWS IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | String | AWS IAM secret key | `wJalrXUtnFEMI/K7MDENG...` |
| `AWS_S3_BUCKET_NAME` | ✅ Yes | String | S3 bucket for certificates | `certificate-bucket` |
| `NEXT_PUBLIC_AWS_REGION` | ✅ Yes | String | Public AWS region (frontend) | `ap-south-1` |
| `NEXT_PUBLIC_BASE_URL` | ✅ Yes | URL | Application base URL | `https://certs.example.com` |
| `REDIS_URL` | ✅ Yes | URL | Redis connection string | `redis://localhost:6379` |
| `SMTP_HOST` | ✅ Yes | String | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | ✅ Yes | Number | SMTP port (587/465/25) | `587` |
| `SMTP_USER` | ✅ Yes | Email | SMTP username | `sender@gmail.com` |
| `SMTP_PASS` | ✅ Yes | String | SMTP password/token | `app-password-here` |
| `SMTP_SECURE` | ✅ Yes | Boolean | Use TLS/SSL | `false` (587), `true` (465) |
| `EMAIL_FROM` | ✅ Yes | Email | Sender email address | `noreply@company.com` |
| `EMAIL_LIMIT` | ❌ No | Number | Max emails per second | `10` (default) |
| `NODE_ENV` | ❌ No | String | Environment mode | `production`, `development` |

---

## Database Setup

### Database Schema Overview

The application uses **9 database models**:

1. **User** - User accounts with authentication
   - Fields: id, email, password, name, isAdmin, createdAt, updatedAt
   - Relations: templates, certificates, batches, apiKeys, tokenTransactions, emailConfig

2. **Template** - Certificate templates
   - Fields: id, name, imageUrl, width, height, placeholders, signatureFields, qrPosition, userId, createdAt, updatedAt
   - Relations: certificates, batches

3. **Certificate** - Generated certificates
   - Fields: id, recipientEmail, recipientName, issueDate, data, imageUrl, templateId, userId, batchId, createdAt

4. **Batch** - Batch generation jobs
   - Fields: id, name, status, totalCertificates, processedCertificates, failedCertificates, templateId, userId, createdAt, updatedAt
   - Relations: certificates, failedCertificates, invalidEmails

5. **FailedCertificate** - Failed generation tracking
   - Fields: id, recipientEmail, error, data, batchId, createdAt

6. **InvalidEmail** - Invalid email tracking
   - Fields: id, email, reason, batchId, createdAt

7. **EmailConfig** - Custom email settings
   - Fields: id, userId, customDomain, dkimPublicKey, verificationStatus, fromEmail, ccEmails, bccEmails, emailSubject, emailBody, createdAt, updatedAt

8. **ApiKey** - API authentication keys
   - Fields: id, key, name, userId, expiresAt, lastUsedAt, createdAt

9. **TokenTransaction** - Token balance tracking
   - Fields: id, userId, amount, balance, type, description, createdAt

10. **Bounce** - Email bounce tracking
    - Fields: id, email, bounceType, diagnosticCode, timestamp, createdAt

### Migration Files (17 total)

```
prisma/migrations/
├── 20241211142301_init/
├── 20241211145743_add_qr_position/
├── 20241212062154_add_user_model/
├── 20241212063152_update_models_for_user_relation/
├── 20241212100029_add_batch_model/
├── 20241212103320_add_failed_certificate_model/
├── 20241212104624_add_invalid_email_model/
├── 20241213130802_add_email_config_model/
├── 20241216123959_update_email_config_model/
├── 20241216131448_update_email_config_model/
├── 20241217073456_add_domain_verification/
├── 20250103101130_add_api_key/
├── 20250104113041_update_api_key/
├── 20250105113748_add_token_transaction_model/
├── 20250106104906_update_email_config_relation/
├── 20250106110953_update_email_config_cascade/
└── 20250106114622_add_bounce_model/
```

### Setup Instructions

#### 1. Install PostgreSQL

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE certificate_app;

# Create user (optional)
CREATE USER certuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE certificate_app TO certuser;

# Exit
\q
```

#### 3. Configure DATABASE_URL

Update `.env` with your database connection:

```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/certificate_app

# Remote PostgreSQL (AWS RDS, Supabase, etc.)
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
```

#### 4. Run Migrations

```bash
# Install dependencies first
npm install

# Generate Prisma client and run migrations
npm run build

# Or manually:
npx prisma generate
npx prisma migrate deploy
```

#### 5. Verify Database Setup

```bash
# Open Prisma Studio to view database
npx prisma studio
```

---

## AWS Services Setup

### Overview of AWS Services Used

1. **S3** - Certificate image storage
2. **SES** - Email delivery service
3. **Route53** - Domain verification (optional)

### 1. AWS IAM User Setup

#### Create IAM User

1. Login to AWS Console → IAM
2. Click **Users** → **Add User**
3. User name: `certificate-app-user`
4. Select: **Programmatic access**
5. Click **Next: Permissions**

#### Attach Policies

Create a custom policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3CertificateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-certificate-bucket/*"
    },
    {
      "Sid": "SESEmailAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:VerifyEmailIdentity",
        "ses:VerifyDomainIdentity",
        "ses:GetIdentityVerificationAttributes",
        "ses:GetIdentityDkimAttributes",
        "ses:VerifyDomainDkim"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Route53DomainVerification",
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Save Credentials

After creation, save:
- **Access Key ID** → `AWS_ACCESS_KEY_ID`
- **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`

### 2. S3 Bucket Setup

#### Create S3 Bucket

1. AWS Console → S3 → **Create Bucket**
2. Bucket name: `your-certificate-bucket` (globally unique)
3. Region: Select your region (e.g., `ap-south-1`)
4. **Block Public Access**: Keep enabled (use pre-signed URLs)
5. **Bucket Versioning**: Optional
6. **Encryption**: Enable (SSE-S3)
7. Click **Create Bucket**

#### Configure CORS (Optional)

If accessing from browser:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

#### Update `.env`

```env
AWS_S3_BUCKET_NAME=your-certificate-bucket
AWS_REGION=ap-south-1
```

### 3. AWS SES (Simple Email Service) Setup

#### Verify Email Address

1. AWS Console → SES → **Verified Identities**
2. Click **Create Identity**
3. Select **Email Address**
4. Enter: `noreply@yourdomain.com`
5. Click **Create Identity**
6. Check email and click verification link

#### Move Out of Sandbox (Production)

For production use:
1. SES → **Account Dashboard**
2. Click **Request production access**
3. Fill out the form (use case, expected send volume)
4. Wait for approval (usually 24 hours)

#### Get SMTP Credentials

**Option 1: Use IAM Access Keys** (Already have from IAM setup)

**Option 2: Create SMTP Credentials**
1. SES → **SMTP Settings**
2. Click **Create SMTP Credentials**
3. Save the username and password
4. Update `.env`:
   ```env
   SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   ```

#### Custom Domain Setup (Optional)

For custom domain (`@yourdomain.com`):

1. SES → **Verified Identities** → **Create Identity**
2. Select **Domain**
3. Enter your domain: `yourdomain.com`
4. Enable **DKIM signing**
5. Copy DNS records to your domain registrar:
   - MX records
   - TXT records for verification
   - CNAME records for DKIM

The application has built-in DKIM management at `/api/domain-config`.

---

## Redis Setup

### Why Redis is Needed

Redis is used for:
1. **Job Queue** - BullMQ for async email sending
2. **Rate Limiting** - IP-based request throttling

### Installation

#### Windows

**Option 1: Windows Subsystem for Linux (WSL)**
```bash
wsl --install
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

**Option 2: Memurai (Redis for Windows)**
```bash
# Download from: https://www.memurai.com/
# Or use chocolatey:
choco install memurai-developer
```

#### macOS

```bash
brew install redis
brew services start redis
```

#### Linux

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Docker

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Verify Installation

```bash
redis-cli ping
# Should return: PONG
```

### Update `.env`

```env
# Local Redis
REDIS_URL=redis://localhost:6379

# Remote Redis with auth
REDIS_URL=redis://username:password@hostname:6379

# Redis Cloud / AWS ElastiCache
REDIS_URL=redis://default:password@redis-endpoint:6379
```

### Production Options

1. **AWS ElastiCache** - Managed Redis on AWS
2. **Redis Cloud** - redis.com (free tier available)
3. **Upstash** - Serverless Redis
4. **DigitalOcean Managed Redis**

---

## Email Configuration

### SMTP Provider Options

#### 1. Gmail (Recommended for Development)

**Setup:**
1. Enable 2-Factor Authentication on Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Save the 16-character password

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App password (remove spaces)
SMTP_SECURE=false
EMAIL_FROM=your-email@gmail.com
```

**Limitations:**
- 500 emails per day (free Gmail)
- 2000 emails per day (Google Workspace)

#### 2. AWS SES SMTP

**Configuration:**
```env
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_SECURE=false
EMAIL_FROM=verified@yourdomain.com
```

**Benefits:**
- High deliverability
- 62,000 emails per month free (with EC2)
- $0.10 per 1,000 emails after

#### 3. SendGrid

**Configuration:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
EMAIL_FROM=verified@yourdomain.com
```

**Benefits:**
- 100 emails per day (free tier)
- Easy setup
- Good deliverability

#### 4. Mailgun

**Configuration:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
EMAIL_FROM=noreply@yourdomain.com
```

### Email Rate Limiting

The application limits email sending to prevent spam flags:

```env
EMAIL_LIMIT=10  # Max emails per second
```

Adjust based on your SMTP provider's limits:
- Gmail: 1-2 per second
- SES: 10+ per second
- SendGrid: 10+ per second

### Custom Email Templates

Users can customize email content via the UI at `/settings` or API:

```
POST /api/email-config
{
  "emailSubject": "Your Certificate is Ready!",
  "emailBody": "Dear {name},\n\nYour certificate is attached.",
  "ccEmails": ["manager@company.com"],
  "bccEmails": ["archive@company.com"]
}
```

### Email Bounce Tracking

The application tracks email bounces in the `Bounce` model:
- Bounce type (hard/soft)
- Diagnostic code
- Timestamp

---

## Installation Steps

### Prerequisites

- Node.js 18+ or 20+ or 21+
- PostgreSQL 12+
- Redis 6+
- AWS Account (S3 + SES)
- Git

### Step-by-Step Installation

#### 1. Clone Repository

```bash
cd c:\Users\Mahesh\Downloads\certificate-app-master\certificate-app-master
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
# Use notepad, VS Code, or any text editor
notepad .env
```

#### 4. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `.env` → `JWT_SECRET`

#### 5. Setup PostgreSQL Database

```bash
# Create database
createdb certificate_app

# Or using psql
psql -U postgres -c "CREATE DATABASE certificate_app;"
```

Update `DATABASE_URL` in `.env`

#### 6. Run Database Migrations

```bash
npm run build
# This generates Prisma client and runs all 17 migrations
```

#### 7. Setup AWS Services

Follow [AWS Services Setup](#aws-services-setup) section

#### 8. Start Redis

```bash
# Local
redis-server

# Or Docker
docker run -d -p 6379:6379 redis:alpine
```

#### 9. Install Custom Fonts (Optional)

```bash
npm run font-install
```

#### 10. Create Admin User

First, register a user with your admin email:
```bash
# Start the dev server
npm run dev

# Open http://localhost:3000
# Register with the email matching ADMIN_EMAIL in .env
```

Then run the admin setup script:
```bash
npm run update-admin
```

#### 11. Start Application

**Development:**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Production:**
```bash
npm run build
npm start
# Runs on http://localhost:3000 (configure port in deployment)
```

#### 12. Verify Installation

1. Open http://localhost:3000
2. Login with admin credentials
3. Navigate to `/dashboard`
4. Create a test template
5. Generate a test certificate

---

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "isAdmin": false
  }
}
```

#### Forgot Password
```http
POST /api/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

---

### Template Endpoints (Protected)

All protected endpoints require JWT token in header:
```http
Authorization: Bearer your-jwt-token
```

#### Create Template
```http
POST /api/templates
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Participation Certificate",
  "imageUrl": "https://s3.amazonaws.com/bucket/template.png",
  "width": 1200,
  "height": 800,
  "placeholders": [
    {
      "field": "name",
      "x": 600,
      "y": 400,
      "fontSize": 48,
      "fontFamily": "MonteCarlo",
      "color": "#000000",
      "align": "center"
    }
  ],
  "signatureFields": [
    {
      "imageUrl": "https://s3.amazonaws.com/bucket/signature.png",
      "x": 300,
      "y": 650,
      "width": 200,
      "height": 100
    }
  ],
  "qrPosition": {
    "x": 1000,
    "y": 700,
    "size": 100
  }
}
```

#### Get All Templates
```http
GET /api/templates
Authorization: Bearer {token}
```

#### Get Single Template
```http
GET /api/templates/{id}
Authorization: Bearer {token}
```

#### Update Template
```http
PUT /api/templates/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Template Name"
}
```

#### Delete Template
```http
DELETE /api/templates/{id}
Authorization: Bearer {token}
```

---

### Certificate Generation Endpoints

#### Generate Certificates (Batch)
```http
POST /api/generate-certificates
Content-Type: application/json
Authorization: Bearer {token}

{
  "templateId": "template-uuid",
  "csvData": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "course": "Web Development"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "course": "Data Science"
    }
  ],
  "batchName": "December 2025 Batch"
}
```

**Response:**
```json
{
  "batch": {
    "id": "batch-uuid",
    "name": "December 2025 Batch",
    "status": "processing",
    "totalCertificates": 2
  }
}
```

#### Get Batch Status
```http
GET /api/batches/{batchId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "batch-uuid",
  "name": "December 2025 Batch",
  "status": "completed",
  "totalCertificates": 2,
  "processedCertificates": 2,
  "failedCertificates": 0,
  "certificates": [...]
}
```

#### Get All Batches
```http
GET /api/batches
Authorization: Bearer {token}
```

---

### Public API v1 (API Key Authentication)

#### Generate Certificate
```http
POST /api/v1/generate
Content-Type: application/json
x-api-key: your-api-key

{
  "templateId": "template-uuid",
  "recipientName": "John Doe",
  "recipientEmail": "john@example.com",
  "data": {
    "name": "John Doe",
    "course": "Web Development",
    "date": "2025-01-10"
  }
}
```

**Response:**
```json
{
  "certificate": {
    "id": "cert-uuid",
    "imageUrl": "https://s3.amazonaws.com/bucket/cert-123.png",
    "recipientEmail": "john@example.com",
    "validationUrl": "https://yourdomain.com/certificate/cert-uuid"
  }
}
```

---

### Email Configuration Endpoints

#### Get Email Config
```http
GET /api/email-config
Authorization: Bearer {token}
```

#### Update Email Config
```http
POST /api/email-config
Content-Type: application/json
Authorization: Bearer {token}

{
  "emailSubject": "Your Certificate",
  "emailBody": "Dear {name},\n\nCongratulations!",
  "ccEmails": ["manager@company.com"],
  "bccEmails": ["archive@company.com"]
}
```

#### Setup Custom Domain
```http
POST /api/domain-config
Content-Type: application/json
Authorization: Bearer {token}

{
  "customDomain": "certificates.company.com",
  "fromEmail": "noreply@certificates.company.com"
}
```

#### Verify Domain
```http
POST /api/verify-domain
Authorization: Bearer {token}
```

---

### API Key Management

#### Create API Key
```http
POST /api/api-keys
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Production API Key",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "key-uuid",
    "key": "ck_live_abc123def456...",
    "name": "Production API Key",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```

#### List API Keys
```http
GET /api/api-keys
Authorization: Bearer {token}
```

#### Delete API Key
```http
DELETE /api/api-keys/{id}
Authorization: Bearer {token}
```

---

### Certificate Validation (Public)

#### Validate Certificate
```http
GET /api/validate/{certificateId}
```

**Response:**
```json
{
  "valid": true,
  "certificate": {
    "id": "cert-uuid",
    "recipientName": "John Doe",
    "issueDate": "2025-01-10T00:00:00.000Z",
    "imageUrl": "https://s3.amazonaws.com/bucket/cert.png",
    "template": {
      "name": "Participation Certificate"
    }
  }
}
```

---

### Analytics Endpoints

#### Get Usage Analytics
```http
GET /api/analytics
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalCertificates": 1250,
  "totalBatches": 45,
  "totalUsers": 12,
  "certificatesThisMonth": 320,
  "chartData": [...]
}
```

---

## Key Features

### 1. Certificate Template Management

**Features:**
- Custom template upload (PNG, JPG)
- Configurable placeholders with positioning
- Multiple font support (MonteCarlo, AlexBrush, etc.)
- Signature image overlay
- QR code positioning for validation
- Text alignment (left, center, right)
- Custom colors and font sizes

**File:** [app/api/templates/route.ts](app/api/templates/route.ts)

### 2. Bulk Certificate Generation

**Features:**
- CSV data import with validation
- Batch processing with progress tracking
- Async job queue with BullMQ
- Failed certificate retry logic
- Invalid email tracking
- Real-time status updates

**File:** [app/api/generate-certificates/route.ts](app/api/generate-certificates/route.ts)

### 3. Email Delivery System

**Features:**
- Nodemailer SMTP integration
- Retry logic (3 attempts, exponential backoff)
- Rate limiting (configurable emails/second)
- Custom email templates
- CC/BCC support
- Attachment handling (PDF/PNG certificates)
- Bounce tracking and analytics

**Implementation:**
- Email queue worker in [app/api/generate-certificates/route.ts](app/api/generate-certificates/route.ts)
- Rate limiting in [app/config/rate-limit.ts](app/config/rate-limit.ts)

### 4. Custom Domain & DKIM

**Features:**
- Custom email domain setup
- DKIM record generation
- AWS SES domain verification
- Route53 DNS management
- Domain verification status tracking

**Files:**
- [app/api/domain-config/route.ts](app/api/domain-config/route.ts)
- [app/api/verify-domain/route.ts](app/api/verify-domain/route.ts)

### 5. Certificate Validation

**Features:**
- QR code with validation URL
- Public validation endpoint
- Certificate authenticity verification
- Tampering detection

**File:** [app/api/validate/[certificateId]/route.ts](app/api/validate/[certificateId]/route.ts)

### 6. API Access

**Features:**
- RESTful API with API key authentication
- API key expiration management
- Usage tracking per key
- Rate limiting per IP
- Versioned API (v1)

**Files:**
- [app/api/v1/generate/route.ts](app/api/v1/generate/route.ts)
- [app/api/api-keys/route.ts](app/api/api-keys/route.ts)
- [app/middleware.ts](app/middleware.ts)

### 7. Token-Based System

**Features:**
- User token balance tracking
- Token transactions (debit/credit)
- Pay-per-certificate model
- Transaction history

**File:** [app/api/tokens/route.ts](app/api/tokens/route.ts)

### 8. Admin Dashboard

**Features:**
- User management
- Batch monitoring
- Analytics and charts
- System configuration
- Template library

**Route:** `/dashboard` (protected, admin-only)

### 9. Rate Limiting

**Features:**
- Redis-based rate limiting
- IP-based throttling
- Configurable limits
- 10 requests/second default

**File:** [app/config/rate-limit.ts](app/config/rate-limit.ts)

---

## Security Best Practices

### Environment Variables

❌ **Never Do:**
- Commit `.env` files to Git
- Share `.env` files via email/Slack
- Use weak JWT secrets (<32 chars)
- Use your main Gmail password

✅ **Always Do:**
- Use `.env.example` as template (no secrets)
- Generate cryptographically random JWT_SECRET
- Use app-specific passwords for email
- Rotate secrets regularly
- Use environment-specific files (`.env.local`, `.env.production`)

### JWT Secret Generation

```bash
# Generate secure secret (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Security

✅ **Best Practices:**
- Use strong passwords (16+ characters)
- Enable SSL/TLS for connections
- Restrict database access by IP
- Regular backups
- Use connection pooling

**Secure Connection String:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### AWS Security

✅ **IAM Best Practices:**
- Use principle of least privilege
- Create service-specific IAM users
- Never use root account credentials
- Enable MFA on AWS account
- Rotate access keys every 90 days
- Use IAM roles for EC2/Lambda

**S3 Security:**
- Keep buckets private (no public access)
- Use pre-signed URLs for access
- Enable bucket versioning
- Enable server-side encryption

**SES Security:**
- Verify all sender identities
- Use DKIM for authentication
- Monitor bounce rates
- Implement SPF records

### API Security

✅ **Protection Mechanisms:**
- JWT authentication for protected routes
- API key authentication for public API
- Rate limiting (10 req/sec default)
- Input validation with Zod schemas
- SQL injection prevention (Prisma ORM)
- XSS prevention (React escaping)

**Rate Limiting Configuration:**
```typescript
// app/config/rate-limit.ts
const RATE_LIMIT = 10; // requests per second
```

### Password Security

✅ **Implemented:**
- bcrypt hashing (10 rounds)
- Password reset tokens with expiration
- Secure password reset flow

**Password Requirements:**
- Minimum 8 characters (enforce in frontend)
- Mix of letters, numbers, symbols (optional)

### HTTPS/SSL

✅ **Production Requirements:**
- Always use HTTPS in production
- Obtain SSL certificate (Let's Encrypt, CloudFlare, AWS ACM)
- Set `NEXT_PUBLIC_BASE_URL` to `https://`
- Configure Next.js with SSL

### Email Security

✅ **Best Practices:**
- Use app-specific passwords (Gmail)
- Enable SPF, DKIM, DMARC records
- Monitor bounce rates
- Validate email addresses
- Rate limit sending

**Gmail App Password:**
1. Enable 2FA: https://myaccount.google.com/security
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use 16-character password in `SMTP_PASS`

### Redis Security

✅ **Protection:**
- Enable password authentication
- Bind to localhost only (if local)
- Use TLS for remote connections
- Disable dangerous commands (CONFIG, EVAL)

**Secure Redis URL:**
```env
REDIS_URL=redis://:password@localhost:6379
```

### Code Security

✅ **Implemented:**
- TypeScript for type safety
- Zod schema validation
- Prisma ORM (SQL injection prevention)
- React XSS protection (auto-escaping)
- CSRF protection (NextAuth)

❌ **Avoid:**
- `eval()` or `Function()` constructors
- Direct SQL queries
- Unvalidated user input
- Exposing stack traces in production

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error:** `Can't reach database server`

**Solutions:**
```bash
# Check PostgreSQL is running
# Windows:
net start postgresql

# macOS:
brew services start postgresql

# Linux:
sudo systemctl status postgresql

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### 2. Redis Connection Errors

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis

# Windows (Memurai):
net start memurai

# Docker:
docker start redis
```

#### 3. AWS S3 Upload Errors

**Error:** `Access Denied` or `InvalidAccessKeyId`

**Solutions:**
1. Verify IAM credentials in `.env`
2. Check IAM permissions (S3 PutObject)
3. Verify bucket name and region
4. Test credentials:
   ```bash
   aws s3 ls s3://your-bucket --profile default
   ```

#### 4. Email Sending Errors

**Error:** `Invalid login` or `Authentication failed`

**Solutions:**

**Gmail:**
- Use app-specific password, not main password
- Enable 2FA first
- Check for "Less secure app access" warning

**AWS SES:**
- Verify sender email address
- Move out of sandbox for production
- Check SES sending limits

**Test SMTP connection:**
```bash
# Install swaks (SMTP test tool)
swaks --to test@example.com \
      --from $SMTP_USER \
      --server $SMTP_HOST \
      --port $SMTP_PORT \
      --auth-user $SMTP_USER \
      --auth-password $SMTP_PASS
```

#### 5. Migration Errors

**Error:** `Migration failed to apply`

**Solutions:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Force reapply migrations
npx prisma migrate deploy --force

# Check migration status
npx prisma migrate status
```

#### 6. JWT Authentication Errors

**Error:** `Invalid token` or `jwt malformed`

**Solutions:**
1. Verify `JWT_SECRET` in `.env` is set
2. Ensure JWT_SECRET is 32+ characters
3. Check token in request header:
   ```
   Authorization: Bearer {token}
   ```
4. Clear browser cookies/localStorage
5. Re-login to get new token

#### 7. Build Errors

**Error:** `Module not found` or `Type error`

**Solutions:**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Update dependencies
npm update
```

#### 8. Font Loading Errors

**Error:** Fonts not rendering on certificates

**Solutions:**
```bash
# Install fonts
npm run font-install

# Verify fonts exist
ls public/fonts/

# Check font paths in code
# Should be: /fonts/FontName-Regular.ttf
```

#### 9. Rate Limiting Errors

**Error:** `Too many requests`

**Solutions:**
1. Increase rate limit in `.env`:
   ```env
   EMAIL_LIMIT=20
   ```
2. Check Redis connection
3. Clear rate limit:
   ```bash
   redis-cli FLUSHDB
   ```

#### 10. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**
```bash
# Find process using port
# Windows:
netstat -ano | findstr :3000
taskkill /PID {PID} /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

## File Reference

### Critical Configuration Files

| File | Purpose | Path |
|------|---------|------|
| `.env` | Environment variables | Root directory |
| `prisma/schema.prisma` | Database schema | `prisma/schema.prisma` |
| `next.config.ts` | Next.js configuration | Root directory |
| `package.json` | Dependencies & scripts | Root directory |
| `tsconfig.json` | TypeScript config | Root directory |

### Core Application Files

| File | Purpose | Path |
|------|---------|------|
| Database client | Prisma client initialization | [app/lib/db.ts](app/lib/db.ts) |
| S3 utilities | AWS S3 upload functions | [app/lib/s3.ts](app/lib/s3.ts) |
| Auth middleware | JWT & API key validation | [app/middleware.ts](app/middleware.ts) |
| Rate limiter | Redis-based rate limiting | [app/config/rate-limit.ts](app/config/rate-limit.ts) |

### API Route Files

| Endpoint | File Path |
|----------|-----------|
| User registration | [app/api/register/route.ts](app/api/register/route.ts) |
| User login | [app/api/login/route.ts](app/api/login/route.ts) |
| Password reset | [app/api/forgot-password/route.ts](app/api/forgot-password/route.ts) |
| Template CRUD | [app/api/templates/route.ts](app/api/templates/route.ts) |
| Generate certificates | [app/api/generate-certificates/route.ts](app/api/generate-certificates/route.ts) |
| Batch management | [app/api/batches/[batchId]/route.ts](app/api/batches/[batchId]/route.ts) |
| Email config | [app/api/email-config/route.ts](app/api/email-config/route.ts) |
| Domain config | [app/api/domain-config/route.ts](app/api/domain-config/route.ts) |
| Domain verification | [app/api/verify-domain/route.ts](app/api/verify-domain/route.ts) |
| API keys | [app/api/api-keys/route.ts](app/api/api-keys/route.ts) |
| Token transactions | [app/api/tokens/route.ts](app/api/tokens/route.ts) |
| Analytics | [app/api/analytics/route.ts](app/api/analytics/route.ts) |
| Public API v1 | [app/api/v1/generate/route.ts](app/api/v1/generate/route.ts) |
| Certificate validation | [app/api/validate/[certificateId]/route.ts](app/api/validate/[certificateId]/route.ts) |

### Database Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models & schema |
| `prisma/migrations/` | 17 migration files |
| `prisma/scripts/update-admin.ts` | Admin user setup script |

### Frontend Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | Login page |
| `/dashboard` | Admin dashboard (protected) |
| `/templates` | Template management (protected) |
| `/generate` | Certificate generation (protected) |
| `/batches` | Batch list (protected) |
| `/settings` | User settings (protected) |
| `/api-keys` | API key management (protected) |
| `/certificate/[id]` | Public certificate validation |

---

## Quick Reference Commands

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run admin setup
npm run update-admin

# Install fonts
npm run font-install
```

### Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Testing

```bash
# Test database connection
psql $DATABASE_URL

# Test Redis
redis-cli ping

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test SMTP (requires swaks)
swaks --to test@example.com --from $SMTP_USER --server $SMTP_HOST
```

---

## Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- AWS S3: https://docs.aws.amazon.com/s3/
- AWS SES: https://docs.aws.amazon.com/ses/
- BullMQ: https://docs.bullmq.io/
- Redis: https://redis.io/docs/

### Tools
- Prisma Studio: `npx prisma studio`
- Redis Commander: `npm install -g redis-commander`
- PostgreSQL GUI: pgAdmin, TablePlus, DBeaver

### AWS Resources
- IAM Console: https://console.aws.amazon.com/iam/
- S3 Console: https://s3.console.aws.amazon.com/
- SES Console: https://console.aws.amazon.com/ses/
- Route53 Console: https://console.aws.amazon.com/route53/

---

## Deployment Checklist

Before deploying to production:

- [ ] Create production `.env` with all variables
- [ ] Generate secure JWT_SECRET (32+ chars)
- [ ] Setup PostgreSQL database
- [ ] Run all 17 database migrations
- [ ] Create AWS S3 bucket
- [ ] Setup AWS SES and verify domain
- [ ] Configure IAM user with minimal permissions
- [ ] Setup Redis (ElastiCache or managed)
- [ ] Configure SMTP credentials
- [ ] Set NEXT_PUBLIC_BASE_URL to production domain
- [ ] Enable HTTPS/SSL
- [ ] Setup DNS records (A, MX, DKIM, SPF)
- [ ] Create admin user via registration
- [ ] Run admin setup script
- [ ] Test certificate generation
- [ ] Test email sending
- [ ] Configure rate limiting
- [ ] Setup monitoring/logging
- [ ] Configure backups (database + S3)
- [ ] Review security settings
- [ ] Test API endpoints
- [ ] Load test email queue

---

## Production Environment Variables Example

```env
# Production .env
DATABASE_URL=postgresql://produser:strongpass@prod-db.aws.com:5432/certapp?sslmode=require
JWT_SECRET=08b28e1943b3e8ac4be09f3d2e2785fc0613e3ed527dc67125593bb5b6f46760
ADMIN_EMAIL=admin@company.com
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=company-certificates-prod
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_BASE_URL=https://certificates.company.com
REDIS_URL=redis://:password@prod-redis.cache.amazonaws.com:6379
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIASESSMTPUSER
SMTP_PASS=SES-SMTP-PASSWORD
SMTP_SECURE=false
EMAIL_FROM=noreply@certificates.company.com
EMAIL_LIMIT=10
NODE_ENV=production
```

---

## License

This configuration guide is provided as-is for the certificate generation application.

---

**Generated**: 2026-01-10
**Application Version**: 1.0.0
**Next.js Version**: 15.5.6
