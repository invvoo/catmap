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
| Maps | Google Maps JavaScript API (AdvancedMarkerElement) |
| Backend/DB | Supabase (Postgres + Auth + Storage) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Email | Resend (`onboarding@resend.dev` test domain for now) |
| Styling | Inline styles + `<style>` blocks (no Tailwind/CSS modules) |
| Hosting | Local dev → Vercel (when ready) |

---

## 📁 Project File Structure
```
app/
  page.tsx                        ← Main map page — "I met a cat!" button, markers, navbar
  login/
    page.tsx                      ← Email/password login + signup
  about/
    page.tsx                      ← About page (Our Story)
  care/
    page.tsx                      ← Care for Strays program page
  poster/
    page.tsx                      ← Lost cat poster generator (/poster?catId=xxx)
  api/
    analyse-cat/
      route.ts                    ← Claude AI photo analysis API route
  components/
    AddCatForm.tsx                 ← Add cat form (auto AI, attributes, duplicate detection)
    CatProfile.tsx                 ← Slide-in cat profile panel
supabase/
  functions/
    notify-lost-cat/
      index.ts                    ← Edge function: sends lost cat alerts via Resend
.env.local                        ← API keys (never committed)
CATMAP_LOGIC.md                   ← This file
```

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://ghntalqmhwrhzzjzhlak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...
NEXT_PUBLIC_GOOGLE_MAPS_ID=13ae...dfb9b7f343
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 🗄️ Supabase Schema (Current Known State)

### Table: `cats`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Cat's name — defaults to "Unknown" if not set |
| lat | float | Latitude |
| lng | float | Longitude |
| status | text | 'stray', 'community', 'lost', 'homed' |
| previous_status | text | Stores status before 'lost', nullable |
| image_url | text | URL from Supabase storage |
| attributes | jsonb | All cat attributes (see below) |
| created_at | timestamp | Auto |

#### `attributes` JSONB structure
```json
{
  "gender": "Male | Female | Unknown",
  "age": "Kitten | Young | Adult | Senior | Unknown",
  "coat": "free text — AI auto-filled",
  "eyes": "free text — AI auto-filled",
  "tnr": "None | Left ear | Right ear | Unknown",
  "health_status": "Healthy | Unhealthy | Unknown",
  "friendliness": "Friendly | Shy | Hostile | Unknown",
  "feeding_status": "Recently Fed | Needs Food | Do Not Feed | Unknown",
  "spayed_neutered": "Yes | No | Unknown",
  "tail": "free text, nullable",
  "scars": "free text, nullable",
  "notes": "free text, nullable"
}
```

### Table: `sightings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| cat_id | uuid | FK → cats.id ON DELETE CASCADE |
| user_id | uuid | FK → auth.users.id ON DELETE CASCADE |
| lat | float8 | Browser geolocation |
| lng | float8 | Browser geolocation |
| note | text | Nullable |
| created_at | timestamptz | Default now() |

### Table: `notifications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| user_id | uuid | FK → auth.users.id ON DELETE CASCADE |
| cat_id | uuid | FK → cats.id ON DELETE CASCADE |
| type | text | e.g. 'lost' |
| message | text | |
| read | boolean | Default false |
| created_at | timestamptz | Default now() |

### Storage: `cat-photos` bucket — **public**
- Filename format: `{timestamp}_{originalname}`

### Auth
- Supabase email/password auth
- Users must be logged in to report a cat or log sightings
- No custom `profiles` table yet

### RLS
- **Disabled on all tables** for dev. Must enable before Vercel deploy.

---

## ✅ What's Built

### `app/page.tsx` — Main Map
- Google Maps via script injection, AdvancedMarkerElement, mapId required
- 70px circular photo pins, colored border by status, status dot, emoji fallback
- Markers reload after new cat saved
- **Navbar:** 🐱 CatMap logo | About | Care for Strays | "🐱 I met a cat!" button | Login/Logout
- "I met a cat!" → gets GPS → opens AddCatForm at user's location → pans map
- Map clicks do NOT open form
- Marker click → opens CatProfile

### `app/login/page.tsx` — Auth
- Email + password login and signup, redirects to `/` on success

### `app/about/page.tsx` — About
- "Our Story" editorial page — Lora + DM Sans fonts
- Scroll fade-in animations, pull quote, CTA linking back to map

### `app/care/page.tsx` — Care for Strays
- Community Stray Care Program explainer — Fraunces + Outfit fonts
- Sticky TOC, fund overview cards, step-by-step flows, trust badges, disclaimer
- Covers: Food Fund reimbursement + Vet Care/TNR programs

