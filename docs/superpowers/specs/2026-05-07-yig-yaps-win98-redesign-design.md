# Yig Yaps — Win98 Brand Redesign · Design Spec

> **Status:** Approved 2026-05-07  
> **Author:** Yuanliu Gao, with Claude (brainstorming session)  
> **Scope:** Complete frontend redesign of `apps/web` — replace all existing visual design with standard Yig brand + Win98 chrome treatment. No old design elements remain.  
> **Brand authority:** `C:\Users\gaoyu\Documents\GitHub\Yigfrontend\brand\2026-05-07-yig-brand-identity.md`  
> **Win98 CSS reference:** `C:\Users\gaoyu\Documents\GitHub\Yigfrontend\styles\win98.css`  
> **Token reference:** `C:\Users\gaoyu\Documents\GitHub\Yigfrontend\styles\tokens.css`

---

## 1 · Goals

1. Replace all existing visual design (terracotta palette, Libre Baskerville serif, Source Sans 3, yellow dot accent) with standard Yig brand tokens.
2. Apply the Win98 chrome treatment to every page — the same treatment already designed for yig.com, extended to the full product app.
3. Rename all UI text from "YigYaps" → "Yig Yaps" (brand naming convention: `Yig SubName`, space-separated).
4. Leave no old design artifacts: remove `--color-primary: #D4A394`, Libre Baskerville import, yellow `--color-dot`, all old CSS custom properties.

---

## 2 · Brand Token Inventory

These tokens replace all existing custom properties in `apps/web/src/index.css`:

```css
/* Colors */
--yig-ink:      #0A0A0A;   /* replaces --color-text-main, --color-logo-bg */
--yig-paper:    #FAF9F5;   /* replaces --color-bg */
--yig-cinnabar: #C8321B;   /* replaces --color-primary, --color-dot */
--yig-phosphor: #00B85A;   /* status-only — CLI / "OK" signals */

/* Win98 chrome */
--w98-face:              #C0C0C0;
--w98-highlight:         #FFFFFF;
--w98-shadow:            #808080;
--w98-deep-shadow:       #404040;
--w98-titlebar-active:   #C8321B;   /* cinnabar override — NOT navy */
--w98-titlebar-inactive: #7B7B7B;
--w98-titletext:         #FFFFFF;
--w98-desktop:           #1A1A1A;   /* Yig black override — NOT teal */

/* Typography */
--yig-font-sans: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;
--yig-font-mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;
--yig-font-w98:  Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif;

/* Remove entirely: --font-serif (Libre Baskerville), --color-primary-rgb,
   --color-dot, --color-logo-bg, --color-accent-bg, --color-input-bg */
```

**Typeface change:** Remove Google Fonts import for Libre Baskerville and Source Sans 3. Import Inter from Google Fonts (or self-host). JetBrains Mono stays for mono contexts. Tahoma is OS-provided — never ship the font file.

---

## 3 · Global Shell — Win98 Desktop

Every page renders inside the Win98 desktop environment. The `App.tsx` wrapper provides:

### 3.1 Desktop container
```
<div class="w98-desktop">          ← background: #1A1A1A (Yig black)
  <Taskbar />                       ← fixed top, height 28px
  <div class="w98-page">            ← padding-top: 36px
    <div class="w98-page__col">     ← max-width 900px, centered
      {/* page windows stack here */}
    </div>
  </div>
</div>
```

### 3.2 Taskbar (replaces Header component entirely)
- Fixed to top, `z-index: 9000`
- **Start button**: `∴` mark (cinnabar) + "Start" label, raised Win98 bevel
- **Running window button**: shows active page title, pressed-in bevel when active
- **System tray**: right-aligned, sunken bevel — `∴` icon (cinnabar) + clock
- No logo, no nav links, no user avatar in the taskbar itself
- Start menu (see §3.3) provides navigation

