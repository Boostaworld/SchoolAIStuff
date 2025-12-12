# Database Migration Plan: Self-Hosted Supabase

## Goal
Migrate from Supabase Cloud (free tier, 500MB limit) to a self-hosted Supabase instance with unlimited storage.

---

## Phase 1: Infrastructure Setup (Google Cloud)

### Why Google Cloud?
- **$300 free credits** for 90 days (new accounts)
- Reliable infrastructure, easy scaling
- Can run Supabase on a single VM or use Cloud SQL

### Recommended Setup
| Resource | Spec | Est. Cost/Month |
|----------|------|-----------------|
| Compute Engine VM | e2-medium (2 vCPU, 4GB RAM) | ~$25 |
| Boot Disk | 50GB SSD | ~$5 |
| Static IP | 1 | ~$3 |
| **Total** | | **~$33/month** |

> With $300 credits, you get **~9 months free**!

### Steps
1. Create Google Cloud account at [cloud.google.com](https://cloud.google.com)
2. Claim your $300 free trial credits
3. Create a Compute Engine VM:
   - Machine type: `e2-medium` (4GB RAM)
   - OS: Ubuntu 22.04 LTS
   - Boot disk: 50GB SSD
   - Allow HTTP/HTTPS traffic
4. Reserve a static external IP
5. SSH into instance and install Docker + Docker Compose

---

## Phase 2: Self-Host Supabase

### Installation
```bash
# Clone Supabase Docker setup
git clone https://github.com/supabase/supabase
cd supabase/docker

# Copy example env
cp .env.example .env

# Generate secure keys (IMPORTANT!)
# Edit .env with your own JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY

# Start Supabase
docker compose up -d
```

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Database password |
| `JWT_SECRET` | 32+ char secret for JWT tokens |
| `ANON_KEY` | Public API key |
| `SERVICE_ROLE_KEY` | Admin API key (keep secret!) |
| `SITE_URL` | Your app's URL |

---

## Phase 3: Data Migration (Zero Data Loss)

### Step 1: Export from Supabase Cloud

**Option A: Supabase Dashboard**
1. Go to Settings > Database > Backups
2. Download the latest backup (`.sql` file)

**Option B: pg_dump (recommended)**
```bash
# Get connection string from Supabase Dashboard > Settings > Database
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres" \
  --clean --if-exists --no-owner --no-privileges \
  -f backup.sql
```

### Step 2: Export Storage Files
```bash
# Use Supabase CLI
supabase storage download --project-ref [PROJECT-ID] ./storage-backup/
```

### Step 3: Import to Self-Hosted

**Database:**
```bash
# Connect to self-hosted Postgres
psql "postgresql://postgres:[PASSWORD]@[YOUR-VPS-IP]:5432/postgres" < backup.sql
```

**Storage:**
```bash
# Upload files to self-hosted storage bucket
supabase storage upload --project-ref [NEW-PROJECT] ./storage-backup/
```

### Step 4: Verify Data Integrity
- [ ] Compare row counts for all tables
- [ ] Spot-check critical data (users, images, messages)
- [ ] Test authentication with existing accounts
- [ ] Verify RLS policies are working

---

## Phase 4: App Migration

### Update Environment Variables
```env
# OLD (Supabase Cloud)
VITE_SUPABASE_URL=https://aicquxhnjdqshoaaqlxk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...old-key

# NEW (Self-Hosted)
VITE_SUPABASE_URL=https://your-vps-domain.com
VITE_SUPABASE_ANON_KEY=eyJ...new-key
```

### DNS Setup (Optional but Recommended)
- Point a subdomain like `api.yourdomain.com` to your VPS
- Set up Let's Encrypt SSL with Caddy or nginx

---

## Rollback Plan

If migration fails:
1. Keep Supabase Cloud project active for 30 days post-migration
2. Simply revert `.env` to old values
3. No data loss since cloud instance remains untouched

---

## Checklist

- [ ] Oracle Cloud account created
- [ ] VPS instance running
- [ ] Docker + Supabase installed
- [ ] Database exported from cloud
- [ ] Storage files exported
- [ ] Data imported to self-hosted
- [ ] Row counts verified
- [ ] Auth tested
- [ ] `.env` updated in app
- [ ] App tested against new backend
- [ ] Cloud project archived (not deleted, as backup)

---

## Timeline Estimate
| Task | Time |
|------|------|
| Oracle Cloud setup | 1-2 hours |
| Supabase installation | 30 min |
| Data export | 15 min |
| Data import | 15-30 min |
| Testing & verification | 1-2 hours |
| **Total** | **~4-5 hours** |

---

## Notes
- Self-hosted Supabase is identical API - **zero code changes needed**
- Oracle Cloud free tier never expires
- Can scale up by adding more storage or RAM later