### `app/poster/page.tsx` — Lost Cat Poster
- Accessed via "🖨️ Generate Lost Poster" on CatProfile (lost cats only)
- A4 portrait, drag-to-crop photo, contact info form, browser print/PDF

### `app/api/analyse-cat/route.ts` — AI Analysis
- POST endpoint, accepts base64 image
- Calls `claude-sonnet-4-20250514`
- Returns: coat, eyes, tnr, gender, age, health_status, friendliness, tail, scars

### `app/components/AddCatForm.tsx` — Add Cat Form
- Opened via "I met a cat!" button → GPS location used
- **Auto AI analysis** fires on photo upload — fills all attribute fields
- Image compressed to max 1024px / JPEG 85% before API call
- EXIF GPS extraction from photo — overrides GPS if found
- Basic fields: Name (optional → "Unknown"), Gender, Age, Status, Coat, Eyes, TNR
- Expandable "More details": Health, Friendliness, Feeding, Spayed/Neutered, Tail, Scars, Notes
- **Nearby duplicate warning:** shows cats within 420ft after photo upload (all cats, no score filter)
- **Save-time match check:** re-scores on Save → modal if score ≥ 4
- Match modal: selectable cards — user can log a sighting for an existing cat instead of saving new

#### Matching Algorithm (weighted score)
| Field | Points | Method |
|---|---|---|
| Coat & Markings | 3 | Fuzzy (word overlap) |
| Eye Color | 2 | Fuzzy |
| Gender | 2 | Exact |
| Tail | 1 | Fuzzy |
| Age Group | 1 | Exact |
| TNR Status | 1 | Exact |

- Score ≥ 7 → "Strong match" (red badge)
- Score 4–6 → "Possible match" (orange badge)
- "Unknown" values never counted as matches
- Name excluded from matching entirely

### `app/components/CatProfile.tsx` — Cat Profile Panel
- Slide-in from right, photo or emoji, name, status badge
- Details card: first seen, location, total sightings, last seen
- Attributes section: all non-Unknown attributes as label/value rows
- Recent sightings: last 3, anonymous, with note
- Sighting modal: GPS + optional note → `sightings` table
- Mark as Lost → updates status, triggers Edge Function
- Mark as Found → reverts to previous_status
- Generate Lost Poster (lost cats only)

### `supabase/functions/notify-lost-cat/` — Edge Function
- Triggered by Mark as Lost in CatProfile
- Inserts `notifications` rows + sends Resend emails to past sighters
- Deployed: `npx supabase functions deploy notify-lost-cat`
- Project ref: `ghntalqmhwrhzzjzhlak`
- Secret: `RESEND_API_KEY` set in Supabase dashboard

---

## 🗺️ PRD Feature Status

| # | Feature | Status |
|---|---|---|
| 1 | Interactive map with pins | ✅ Done |
| 2 | Add cat form | ✅ Done |
| 3 | EXIF GPS extraction | ✅ Done |
| 4 | Auth (login/signup) | ✅ Done |
| 5 | Cat profile panel | ✅ Done |
| 6 | Custom map markers | ✅ Done |
| 7 | Sighting log | ✅ Done |
| 8 | Lost cat alert + poster | ✅ Done |
| 9 | AI photo analysis | ✅ Done |
| 10 | Duplicate/match detection | ✅ Done |
| 11 | About page | ✅ Done |
| 12 | Care for Strays page | ✅ Done |
| 13 | Name voting for strays | 🔲 Next |
| 14 | Photo carousel on profile | 🔲 Planned |
| 15 | Sighting history mini-map | 🔲 Planned |
| 16 | UserProfile table + trust score | 🔲 Planned |
| 17 | Reimbursement requests + verification | 🔲 Planned |
| 18 | Notifications UI | 🔲 Planned |
| 19 | Private messaging | 🔲 Planned |

---

## 📋 Next Steps
1. **Step 13:** Name voting for strays
2. **Pre-deploy:** Enable RLS, real Resend domain, Vercel deploy

---

## 📝 Session Log

### Session 1 — March 12, 2026
- Full build session covering steps 1–12
- All core features built: map, auth, AI analysis, duplicate matching, lost cat flow, poster, About + Care pages
- "I met a cat!" GPS button replaces map-click upload
- Supabase project: `ghntalqmhwrhzzjzhlak`

---

## 🔗 References
- [Supabase JS Docs](https://supabase.com/docs/reference/javascript)
- [Google Maps JS API](https://developers.google.com/maps/documentation/javascript)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Anthropic Claude API](https://docs.anthropic.com/en/api/getting-started)
- [Google Maps AdvancedMarkerElement](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
