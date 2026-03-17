# Onsite — Brand & UI Style Guide

> **Purpose:** This document defines the visual identity, color system, typography, spacing, and component patterns for **Onsite**, an AI-powered role-specific interview prep platform. Use this as the single source of truth when building UI.

---

## 1. Brand Overview

- **Product name:** Onsite (always lowercase in logo context: `onsite.`)
- **Tagline options:** "You're already onsite." · "Prep like you've been there before." · "Interview prep that knows your role."
- **Voice:** Confident, direct, modern. Speaks like a sharp friend who works in tech — not a corporate brochure.
- **Target audience:** New grads and early-career professionals preparing for role-specific interviews.

---

## 2. Logo

### Usage Rules
- The logo is the word **onsite.** in italic, bold, rounded sans-serif type with a trailing period.
- The period is part of the logo and must never be removed.
- The dot above the `i` is a distinctive brand element — a slightly oversized circle. Preserve this in any recreation.
- Logo color is **Mint (#00C968)** on dark backgrounds, or **Charcoal (#1C1C1E)** on light backgrounds.
- The logo may optionally appear inside a rounded rectangle border (mint stroke, charcoal fill) as shown in the primary brand mark.

### Logo Clear Space
- Maintain clear space around the logo equal to the height of the letter "o" on all sides.

### Logo Don'ts
- Don't rotate or skew the logo.
- Don't change the logo to colors outside the approved palette.
- Don't add drop shadows, gradients, or effects.
- Don't use upright (non-italic) text for the logo.

---

## 3. Color System

### Primary Palette

| Name         | Hex       | Usage                                      |
|--------------|-----------|---------------------------------------------|
| Charcoal     | `#1C1C1E` | Primary background, nav bars, hero sections |
| Dark Gray    | `#2C2C2E` | Card surfaces, elevated containers          |
| Mid Gray     | `#3A3A3C` | Borders, dividers, subtle separators        |
| Mint         | `#00C968` | Primary accent, CTAs, links, active states  |
| Bright Mint  | `#00E87B` | Hover states, highlights, focus rings       |
| Warm White   | `#E8E4DD` | Primary text on dark backgrounds            |
| Cream        | `#F7F5F0` | Light-mode backgrounds, alt sections        |
| Pure White   | `#FFFFFF` | Light-mode card surfaces                    |

### Semantic Colors

| Name    | Hex       | Usage                        |
|---------|-----------|-------------------------------|
| Success | `#00C968` | Same as Mint — confirmations  |
| Warning | `#F5A623` | Caution states, alerts        |
| Error   | `#E8453C` | Errors, destructive actions   |
| Info    | `#3D8BC2` | Informational badges, tips    |

### Neutral Text Scale (Dark Mode)

| Token             | Hex       | Usage                       |
|-------------------|-----------|-----------------------------|
| `text-primary`    | `#E8E4DD` | Headings, body text         |
| `text-secondary`  | `#8A8A8E` | Descriptions, placeholders  |
| `text-tertiary`   | `#6C6C70` | Hints, disabled text        |

### Neutral Text Scale (Light Mode)

| Token             | Hex       | Usage                       |
|-------------------|-----------|-----------------------------|
| `text-primary`    | `#1C1C1E` | Headings, body text         |
| `text-secondary`  | `#5C5C5E` | Descriptions, placeholders  |
| `text-tertiary`   | `#8A8A8E` | Hints, disabled text        |

### CSS Variables (Recommended)

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #1C1C1E;
  --color-bg-secondary: #2C2C2E;
  --color-bg-tertiary: #3A3A3C;
  --color-bg-cream: #F7F5F0;
  --color-bg-white: #FFFFFF;

  /* Brand */
  --color-mint: #00C968;
  --color-mint-bright: #00E87B;
  --color-mint-dim: #00A354;
  --color-mint-subtle: rgba(0, 201, 104, 0.12);

  /* Text (dark mode defaults) */
  --color-text-primary: #E8E4DD;
  --color-text-secondary: #8A8A8E;
  --color-text-tertiary: #6C6C70;

  /* Borders */
  --color-border-default: #3A3A3C;
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-accent: #00C968;

  /* Semantic */
  --color-success: #00C968;
  --color-warning: #F5A623;
  --color-error: #E8453C;
  --color-info: #3D8BC2;
}
```

---

## 4. Typography

### Font Stack

| Role      | Font Family                        | Fallback                  |
|-----------|------------------------------------|---------------------------|
| Headings  | **Satoshi**                        | system-ui, sans-serif     |
| Body      | **General Sans**                   | system-ui, sans-serif     |
| Mono/Code | **JetBrains Mono** or **SF Mono**  | ui-monospace, monospace   |

> If Satoshi/General Sans are not available in your build environment, **Inter** is an acceptable fallback for both — but Satoshi is strongly preferred for its geometric warmth.

### Type Scale

| Token   | Size  | Weight | Line Height | Letter Spacing | Font     | Usage                    |
|---------|-------|--------|-------------|----------------|----------|--------------------------|
| `h1`    | 40px  | 700    | 1.15        | -0.02em        | Satoshi  | Hero headings            |
| `h2`    | 28px  | 600    | 1.2         | -0.01em        | Satoshi  | Section headings         |
| `h3`    | 22px  | 600    | 1.3         | -0.01em        | Satoshi  | Card titles, sub-sections|
| `h4`    | 18px  | 500    | 1.35        | 0              | Satoshi  | Small headings, labels   |
| `body`  | 16px  | 400    | 1.6         | 0              | General Sans | Body text           |
| `body-sm` | 14px | 400   | 1.5         | 0              | General Sans | Descriptions, metadata |
| `caption`| 12px | 400    | 1.4         | 0.02em         | General Sans | Hints, timestamps     |
| `label` | 12px  | 600    | 1           | 0.08em         | General Sans | Buttons, tags (uppercase) |
| `code`  | 14px  | 400    | 1.5         | 0              | JetBrains Mono | Code, technical data |

### Type Rules
- Headings are **sentence case** — never Title Case or ALL CAPS (exception: button labels and tags use uppercase at `label` size).
- Body text on dark backgrounds: `#E8E4DD` (Warm White). Never pure `#FFFFFF`.
- Accent text (links, highlighted terms): `#00C968` (Mint).
- Don't use font sizes below 12px anywhere in the UI.

