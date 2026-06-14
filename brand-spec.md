# Brand Specification · Jelantahin

> **Modern Heritage** — Warm Earth palette. Indonesian warmth meets contemporary design.
> Last updated: 2026-07-17

---

## Brand Essence

| Attribute | Value |
|-----------|-------|
| **Tagline** | *Daur ulang minyak jelantah, lebih mudah & menguntungkan* |
| **Tone** | Warm, trustworthy, local-rooted, modern-efficient |
| **Personality** | Like a trusted local shop that's also tech-savvy |
| **Promise** | Turn kitchen waste into value — transparently, fairly |
| **Audience** | UMKM owners (warung, rumah makan) + Perusahaan kolektor |

---

## Logo

### Primary Logo

```
┌─────────────────────────────────────────────────┐
│                    🫒                            │
│              (custom SVG mark)                   │
│                                                   │
│              Jelantahin                            │
│              daur ulang minyak jelantah            │
└─────────────────────────────────────────────────┘
```

**Mark**: Abstract geometric combination of:
- An olive/drop silhouette (the oil droplet)
- A leaf form (sustainability / nature)
- Flowing line (circular economy — waste to value)

**Location**: `src/lib/assets/logo.svg`
**Lockup**: Mark + "Jelantahin" wordmark in Sora Bold.

### Logo Variations
- **Full** — mark + wordmark + tagline (for hero, footer)
- **Compact** — mark + wordmark only (for navbar)
- **Mark only** — icon alone (favicon, loading states, avatar placeholder)

### Logo Usage Rules
- Clear space: minimum 1× the mark height on all sides
- Minimum size: 24px (mark only), 120px (full lockup)
- Never outline, stretch, or rotate the mark

---

## Color System

All colors expressed in `oklch()` for perceptual uniformity.

### Primary Palette (Warm Earth)

| Token | oklch | Hex | Role |
|-------|-------|-----|------|
| `--earth-900` | oklch(0.21 0.04 60) | #3A2E20 | Deepest brown — text on light |
| `--earth-800` | oklch(0.32 0.05 60) | #5A4A35 | Secondary text, icons |
| `--earth-700` | oklch(0.43 0.06 65) | #7B6950 | Muted text, subdued UI |
| `--earth-600` | oklch(0.55 0.07 70) | #9E8A6A | Borders, disabled states |
| `--earth-500` | oklch(0.67 0.08 75) | #C2AD87 | Neutral UI elements |
| `--earth-400` | oklch(0.78 0.06 80) | #DDCEB0 | Muted backgrounds |
| `--earth-300` | oklch(0.86 0.04 85) | #EFE5D5 | Card backgrounds |
| `--earth-200` | oklch(0.92 0.02 90) | #F6F0E6 | Page backgrounds |
| `--earth-100` | oklch(0.96 0.01 90) | #FBF8F3 | Lightest tint |
| `--earth-50`  | oklch(0.99 0.005 90) | #FDFCFA | Near-white |

### Brand Accent (Jelantah Gold — the core identity)

| Token | oklch | Hex | Role |
|-------|-------|-----|------|
| `--gold-700` | oklch(0.50 0.12 75) | #8A6F0A | Text on light (AA+) |
| `--gold-600` | oklch(0.60 0.14 78) | #AD8B0C | Hover state |
| `--gold-500` | oklch(0.70 0.15 80) | #D4A40D | **Primary brand color** (CTA, active) |
| `--gold-400` | oklch(0.80 0.12 82) | #EBC245 | Light accent, badges |
| `--gold-300` | oklch(0.87 0.08 85) | #F5D980 | Subtle brand glow |
| `--gold-200` | oklch(0.93 0.05 88) | #FBEFC0 | Tinted backgrounds |
| `--gold-100` | oklch(0.97 0.02 90) | #FEF7E4 | Lightest tint |

### Green Accent (Nature / Sustainability / Success)

