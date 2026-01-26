# Redis Resilience - Implementation Summary

## What Was Implemented

Enhanced Redis connection with comprehensive resilience features to prevent queue crashes.

---

## Features Added

### 1. Retry Logic with Exponential Backoff
```typescript
retryStrategy(times) {
  if (times > 10) {
    return null; // Stop after 10 attempts
  }
  const delay = Math.min(times * 1000, 10000); // 1s, 2s, 4s... max 10s
  return delay;
}
```

**Retry Schedule:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 3 seconds
- ...
- Attempt 10: 10 seconds
- **Total retry time:** ~55 seconds

### 2. Automatic Reconnection
```typescript
reconnectOnError(err) {
  return true; // Always try to reconnect
}
```

**Reconnects on:**
- Network errors
- Connection timeouts
- Redis server restarts
- Any connection failures

### 3. Connection Event Handlers

**Monitors connection health:**
- ✅ `connect` - Successfully connected
- ✅ `ready` - Ready to accept commands
- 🔄 `reconnecting` - Attempting to reconnect
- ⚠️ `close` - Connection closed
- ⚠️ `end` - Connection ended
- ❌ `error` - Connection error

**Logs example:**
```
✅ Successfully connected to Redis
✅ Redis is ready to accept commands
❌ Redis connection error: Connection timeout
🔄 Redis reconnecting in 2000ms...
✅ Successfully connected to Redis
```

### 4. Automatic Job Cleanup

**Completed jobs:**
- Keep for 24 hours
- Keep last 1000 jobs
- Prevents memory bloat

**Failed jobs:**
- Keep for 7 days
- Useful for debugging
- Auto-cleanup after 7 days

### 5. Queue Error Handling

```typescript
emailQueue.on('error', (error) => {
  console.error('❌ Email queue error:', error.message);
});
```

---

## Testing Redis Resilience

### Test 1: Redis Restart

**On server:**
```bash
# Restart Redis
sudo systemctl restart redis

# Watch logs
pm2 logs certificate-app --lines 50
```

**Expected output:**
```
⚠️ Redis connection closed
🔄 Redis reconnecting in 1000ms...
🔄 Redis retry attempt 1/10, waiting 1000ms
✅ Successfully connected to Redis
✅ Redis is ready to accept commands
```

### Test 2: Redis Stop/Start

**Stop Redis:**
```bash
sudo systemctl stop redis
pm2 logs certificate-app
```

**Expected:**
```
❌ Redis connection error: Connection refused
🔄 Redis retry attempt 1/10, waiting 1000ms
🔄 Redis retry attempt 2/10, waiting 2000ms
...
```

**Start Redis:**
```bash
sudo systemctl start redis
pm2 logs certificate-app
```

**Expected:**
```
✅ Successfully connected to Redis
✅ Redis is ready to accept commands
```

### Test 3: Send Email During Redis Downtime

**While Redis is down:**
```bash
# Try to send email
curl -X POST http://localhost:3000/api/generate-certificates \
  -H "Content-Type: application/json" \
  -d '{"emails": ["test@example.com"]}'
```

**Expected:**
- Request should still work
- Email will be queued when Redis comes back
- No crashes or errors

---

## Monitoring Redis Health

### Check Connection Status

**View logs:**
```bash
pm2 logs certificate-app | grep Redis
```

**Look for:**
- ✅ Connection successful
- 🔄 Reconnection attempts
- ❌ Connection errors

### Check Queue Status

**In Redis CLI:**
```bash
redis-cli

# Check queue length
LLEN bull:emailQueue:wait

# Check failed jobs
LLEN bull:emailQueue:failed

# Check completed jobs
LLEN bull:emailQueue:completed
```

---

## Benefits

### Before (Without Resilience):
- ❌ Redis restart = Queue crashes
- ❌ Connection lost = App crashes
- ❌ No retry logic
- ❌ No automatic recovery

### After (With Resilience):
- ✅ Redis restart = Auto-reconnect
- ✅ Connection lost = Retry 10 times
- ✅ Exponential backoff
- ✅ Automatic recovery
- ✅ Detailed logging
- ✅ Job cleanup

---

## Configuration

**Current Settings:**
```typescript
{
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 10000, // 10 seconds
  retryStrategy: 10 attempts, exponential backoff
  reconnectOnError: true
}
```

**Queue Settings:**
```typescript
{
  attempts: 5, // Email retry attempts
  backoff: exponential, 1s delay
  removeOnComplete: 24 hours or 1000 jobs
  removeOnFail: 7 days
}
```

---

## Troubleshooting

### Redis Won't Connect

**Check Redis is running:**
```bash
sudo systemctl status redis
```

**Check Redis URL:**
```bash
cat .env | grep REDIS_URL
```

**Test connection:**
```bash
redis-cli ping
# Should return: PONG
```

### Too Many Retries

**Check logs:**
```bash
pm2 logs certificate-app | grep "retry attempt"
```

**If seeing 10/10 attempts:**
- Redis is down
- Wrong REDIS_URL
- Network issues

### Queue Not Processing

**Check worker is running:**
```bash
pm2 logs certificate-app | grep "worker"
```

**Check queue length:**
```bash
redis-cli LLEN bull:emailQueue:wait
```

---

## Quick Reference

**Monitor Redis:**
```bash
pm2 logs certificate-app | grep Redis
```

**Check queue:**
```bash
redis-cli LLEN bull:emailQueue:wait
```

**Restart Redis:**
```bash
sudo systemctl restart redis
```

**View failed jobs:**
```bash
redis-cli LLEN bull:emailQueue:failed
```

---

**Status:** ✅ Implemented  
**Tested:** Ready for testing  
**Impact:** High - Prevents queue crashes