---

## 5. Spacing System

Use a **4px base grid** with these standard tokens:

| Token | Value | Usage                              |
|-------|-------|------------------------------------|
| `xs`  | 4px   | Tight inner padding, icon gaps     |
| `sm`  | 8px   | Inner padding, compact spacing     |
| `md`  | 16px  | Default padding, element gaps      |
| `lg`  | 24px  | Section padding, card padding      |
| `xl`  | 32px  | Major section gaps                 |
| `2xl` | 48px  | Page section separation            |
| `3xl` | 64px  | Hero padding, major landmarks      |

---

## 6. Border Radius

| Token    | Value | Usage                             |
|----------|-------|-----------------------------------|
| `sm`     | 6px   | Small chips, tags, inputs         |
| `md`     | 8px   | Buttons, badges                   |
| `lg`     | 12px  | Cards, modals, panels             |
| `xl`     | 16px  | Featured cards, hero elements     |
| `full`   | 9999px| Pills, avatars, toggles           |

---

## 7. Shadows & Elevation (Dark Mode)

Dark-mode UIs use **border + background shift** for elevation rather than drop shadows:

| Level    | Treatment                                                    |
|----------|--------------------------------------------------------------|
| Level 0  | `background: #1C1C1E` — base layer                          |
| Level 1  | `background: #2C2C2E` — cards, modals                       |
| Level 2  | `background: #3A3A3C` — dropdowns, popovers                 |
| Overlay  | `background: rgba(0, 0, 0, 0.6)` — modal backdrops          |

For light-mode contexts, use subtle shadows:
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.12);
```

---

## 8. Iconography

- **Style:** Line icons, 2px stroke, rounded caps and joins.
- **Default size:** 20px (with a 24px touch target).
- **Color:** `var(--color-text-secondary)` by default. `var(--color-mint)` for active/accent states.
- **Preferred icon set:** Lucide (lucide.dev) — clean, consistent, MIT licensed.

---

## 9. Component Patterns

### Buttons

| Variant   | Background         | Text Color  | Border             | Usage              |
|-----------|--------------------|-------------|--------------------|--------------------|
| Primary   | `#00C968` (Mint)   | `#1C1C1E`  | none               | Main CTAs          |
| Secondary | transparent        | `#00C968`   | 1px `#00C968`      | Secondary actions  |
| Ghost     | transparent        | `#E8E4DD`   | none               | Tertiary actions   |
| Danger    | `#E8453C`          | `#FFFFFF`   | none               | Destructive actions|