| Token | oklch | Hex | Role |
|-------|-------|-----|------|
| `--herb-700` | oklch(0.40 0.10 145) | #2D6A3B | Text, dark badges |
| `--herb-600` | oklch(0.50 0.12 148) | #3D8A4F | Hover |
| `--herb-500` | oklch(0.60 0.13 150) | #4FA862 | **Positive action, success** |
| `--herb-400` | oklch(0.72 0.10 152) | #72C283 | Light badges |
| `--herb-300` | oklch(0.82 0.08 155) | #9FD9AE | Backgrounds |
| `--herb-200` | oklch(0.90 0.05 158) | #C8ECD3 | Subtle background |
| `--herb-100` | oklch(0.95 0.02 160) | #E8F6ED | Lightest |

### Semantic Colors

| Token | oklch | Hex | Role |
|-------|-------|-----|------|
| `--danger` | oklch(0.55 0.18 25) | #C4443C | Errors, cancellations |
| `--warning` | oklch(0.75 0.15 75) | #D9A520 | Warnings, pending states |
| `--info` | oklch(0.60 0.10 220) | #3A7DC2 | Informational |

### Neutral (for dark mode / high-contrast)

| Token | oklch | Hex | Role |
|-------|-------|-----|------|
| `--neutral-900` | oklch(0.15 0.01 60) | #1A1816 | Text on light |
| `--neutral-800` | oklch(0.25 0.01 60) | #2E2B27 | Secondary text |
| `--neutral-700` | oklch(0.38 0.01 65) | #4A4640 | Muted text |
| `--neutral-600` | oklch(0.50 0.01 70) | #635F57 | Borders |
| `--neutral-500` | oklch(0.62 0.01 75) | #7E7A70 | Disabled text |
| `--neutral-400` | oklch(0.74 0.01 80) | #9B968C | Light borders |
| `--neutral-300` | oklch(0.84 0.01 85) | #B8B4AA | Disabled bg |
| `--neutral-200` | oklch(0.92 0.01 85) | #D6D2C8 | Muted bg |
| `--neutral-100` | oklch(0.96 0.01 85) | #EBE8E0 | Subtle bg |
| `--neutral-50`  | oklch(0.985 0.005 85) | #F5F3EF | Page bg |

---

## Typography

### Font Pairing

| Use | Font | Fallback | Weight Range |
|-----|------|----------|-------------|
| **Display** (headings, hero, brand moments) | **Sora** | system-ui, sans-serif | 200 – 800 |
| **Body** (UI text, labels, paragraphs) | **Plus Jakarta Sans** | system-ui, sans-serif | 200 – 800 |
| **Mono** (code, IDs, numeric data) | **JetBrains Mono** | monospace | 400 – 700 |

**Why Sora?** Warm, geometric grotesk — modern enough to feel contemporary, rounded enough to feel approachable. Supports latin-ext (Indonesian diacritics).

**Why Plus Jakarta Sans?** Clean, highly readable body text. Its name (Jakarta) is a subtle brand connection to Indonesia's capital — a small but meaningful detail for a local-rooted platform.

### Type Scale

```css
--text-xs:   0.75rem  (12px)   / 1rem    — labels, meta
--text-sm:   0.875rem (14px)   / 1.25rem — body small, nav
--text-base: 1rem     (16px)   / 1.5rem  — body
--text-lg:   1.125rem (18px)   / 1.5    — large body
--text-xl:   1.25rem  (20px)   / 1.4    — subheading
--text-2xl:  1.5rem   (24px)   / 1.3    — section heading
--text-3xl:  1.875rem (30px)   / 1.25   — page heading
--text-4xl:  2.25rem  (36px)   / 1.15   — hero heading
--text-5xl:  3rem     (48px)   / 1.1    — large hero
--text-6xl:  3.75rem  (60px)   / 1.05   — display
```

### Line Length
- Body text: max-width 65ch (for readability)
- Headings: max-width 20ch

---

## Iconography

**All icons are custom SVG** — no emoji, no icon font, no Material Icons.

### Style
- **Outlined, 1.5px stroke**, rounded caps and joins
- 24×24px viewBox
- Stroke color inherits currentColor
- Consistent weight across the whole set

