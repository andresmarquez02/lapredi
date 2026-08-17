# Design System — lapredi

<!-- impeccable:design-doc -->

Brief-pinned redesign (user-supplied reference image: dark finance-dashboard UI). Mode: **Operate**. Single-user internal tool — see PRODUCT.md.

## Direction Contract

THESIS: A quiet, precise Operate dashboard for one person's daily match-scanning ritual — every number proves itself with the reasoning behind it, refusing the reference's own decorative-only charts.
OWN-WORLD: deep-ocean navy canvas (brief-pinned ink-black/deep-space-blue/yale-blue ramp), soft-bordered rounded cards one step up from canvas, one confident blue for primary/home data, a calibrated five-hue set reserved strictly for the outcome donut and status signals.
STORY: scan upcoming fixtures, see at a glance which have predictions and their lean, click one and its full breakdown appears on the same screen — no navigation.
FORM: reference finance-dashboard grammar (rounded cards, pill toggles, donut chart, calendar, icon rail) re-authored with real football-prediction content.

## Color Palette & Roles

Neutral ground is a brief-pinned navy ramp (ink-black → deep-space-blue → yale-blue), extended on the dark end with `--true-black`/`--near-black` (see below), remapped to semantic roles rather than used raw in components:

| Token | Value | Role |
|---|---|---|
| `--bg-canvas` | `--true-black` `#000000` | Page background (as a subtle vertical gradient into `--ink-black`, not flat) |
| `--bg-surface` | `--near-black` `#00070a` | Card fill |
| `--bg-surface-sunken` | `--ink-black` `#000e14` | Idle fill for repeated list rows (fixture cards) — one step up from `--bg-surface`, distinct from both the parent card and the raised hover state |
| `--bg-surface-raised` | `--ink-black-2` `#00111a` | Hover/active fill, pill track |
| `--border-subtle` | `--ink-black-3` `#00141f` | Card borders |
| `--border-strong` | `--ink-black-4` `#001824` | Emphasis borders |
| `--text-primary` | `#f4f4f5` | Headlines, primary numbers |
| `--text-secondary` | `#a1a1aa` | Body copy |
| `--text-tertiary` | `#6b6b73` | Metadata, disabled |
| `--accent-blue` | `#3b82f6` | Primary accent, home-win share |
| `--accent-amber` | `#f59e0b` | Draw share |
| `--accent-rose` | `#fb7185` | Away-win share |
| `--accent-emerald` / `--accent-violet` | `#22c55e` / `#a78bfa` | Reserved for future status/category use; `--accent-emerald` also used at reduced (~10%/80%) opacity in `FormStrip`'s win chips - at full strength it read as a wall of green repeated up to 10x per fixture row |

Darkened three times in one 2026-08-16 session, each time on "too much color / más negro" feedback: every role originally sat two-to-four steps higher up the ramp (`--border-strong` started as `--yale-blue`). By the third pass the `--ink-black` family (the darkest of the user's original 10 swatches) had itself become the *lightest* tier still in use - `--true-black` and `--near-black` were added to extend the ramp further down, following the same step deltas (~R+0/G+3/B+5) as the rest of the family. `--deep-space-blue*` and `--yale-blue` are no longer used by the base UI at all, kept only as the (still brief-pinned) upper end of the ramp for any future lighter/emphasis need. `CHART_COLORS` in `src/lib/charts/register.ts` and the two chart components with hardcoded hex (`WinnerDoughnutChart`, `ScorelineHeatmapChart` — Chart.js config can't read CSS custom properties) were updated to match each time; keep them in sync by hand if this table changes again.

Color strategy: **Restrained** ground (a hue-tinted navy neutral scale, not true gray) with a **committed** three-hue system reserved exclusively for the win/draw/away outcome — the one thing on this screen that is genuinely three-way data. Nothing else on the page borrows these hues, so the outcome read stays legible at a glance. The navy tint gives the ground cohesion with `--accent-blue` (same hue family, much higher lightness/chroma) without competing with it for attention.

## Typography

System sans (Geist, inherited from the existing Next.js setup) throughout — Operate mode calls for a workhorse stack, not a display face. Numbers use tabular proportions via the default sans; no monospace switch (data density here is low, not a trading-terminal volume).

## Components

