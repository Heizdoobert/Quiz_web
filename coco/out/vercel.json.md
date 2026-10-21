# vercel.json
lines:14 exports:
---
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "crons": [
    {
      "path": "/api/cron/system-report",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/daily-challenge",
      "schedule": "5 0 * * *"
    }
  ]
}