### Key Icons
| Concept | Icon Name | Replaces Emoji |
|---------|-----------|----------------|
| Olive / Jelantah | `olive-drop` | 🫒 |
| UMKM / Shop | `shop` | 🏪 |
| Company | `building` | 🏭 |
| Payment | `credit-card` | 💳 |
| Points / Reward | `award` | 🏆 |
| History | `clock-rotate` | 📋 |
| Location | `map-pin` | 📍 |
| Orders | `package` | 📦 |
| Chat | `message-circle` | 💬 |
| Logout | `log-out` | 🚪 |
| Search | `search` | 🔍 |
| User | `user` | 👤 |
| Bank | `bank` | 🏦 |
| Trending | `trending-up` | 📈 |

---

## Spacing & Layout

```css
--space-1:  0.25rem  (4px)
--space-2:  0.5rem   (8px)
--space-3:  0.75rem  (12px)
--space-4:  1rem     (16px)
--space-5:  1.25rem  (20px)
--space-6:  1.5rem   (24px)
--space-8:  2rem     (32px)
--space-10: 2.5rem   (40px)
--space-12: 3rem     (48px)
--space-16: 4rem     (64px)
--space-20: 5rem     (80px)
```

### Layout Max-widths
- Content: 1200px
- Narrow (auth forms): 480px
- Wide (dashboard): 1440px

---

## Border Radius

```css
--radius-sm:   0.375rem  (6px)
--radius-md:   0.625rem  (10px)
--radius-lg:   1rem      (16px)
--radius-xl:   1.5rem    (24px)
--radius-full: 9999px
```

---

## Shadows

```css
--shadow-sm:   0 1px 2px oklch(0 0 0 / 0.04), 0 1px 1px oklch(0 0 0 / 0.02)
--shadow-md:   0 2px 4px oklch(0 0 0 / 0.04), 0 4px 8px oklch(0 0 0 / 0.03)
--shadow-lg:   0 4px 8px oklch(0 0 0 / 0.04), 0 8px 24px oklch(0 0 0 / 0.03)
--shadow-xl:   0 8px 16px oklch(0 0 0 / 0.05), 0 16px 48px oklch(0 0 0 / 0.04)
--shadow-gold: 0 0 0 2px oklch(0.70 0.15 80 / 0.3) /* focus ring */
```

---

## Motion

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)

--duration-fast:   150ms
--duration-base:   250ms
--duration-slow:   400ms
--duration-xslow:  700ms
```

---

## Heritage Elements (Visual Language)

To express "Modern Heritage" without resorting to cliché:

1. **Geometric rhythm** — inspired by the grid-like ordering of batik patterns, not the motifs themselves. Use repeating geometric lines at section boundaries, subtle diagonal hatching on hover states, concentric circular motifs in empty states.
2. **Tropical warmth** — the Warm Earth palette itself carries this. Occasional use of leaf/plant silhouette accents in hero and empty states.
3. **Circular economy symbolism** — flowing lines, looping arrows, connected dots in decorative elements.
4. **Texture** — subtle noise/grain on hero sections (CSS `filter: contrast(1.4) brightness(1.2)` with SVG noise overlay).

### Anti-patterns (Don't)
- ❌ Batik pattern as full backgrounds or borders
- ❌ Wayang / shadow puppet imagery
- ❌ Excessive tropical colors (keep the palette disciplined)
- ❌ Decorative elements that serve no function

---

## Brand Assets Location

| Asset | Path | Format |
|-------|------|--------|
| Brand spec | `brand-spec.md` | Markdown |
| Logo mark | `src/lib/assets/logo.svg` | SVG |
| Logo compact | `src/lib/assets/logo-compact.svg` | SVG |
| Favicon | `static/favicon.svg` | SVG |
| OG image | `static/og-image.svg` | SVG |
| Icon sprite | `src/lib/assets/icons.svg` | SVG sprite |

---

## Accessibility

- All text/background combinations must pass WCAG AA (contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text)
- Focus indicators use `--shadow-gold` (2px ring in brand gold)
- Interactive elements have minimum 44×44px touch target
- All custom SVGs have `aria-hidden="true"` or descriptive `<title>`
