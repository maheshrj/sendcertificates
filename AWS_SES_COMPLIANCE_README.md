# AWS SES Production Compliance - Quick Start

## 🚀 Implementation Complete!

The AWS SES production compliance implementation is complete. This README provides quick setup instructions.

## ✅ What's Been Implemented

1. **Bounce & Complaint Handling** - SNS webhook at `/api/ses-notifications`
2. **Suppression List** - Automatic blocking of bounced/complained/unsubscribed emails
3. **Global Rate Limiting** - 10 emails/sec, 50,000/day enforcement
4. **Enhanced Email Templates** - Professional design with unsubscribe, validation links
5. **Quota Monitoring** - API endpoint at `/api/ses-quota`
6. **Unsubscribe Functionality** - Endpoint at `/api/unsubscribe`

## 📋 Next Steps (Required)

### 1. Run Database Migration

```bash
# Apply schema changes
npx prisma migrate dev --name add_complaint_and_suppression_models

# Regenerate Prisma client (fixes TypeScript errors)
npx prisma generate
```

### 2. Configure AWS SNS

#### Create SNS Topics
1. Go to AWS Console → SNS → Topics
2. Create `ses-bounces-production` (Standard, ap-south-1)
3. Create `ses-complaints-production` (Standard, ap-south-1)

#### Configure SES
1. Go to AWS Console → SES → Verified Identities
2. Select your domain/email → Edit Notifications
3. Set:
   - Bounce feedback: `ses-bounces-production`
   - Complaint feedback: `ses-complaints-production`
   - Include original headers: ✅ Enabled

#### Subscribe Webhook
1. For each SNS topic → Create subscription
2. Protocol: HTTPS
3. Endpoint: `https://yourdomain.com/api/ses-notifications`
4. Webhook will auto-confirm

### 3. Update Environment Variables

Add to `.env`:
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com
```

### 4. Test the Implementation

#### Test Bounce Handling
```bash
# Send test email to AWS simulator
curl -X POST https://yourdomain.com/api/generate-certificates \
  -d "email=bounce@simulator.amazonses.com"

# Verify:
# 1. Webhook receives notification
# 2. Email added to suppression list
# 3. Future sends are blocked
```

#### Test Complaint Handling
```bash
# Send test email to AWS simulator
curl -X POST https://yourdomain.com/api/generate-certificates \
  -d "email=complaint@simulator.amazonses.com"

# Verify same as bounce handling
```

#### Test Unsubscribe
1. Send certificate email
2. Click unsubscribe link in footer
3. Verify confirmation page
4. Check email is in suppression list

#### Test Rate Limiting
```bash
# Check current quota usage
curl https://yourdomain.com/api/ses-quota

# Response shows current usage and limits
```

## 📊 Monitoring

### Check Bounce/Complaint Rates

```sql
-- Bounce rate (last 24 hours)
SELECT COUNT(*) FROM "Bounce" WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- Complaint rate (last 24 hours)
SELECT COUNT(*) FROM "Complaint" WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- Suppression list size
SELECT COUNT(*), reason FROM "SuppressionList" GROUP BY reason;
```

### API Endpoints

- **Quota Usage**: `GET /api/ses-quota`
- **SNS Webhook**: `POST /api/ses-notifications`
- **Unsubscribe**: `GET /api/unsubscribe?email=user@example.com`

## 🎯 Compliance Status

- ✅ Bounce handling automated
- ✅ Complaint handling automated
- ✅ Suppression list enforced
- ✅ Rate limiting: 10 emails/sec, 50,000/day
- ✅ Unsubscribe mechanism (List-Unsubscribe headers + link)
- ✅ Professional email templates
- ✅ Plain text versions
- ✅ Monitoring and quota tracking

## 📚 Documentation

See [walkthrough.md](./walkthrough.md) for detailed implementation documentation.

## ⚠️ Important Notes

1. **TypeScript Errors**: Run `npx prisma generate` to fix lint errors
2. **SNS Webhook**: Must be publicly accessible via HTTPS
3. **Rate Limits**: Bulk sends now limited to 10 emails/sec (AWS compliance)
4. **Suppression List**: Emails are automatically blocked after bounce/complaint

## 🔍 Troubleshooting

### Prisma Errors
```bash
npx prisma generate
```

### SNS Not Working
- Check subscription is "Confirmed" in AWS Console
- Verify webhook is publicly accessible
- Check CloudWatch logs for delivery failures

### Rate Limit Issues
- Verify Redis is connected
- Check `REDIS_URL` environment variable
- Review logs for rate limit messages

## 📞 Support

For issues or questions, refer to the detailed [walkthrough.md](./walkthrough.md) documentation.
