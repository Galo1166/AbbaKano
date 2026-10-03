---
name: VTU Pulse
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
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#43ed9e'
  on-secondary: '#003920'
  secondary-container: '#00d084'
  on-secondary-container: '#005231'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#59fead'
  secondary-fixed-dim: '#31e193'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005231'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
  numpad-key:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
---

## Brand & Style

This design system delivers a high-velocity, trusted utility and fintech experience tailored for telecom virtual top-ups (VTU), automated bill payments, data bundles, and micro-agent banking. The core visual narrative balances the precision and rock-solid security of institutional modern fintech with the kinetic immediacy of telco retail distribution. 

### Target Audience & Psychological Posture
Designed for mobile-first agents, sub-distributors, and digital-native retail users across fast-growing emerging markets. Every interaction prioritizes instantaneous transaction confirmation, high-legibility network switching, and unequivocal financial clarity.

### Aesthetic Movement
The aesthetic synthesizes **Modern African Neo-Fintech** with **Tactile Utility Minimalism**:
- Deep obsidian backdrop with high-contrast, luminous indicators.
- Precision line-work and micro-borders that articulate nested surface tiers cleanly on low-to-high gamut mobile displays.
- Expressive brand identity anchors through explicit, authenticated telco network tokens (MTN, Airtel, Glo, 9mobile) cleanly integrated within a unified neutral architecture.
- Tactile feedback paradigms: deliberate tap-states, grounded sheet elevations, and crisp biometric/numpad physical metaphors.

## Colors

The color architecture is built around deep dark obsidian slate tones, offset by high-luminance functional accents and standard telecom operator identity tokens.

### Theme Palette & Roles
- **Primary Canvas & Neutral Dark (`#0A0E17`)**: Base surface depth. Layered with elevated neutral tones (`#111827` surface-raised, `#1E293B` surface-overlay, `#334155` borders/dividers, `#94A3B8` secondary labels, `#F8FAFC` primary text).
- **Electric Cobalt Action (`#2563EB`)**: Primary conversion color for primary buttons, selection tabs, active toggles, and critical transactional progressions.
- **Emerald Mint Balance (`#00D084`)**: Positive ledger balances, successful transaction statuses, completed top-ups, and cashback rewards.
- **Warm Amber Alert (`#F59E0B`)**: Pending network confirmations, escrow states, recharge queue warnings, and low-wallet alerts.
- **Crimson Error (`#EF4444`)**: Failed API hooks, insufficient balances, network disconnects.

### Telco Operator Tokens
Specific carrier tokens must maintain absolute chromatic fidelity to prevent user recharge errors:
- **MTN Yellow**: `#FFCC00` (Text label pairing: `#0A0E17`)
- **Airtel Red**: `#E60000` (Text label pairing: `#FFFFFF`)
- **Glo Green**: `#27A844` (Text label pairing: `#FFFFFF`)
- **9mobile Lime**: `#84BD00` (Text label pairing: `#0A0E17`)

Carrier colors are strictly isolated to carrier selection chips, operator badges, bundle logos, and active network indicator dots. They must never override core interactive buttons.

## Typography

The design system utilizes **Plus Jakarta Sans** across all typography tiers, capitalizing on its modern geometric curves, open apertures, and crisp readability on sub-400px mobile devices.

### Numerical Legibility & Tabular Figures
Financial transactions require fixed-width figures to prevent layout jitter during live inputs and quick counter updates. All currency amounts, VTU balance metrics, phone number inputs, and data balance representations must activate OpenType tabular numbers (`font-feature-settings: "tnum" 1`).

### Hierarchy & Scaling Strategy
- **Currency & High-Impact Balance Display (`currency-display`, `display-lg`)**: Reserved strictly for total wallet balances, cashbacks, and the transaction amount preview screen.
- **Section & Modal Titles (`headline-md`, `headline-sm`)**: Used within bottom sheets, bill category sections, and transaction receipts.
- **Body & Micro-Metrics (`body-md`, `label-sm`)**: Handles commission percentages, operator verification feedback, and time-stamped transaction ledger rows.

## Layout & Spacing

Designed for mobile viewport widths centered around 390px (iPhone 12/13/14/15/16 baseline) with responsive scaling down to 360px Android devices.

### Layout Geometry
- **Screen Margin**: Fixed `1.25rem` (20px) horizontal outer margin creates a stable edge-to-edge frame that accommodates one-handed thumb interaction while preventing edge-clipping on curved screens.
- **Column Structure**: 4-column fluid mobile grid with `1rem` (16px) gutters. Fast-action utilities (Airtime, Data, Cable TV, Electricity) distribute across 4 equal columns.
- **Vertical Rhythm**: Built upon a strict 4px/8px step. Component vertical padding uses `space-sm` (12px) for compact listings and `space-md` (16px) for standard interactive cards.

### Safe Areas & Layout Anchors
- Bottom action bars are permanently pinned above device home indicators (`env(safe-area-inset-bottom) + 12px`).
- Bottom navigation tabs maintain an absolute structural height of 68px with touch target boxes of minimum 48px × 48px.

## Elevation & Depth

The design system utilizes a **Tonal Layering with Specular Stroke** model rather than blurry, heavy drop shadows, maintaining crisp delineation against dark canvases.

