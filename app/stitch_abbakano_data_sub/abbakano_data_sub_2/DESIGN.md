---
name: AbbaKano Data Sub
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434652'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#747683'
  outline-variant: '#c4c6d4'
  surface-tint: '#345ab3'
  primary: '#00276c'
  on-primary: '#ffffff'
  primary-container: '#0b3c95'
  on-primary-container: '#8facff'
  inverse-primary: '#b3c5ff'
  secondary: '#835500'
  on-secondary: '#ffffff'
  secondary-container: '#feae2c'
  on-secondary-container: '#6b4500'
  tertiary: '#00266d'
  on-tertiary: '#ffffff'
  tertiary-container: '#003a9c'
  on-tertiary-container: '#90acff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#14419a'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b3c5ff'
  on-tertiary-fixed: '#00174a'
  on-tertiary-fixed-variant: '#003ea6'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
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
    lineHeight: 18px
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
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes a high-trust, frictionless digital utility ecosystem tailored for mobile-first Nigerian consumers and VTU (Virtual Top-Up) resellers. It strips away the visual clutter, hyperactive banners, and cramped grid layouts that dominate typical African fintech and telecommunication utilities. The visual philosophy emphasizes clarity, instant transactional legibility, effortless single-thumb interaction, and financial serenity.

Rooted in a Modern Utility Minimalist aesthetic, the system pairs deep royal cobalt blues from the brand emblem with warm, luminous gold accents. It balances these brand hallmarks against expansive slate-tinted white space, crisp typography, and soft, air-filled surfaces. Interactions evoke precision, safety, and rapid execution, ensuring users feel absolute certainty during wallet funding and bundle checkout flows.

## Colors

The color palette directly reflects the official brand identity, designed for crisp daylight legibility under varied mobile screen conditions:

- **Primary (`#0B3C95`):** Deep Royal Cobalt. Conveys reliability, institutional trust, and stability. Utilized for major navigation bars, key brand headers, primary call-to-action buttons, active tab states, and prominent wallet balances.
- **Secondary (`#F5A623`):** Warm Imperial Gold. Derived from the dynamic swoosh and SIM iconography of the brand mark. Reserved for high-value focal moments: tier indicators, cashback tags, reward badges, notification alerts, and active bundle selection outlines. Never used for large body copy to maintain legibility.
- **Tertiary (`#0047BA`):** Electric Cobalt. Used for micro-interactions, interactive text links, active network pills, and subtle directional icons.
- **Neutral Surface (`#F8FAFC`):** Soft Slate Tint. Replaces stark blinding white across application canvasses to reduce eye strain, allowing pure white (`#FFFFFF`) card containers to lift cleanly off the canvas.
- **Semantic Statuses:**
  - Success: `#059669` (Transaction successful, wallet credited)
  - Warning: `#D97706` (Low wallet balance, pending confirmation)
  - Error: `#DC2626` (Failed transmission, network outage)
  - Neutral Text (Heading): `#0F172A`
  - Neutral Text (Body/Muted): `#64748B`

## Typography

Typography is set exclusively in **Plus Jakarta Sans**, offering geometric clarity combined with open counterforms that remain sharp on budget mobile screens.

- **Financial Figures & Wallet Balances:** Display sizes (`display-lg` and `display-sm`) feature tight letter-spacing (`-0.02em`) with tabular figures enabled (`font-variant-numeric: tabular-nums`) so that Naira currency valuations and dynamic bundle tallies align with zero horizontal shift.
- **Hierarchical Discipline:** Section titles never exceed `title-lg` inside inner card modules to prevent visual overcrowding.
- **Data Densities:** Transaction receipts, breakdown tables, and network quota labels rely on `label-md` and `body-sm` in semi-bold and regular weights respectively, guaranteeing instant scan speed without cognitive fatigue.

## Layout & Spacing

The layout is built around a single-column, touch-optimized fluid layout designed primarily for mobile viewports (360px–430px base), expanding gracefully into a maximum container width of 540px on tablets or desktop wrappers to preserve its intentional app ergonomics.

- **Spacious Rhythm:** Vertical flow strictly enforces breathing room. Groups of actionable items are separated by `space-xl` (32px), eliminating the feeling of congested, low-cost utility software.
- **Touch-Area Safety:** All tap regions (network selectors, bundle cards, keypad inputs) require a minimum vertical footprint of 48px, with 56px standard for core CTAs.
- **Edge Cushioning:** Screen margins adopt `margin-mobile` (16px) with an inner card content padding of `space-md` (16px) to `space-lg` (24px) for prominent balance and action hubs.