### 3.3 Start Menu
Clicking Start opens a Win98-style menu:
```
[∴] Start
├── [∴] Yig Yaps          → / (landing)
├── Programs ▸
│   ├── Marketplace        → /marketplace
│   ├── YAP Studio         → /yaps/studio
│   └── Evolution Lab      → /lab/:id
├── Publish Skill          → /publish
├── My Packages            → /my-packages
├── Settings               → /settings
├─── ───────────────
├── Docs                   → /blog
├── API Reference          → {API_URL}/docs
└── Sign In / [Username]
```
Vertical branding strip on left: Ink background, "Yig Yaps" rotated text in Win98 face color.

### 3.4 AuthModal → Win98 Dialog
The existing `AuthModal` component is restyled as a Win98 dialog (`w98-dialog` + `w98-dialog-backdrop`). Title bar: "Sign In — Yig Yaps". GitHub OAuth button uses `w98-btn primary`.

---

## 4 · Page-by-Page Design

Each page renders as one or more vertically stacked Win98 windows (`w98-window--page`) inside `w98-page__col`. Windows open with the `w98-window-appear` animation (staggered by 90 ms per window).

### 4.1 LandingPage (`/`)

**Windows:**

| # | Title bar | Content |
|---|---|---|
| 1 | `∴ Yig Yaps — Open Skill Registry` | Hero: eyebrow mono text, h1 Inter 700 36px, sub-copy, two Win98 buttons. Right column: large `∴` glyph + "Yig Yaps" wordmark. Below hero body: tab strip (All Skills / Featured / New / Finance / Legal). Statusbar: phosphor dot + "Ready · {N} skills · MCP-compatible". |
| 2 | `📦 Marketplace — Browse Skills` | Win98 search toolbar + 3-column SkillCard grid (preview). Statusbar: count + keyboard hint. |
| 3 | `💡 Why Yig Yaps — Platform Overview` | 3-column value grid (no outer card borders — content fills window body). |
| 4 | `🔒 Security Model — Give Conclusions, Not Your Secrets` | Side-by-side trust comparison cards. |
| 5 | `∴ Yig Yaps · © 2026 · Apache 2.0` | Footer row. Statusbar: Microsoft disclaimer (IP requirement — see §7). |

Hero window menubar: `File · Edit · View · Marketplace · Publish · Docs · Help`

### 4.2 HomePage / Marketplace (`/marketplace`)

**Windows:**

| # | Title bar | Content |
|---|---|---|
| 1 | `📦 Marketplace — {N} Skills` | Toolbar: search input + Search button + separator + category select + sort select. Body: `FilterPanel` in left sidebar (Win98 groupbox style) + skill grid right. Statusbar: result count + page. |

Pagination uses `w98-btn` row at bottom of window body.

### 4.3 SkillDetailPage (`/skill/:packageId`)

**Windows:**

| # | Title bar | Content |
|---|---|---|
| 1 | `{SkillIcon} {DisplayName} — Skill Detail` | Left: metadata block (category pill → plain badge, price, installs, rating, author). Right: Install button (`w98-btn primary` + `w98-btn` for copy CLI command). Description in Inter body text. |
| 2 | `📋 Rules & Documentation` | MarkdownEditor rendered read-only, Inter body text inside window. |
| 3 | `⭐ Reviews` | ReviewList + ReviewForm. Stars use cinnabar `★`. ReviewForm inputs use `w98-input`. |

Statusbar on window 1: phosphor dot + maturity badge + version.

### 4.4 PublishSkillPage (`/publish`)

Single window: `⬆ Publish a Skill — New YAP Wizard`

Uses Win98 wizard layout (`w98-wizard`):
- **Sidebar (Ink background):** `∴` mark, "Publish Your YAP Skill" title, step list (active step highlighted cinnabar)
- **Steps:** 1. Package Info · 2. Skill Rules · 3. Pricing · 4. Review & Publish
- All inputs: `w98-input` (sunken bevel)
- All buttons: `w98-btn` / `w98-btn primary`
- Progress bar: `w98-progress` + `w98-progress__fill` (cinnabar segments)

### 4.5 MyPackagesPage (`/my-packages`)

**Windows:**