**States:**
- Hover: Brighten background by ~10% (Primary → `#00E87B`).
- Active/Pressed: Darken by ~10%.
- Disabled: 40% opacity, no pointer events.
- Focus: 2px mint outline with 2px offset (`outline: 2px solid #00C968; outline-offset: 2px`).

**Sizing:**
- Default: `height: 40px; padding: 0 20px; font-size: 14px; border-radius: 8px;`
- Small: `height: 32px; padding: 0 14px; font-size: 13px; border-radius: 6px;`
- Large: `height: 48px; padding: 0 28px; font-size: 16px; border-radius: 10px;`

### Cards

```css
.card {
  background: var(--color-bg-secondary);   /* #2C2C2E */
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  padding: 24px;
}
.card:hover {
  border-color: var(--color-border-default);
}
```

### Inputs

```css
.input {
  background: var(--color-bg-primary);     /* #1C1C1E */
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 16px;
  color: var(--color-text-primary);
}
.input::placeholder {
  color: var(--color-text-tertiary);
}
.input:focus {
  border-color: var(--color-mint);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-mint-subtle);
}
```

### Tags / Chips

```css
.tag {
  background: var(--color-mint-subtle);    /* rgba(0,201,104,0.12) */
  color: var(--color-mint);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
}
```

### Navigation (Top Bar)

- Background: `#1C1C1E`
- Height: 56px
- Logo on the left, nav links centered or right-aligned.
- Active link: mint text + 2px mint bottom border.
- Inactive link: `#8A8A8E` text, no border.

---

## 10. Dark Mode / Light Mode

The product is **dark-mode-first**. Dark mode is the default.

For light-mode contexts (marketing pages, email, print):
- Swap `--color-bg-primary` to `#FFFFFF` and `--color-bg-secondary` to `#F7F5F0`.
- Swap `--color-text-primary` to `#1C1C1E` and `--color-text-secondary` to `#5C5C5E`.
- Logo becomes charcoal text on light backgrounds.
- Mint accent remains the same (`#00C968`).

---

## 11. Motion & Animation

- **Default transition:** `150ms ease` for color, border, and opacity changes.
- **Layout transitions:** `250ms ease` for transforms, height, and width.
- **Page transitions:** `300ms ease` for route changes and modal entrances.
- Respect `prefers-reduced-motion: reduce` — disable all non-essential animations.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. Layout & Grid

- **Max content width:** 1200px, centered.
- **Page padding:** 24px on mobile, 48px on tablet, 64px on desktop.
- **Grid:** 12-column grid with 24px gutters on desktop, single-column stack on mobile.
- **Breakpoints:**

| Name     | Min Width | Columns | Gutter |
|----------|-----------|---------|--------|
| Mobile   | 0         | 1       | 16px   |
| Tablet   | 768px     | 2       | 24px   |
| Desktop  | 1024px    | 12      | 24px   |
| Wide     | 1440px    | 12      | 32px   |

---

## 13. Accessibility

- All interactive elements must be keyboard accessible.
- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text and UI elements.
- Focus indicators: 2px mint outline with 2px offset — never remove focus styles.
- Mint (`#00C968`) on Charcoal (`#1C1C1E`) passes WCAG AA for large text. For small body text, use Warm White (`#E8E4DD`) and reserve mint for accents and interactive elements.
- All images and icons need appropriate `alt` text or `aria-label`.

---

## 14. File & Asset Naming

- Components: `kebab-case` (e.g., `interview-card.tsx`, `role-selector.tsx`)
- CSS/style files: match component name (e.g., `interview-card.module.css`)
- Images: descriptive kebab-case (e.g., `logo-mint-on-dark.svg`, `hero-illustration.png`)
- Colors: reference by token name, not hex value, in code.

---

## 15. Quick Reference — Copy-Paste Tokens

```css
/* Drop this into your global stylesheet or Tailwind config */

/* Colors */
--charcoal: #1C1C1E;
--dark-gray: #2C2C2E;
--mid-gray: #3A3A3C;
--mint: #00C968;
--mint-bright: #00E87B;
--mint-dim: #00A354;
--mint-subtle: rgba(0, 201, 104, 0.12);
--warm-white: #E8E4DD;
--cream: #F7F5F0;

/* Typography */
--font-heading: 'Satoshi', system-ui, sans-serif;
--font-body: 'General Sans', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;

/* Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

---

*Last updated: March 2026. Onsite brand identity v1.*
