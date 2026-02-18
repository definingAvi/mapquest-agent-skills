---
name: mapquest-key-security
description: Best practices for securing MapQuest API keys. Covers environment variables, referrer restrictions, server-side proxying, key rotation, and incident response when a key is exposed.
---

# MapQuest API Key Security

## Overview

Your MapQuest API key is a secret credential. Exposing it allows others to use your quota, incur charges on your account, and potentially abuse MapQuest services. Always treat API keys like passwords.

---

## The Golden Rules

1. **Never hardcode an API key in source code**
2. **Never commit a key to version control**
3. **Use referrer restrictions in the MapQuest developer portal**
4. **For server-rendered or backend apps: proxy all MapQuest requests through your server**
5. **Rotate keys if you suspect exposure**

---

## Environment Variable Storage

### Frontend (Vite / React / Vue)

```bash
# .env.local (never commit this file)
VITE_MAPQUEST_API_KEY=your_key_here
```

```js
// Access in code:
const apiKey = import.meta.env.VITE_MAPQUEST_API_KEY;
```

```
# .gitignore — ensure .env files are excluded
.env
.env.local
.env*.local
```

### Backend (Node.js)

```bash
# .env
MAPQUEST_API_KEY=your_key_here
```

```js
require('dotenv').config();
const apiKey = process.env.MAPQUEST_API_KEY;
```

### Never do this:

```js
// ❌ WRONG — key is visible in source code and bundle
const apiKey = 'Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9';

// ❌ WRONG — key in git history forever
// git commit -m "added api key"
```

---

## Referrer Restrictions (Developer Portal)

In the [MapQuest Developer Portal](https://developer.mapquest.com), set **Allowed Referrers** for each key:

- `https://yourdomain.com/*` — production
- `https://staging.yourdomain.com/*` — staging
- `http://localhost:*` — local development

This limits the key to only work when requests originate from your domains. Client-side keys with referrer restrictions are significantly safer than unrestricted keys.

**Limitation:** Referrer headers can be spoofed by determined bad actors. For truly sensitive apps, use server-side proxying instead.

---

## Server-Side Proxy (Recommended for Production)

Never send MapQuest API requests directly from client-side code in production. Instead, proxy through your backend:

```js
// Express.js proxy route
const express = require('express');
const router = express.Router();

router.get('/geocode', async (req, res) => {
  const { address } = req.query;

  // Validate input
  if (!address || address.length > 500) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  // Optional: rate limit per user/IP here

  try {
    const response = await fetch(
      `https://www.mapquestapi.com/geocoding/v1/address?key=${process.env.MAPQUEST_API_KEY}&location=${encodeURIComponent(address)}&thumbMaps=false`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Geocoding service unavailable' });
  }
});
```

```js
// Client-side — call your proxy, not MapQuest directly
const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
```

**Benefits of proxying:**
- API key never exposed to browser
- You can rate-limit per user
- You can cache responses
- You can log and monitor usage

---

## Key Rotation Strategy

Create multiple keys in the MapQuest Developer Portal:

| Key Name | Purpose | Restrictions |
|---|---|---|
| `production-web` | Live site | Referrer: `https://yourdomain.com/*` |
| `staging-web` | Staging environment | Referrer: `https://staging.yourdomain.com/*` |
| `development` | Local dev | Referrer: `http://localhost:*` |
| `server-side` | Backend proxy | No referrer (IP-restricted if possible) |

Rotate keys every 90 days or immediately after any potential exposure.

---

## Incident Response: Exposed Key

If you suspect a key was exposed (e.g., committed to a public repo):

1. **Immediately regenerate/revoke the key** in the MapQuest Developer Portal
2. **Deploy a new key** from your secure environment variable store
3. **Purge git history** if committed (use `git filter-branch` or BFG Repo Cleaner)
4. **Check MapQuest usage logs** for unusual activity
5. **Notify your team** and update deployment pipelines

```bash
# If key was committed — remove from git history
# Install BFG: https://rtyley.github.io/bfg-repo-cleaner/
bfg --replace-text secrets.txt my-repo.git
git push --force
```

---

## Checklist for Every Project

- [ ] API key stored in `.env` / environment variable, never in source code
- [ ] `.env` files added to `.gitignore`
- [ ] Referrer restrictions configured in MapQuest Developer Portal
- [ ] Separate keys for production, staging, and development
- [ ] Server-side proxy implemented for production (recommended)
- [ ] Key rotation schedule documented (every 90 days)
- [ ] Team members aware not to log or share keys in chat/tickets

---

## What Not to Do

❌ Don't log API keys in console.log or server logs

❌ Don't share API keys in Slack, email, or issue trackers

❌ Don't use the same key for development and production

❌ Don't store keys in local storage or cookies (accessible to JS/XSS)

❌ Don't put keys in URLs (they appear in server logs and browser history)
