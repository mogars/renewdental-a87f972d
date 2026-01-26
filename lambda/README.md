# AWS Lambda Functions

Node.js Lambda functions converted from Supabase Edge Functions.

## Functions

| Function | Description |
|----------|-------------|
| `send-sms-reminder` | Scheduled SMS reminders (24h, 2h, 1h before appointments) |
| `send-immediate-sms` | Send SMS immediately for a specific appointment |
| `create-user` | Admin-only user creation with role assignment |

## Deployment

### 1. Install dependencies
```bash
cd lambda
npm install
```

### 2. Package each function
```bash
# For each function folder:
cd send-sms-reminder
zip -r ../send-sms-reminder.zip .
cd ..
```

### 3. Create Lambda functions in AWS Console

1. Go to AWS Lambda → Create function
2. Runtime: Node.js 18.x or 20.x
3. Upload the ZIP file
4. Set handler to `index.handler`

### 4. Environment Variables

Set these in Lambda Configuration → Environment variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TEXTBEE_API_KEY` | TextBee API key |
| `TEXTBEE_DEVICE_ID` | TextBee device ID |

### 5. API Gateway

1. Create HTTP API in API Gateway
2. Add routes:
   - `POST /send-sms-reminder` → send-sms-reminder Lambda
   - `POST /send-immediate-sms` → send-immediate-sms Lambda
   - `POST /create-user` → create-user Lambda
3. Enable CORS

### 6. Scheduled Reminders (EventBridge)

For `send-sms-reminder`, create EventBridge rule:
1. Go to EventBridge → Rules → Create rule
2. Schedule: `rate(30 minutes)` or cron expression
3. Target: send-sms-reminder Lambda

## Frontend Integration

Update your frontend to call the new Lambda endpoints:

```typescript
// Replace Supabase function calls with Lambda URLs
const LAMBDA_BASE_URL = "https://your-api-gateway.execute-api.region.amazonaws.com";

// Example: Send immediate SMS
const response = await fetch(`${LAMBDA_BASE_URL}/send-immediate-sms`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ appointmentId }),
});
```

## Security Notes

- All functions validate JWT tokens from Supabase Auth
- `create-user` requires admin role
- SMS functions require admin, staff, or dentist role
- Service role key should be kept secret (never expose in frontend)