### Elevation Hierarchy
- **Level 0 (Base Canvas - `#0A0E17`)**: The root view background for scrollable flows.
- **Level 1 (Card & Module Containers - `#111827`)**: Standard card containers for quick actions, operator selectors, and transaction history feeds. Outlined with a 1px hairline border of `rgba(255, 255, 255, 0.08)`.
- **Level 2 (Active Controls & Modals - `#1E293B`)**: Bottom sheets, quick-action sheets, numpad surface plates, and elevated filter chips. Bordered with `rgba(255, 255, 255, 0.12)`.
- **Level 3 (Floating Overlays & Tooltips - `#243047`)**: Transient notification toasts, dropdown popovers, and floating biometric shortcuts. Accompanied by a subtle ambient shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.5)`.

### Glass & Translucency
Top navigation bars and the persistent bottom navigation strip utilize background blur (`backdrop-filter: blur(16px)`) over `rgba(10, 14, 23, 0.82)`. This exposes subtle motion underneath during list scrolls without compromising accessibility.

## Shapes

The shape system employs roundedness level **2** (`0.5rem` / 8px baseline) to balance contemporary consumer-grade software friendliness with fintech precision.

### Application Rules
- **Base Cards & Action Modules (`rounded-xl` - 16px / 1rem)**: Used for primary balance cards, telecom carrier selection tiles, and transaction receipt cards.
- **Buttons, Text Inputs & Numpad Keys (`rounded-lg` - 12px / 0.75rem)**: Ergonomic contact surfaces optimized for immediate thumb capture.
- **Pills & Status Indicators (`rounded-full` - 9999px)**: Reserved for transaction status chips (Success, Pending, Failed), network operator identifiers, discount/cashback tags, and segmented control track indicators.

## Components

### 1. Primary Action & Quick Recharge Buttons
- **Height**: 52px fixed mobile height for optimal thumb ergonomics.
- **Primary Style**: `#2563EB` solid background with `#FFFFFF` text (`label-lg`), no drop shadow, pressed state shifts to `#1D4ED8` with `scale(0.98)` spring animation.
- **Secondary / Ghost**: `#111827` background, 1px border `rgba(255, 255, 255, 0.12)`, `#F8FAFC` text.

### 2. Telecom Network Selector Chips
- **Structure**: 4-column horizontal card grid. Each tile contains the official operator circular badge (24px) paired with the network name.
- **Unselected**: `#111827` background, 1px border `rgba(255, 255, 255, 0.08)`.
- **Selected**: 1.5px border matching the respective carrier token (`#FFCC00`, `#E60000`, `#27A844`, `#84BD00`), subtle carrier-tinted background gradient at 12% opacity.

### 3. Financial Balance Wallet Card
- Surface: Gradient angled at 135deg from `#1E293B` to `#0F172A`, bordered by `rgba(255, 255, 255, 0.1)`.
- Dynamic balance amount set in `currency-display` with `#00D084` accent highlighting for cash additions and commissions.
- Contains integrated quick-action buttons: "Top Up Wallet", "Transfer", "Statement".

### 4. Tactile PIN & Amount Numpad
- Layout: 3x4 grid anchored at screen bottom.
- Key Surface: `#111827` circular-rectangle plates (64px height) with 1px border of `rgba(255, 255, 255, 0.06)`. Active tap-down triggers immediate solid feedback `#1E293B`.
- Integrated biometric (FaceID/Fingerprint) toggle icon placed directly to the left of the '0' digit; backspace delete key placed to the right.

### 5. Transaction Status Badges
- **Success**: Pill shape, background `rgba(0, 208, 132, 0.15)`, text `#00D084`, 1px border `rgba(0, 208, 132, 0.3)`.
- **Pending**: Pill shape, background `rgba(245, 158, 11, 0.15)`, text `#F59E0B`, 1px border `rgba(245, 158, 11, 0.3)`.
- **Failed**: Pill shape, background `rgba(239, 68, 68, 0.15)`, text `#EF4444`, 1px border `rgba(239, 68, 68, 0.3)`.

### 6. Form Inputs & Phone Number Field with Auto-Detection
- Input box: 52px height, `#111827` surface, 1px border `rgba(255, 255, 255, 0.1)`.
- Prefix area: Integrated phonebook icon and real-time auto-detected telco logo (e.g., typing "0803" immediately highlights MTN yellow mini-badge inside the input field).
- Focus State: 1.5px border `#2563EB`, background shifts to `#0F172A`.

### 7. Segmented Plan Switcher (Data / Airtime / Bills)
- Pill track container: `#111827` with 4px inner padding.
- Sliding active thumb: `#2563EB` or `#1E293B` with high-contrast text `#FFFFFF`.

### 8. Polished Bottom Navigation Bar
- Height: 68px plus device safe-bottom offset.
- Floating glass aesthetic: `#0A0E17` at 85% opacity with 16px blur, bordered at top with 1px hairline `rgba(255, 255, 255, 0.08)`.
- 5 key routes: Home, Airtime/Data, Reseller Hub, History, Account. Active icon illuminated with `#2563EB` and subtle `#00D084` indicator dot.