- **Card**: `rounded-3xl` (24px), `border border-border-subtle`, `bg-surface`, `p-6`.
- **Fixture row** (2026-08-16, revised): rows live *outside* the fixture-list card now, not nested inside it - the card (`rounded-3xl border border-border-subtle bg-surface p-6`) holds only the title/count and the two filter rows, all still colored; rows below it are flat (no border, no fill) on idle, `hover:bg-surface-sunken` for interaction feedback only. Selected is the one exception: `border-l-4 border-l-accent-blue bg-surface-raised` plus a blue-tinted shadow - a left accent bar, not a filled box, deliberately more evident than the earlier all-rows-bordered version once idle rows lost their box (color now means "selected", not decoration).
- **Pill toggle** (fixture filter): `rounded-full` track in `bg-surface-raised`, active segment `bg-white text-black`, inactive `text-text-secondary`.
- **Probability donut**: CSS `conic-gradient` ring (no chart library), center hole shows the leading outcome's label + %, legend below with dot + label + %.
- **Mini probability bar**: same three-color system, flattened to a 6px bar for list rows.
- **Calendar**: month grid, Monday-first, fixture-kickoff days carry a dot, selected day fills blue; days without a fixture are inert (not clickable) rather than fake-interactive. Stacked above the fixture list in the left column (see Desktop split-view below) - no longer needs its own `sticky`/`self-start`, since it's not competing for row-height in a side-by-side grid anymore.
- **Icon rail**: real destinations (Overview, Favorites, Follows) — no placeholder nav items for sections that don't exist yet. Below `sm`, the rail itself is `hidden`; a fixed hamburger button (`top-4 left-4`) opens the same three items as a left-side drawer instead (see Mobile navigation below) — a plain `hidden`/`sm:flex` swap has no mobile equivalent on its own, so the drawer is required, not optional chrome.
- **Recent-form strip** (`FormStrip`): up to 5 small circular chips per team, newest-first, from each team's already-fetched `recentResults` — green/amber/rose fill (win/draw/loss) at `sm` size next to the team name in the fixture list (lets you compare two teams' streaks before opening details) and `md` size above the goals-trend chart in the match detail. Reuses the outcome triad's semantic pairing (amber = draw everywhere on this page) but is a distinct three-way concept (a team's past results, not this fixture's predicted outcome) — deliberately not the same UI element as the outcome donut/pills.

## Structural decision: in-place fixture detail

The `/fixtures/[id]` route was removed. `src/app/page.tsx` (server component) fetches every tracked fixture with its full prediction in one query (`getDashboardFixtures`) and hands it to `src/components/dashboard/Dashboard.tsx` (client component), which owns `selectedFixtureId`/`filter`/`search` as local state. Selecting a fixture (list row or calendar day) re-renders the detail panels in place — no route change, per the product requirement.

### Desktop split-view (2026-08-16, tuned repeatedly the same day - this is the current/final shape)

At `lg` and up, selecting a fixture no longer updates a block below the fold (the original in-place design still required scrolling down to see it change - the same orientation problem fixed for mobile below, but left un-fixed for desktop until the user flagged it separately). The content area is `grid-cols-[40%_60%]` from `lg` (1024px) up to 1400px, then `min-[1400px]:grid-cols-[30%_70%]` above that (list/detail) - 30/70 alone read as too cramped for the fixture list at laptop-class widths, so it only applies once there's enough room to afford it; the left column stacks the calendar above the fixture list, the right is `MatchDetail`. A persistent list-plus-reading-pane split (the same pattern Gmail/Linear use for scan-then-drill workflows), chosen over a new route or a modal specifically because it's the only option that satisfies both the accessibility complaint and the in-place requirement above at once, rather than trading one for the other.

Fixed-height shell, not page scroll: `lg:h-screen lg:overflow-hidden` on the root, `lg:flex lg:h-full lg:flex-col lg:overflow-hidden` on the content wrapper, header is `lg:shrink-0` (never scrolls). Each column then gets its own independent `lg:h-full lg:min-h-0 lg:overflow-y-auto` scroll (the `min-h-0` is required - flex/grid children default to `min-height: auto`, which silently defeats `overflow-y-auto` on a child by refusing to shrink below content size) with a `.custom-scrollbar` (see globals.css) styled thumb instead of the OS default. This is the second iteration: the first tried one page-level scroll with no nested scrollbars, but the user found that made tall detail content (many chart/stat sections) effectively uncappable without either cutting content off or losing the sticky pane - independent per-pane scrolling inside a fixed shell (the same shape Gmail/Linear use) reads better for this amount of content than either single-scroll extreme.

`MatchDetail`'s own internal layout (`AI Analysis`/`Match Factors` beside `MarketBoard`'s charts) subdivides at `xl`, not `lg` - it sits inside the already-narrowed detail pane, so splitting into thirds again at the same `lg` breakpoint as the outer layout compounded into a cramped ~250px sidebar around 1300px viewports. Below `xl` it stacks full-width instead.

