---
name: Bolão da Copa
description: Bolão de Copa do Mundo para grupo de amigos — palpites, pontuação, glória efêmera.
colors:
  bg: "oklch(11% 0.025 155)"
  surface: "oklch(16.5% 0.032 155)"
  raised: "oklch(21% 0.042 155)"
  border: "oklch(24% 0.042 155)"
  text-primary: "oklch(95% 0.008 155)"
  text-secondary: "oklch(70% 0.022 155)"
  text-tertiary: "oklch(46% 0.018 155)"
  accent: "oklch(87% 0.195 95)"
  accent-fg: "oklch(12% 0.025 155)"
  ok: "oklch(55% 0.135 155)"
  ok-fg: "oklch(95% 0.008 155)"
  live: "oklch(63% 0.257 29)"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "42px"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  button-primary-disabled:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  button-save:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-save-saved:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.ok-fg}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Bolão da Copa

## 1. Overview

**Creative North Star: "A Mesa do Bolão"**

The image is a table among friends: worn at the edges, personal, contested. Ten people who know each other too well to be polite about losing. This is a shared object built for a specific group — not a product designed for strangers at scale. People open the app wanting to beat their friends. The interface holds that energy: competitive, warm, genuinely fun in the way that rivalry among people who like each other is fun.

The scene is a phone held under the glow of a television during a night game. Dark surfaces absorb ambient light and put content forward. The single yellow accent, borrowed from the seleção yellow of the Brazilian flag, carries all the semantic weight in the system. It marks the button to press, the number that matters, the player in first place. When yellow appears, it means something. When it doesn't, nothing competes.

This system refuses three failure modes: the cluttered urgency of betting apps, designed to extract money from strangers (Bet365, Sportingbet); the cold precision of American SaaS dashboards, beautiful but impersonal (Linear, Vercel); and the over-animated playfulness of products built for children. What it earns instead: information with weight, competition made immediately legible, and enough specificity to feel like it belongs to this group.

**Key Characteristics:**
- Dark-only; green-tinted near-blacks derived from the same hue as the accent
- Single yellow accent with strict semantic discipline — never decorative
- Tonal depth through four surface levels, no shadows anywhere
- Numbers as the primary visual language; bold weights over large sizes
- Emoji as the complete iconography system; no SVG icon library
- Mobile-first at 448px max-width; desktop is bonus territory

## 2. Colors: The Canarinho System

A night-lit pitch with one lamp on. The surface stack is four steps of the same green-tinted dark. The accent is one deliberate yellow, high in chroma, rationed carefully.

### Primary

- **Número 10** (`oklch(87% 0.195 95)`): The canarinho yellow. Used for: primary CTA buttons, the #1 rank badge, the active navigation tab, score digits in the DrumPicker, and "your row" borders in standings. The highest honor in the system.
- **Número 10 Foreground** (`oklch(12% 0.025 155)`): Text color rendered on the yellow accent. Near-black, green-tinted to match the surface family.

### Secondary

- **Verde Certo** (`oklch(55% 0.135 155)`): Correct-prediction green. Used exclusively for the "Salvo ✓" button confirmation state and 5-point badges. It means "you got it right." Not a UI accent; a semantic event.

### Tertiary

- **Ao Vivo** (`oklch(63% 0.257 29)`): Live-urgency red. Used for the pulsing "ao vivo" indicators, notification badges on nav tabs, and error messages. The only warm hue in the system. Its rarity is precisely the point.

### Neutral

- **Grama Noturna** (`oklch(11% 0.025 155)`): Page background. The darkest surface. The pitch at 8pm under floodlights.
- **Superfície** (`oklch(16.5% 0.032 155)`): Card and container background. One step lighter than the page, enough to define containment.
- **Elevado** (`oklch(21% 0.042 155)`): Raised elements: disabled button backgrounds, stage label pills, code tags, active rows in lists.
- **Divisa** (`oklch(24% 0.042 155)`): Borders and dividers. Barely perceptible; defines shape without asserting itself.
- **Texto Primário** (`oklch(95% 0.008 155)`): Main text. High-contrast white, slightly green-tinted toward the brand hue.
- **Texto Secundário** (`oklch(70% 0.022 155)`): Supporting text, dates, meta information, team names in context.
- **Texto Terciário** (`oklch(46% 0.018 155)`): Hints, labels, disabled states. The floor of legible text.

### Named Rules

**The One Yellow Rule.** The accent is used for exactly one interactive or status element at a time per screen. When yellow appears on a button, a badge, and a nav tab simultaneously, it means three things — and therefore nothing. Each additional use halves its signal value. Spread it and it becomes decoration; keep it rare and it becomes direction.

**The No-Warm-Hues Rule.** Verde Certo and Ao Vivo are not palette colors; they are semantic events. Verde means "you were right." Ao Vivo means "now, urgently." Neither appears for decoration, brand expression, or emphasis.

## 3. Typography

