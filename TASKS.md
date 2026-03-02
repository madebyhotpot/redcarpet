# Redcarpet — Agent Task List

**Project:** Confluence Awards — Augmented Red Carpet Experience
**Stack:** Next.js (App Router) · TypeScript · TailwindCSS · Supabase · Vercel Blob · fal.ai · Trigger.dev

## How agents use this file

1. Find a task whose dependencies are all `[x] DONE`
2. Change its `Status` line to `[~] IN_PROGRESS (agent: <your-session-id>)`
3. Implement the task according to the Scope and Acceptance Criteria
4. Change `Status` to `[x] DONE` when complete

**Status markers:**
- `[ ] TODO` — not started
- `[~] IN_PROGRESS (agent: <id>)` — claimed by an agent
- `[x] DONE` — complete

---

## Dependency Graph

```
T01 → T02 → T03 → T04
                 → T06
                 → T08 → T14 → T15 → T16
                 → T17 (also needs T05)
                 → T07 (also needs T17)
           T02 → T05
      T01 → T09 → T10 → T11 → T12 → T13
                                (T12 also needs T06, T07)
```

Parallelizable once T03 is done: T04, T05, T06, T08, T09 (T09 only needs T01)
Parallelizable once T08+T09 are done: T14 chain
Parallelizable once T03+T05 are done: T17

---

## Phase 1 — Foundation

---

## T01 — Scaffold Next.js project
**Status:** [x] DONE
**Depends on:** none

**Scope:**
- Run `npx create-next-app@latest` in `/Users/ansonkao/Sites/redcarpet` with these options: App Router, TypeScript, TailwindCSS, no src/ directory, no custom import alias
- Confirm the following exist after scaffolding: `app/`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `package.json`

**Acceptance criteria:**
- `npm run dev` starts the dev server with no errors
- Default Next.js page renders at `localhost:3000`

---

## T02 — Install all project dependencies
**Status:** [x] DONE
**Depends on:** T01

**Scope:**
Install the following packages:
```
npm install react-webcam embla-carousel-react framer-motion
npm install @supabase/supabase-js @vercel/blob @fal-ai/client
npm install @trigger.dev/sdk @trigger.dev/nextjs
```

Create `.env.example` at the project root:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
BLOB_READ_WRITE_TOKEN=
FAL_KEY=
TRIGGER_SECRET_KEY=
TRIGGER_API_URL=
```

**Acceptance criteria:**
- All packages appear in `package.json` dependencies
- `.env.example` exists with all keys listed above
- `npm run dev` still starts with no errors

---

## Phase 2 — Database & Seed

---

## T03 — Supabase schema
**Status:** [x] DONE
**Depends on:** T02

**Scope:**
Write migration SQL at `supabase/migrations/001_initial.sql`:

```sql
-- result_type enum
create type result_type_enum as enum ('image', 'video');

-- effects table
create table effects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  preview_image_url text not null
);

-- shots table
create table shots (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  effect_id uuid not null references effects(id),
  result_url text,
  result_type result_type_enum,
  created_at timestamptz not null default now()
);
```

Apply the migration to the Supabase project (via Supabase CLI or dashboard).

**Acceptance criteria:**
- Both tables exist in Supabase with the correct columns and types
- `supabase/migrations/001_initial.sql` file is committed

---

## T04 — Seed effects data
**Status:** [x] DONE
**Depends on:** T03

**Scope:**
Create `supabase/seed.sql` that inserts at least 5 placeholder effects, e.g.:
```sql
insert into effects (name, preview_image_url) values
  ('Glam Glow', 'https://placehold.co/400x400?text=Glam+Glow'),
  ('Neon Halo', 'https://placehold.co/400x400?text=Neon+Halo'),
  ('Golden Hour', 'https://placehold.co/400x400?text=Golden+Hour'),
  ('Starfield', 'https://placehold.co/400x400?text=Starfield'),
  ('Chromatic', 'https://placehold.co/400x400?text=Chromatic');
