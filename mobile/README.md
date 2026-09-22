# AbbaKano Data Sub 📱⚡

> A modern, high-performance Nigerian Virtual Top-Up (VTU) and telecom reseller application built with **React Native**, **Expo (v57)**, and **TypeScript**.

[![Expo](https://img.shields.io/badge/Expo-v57.0-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

**AbbaKano Data Sub** is an enterprise-grade VTU portal tailored for individual users and high-volume wholesale data resellers across Nigeria. It delivers automated, sub-second top-ups for data bundles, airtime, prepaid electricity tokens, and cable TV subscriptions, coupled with dedicated virtual bank accounts and reseller commission tools.

---

## 🚀 Key Features

### 🔐 Authentication & Security
- **Smart Registration**: Sign up with just a phone number (mandatory); email address is optional.
- **Dual-Mode Login**: Sign in using either registered phone number or email address.
- **Phone-Based Referral System**: Every user's registered phone number serves as their universal referral code.
- **4-Digit Wallet PIN**: Secure PIN authorization modal for executing financial debit operations.
- **Self-Service Recovery**: Complete OTP-based password and PIN reset workflow.

### 📶 Telecom & VTU Services
- **Data Bundle Hub**: Automated SME, Corporate Gifting, and Direct Data bundles across **MTN**, **Airtel**, **Glo**, and **9mobile**.
- **Instant Airtime Top-Up**: Automatic telco prefix detection (`0803`, `0802`, `0805`, etc.) with manual override and quick-select presets.
- **Reseller Price Masking**: When purchasing data bundles, wholesale prices are hidden on client receipts, the transaction ledger, and audit modals—displaying only the bundle purchased and completion status so resellers can sell at custom retail markups.

### 💡 Utilities & Subscriptions
- **Prepaid Electricity**: Instant meter number verification and token generation (IKEDC, EKEDC, KEDCO, AEDC, IBEDC, etc.) with copy-to-clipboard tokens.
- **Cable TV Subscriptions**: Instant smartcard/IUC verification with package selection for **DStv**, **GOtv**, and **StarTimes**.

### 💼 Wallet & Banking
- **Virtual Accounts**: Automated, dedicated Moniepoint MFB and Wema Bank / ALAT virtual account numbers for instant auto-funding.
- **Privacy Controls**: One-tap toggle to mask/unmask main balance and commission earnings.
- **Refer & Earn Program**: Real-time commission tracker with one-tap transfer of bonuses to the main wallet.

### 🎧 Customer Support & Community
- **WhatsApp Direct**: 1-tap connection to technical support agents.
- **WhatsApp Community Hub**: Dedicated community updates grid for broadcast alerts on VTU server status, telco downtime, and price drops.
- **Interactive FAQs**: Accordion-based answers to common VTU queries and payment delays.

### 🎨 Theme & UI/UX
- **Dynamic Theming**: Full support for Dark Mode, Light Mode, and System Theme preferences with zero screen flash.
- **Responsive Layout**: Optimized for iOS, Android, and Web browsers.

---

## 🛠️ Tech Stack

- **Framework**: [Expo v57](https://expo.dev) with Expo Router (file-based navigation)
- **Runtime**: [React Native 0.86](https://reactnative.dev)
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Styling**: Tailored React Native StyleSheet architecture with dynamic semantic tokens (`getPalette`)
- **Icons**: `@expo/vector-icons` (MaterialIcons, Ionicons, MaterialCommunityIcons)
- **Safe Area**: `react-native-safe-area-context`

---

## 📁 Project Structure

```
abbakano_data_sub_app/
├── assets/                  # Brand assets, emblems, telco logos, and screen previews
│   ├── images/
│   ├── screens/
│   └── screenAssets.ts     # Centralized asset registry
├── src/
│   ├── app/                # Expo Router root entry and layout
│   │   ├── _layout.tsx     # Root stack & font loading
│   │   ├── index.tsx       # Main authenticated container & auth router
│   │   └── explore.tsx     # Feature exploration & screen catalog
│   ├── components/
│   │   ├── common/         # Buttons, badges, headers, form inputs
│   │   ├── dashboard/      # Wallet balance card, quick actions, recent transactions
│   │   ├── history/        # Transaction ledger filters & audit modals
│   │   ├── kyc/            # Tier verification modals
│   │   ├── modals/         # Checkout bottom sheet, PIN modal, receipt modal
│   │   ├── navigation/     # App bottom navigation bar
│   │   └── vtu/            # Data picker, electricity & cable biller cards
│   ├── constants/
│   │   ├── mockData.ts     # Mock user profile, data plans, bills, transaction ledger
│   │   ├── telco.ts        # Telco networks, prefixes, and brand metadata
│   │   └── theme.ts        # Color palettes (Dark/Light), typography, spacing, border radii
│   ├── context/
│   │   ├── AppContext.tsx  # Global state (user, balances, ledger, theme mode)
│   │   └── CheckoutContext.tsx # Checkout flow state (draft, PIN validation, receipt modal)
│   ├── hooks/              # Theme and telco detector hooks
│   └── views/              # Full-screen views
│       ├── AuthLoginView.tsx       # Sign In (Phone or Email)
│       ├── AuthRegisterView.tsx    # Sign Up (Phone mandatory, Email optional)
│       ├── AuthWelcomeView.tsx     # Onboarding landing screen
│       ├── AuthPinSetupView.tsx    # Initial 4-digit PIN setup
│       ├── ForgotPasswordView.tsx  # Password & PIN reset flow
│       ├── DashboardView.tsx       # Main wallet dashboard
│       ├── VtuView.tsx             # Data bundles screen
│       ├── AirtimeView.tsx         # Airtime recharge screen
│       ├── ElectricityView.tsx     # Prepaid electricity screen
│       ├── CableTvView.tsx         # Cable TV subscription screen
│       ├── FundWalletView.tsx      # Virtual account funding screen
│       ├── LedgerView.tsx          # Full transaction ledger & history
│       ├── ReferEarnView.tsx       # Referral rewards & invite links
│       ├── ProfileView.tsx         # Account settings & tier management
│       └── SupportView.tsx         # Support desk & WhatsApp community
├── app.json                # Expo application config
├── package.json            # Dependencies & scripts
└── tsconfig.json           # TypeScript configuration
```

---

## 🏃 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn**
- **Expo Go** app (optional, for testing on physical iOS/Android device)

### 1. Clone the Repository
```bash
git clone https://github.com/Spectre-Techie/AbbaKano-Data-Sub.git
cd AbbaKano-Data-Sub
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npx expo start
```

### Backend API Configuration

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` before starting Expo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Use `http://localhost:3000` for a browser on the development computer. For a physical device, use the computer's LAN IP, for example `http://192.168.1.20:3000`. The Docker service name `backend` is only available to containers on the same Docker network.

From the terminal menu, press:
- `w` — Open in Web browser
- `a` — Open in Android emulator / connected device
- `i` — Open in iOS simulator (macOS only)
- Or scan the QR code using the **Expo Go** app on your phone.

---

## 🧪 Verification & Building

### Type Check
Run the TypeScript compiler to ensure type correctness:
```bash
npx tsc --noEmit
```

### Static Web Export
Verify production web bundle build:
```bash
npx expo export --platform web
```

---

## 🤝 Collaboration Guidelines

1. **Branching**: Create feature branches off `main` (`feature/your-feature-name` or `fix/your-fix-name`).
2. **Commit Messages**: Keep commit messages descriptive (e.g. `feat: add WhatsApp community grid to support desk`).
3. **Theming**: When adding new components, always use dynamic theme tokens via `useTheme()` or `useApp()` to maintain Dark/Light mode fidelity.
4. **Reseller Rules**: Preserve the price-masking rule on all data bundle receipts and ledger displays (`type === 'DATA'`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