| # | Title bar | Content |
|---|---|---|
| 1 | `📊 My Packages — Dashboard` | Stats row: 3 `stat-card` panels (restyled to Win98 groupbox). Package list below: each package = Win98 list item row with Edit/Archive `w98-btn` actions. |

Stats use Inter 700 numbers, Win98 face background panels (not rounded cards).

### 4.6 EditPackagePage (`/my-packages/:id/edit`)

Single window: `✏ Edit Package — {DisplayName}`

Same wizard layout as PublishSkillPage but pre-populated. Same input/button styling.

### 4.7 YapStudioPage (`/yaps/studio`) & YapAssemblyPage (`/yaps/:yapId`)

**YapStudioPage** — single window: `🔧 YAP Studio — Assemble Skills`  
Body: assembly builder UI. All buttons `w98-btn`. Skill selector uses `w98-input` + dropdown.

**YapAssemblyPage** — single window: `🔧 YAP Assembly — {yapId}`  
Shows assembled YAP details + install CLI command in monospaced `w98-input` (read-only, sunken).

### 4.8 EvolutionLabPage (`/lab/:packageId`)

Single window: `🧪 Evolution Lab — {packageId}`  
Contains `ChatInterface`, `RulesEditor`, `LabApiKeyPanel`. Chat messages render in a scrollable Win98-body pane. API key input uses `w98-input`. Privacy warning banner → Win98 dialog. Consent modal → `w98-dialog`.

### 4.9 SettingsPage (`/settings`)

Single window: `⚙ Settings — Yig Yaps`  
Sections as Win98 groupboxes (`w98-groupbox`). Inputs: `w98-input`. Save/Cancel: `w98-btn` row.

### 4.10 AdminPage (`/admin`)

Single window: `🛡 Admin — Yig Yaps Registry`  
Data tables render inside window body (Inter 13px, alternating row background `#F5F5F3`/white). Action buttons: `w98-btn`. Dangerous actions (ban/delete): `w98-btn` with cinnabar border.

### 4.11 BlogPage (`/blog`)

Single window: `📄 Docs & Blog — Yig Yaps`  
Markdown rendered with Inter typography inside window body. Headings use Ink 700. Code blocks use JetBrains Mono on `#F2F0EA` background with Win98 sunken border.

### 4.12 TermsPage (`/terms`) & PrivacyPage (`/privacy`)

Each: single window with page title. Markdown content in Inter body text. No special chrome beyond the window frame.

### 4.13 AuthCallback (`/auth/success`, `/auth/error`)

Win98 dialog (centered on desktop, no full-page window). Success: phosphor `●` + "Signed in — redirecting…". Error: cinnabar `●` + error message + "OK" `w98-btn`.

### 4.14 VerifyEmailPage & ResetPasswordPage

Win98 dialogs (280px wide). Inputs: `w98-input`. Buttons: `w98-btn` + `w98-btn primary`. Title: appropriate icon + "Verify Email" / "Reset Password".

### 4.15 NotFoundPage (`/*`)

**BSOD 404** — full-screen cinnabar (`w98-bsod`):
```
[YIG_FATAL_ERROR]

A fatal exception has occurred at 0x0000:PAGE_NOT_FOUND.

The current page cannot be displayed. Press any key to continue.

* Press any key to return to the registry
```
"Any key" or click → navigate to `/`. This is the brand-spec easter egg (§8).

---

## 5 · Component Changes

### Remove entirely
- `Header.tsx` — replaced by `Taskbar.tsx` + `StartMenu.tsx`
- All inline `<style>` blocks that define old palette variables
- `App.css` — old global layout file, replaced

### New components
| Component | Purpose |
|---|---|
| `Taskbar.tsx` | Fixed top bar: Start button, running window buttons, system tray |
| `StartMenu.tsx` | Animated dropdown from Start button, full nav |
| `Win98Window.tsx` | Reusable window shell (titlebar + optional menubar + body + statusbar slots) |
| `Win98Dialog.tsx` | Centered dialog box (auth, confirm, error flows) |
| `Win98Wizard.tsx` | Sidebar-step wizard layout (publish, edit) |