**Display/Body Font:** system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif

No external typeface. No font load, no FOUT, no dependency. The weight range of the system font does all the work. A bold 42px system-ui is as assertive as any custom display typeface when contrast is this extreme.

**Character:** Blunt and functional. Hierarchy is established by weight contrast (400 vs 700 vs 800), not by typeface switching. Numbers speak louder than words in this interface.

### Hierarchy

- **Display** (800, 42px, line-height 1, tabular-nums): The score digit in DrumPicker. Never used for prose. The only element that reaches this size.
- **Headline** (800, 24px, line-height 1.1): Login screen title. One instance per session start.
- **Title** (700, 18px, line-height 1.3): Section headers within screens ("Classificação"). One per screen.
- **Body** (400–600, 14px, line-height 1.5): Names, predictions, match details, supporting text. The workhorse. The 448px container width keeps line lengths within 65ch automatically.
- **Label** (600, 11px, letter-spacing 0.1em, uppercase): Stage pills, meta labels ("RESULTADO", "AO VIVO", "pts"). Uppercase only at 11px and below.

### Named Rules

**The Weight-Not-Size Rule.** Hierarchy is established through weight contrast first, size second. A 700-weight 14px outranks a 400-weight 18px. Reach for a heavier weight before reaching for a larger font-size.

**The Tabular Imperative.** Every score, point count, and rank number uses `font-variant-numeric: tabular-nums`. Column alignment is not optional when numbers are the product.

## 4. Elevation

This system is flat by doctrine. No `box-shadow` exists anywhere in the codebase. Depth is communicated through the four-level tonal surface ladder: `--bg` (11%) to `--surface` (16.5%) to `--raised` (21%) to `--border` (24%). Each step is a lightness increment at the same green-tinted hue. Cards feel lifted because their background is lighter than the page, not because they cast a shadow.

The one exception is persistent chrome. The sticky header and fixed bottom navigation use `backdrop-filter: blur` at 92-96% opacity. These elements float above scrolling content by becoming semi-transparent and revealing the layers beneath. This is structural, not decorative.

### Named Rules

**The No-Shadow Rule.** If you are reaching for `box-shadow`, the answer is `background: var(--raised)`. A tonal step communicates containment without inventing a light source.

**The Blur-as-Structure Rule.** `backdrop-filter: blur` is reserved for persistent UI chrome that must remain legible as content scrolls beneath it — the header and bottom nav only. It is not an ambient aesthetic choice.

## 5. Components

### Buttons

Buttons are unambiguous. Size communicates prominence. The primary yellow button is the largest interactive element on any action screen.

- **Shape:** 24px radius (`rounded-2xl`) for primary and ghost. 12px radius (`rounded-xl`) for inline save actions.
- **Primary:** `background: var(--accent)`, `color: var(--accent-fg)`, padding 16px vertical / 24px horizontal, `font-size: 18px`, `font-weight: 700`. Active: `opacity: 0.9`. Disabled: `background: var(--raised)`, `color: var(--t3)`.
- **Ghost / Outline:** `border: 1px solid var(--border)`, transparent background, `color: var(--t1)`, same padding as primary, `font-weight: 600`. Active: `background: var(--surface)`.
- **Save (inline):** Padding 10px / 20px, `font-size: 14px`, `font-weight: 700`, 12px radius. Three states: accent yellow (default), verde certo green (confirmed for 1.8s), raised gray (disabled).

### DrumPicker (Signature Component)

The primary score-entry mechanism. A vertical number roller: drag up to increase, drag down to decrease, tap chevrons for single increments. There are no number-input spinners visible.

- **Container:** 12px radius, `touch-action: none`, `user-select: none`. Active drag: `background: oklch(87% 0.195 95 / 0.12)` (accent at 12% opacity).
- **Digit:** 42px, `font-weight: 800`, `color: var(--accent)`, 52px wide, centered, `tabular-nums`. The yellow digit is the emotional center of the prediction interaction.
- **Chevrons:** 16×10px SVG arrows. `color: var(--t3)` at rest, `var(--t2)` on hover. Disabled: `opacity: 0.3`.
- **Accessibility:** `role="spinbutton"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={20}`. Keyboard-compatible via chevron buttons.

### Cards / Containers (MatchCard)

- **Corner Style:** 24px radius (rounded-2xl)
- **Background:** `var(--surface)`
- **Shadow Strategy:** None. Contrast against `var(--bg)` defines the card boundary.
- **Border:** `1px solid var(--border)` by default. Warning state (no prediction submitted before lockout): `2px solid var(--accent)` at full opacity.
- **Internal Padding:** Header row: 12px / 16px. Content area: 16px / 16px / 12px. Predictions list: 12px / 16px.
- **Internal Sections:** Divided by `border-bottom: 1px solid var(--border)` only. No nested cards.

### Inputs / Fields

