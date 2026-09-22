---
name: AbbaKano Data Sub
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
This design system establishes a high-performance, security-focused mobile virtual top-up (VTU) and utility payment interface. The aesthetic bridges institutional trust with high-speed digital utility, targeting everyday consumers, digital merchants, and airtime/data resellers across fast-moving mobile markets.

The visual direction uses an **Elevated OLED Dark Modern** style:
- **Foundational Atmosphere:** Ultra-deep, battery-efficient slate-black backdrop that accentuates high-density financial metrics and instant transaction feedback.
- **Accents & Personality:** Vibrant royal electric blue conveys infrastructural stability and encrypted banking security, while tactical amber-gold highlights high-value perks, wallet balances, active bonuses, and instant alert nodes.
- **Surface Architecture:** Floating layered card tiers with precise, featherlight borders provide crisp legibility without ocular fatigue under low-light or outdoor viewing conditions.

## Colors
The color hierarchy is engineered for deep contrast ratios (WCAG AAA compliant for critical actions) on dark mobile displays:

- **Canvas & Backgrounds:**
  - `surface-canvas`: `#090d16` (Deepest slate-black base)
  - `surface-base`: `#0d121f` (Primary view background)
  - `surface-container-low`: `#151b2b` (Standard structural cards, list items)
  - `surface-container-high`: `#1d253b` (Elevated modal sheets, interactive inputs, floating action modules)
  - `surface-container-highest`: `#28334f` (Active hover, selected states, segmented controls)

- **Accents:**
  - `primary`: `#3b82f6` (Primary action buttons, brand signatures, active indicators)
  - `primary-container`: `#1e3a8a` (Deep interactive fills, selection tints)
  - `secondary`: `#f59e0b` (Wallet balance values, VIP tier badges, airtime cash-backs)
  - `secondary-container`: `#78350f` (Muted badge backings)
  - `tertiary` (Success): `#10b981` (Instant transaction success, network online pulse)
  - `error`: `#ef4444` (Failed top-ups, invalid meter IDs, network downtime alerts)

- **Outlines & Strokes:**
  - `stroke-subtle`: `rgba(255, 255, 255, 0.08)` (Structural cards, input boundaries)
  - `stroke-prominent`: `rgba(255, 255, 255, 0.16)` (Dividers, active focus frames)
  - `stroke-brand`: `rgba(59, 130, 246, 0.40)` (Focused inputs, selected payment methods)

- **Text & Iconography:**
  - `text-primary`: `#ffffff` (High contrast headings, critical transaction numbers)
  - `text-secondary`: `#94a3b8` (Labels, metadata, transaction timestamps)
  - `text-tertiary`: `#64748b` (Disabled items, placeholder strings)

## Typography
Plus Jakarta Sans is utilized across all interfaces to provide optical clarity on high-DPI screens.

- **Financial Display:** Wallet numbers and recharge balances use tabular numbers (`font-variant-numeric: tabular-nums;`) combined with `currency-display` to ensure currency amounts align without jittering during live reloads.
- **Hierarchy Rules:**
  - `headline-xl` is reserved for primary onboarding and major account balance views.
  - `label-sm` is strictly for status badges (e.g., "SUCCESSFUL", "SME DATA", "PENDING") and must be styled in uppercase with intentional tracking.
  - Body text uses regular weight (`400`) in `text-secondary` (`#94a3b8`) for context descriptions and `600` for transactional parameter values.

## Layout & Spacing
The layout follows a mobile-first fluid architecture optimized for one-handed operation:

- **Mobile Viewport Structure:** Standard outer gutter uses `margin` (`16px`). Touch targets have a strict minimum height of `48px`.
- **Vertical Spacing Cadence:**
  - Component internals (icon to text, chip padding) rely on `space-xs` (`8px`) to `space-sm` (`12px`).
  - Stacked list tiles and utility vendor selectors use `space-sm` gaps.
  - Section blocks (Quick Actions, Recent Airtime/Data, Utility Hub) are spaced using `space-lg` (`24px`).
- **Network Vendor Grids:** Data and VTU bundles adapt to a responsive 2-column or 4-column compact grid with `gutter-sm` (`12px`) separation.

## Elevation & Depth
In this OLED dark system, depth is achieved primarily through layered luminosity and subtle surface containment, rather than dark drop shadows:

1. **Surface Stratification:**
   - **Level 0 (Canvas):** Pure dark background (`#090d16`).
   - **Level 1 (Card Baseline):** `#151b2b` with a crisp outline `1px solid rgba(255, 255, 255, 0.08)`.
   - **Level 2 (Active/Elevated Overlays):** `#1d253b` with `1px solid rgba(255, 255, 255, 0.12)`.
   - **Level 3 (Modals & Bottom Sheets):** `#1d253b` anchored over a `rgba(9, 13, 22, 0.75)` backdrop blur (`12px`).

2. **Ambient Colored Glows:**
   - Critical primary interactive triggers (e.g., "Fund Wallet", "Purchase Bundle") project a soft, colored ambient underglow: `box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.35)`.
   - VIP/Wallet elements use subtle amber diffusion: `box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.20)`.

3. **Dividers & Outlines:**
   - Never use solid opaque borders. Hairline borders (`rgba(255, 255, 255, 0.08)`) create visual boundaries while maintaining dark elegance.

## Shapes
A rounded modern finish softens the technical nature of telecom utilities:

- **Default Radii:**
  - **Cards & Hero Modules:** `rounded-2xl` (`16px` / `1rem`) for dashboard balance containers, promo banners, and provider cards.
  - **Inputs & Interactive Controls:** `rounded-xl` (`12px` / `0.75rem`) for text fields, dropdown selectors, and payment method pickers.
  - **Buttons & Tags:** `rounded-xl` for standard buttons, and full rounded capsules (`9999px`) for network carrier filters (MTN, Airtel, Glo, 9mobile) and transaction status chips.

## Components

### Buttons
- **Primary Action (Instant Top-Up / Pay):** Solid fill `#3b82f6`, label `#ffffff` in `label-lg`, height `52px`, `rounded-xl`. Enhanced with dynamic scale feedback (`active:scale-[0.98]`) and soft blue glow.
- **Secondary (Fund Wallet / History):** Semi-transparent fill `rgba(59, 130, 246, 0.12)`, text `#3b82f6`, outline `1px solid rgba(59, 130, 246, 0.3)`.
- **Tertiary / Amber Glow (Special Bundles):** Background `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`, text `#090d16` (bold contrast), elevation shadow in amber.

### Cards & Service Tiles
- **Dashboard Wallet Card:** Container `#151b2b` styled with a subtle 135-degree radial gradient from `#1d253b` to `#0d121f`. Bound by `1px solid rgba(255, 255, 255, 0.08)`. Features gold-accented balance labels and instant quick-fund CTA.
- **Telecom Grid Tiles:** Square-ratio interactive cards featuring the provider logo, network indicator dot (green = operational, amber = delayed delivery), and provider name. Container uses `#151b2b` default, switching to `#1d253b` with a `2px solid #3b82f6` border on selection.

### Form Inputs & Phone Field
- **Phone & Account Number Inputs:** `#151b2b` surface with inner text in `#ffffff`. Placeholder styled in `#64748b`. Left slot contains national flag or dynamic auto-detected network logo badge (MTN, Glo, etc.). Height `54px`, `rounded-xl`.
- **State Feedback:** Focused state replaces neutral border with `#3b82f6` accompanied by an outer ring `0 0 0 3px rgba(59, 130, 246, 0.20)`.

### Chips & Badges
- **Carrier Selector Chips:** Compact pill shapes (`rounded-full`) with `8px 16px` padding. Unselected: `#151b2b` with `#94a3b8` text. Selected: `#3b82f6` background with `#ffffff` bold text.
- **Data Bundle Chips:** Shows plan size (e.g., "2.5GB") as `label-md` `#ffffff` and cost (e.g., "₦500") as `body-sm` `#f59e0b`.

### Transaction Lists
- **Item Rows:** Separated using vertical spacing (`space-sm`) rather than continuous edge-to-edge dividing lines. Background uses `#151b2b` with internal padding of `14px 16px` and `rounded-xl`.
- **Status Indication:** Left-aligned avatar shows service category icon (Airtime, Cable TV, Electricity, Data) illuminated with accent tints; trailing column contains total amount and color-coded status badge (`#10b981` success, `#ef4444` failed).