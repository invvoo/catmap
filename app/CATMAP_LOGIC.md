# 🐱 CatMap — Project Logic & Context File
> **Purpose:** Feed this document into any new Claude chat to restore full project context.  
> **Rule:** Claude must update this file after every prompt session. Always ask before making changes. Ask clarifying questions if anything is unclear.

---

## 🔁 Working Rules (Claude Must Follow)
1. **Always ask before making changes** — describe what you plan to do and wait for approval.
2. **Ask clarifying questions** if requirements are ambiguous.
3. **Update this MD file** after every work session with what was done and what's next.
4. **One feature at a time** — don't jump ahead.
5. **Reference this file at the start of every new chat** to restore context.
6. **Never assume** — if a Supabase table, column, or bucket name is uncertain, ask first.

---

## 🧱 Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, React |
| Maps | Google Maps JavaScript API |
| Backend/DB | Supabase (Postgres + Auth + Storage) |
| AI (planned) | Anthropic Claude API (via Artifacts / API calls) |
| Styling | Inline styles (no Tailwind/CSS modules currently) |
| Hosting | (Not confirmed — ask user) |

---

## 📁 Project File Structure (Known)
```
app/
  page.tsx                  ← Main map page (home)
  login/
    page.tsx                ← Login/signup page
  components/
    AddCatForm.tsx          ← Form to report a new cat
    CatProfile.tsx          ← Slide-in panel showing cat details
.env.local                  ← API keys (not committed)
```

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
```

---

## 🗄️ Supabase Schema (Current Known State)

### Table: `cats`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Cat's name |
| lat | float | Latitude |
| lng | float | Longitude |
| description | text | Free text |
| status | text | 'stray', 'community', 'lost', 'homed' |
| image_url | text | URL from Supabase storage |
| created_at | timestamp | Auto |

### Table: `sightings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, gen_random_uuid() |
| cat_id | uuid | FK → cats.id |
| user_id | uuid | FK → auth.users.id |
| lat | float8 | From browser geolocation |
| lng | float8 | From browser geolocation |
| note | text | Nullable, optional |
| created_at | timestamptz | Default now() |
### Table: `notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, gen_random_uuid() |
| user_id | uuid | FK → auth.users.id |
| cat_id | uuid | FK → cats.id |
| type | text | e.g. 'lost' |
| message | text | Notification text |
| read | boolean | Default false |
| created_at | timestamptz | Default now() |

### `cats` table additions
| Column | Type | Notes |
|---|---|---|
| previous_status | text | Stores status before 'lost', nullable |

### Storage Bucket: `cat-photos`
- Stores uploaded cat photos
- Filename format: `{timestamp}_{originalname}`

### Auth
- Supabase email/password auth
- Users must be logged in to report a cat
- No custom `profiles` table yet (just Supabase auth user)

---

## ✅ What's Already Built

### 1. Main Map (`app/page.tsx`)
- Loads Google Maps via script injection
- Loads all cats from Supabase and places markers
- Click on map → opens `AddCatForm` (requires login)
- Click on marker → opens `CatProfile`
- Navbar with login/logout

### 2. Login Page (`app/login/page.tsx`)
- Email + password login and signup
- Redirects to `/` on success
- Error messaging

### 3. AddCatForm (`app/components/AddCatForm.tsx`)
- Photo upload with preview
- **EXIF GPS extraction** — reads lat/lng from photo metadata
- Falls back to map-click location if no EXIF data
- Fields: Name, Description, Status dropdown
- Uploads photo to `cat-photos` bucket
- Inserts row into `cats` table

### 4. CatProfile (`app/components/CatProfile.tsx`)
- Slide-in panel from right
- Shows photo (or cat emoji placeholder)
- Status badge with color + emoji
- Description, first seen date, lat/lng
- **Two buttons — NOT yet wired up:**
  - "📍 I saw this cat recently!"
  - "🚨 Mark as Lost"

---

## 🗺️ PRD Feature List & Status

