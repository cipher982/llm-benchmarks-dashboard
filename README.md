## [llm-benchmarks.com](https://llm-benchmarks.com)

[![Status](https://img.shields.io/uptimerobot/status/m797914664-fefc15fb1a5bba071a8a5c91)](https://stats.uptimerobot.com/JLmzRuRDp5)
[![Uptime](https://img.shields.io/uptimerobot/ratio/30/m797914664-fefc15fb1a5bba071a8a5c91)](https://stats.uptimerobot.com/JLmzRuRDp5)
![Cronitor](https://cronitor.io/badges/G8yp5e/production/VnmBXHNorcpEyvbg9ASvxeGp8zU.svg)

Frontend/backend code for https://github.com/cipher982/llm-benchmarks

### Environment configuration

- NODE_ENV: required. Must be `production` or `development`. The server refuses to start if missing/invalid.
- ADMIN_API_KEY: required in production. Used for all admin-protected endpoints via `x-admin-key` header.
- DISABLE_CORS: optional. If set to `true`, CORS is disabled (allow all origins). Do not use in production.
- MONGODB_URI, PORT, FRONTEND_URL: standard service configuration.

Notes:
- Manual data generation endpoint `/admin/generate-data` is protected by `x-admin-key` in production and is mostly for debugging; a cron job runs every 30 minutes automatically.