```

Apply seed to Supabase.

**Acceptance criteria:**
- At least 5 rows exist in the `effects` table in Supabase
- `supabase/seed.sql` file exists in the repo

---

## Phase 3 — API Routes

---

## T05 — `POST /api/upload`
**Status:** [x] DONE
**Depends on:** T02

**Scope:**
Create `app/api/upload/route.ts`:
- Accept `multipart/form-data` with a field named `file`
- Upload to Vercel Blob using `put()` from `@vercel/blob` with `access: 'public'`
- Return `200 { image_url: string }`
- Return `400` if no file provided, `500` on upload error

**Acceptance criteria:**
- `curl -X POST -F "file=@test.jpg" http://localhost:3000/api/upload` returns `{ image_url: "https://..." }`

---

## T06 — `GET /api/effects`
**Status:** [x] DONE
**Depends on:** T03

**Scope:**
Create `app/api/effects/route.ts`:
- Initialize Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Query `select * from effects`
- Return `200 { effects: [{ id, name, preview_image_url }] }`
- Return `500` on DB error

**Acceptance criteria:**
- `curl http://localhost:3000/api/effects` returns a JSON object with an `effects` array containing the seeded rows

---

## T07 — `POST /api/shots`
**Status:** [x] DONE
**Depends on:** T03, T17

**Scope:**
Create `app/api/shots/route.ts`:
- Accept JSON body `{ image_url: string, effect_id: string }`
- Validate both fields are present; return `400` if not
- Insert row into Supabase `shots` with `result_url: null`, `result_type: null`
- Trigger the Trigger.dev `generate-shot` task with payload `{ shotId: shot.id }`
- Return `201 { id: shot.id }`

**Acceptance criteria:**
- `POST /api/shots` with a valid body returns `201 { id: "..." }`
- A row appears in Supabase `shots` with `result_url = null`
- Trigger.dev dashboard shows the job was queued

---

## T08 — `GET /api/shots/:id`
**Status:** [x] DONE
**Depends on:** T03

**Scope:**
Create `app/api/shots/[id]/route.ts`:
- Extract `id` from route params
- Query Supabase: `select * from shots where id = :id`
- Return `200 { id, image_url, effect_id, result_url, result_type }`
- Return `404` if not found, `500` on DB error

**Acceptance criteria:**
- `GET /api/shots/<valid-id>` returns the full shot record
- `GET /api/shots/<invalid-id>` returns `404`

---

## Phase 4 — Shared UI Components

---

## T09 — Branding layout & shared components
**Status:** [x] DONE
**Depends on:** T01

**Scope:**

**`app/layout.tsx`:**
- Load Inter font via `next/font/google`
- Apply Inter to `<body>`
- Global background: `bg-black` with a fixed swirling purple/blue radial gradient in the upper portion. Implement with a CSS class or inline style using:
  ```css
  background: radial-gradient(ellipse at 50% -20%, #6b21a8 0%, #1e1b4b 40%, #000000 70%);
  ```
- Set `min-h-screen`, portrait-friendly layout, max-width ~375px centered

**`components/BrandingHeader.tsx`:**
- "Confluence Awards" as the primary logo text (bold, white, uppercase, tracked)
- "AUGMENTED RED CARPET EXPERIENCE" as a subtitle (smaller, white, letter-spaced)
- Centered horizontally

**Acceptance criteria:**
- Any page using the root layout shows the dark gradient background and branding header
- Inter font is applied globally

---

## Phase 5 — Create Shot Page `/shot/new`

---

## T10 — State 1: Camera view
**Status:** [x] DONE
**Depends on:** T09

**Scope:**
Create `app/shot/new/page.tsx` (and any sub-components in `app/shot/new/`):
- Render `<BrandingHeader />`
- Full-viewport-height `react-webcam` component with `facingMode: 'user'` (front camera), `rounded-lg`, covering full width
- Bottom overlay (absolute, inside the webcam container):
  - **Capture button**: large white circle (`w-16 h-16`), centered horizontally (slightly left of center), triggers `getScreenshot()` and stores the data URL in state, then sets `pageState = 'accept-reject'`
  - **Flip button**: smaller white circle with a flip/rotate icon, centered right, toggles `facingMode` between `'user'` and `'environment'`
