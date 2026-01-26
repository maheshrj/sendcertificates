# Sentry Error Monitoring Setup Guide

## Overview

Sentry automatically tracks and alerts on production errors in real-time.

**Benefits:**
- 📊 Real-time error tracking
- 📧 Email alerts for critical errors
- 🔍 Stack traces and context
- 📈 Error trends and analytics
- 🎯 Know exactly when things break

---

## Step 1: Create Free Sentry Account

1. Go to: https://sentry.io/signup/
2. Sign up (free tier is perfect)
3. Create new project:
   - Platform: **Next.js**
   - Project name: **certificate-app**
4. Copy your **DSN** (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

---

## Step 2: Add DSN to Environment Variables

**On Server:**
```bash
cd /var/www/certificate-app
nano .env
```

**Add this line:**
```
SENTRY_DSN=https://your-dsn-here@xxxxx.ingest.sentry.io/xxxxx
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`)

---

## Step 3: Install and Configure (Already Done)

✅ Sentry package installed: `@sentry/nextjs`  
✅ Configuration files created

---

## Step 4: Deploy and Test

```bash
cd /var/www/certificate-app
git pull origin main
npm install
npm run build
pm2 restart all
```

---

## Step 5: Test Error Tracking

**Create a test error:**
```bash
# On server
curl "http://localhost:3000/api/test-error"
```

**Check Sentry Dashboard:**
1. Go to https://sentry.io
2. Open your project
3. You should see the test error!

---

## What Gets Tracked

### Automatic Tracking:
- ✅ All unhandled exceptions
- ✅ API route errors
- ✅ Email sending failures
- ✅ Database connection errors
- ✅ Redis connection errors

### Custom Tracking:
- ✅ Certificate generation errors
- ✅ Token deduction failures
- ✅ Batch processing errors

---

## Sentry Dashboard Features

### Issues Tab
- See all errors
- Group similar errors
- Track error frequency

### Performance Tab
- API response times
- Slow queries
- Bottlenecks

### Alerts
- Email notifications
- Slack integration
- Custom rules

---

## Setting Up Alerts

1. Go to **Settings** → **Alerts**
2. Create new alert:
   - **Name:** High Error Rate
   - **Condition:** Error rate > 5% in 5 minutes
   - **Action:** Send email
3. Save

**Recommended Alerts:**
- Error rate > 5%
- New error types
- Critical errors (database, Redis)

---

## Error Context

Every error includes:
- **Stack trace** - Exact line of code
- **User info** - User ID (if logged in)
- **Request data** - URL, method, headers
- **Environment** - Production/development
- **Timestamp** - When it happened
- **Custom context** - Batch ID, email, etc.

---

## Monitoring Commands

### Check if Sentry is working:
```bash
# View application logs
pm2 logs certificate-app | grep Sentry

# Should see: "Sentry initialized"
```

### Test error manually:
```bash
curl "http://localhost:3000/api/test-error"
```

---

## Troubleshooting

### Errors not showing in Sentry

**Check DSN is set:**
```bash
cat .env | grep SENTRY_DSN
```

**Check Sentry initialized:**
```bash
pm2 logs certificate-app | grep Sentry
```

**Restart application:**
```bash
pm2 restart certificate-app
```

### Too many errors

**Adjust sample rate** in `sentry.server.config.ts`:
```typescript
tracesSampleRate: 0.1, // Only track 10% of transactions
```

---

## Cost

**Free Tier:**
- 5,000 errors/month
- 10,000 transactions/month
- 1 project
- **Perfect for this app!**

**Paid Plans:**
- Only if you exceed free tier
- ~$26/month for more

---

## Privacy & Security

- ✅ No sensitive data sent (passwords filtered)
- ✅ Can filter specific data
- ✅ GDPR compliant
- ✅ Data encrypted in transit

---

## Integration with Error Handler

Errors are automatically sent to Sentry from:
- `app/lib/error-handler.ts`
- Email worker failures
- API route errors
- Unhandled exceptions

**Example error in Sentry:**
```
Error: validation: Invalid email address or missing required data
Context:
  - email: invalid@email
  - batchId: batch_123
  - category: validation
  - attemptNumber: 1
```

---

## Quick Reference

```bash
# View Sentry DSN
cat .env | grep SENTRY_DSN

# Test error tracking
curl "http://localhost:3000/api/test-error"

# Check logs
pm2 logs certificate-app | grep Sentry

# Restart after config change
pm2 restart certificate-app
```

---

## Next Steps After Setup

1. ✅ Create Sentry account
2. ✅ Add DSN to `.env`
3. ✅ Deploy and restart
4. ✅ Test with test error
5. ✅ Set up email alerts
6. ✅ Monitor dashboard daily

---

**Status:** Ready to configure  
**Cost:** Free  
**Setup Time:** 10 minutes  
**Value:** Priceless! 🎯