## Elevation & Depth

Visual hierarchy employs ambient, diffused shadows coupled with structural tonal layering, avoiding dense, harsh drop shadows.

- **Canvas to Card Layering:** Pure white cards (`#FFFFFF`) sit on top of the soft slate foundation (`#F8FAFC`). Depth is established primarily through crisp 1px borders in slate (`#E2E8F0`) rather than elevation, keeping the interface clean and light.
- **Elevated Hero Panels (Wallet Hub):** The top balance summary card utilizes an ambient, tinted shadow (`box-shadow: 0 12px 32px -8px rgba(11, 60, 149, 0.12)`) paired with a subtle, deep-blue linear gradient (`135deg, #0B3C95 0%, #0047BA 100%`) to create the distinct anchor of the home screen.
- **Floating Modals & Pin Confirmations:** Sheets and confirmation drawers rise with a smooth blur overlay (`backdrop-filter: blur(8px)`) accompanied by an ambient shadow (`0 20px 40px -12px rgba(15, 23, 42, 0.18)`).
- **Interactive State Depth:** When bundle cards are tapped or active, they drop internal elevation and receive a 2px stroke in warm gold (`#F5A623`) with an ultra-light gold ambient glow (`0 0 0 4px rgba(245, 166, 35, 0.12)`).

## Shapes

The design system incorporates roundedness level `2` (0.5rem / 8px base, scaling up to 1rem / 16px and 1.5rem / 24px for macro containers). This echoes the smooth curves of the brand mark and hardware contours of modern smartphones.

- **Base Cards & Modules:** Finished with `rounded-lg` (16px / 1rem) for an approachable, friendly silhouette.
- **Buttons & Input Fields:** 12px border radius for ergonomic tap targets.
- **Quick-Action Utility Pills & Network Chips:** Fully rounded pill shapes (`border-radius: 9999px`) for network toggles (MTN, Airtel, Glo, 9mobile), quick amount selectors, and plan categories (SME, Gifting, Corporate).
- **Modal Drawers:** Top-left and top-right radii set to 24px (`rounded-xl`).

## Components

### Buttons
- **Primary Action:** Solid Royal Cobalt background (`#0B3C95`), white text (`#FFFFFF`), `label-lg` typography, 54px height, 12px radius. Tapping triggers a subtle scale-down (`active:scale-[0.98]`).
- **Accent / Promo Action:** Solid Warm Gold background (`#F5A623`), dark cobalt text (`#0B3C95`), used sparingly for upsell tiers or instant top-up triggers.
- **Secondary / Ghost:** Transparent background, 1.5px border in `#CBD5E1`, text in `#0B3C95`.

### Service & Network Selector Chips
- Network carriers (MTN, Airtel, Glo, 9mobile) are arranged in a horizontal equal-width segmented row.
- **Default State:** White background, 1px `#E2E8F0` border, muted carrier badge.
- **Selected State:** Pure white container, 2px solid `#0B3C95` border, active tint background (`rgba(11, 60, 149, 0.04)`), carrier logo in full saturation with a checkmark badge.

### Data Bundle Plan Cards
- Vertical stacked list with 12px gap between items.
- Structured with plan volume (e.g., "2.5 GB") in `title-lg`, validity duration (e.g., "30 Days") in `body-sm` muted text, and price tagged cleanly in bold `title-md` (`#0B3C95`).
- Active state renders a 2px `#F5A623` outline and a soft warm tint to prevent incorrect bundle purchases.

### Input Fields & Phone Number Inputs
- Height: 52px with 16px horizontal padding.
- Neutral light gray background (`#F1F5F9`) in idle state with no harsh borders.
- On focus: shifts to `#FFFFFF` background with a 1.5px solid `#0B3C95` border and a faint cobalt focus ring (`0 0 0 3px rgba(11, 60, 149, 0.1)`).
- Includes native contact book quick-picker icon on the right edge.

### Wallet Hero Card
- Signature visual anchor. Deep cobalt gradient (`#0B3C95` to `#0047BA`) with 20px radius.
- Displays available balance with a toggleable privacy eye icon, clean white typography, and two prominent gold-accented quick-actions: "Add Money" and "Transaction History".

### Transaction Status Slips
- Off-white card designed with clear top-level success/failure iconography (48px circle with centered glyph).
- Key-value list separated by hairline borders (`#F1F5F9`) detailing Beneficiary, Network, Plan Type, Transaction Ref, and Timestamp.
- Sticky bottom share and repeat-transaction buttons.