The detail pane remounts (`key={selected.id}`) and fades/slides in via GSAP on every selection change, so switching fixtures has a visible "something changed" cue on desktop too, not just mobile. On mobile (below `lg`) the same pane becomes a `fixed inset-0` full-screen overlay instead (`lg:static` cancels the fixed positioning at `lg+` - forgetting that once caused the detail pane to render as a broken full-viewport overlay even on wide desktop screens), with its own sticky close bar (backdrop-blurred, an `IconX` button) rather than the outer page's scroll.

### Mobile navigation and fixture detail (2026-08-16)

Two mobile-specific problems, both solved without a route change (per the in-place requirement above):

- **Nav**: `Sidebar`'s desktop icon rail (`hidden sm:flex`) had no mobile equivalent at all — below `sm` the nav simply disappeared. Added a fixed hamburger trigger (`sm:hidden`) opening a full-height left drawer with the same three destinations, closing on selection or on the scrim.
- **Detail on selection**: on mobile, selecting a fixture updated the detail panels far down the page, so nothing visible changed without scrolling. `Dashboard` tracks a separate `mobileDetailOpen` flag (distinct from `selectedId`, which still defaults to the first predicted fixture on mount - gating on `selectedId` alone would have dropped a mobile visitor straight into the detail view before they ever saw the list). An explicit tap (list row or calendar day) sets both `selectedId` and `mobileDetailOpen`; below `lg` this renders `MatchDetail` as a full-screen fixed overlay with a back button instead of a second route; at `lg` and up the flag is ignored and the panel is always shown as the pinned right-hand pane (see Desktop split-view above).
- **Calendar order**: the calendar always renders above the fixture list now (both stacked in the left column - see Desktop split-view above), on every breakpoint, not just mobile/tablet.

## Known limitation / not yet verified

No browser-automation or screenshot tool was available in this session to visually click-test the interactive states (search, filter pills, calendar month navigation, fixture selection) or compare pixel-for-pixel against the reference image. What was verified: server-rendered HTML contains the expected real content, `tsc --noEmit` and `eslint` are clean, and the dev server serves `/` with no compile errors. The interactive behavior should be clicked through in a real browser before considering this done.

Same limitation applies to the 2026-08-16 navy-palette / fixture-row / sticky-calendar pass and the same-day follow-up pass (darker palette revision, mobile nav drawer, mobile detail overlay, AI-analysis text-overflow fix, recent-form strips): verified via `tsc --noEmit`, `eslint`, and the Impeccable mechanical detector (`detect.mjs --scope layout`, zero findings) each time - not visually click-tested in a browser. A dev server on `:3000` (left running by a separate concurrent session working the same repo) intermittently 500'd on `/` during this pass with a Windows file-lock error reading `src/app/favicon.ico` ("being used by another process") - unrelated to any change in this pass (that file was never touched here) and most likely that other session regenerating favicon assets; not a compile error in the code above.

Motion: GSAP + react-bits (github.com/DavidHDev/react-bits, added as a shadcn-CLI registry in `components.json`) is wired in. A hand-rolled `CountUp` (`src/components/CountUp.tsx`, plain GSAP tween - react-bits' own CountUp variant pulls in Framer Motion as its only dependency option, which would have added a second animation runtime) animates the percentage figures in `OddsPill` and the fixture-list `QuickPill`. `MarketBoard`'s own GSAP section stagger (pre-existing, added by concurrent work on this repo) was left as-is rather than merged into this system.

The fixture-list row entrance originally used react-bits' `AnimatedContent` (GSAP `ScrollTrigger`, one instance per row). That component's `ScrollTrigger` watches `window` scroll by default; the fixture list scrolls in its own `max-h-180 overflow-y-auto` box, not the window, so the trigger for any row below the initial fold never fired - those rows stayed at `opacity: 0` permanently ("cards disappear while scrolling" / "no animations visible" were the same bug). Replaced with a single plain `gsap.fromTo(..., {stagger: 0.04})` over `[data-fixture-row]` in a mount/`fixtures`-change effect - no scroll-gating, so it's correct regardless of which element actually scrolls. `AnimatedContent` itself is still installed and valid for a genuinely window-scrolling context; just not this one.

Also fixed the same session: `useFavorites` (`src/lib/hooks/useFavorites.ts`) threw "getServerSnapshot should be cached" / looped - `getServerSnapshot` returned a fresh `[]` literal every call, and `useSyncExternalStore` compares snapshots by reference. Fixed by returning a module-level constant.