- Page manages state: `pageState: 'camera' | 'accept-reject' | 'select-effect'`
- `capturedImage: string | null` state holds the data URL

**Acceptance criteria:**
- Camera stream visible on page load at `/shot/new`
- Clicking Capture freezes the image and transitions to accept-reject state
- Clicking Flip switches camera direction

---

## T11 — State 2: Accept/Reject
**Status:** [x] DONE
**Depends on:** T10

**Scope:**
Extend `app/shot/new/page.tsx` with the `accept-reject` state:
- Replace the live `<Webcam>` with a `<img src={capturedImage}>` (same dimensions and positioning)
- Bottom overlay changes to:
  - **Retry button**: white circle with undo icon — sets `capturedImage = null`, `pageState = 'camera'`
  - **Accept button**: white circle with checkmark icon — sets `pageState = 'select-effect'`
- Camera stream stops (webcam is unmounted) while in this state

**Acceptance criteria:**
- After capture, the frozen photo is shown
- Retry returns to live camera
- Accept advances to State 3 (`select-effect`)

---

## T12 — State 3: Effects carousel + submission
**Status:** [x] DONE
**Depends on:** T11, T06, T07

**Scope:**
Extend `app/shot/new/page.tsx` with the `select-effect` state:

**Photo thumbnail (upper-center):**
- Small rounded square thumbnail of `capturedImage`, centered top
- White checkmark badge in bottom-right corner of thumbnail

**Effects carousel:**
- Fetch effects from `GET /api/effects` on page mount (store in state, shared across states)
- Use `embla-carousel-react` with `containScroll: 'keepSnaps'` and snap alignment
- Each slide: large square image (`preview_image_url`) with the effect `name` below
- Center slide is visually emphasized (scale or opacity)
- Track selected effect as the currently centered/snapped slide

**"Choose Effect →" button:**
- White pill button, overlaid at the bottom of the center carousel card
- On tap:
  1. Set `isSubmitting = true`, disable button
  2. Upload `capturedImage` to `POST /api/upload` (convert data URL to Blob first)
  3. `POST /api/shots` with `{ image_url, effect_id: selectedEffect.id }`
  4. `router.push('/shot/' + id)`

**Acceptance criteria:**
- Effects carousel renders with data from `GET /api/effects`
- Scrolling snaps to center cards
- "Choose Effect →" button submits and navigates to `/shot/:id`

---

## T13 — Transitions & animations (State 1→2→3)
**Status:** [x] DONE
**Depends on:** T12

**Scope:**
Add Framer Motion animations to `app/shot/new/page.tsx`:

**State 1 → 2 (capture):**
- Instant freeze — no animation needed for the image swap
- Camera overlay buttons swap in place instantly

**State 2 → 3 (accept):**
- Use Framer Motion `layout` animations or `AnimatePresence`
- The photo element animates from its large viewport-filling position to the small thumbnail position (upper-center)
- Simultaneously, the effects carousel slides up from off-screen bottom (`y: '100%'` → `y: 0`)
- The checkmark badge fades in after the thumbnail settles

Use `layoutId` on the photo element across state renders so Framer Motion auto-animates the layout change.

**Acceptance criteria:**
- Accepting a photo triggers a smooth, coordinated animation into State 3
- The photo visibly shrinks and repositions to the thumbnail area
- The carousel slides up simultaneously

---

## Phase 6 — Read Shot Page `/shot/:id`

---

## T14 — State 1: Pending view + polling
**Status:** [x] DONE
**Depends on:** T09, T08