| # | Feature | Status | Priority |
|---|---|---|---|
| 1 | Interactive map with pins | ✅ Done | — |
| 2 | Add cat / sighting form | ✅ Done | — |
| 3 | EXIF GPS extraction | ✅ Done | — |
| 4 | Auth (login/signup) | ✅ Done | — |
| 5 | Cat profile panel | ✅ Done (UI only) | — |
| 6 | Custom map markers (color by status) | ✅ Done | High |
| 7 | Sighting log ("I saw this cat") | ✅ Done | High |
| 8 | Lost cat alert + poster generator | 🔲 Not started (alert done, poster pending) | High |
| 9 | AI photo analysis (markings, TNR) | 🔲 Not started | Medium |
| 10 | Name voting for strays | 🔲 Not started | Medium |
| 11 | Photo carousel on profile | 🔲 Not started | Medium |
| 12 | Sighting history / movement mini-map | 🔲 Not started | Medium |
| 13 | Reimbursement requests + verification | 🔲 Not started | Low |
| 14 | Trust score system | 🔲 Not started | Low |
| 15 | Private messaging | 🔲 Not started | Low |
| 16 | Notifications | 🔲 Not started | Low |
| 17 | Poster generator (printable lost cat) | 🔲 Not started | High |
| 18 | "Near Me" geographic discovery | 🔲 Not started | Medium |
| 19 | UserProfile table (roles, trust score) | 🔲 Not started | Medium |

---

## 📋 Agreed Step-by-Step Build Order
*(To be confirmed with user — not yet locked in)*

**Phase 1 — Map Polish & Core Interactions**
- [x] Step 1: Custom map markers — ✅ Done (photo pins, colored ring, status dot, AdvancedMarkerElement)
- [x] Step 2: Wire up "I saw this cat" → sighting log ✅ Done

**Phase 2 — Lost Cat Flow**
- [x] Step 3: "Mark as Lost" button ✅ Done — red banner, confirmation modal, alerts via in-app notifications + Resend email, reversible with "Mark as Found"
- [ ] Step 4: Lost cat poster generator page

**Phase 3 — AI Features**
- [ ] Step 5: AI photo analysis via Claude API (markings, TNR ear clip detection)
- [ ] Step 6: Duplicate/match detection

**Phase 4 — Community Features**
- [ ] Step 7: Name voting for strays
- [ ] Step 8: Photo carousel
- [ ] Step 9: Sighting history timeline + mini-map

**Phase 5 — Trust & Funding**
- [ ] Step 10: UserProfile table + trust score
- [ ] Step 11: Reimbursement requests + peer verification

---

## ✅ Confirmed Answers
1. **Hosting** — Local dev now, Vercel when ready. Code should be Vercel-compatible from the start.
2. **Supabase RLS** — Disabled for now (testing). Will need to enable before production/Vercel deploy.
3. **`cat-photos` bucket** — Public ✅
4. **UserProfile table** — Does NOT exist yet. Needs to be created.
5. **AI** — Anthropic Claude API confirmed for photo analysis features.

## 🔲 Still Open
1. **Google Maps API version** — currently using legacy `Marker`. Should we upgrade to `AdvancedMarkerElement` for custom styled markers? (Recommended — ask user before doing so.)
2. **`profiles` table schema** — what columns do we want? Suggested: `id` (uuid, FK to auth.users), `email`, `display_name`, `role` (enum: casual/caretaker/owner/admin), `trust_score` (int), `created_at`. Confirm before creating.
3. **RLS** — needs to be enabled before Vercel deploy. Flag this at the right time.

---

## 📝 Session Log

### Session 1 — [March 12, 2026]
- User uploaded all existing source files
- PRD reviewed and understood
- This CATMAP_LOGIC.md file created
- Confirmed: local dev → Vercel later, RLS off for now, bucket is public, no profiles table yet, Claude API for AI
- ✅ Step 1 complete: Custom map markers — upgraded to AdvancedMarkerElement, 70px circular photo pins with colored status ring + status dot. Fallback to 🐱 emoji if no photo.
- New env var needed: `NEXT_PUBLIC_GOOGLE_MAPS_ID` (Map ID from Google Cloud Console)
- ✅ Step 2 complete: Sighting log wired up. New `sightings` table required in Supabase (see schema). CatProfile now shows total sightings, last seen time, recent sightings list (anonymous), and a modal with optional note + GPS requirement.
- ✅ Step 3 complete: Mark as Lost/Found. New `notifications` table + `previous_status` column on `cats`. Edge function `notify-lost-cat` deployed via Supabase CLI. Emails via Resend (onboarding@resend.dev for now).
- **Next:** Step 4 — Lost cat poster generator

---

## 🔗 Useful References
- [Supabase JS Docs](https://supabase.com/docs/reference/javascript)
- [Google Maps JS API](https://developers.google.com/maps/documentation/javascript)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Anthropic Claude API](https://docs.anthropic.com/en/api/getting-started)
- [Google Maps AdvancedMarkerElement](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