### Refactor (logic unchanged, visual replaced)
| Component | Change |
|---|---|
| `AuthModal.tsx` | Wrap in `Win98Dialog`, use `w98-btn` + `w98-input` |
| `SkillCard.tsx` | Remove rounded cards, use flat border + Inter inside window grid |
| `SearchBar.tsx` | Replace input with `w98-input` inside toolbar |
| `FilterPanel.tsx` | Wrap in `w98-groupbox` |
| `Pagination.tsx` | Use `w98-btn` row |
| `InstallButton.tsx` | Use `w98-btn primary` |
| `ReviewForm.tsx` | Use `w98-input` + `w98-btn` |
| `SkeletonLoader.tsx` | Win98 progress bar segments (cinnabar `w98-progress`) |

---

## 6 · CSS Architecture

### File strategy
```
apps/web/src/
  index.css          ← REPLACE: Yig brand tokens only (no old palette)
  win98.css          ← NEW: copy from Yigfrontend/styles/win98.css
  App.css            ← REPLACE: minimal layout (app-container, w98-desktop wrapper)
```

Copy `win98.css` and update the two Yig overrides (already correct in source):
- `--w98-titlebar-active: #C8321B` (cinnabar)
- `--w98-desktop: #1A1A1A` (Yig black)

### Google Fonts update
```html
<!-- index.html — remove Libre Baskerville, Source Sans 3 -->
<!-- Add: -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

### No scoped CSS-in-JS
Remove all `<style>{`…`}</style>` inline blocks from page components. All styles live in `index.css` or `win98.css`. Component-specific rules use module CSS files if needed.

---

## 7 · IP Compliance (Win98)

Five red lines from brand spec §9 — all observed:

1. **No Microsoft Windows 4-color flag logo.** ✅ `∴` used as Start button icon.
2. **No "Windows", "Microsoft", or "Win98" in UI labels.** ✅ All title bars say "Yig Yaps — …".
3. **No Microsoft system bitmaps.** ✅ All icons are Unicode characters or custom SVG.
4. **No Tahoma font file shipped.** ✅ CSS only: `font-family: Tahoma, 'MS Sans Serif', sans-serif;`
5. **No Microsoft system sounds.** ✅ No audio in this app.

**Required footer disclaimer** (in footer window statusbar):
> Visual style inspired by Windows 98 (© Microsoft). Yig Yaps is not affiliated with Microsoft.

---

## 8 · Naming Changes

All occurrences of "YigYaps" in UI-visible strings → "Yig Yaps":
- Page titles, window title bars, footer copyright
- Hero headline, CTA buttons, auth modal title
- Document `<title>` tags in `index.html`
- `<meta>` description and OG tags

Package IDs and internal code identifiers (`@yigyaps/types`, `yigyaps` npm scope) are NOT renamed — this is a UI-only text change.

---

## 9 · Implementation Sequence

Designed for atomic commits per phase:

1. **CSS foundation** — copy `win98.css` from Yigfrontend; replace `index.css` with Yig tokens; update `index.html` fonts; strip `App.css`.
2. **Global shell** — build `Taskbar`, `StartMenu`, `Win98Window`, `Win98Dialog`, `Win98Wizard` components; replace `App.tsx` wrapper; remove `Header.tsx`.
3. **LandingPage** — full Win98 redesign per §4.1 (highest-traffic, most impactful).
4. **Marketplace + SkillCard** — HomePage + SkillDetailPage per §4.2–4.3.
5. **Publish flows** — PublishSkillPage + EditPackagePage per §4.4, §4.6.
6. **Dashboard + Auth** — MyPackagesPage + AuthModal + auth pages per §4.5, §4.13–4.14.
7. **App pages** — YapStudio, YapAssembly, EvolutionLab, Settings, Admin, Blog per §4.7–4.11.
8. **NotFoundPage BSOD** — Win98 BSOD 404 per §4.15.
9. **Polish pass** — window open animations, Start menu, system tray clock, mobile responsive.

---

*End of spec. v1, 2026-05-07.*
