# Design System — lapredi

<!-- impeccable:design-doc -->

Brief-pinned redesign (user-supplied reference image: dark finance-dashboard UI). Mode: **Operate**. Single-user internal tool — see PRODUCT.md.

## Direction Contract

THESIS: A quiet, precise Operate dashboard for one person's daily match-scanning ritual — every number proves itself with the reasoning behind it, refusing the reference's own decorative-only charts.
OWN-WORLD: near-black canvas, soft-bordered rounded cards, one confident blue for primary/home data, a calibrated five-hue set reserved strictly for the outcome donut and status signals.
STORY: scan upcoming fixtures, see at a glance which have predictions and their lean, click one and its full breakdown appears on the same screen — no navigation.
FORM: reference finance-dashboard grammar (rounded cards, pill toggles, donut chart, calendar, icon rail) re-authored with real football-prediction content.

## Color Palette & Roles

| Token | Value | Role |
|---|---|---|
| `--bg-canvas` | `#08080a` | Page background (not pure black) |
| `--bg-surface` | `#121215` | Card fill |
| `--bg-surface-raised` | `#18181c` | Hover/active fill, pill track |
| `--border-subtle` | `#232327` | Card borders |
| `--border-strong` | `#2e2e33` | Emphasis borders |
| `--text-primary` | `#f4f4f5` | Headlines, primary numbers |
| `--text-secondary` | `#a1a1aa` | Body copy |
| `--text-tertiary` | `#6b6b73` | Metadata, disabled |
| `--accent-blue` | `#3b82f6` | Primary accent, home-win share |
| `--accent-amber` | `#f59e0b` | Draw share |
| `--accent-rose` | `#fb7185` | Away-win share |
| `--accent-emerald` / `--accent-violet` | `#22c55e` / `#a78bfa` | Reserved for future status/category use |

Color strategy: **Restrained** ground (near-black + neutrals) with a **committed** three-hue system reserved exclusively for the win/draw/away outcome — the one thing on this screen that is genuinely three-way data. Nothing else on the page borrows these hues, so the outcome read stays legible at a glance.

## Typography

System sans (Geist, inherited from the existing Next.js setup) throughout — Operate mode calls for a workhorse stack, not a display face. Numbers use tabular proportions via the default sans; no monospace switch (data density here is low, not a trading-terminal volume).

## Components

- **Card**: `rounded-3xl` (24px), `border border-border-subtle`, `bg-surface`, `p-6`.
- **Pill toggle** (fixture filter): `rounded-full` track in `bg-surface-raised`, active segment `bg-white text-black`, inactive `text-text-secondary`.
- **Probability donut**: CSS `conic-gradient` ring (no chart library), center hole shows the leading outcome's label + %, legend below with dot + label + %.
- **Mini probability bar**: same three-color system, flattened to a 6px bar for list rows.
- **Calendar**: month grid, Monday-first, fixture-kickoff days carry a dot, selected day fills blue; days without a fixture are inert (not clickable) rather than fake-interactive.
- **Icon rail**: single real destination (Overview) — no placeholder nav items for sections that don't exist yet.

## Structural decision: in-place fixture detail

The `/fixtures/[id]` route was removed. `src/app/page.tsx` (server component) fetches every tracked fixture with its full prediction in one query (`getDashboardFixtures`) and hands it to `src/components/dashboard/Dashboard.tsx` (client component), which owns `selectedFixtureId`/`filter`/`search` as local state. Selecting a fixture (list row or calendar day) re-renders the detail panels in place — no route change, per the product requirement.

## Known limitation / not yet verified

No browser-automation or screenshot tool was available in this session to visually click-test the interactive states (search, filter pills, calendar month navigation, fixture selection) or compare pixel-for-pixel against the reference image. What was verified: server-rendered HTML contains the expected real content, `tsc --noEmit` and `eslint` are clean, and the dev server serves `/` with no compile errors. The interactive behavior should be clicked through in a real browser before considering this done.