**Scope:**
Create `app/shot/[id]/page.tsx`:
- Fetch shot data on mount via `GET /api/shots/:id`
- **Pending state** (while `result_url === null`):
  - `<BrandingHeader />`
  - Two thumbnails side by side, centered:
    - Left: user photo (`image_url`), portrait crop, smaller (`w-24`), white checkmark badge
    - Right: effect preview image (look up from `GET /api/effects` or from the shot's `effect_id`), square, larger (`w-32`), white checkmark badge
  - "Generating..." white centered text below thumbnails
  - Poll `GET /api/shots/:id` every 3 seconds using `setInterval`; clear interval on unmount
  - When `result_url` becomes non-null, transition to `pageState = 'display'`

**Acceptance criteria:**
- Visiting `/shot/<pending-id>` shows the two thumbnails and "Generating..." text
- Polling fires every 3 seconds (visible in Network tab)
- When shot is complete, view transitions to display state

---

## T15 — State 2: Shot display + share
**Status:** [x] DONE
**Depends on:** T14

**Scope:**
Extend `app/shot/[id]/page.tsx` with the `display` state:
- `<BrandingHeader />`
- Full-width, tall rounded rectangle (`rounded-xl overflow-hidden`) media container:
  - If `result_type === 'video'`: `<video src={result_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />`
  - If `result_type === 'image'`: `<img src={result_url} className="w-full h-full object-cover" />`
- **"Share →"** white pill button, absolutely positioned at the bottom of the media container:
  - On tap: `navigator.share({ url: result_url, title: 'My Augmented Red Carpet Shot' })`
  - Graceful fallback if Web Share API not available (just hide the button or show a copy-link fallback)

**Acceptance criteria:**
- Display state shows the result media (image or video)
- Video autoplays and loops
- Share button triggers the native share sheet on mobile

---

## T16 — Pending → Shot display transition
**Status:** [x] DONE
**Depends on:** T15

**Scope:**
Add Framer Motion transition to `app/shot/[id]/page.tsx`:
- Wrap pending thumbnails in `<AnimatePresence>`; on exit they fade out (`opacity: 0`)
- Result media fades and scales in: `initial={{ opacity: 0, scale: 0.95 }}` → `animate={{ opacity: 1, scale: 1 }}`
- Transition duration ~400ms, ease-out

**Acceptance criteria:**
- When polling detects a completed shot, the thumbnail UI fades out smoothly
- The result media fades/scales in

---

## Phase 7 — Background Job

---

## T17 — Trigger.dev job: fal.ai pipeline
**Status:** [x] DONE
**Depends on:** T03, T05

**Scope:**
Create `trigger/generate-shot.ts`:

```typescript
import { task } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import * as fal from '@fal-ai/client';

export const generateShot = task({
  id: 'generate-shot',
  run: async (payload: { shotId: string }) => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Fetch shot + effect
    const { data: shot } = await supabase.from('shots').select('*, effects(*)').eq('id', payload.shotId).single();

    // Step 1: fal.ai call #1 (replace model/params per effect requirements)
    const step1Result = await fal.run('fal-ai/flux/dev', {
      input: { image_url: shot.image_url, prompt: shot.effects.name }
    });

    // Step 2: fal.ai call #2 (optional refinement)
    // const step2Result = await fal.run('fal-ai/...', { ... });

    // Upload result to Vercel Blob
    const resultBuffer = await fetch(step1Result.images[0].url).then(r => r.arrayBuffer());
    const { url: resultUrl } = await put(`results/${payload.shotId}.jpg`, resultBuffer, { access: 'public' });

    // Update Supabase
    await supabase.from('shots').update({ result_url: resultUrl, result_type: 'image' }).eq('id', payload.shotId);
  }
});
```

Configure `trigger.config.ts` at project root to register the task.

**Note:** The exact fal.ai model IDs and multi-step pipeline will be refined based on the actual effects. The scaffold above is a working starting point.

**Acceptance criteria:**
- `generate-shot` task appears in Trigger.dev dashboard
- Running the task with a valid `shotId` updates the shot's `result_url` in Supabase
- The job survives Vercel function timeout limits (Trigger.dev handles this)