- **Style:** `background: var(--surface)`, no visible border at rest, 12px radius, padding 12px / 16px, `font-size: 18px`.
- **Focus:** `outline: none`, `box-shadow: 0 0 0 2px var(--accent)`. No border shift, no background change.
- **Placeholder:** `color: var(--t3)`.
- **Spinner controls:** Suppressed globally via `-webkit-appearance: none` and `-moz-appearance: textfield`. Native number input chrome never appears.

### Navigation (BottomNav)

- **Style:** Fixed viewport-bottom, max-width 448px, centered. `background: oklch(11% 0.025 155 / 0.96)` with `backdrop-filter: blur`. Border-top: `1px solid var(--border)`.
- **Item anatomy:** Emoji icon (18px) above text label (12px). No SVG icon library.
- **States:** Active: `color: var(--accent)`. Inactive: `color: var(--t3)`. `transition: color 150ms`.
- **Notification badge:** Absolute-positioned, `background: oklch(63% 0.257 29)`, 16px circle, 9px bold white text.

### Points Badge

Inline reward indicator shown next to each prediction after reveal.

- **10 pts:** `background: var(--accent)`, `color: var(--accent-fg)` — exact match, maximum reward.
- **5 pts:** `background: var(--ok)`, `color: var(--ok-fg)` — correct result direction, partial credit.
- **0 pts:** `background: var(--raised)`, `color: var(--t3)` — no credit, muted.
- **Shape:** 6px radius, 48px fixed width, padding 2px / 8px, 12px bold centered text.

### Stage Pill

Metadata chip in MatchCard headers.

- `background: var(--raised)`, `color: var(--t2)`, 11px `font-weight: 600`, uppercase, `letter-spacing: 0.1em`, full-radius pill, padding 4px / 12px.

### Ranking Row

The standings list item. The most emotionally loaded component in the product.

- **Default:** `background: var(--surface)`, `border: 1px solid var(--border)`, 12px radius, padding 12px.
- **My row:** `background: oklch(87% 0.195 95 / 0.12)` (accent-muted), `border: 1px solid oklch(87% 0.195 95 / 0.40)` (accent-ring). The player locates themselves in the list immediately.
- **Rank circle:** 32px, full-radius. #1: `background: var(--accent)`, `color: var(--accent-fg)`. Others: `background: var(--raised)`, `color: var(--t2)`.
- **Points:** Right-aligned, 20px `font-weight: 800`, `color: var(--t1)`, `tabular-nums`.

## 6. Do's and Don'ts

### Do:

- **Do** use `var(--accent)` for the one interactive or status element that matters on a given screen. The CTA button, the #1 badge, the active tab, the score digit: one at a time.
- **Do** establish hierarchy through `font-weight` first (400, 700, 800), `font-size` second.
- **Do** apply `font-variant-numeric: tabular-nums` to every score, point count, and rank number.
- **Do** keep the app container at `max-width: 448px`. This is a phone app. Desktop renders correctly but is not the target.
- **Do** use `var(--raised)` as the background for disabled states and code tags. Not a semi-transparent overlay.
- **Do** use `backdrop-filter: blur` exclusively on persistent chrome (the sticky header, the fixed bottom nav).
- **Do** honor `prefers-reduced-motion`: suppress `animate-pulse` and replace `transition-all` with `transition-colors`.
- **Do** maintain 44px minimum touch targets on all interactive elements.
- **Do** maintain WCAG AA contrast (4.5:1) for all text. The tonal surface stack is calibrated to meet this at every level.
- **Do** use `ease-in-out` at 150ms for color/opacity state transitions. This is the system default.

### Don't:

- **Don't** replicate apps de apostas (Bet365, Sportingbet): no dense multi-column layouts, no competing CTAs stacked on the same screen, no neon color overload, no urgency patterns designed to extract money.
- **Don't** go SaaS dashboard (Linear, Vercel): cold, corporate, impersonal. This is for 10 people who know each other.
- **Don't** animate like a children's app: no bounce easing, no elastic springs, no confetti on correct predictions, no over-choreographed page transitions.
- **Don't** scatter `var(--accent)` across decorative elements, dividers, or secondary text. Every extra yellow dilutes the one that matters.
- **Don't** use `box-shadow`. Depth is tonal. Use a `var(--raised)` background.
- **Don't** add a light mode. The design rationale is a phone in a dark room during a night game.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items.
- **Don't** use gradient text (`background-clip: text` with a gradient background). Emphasis is weight and size only.
- **Don't** add external fonts. System font at 800 weight is sufficient, and zero load time is a design decision.
- **Don't** animate CSS layout properties (width, height, padding, margin, grid-template). Animate `opacity`, `color`, `background-color`, and `transform` only.
- **Don't** add a "hero metric" layout: big number, small label, supporting stats, gradient accent. It's a SaaS cliché and wrong for this context.
- **Don't** use FIFA or Copa do Mundo official branding aesthetics: multilingual, institutional, committee-designed. This is handmade for one group.
