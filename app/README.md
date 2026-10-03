# AbbaKano Mobile App

The AbbaKano mobile app is an Expo Router application for wallet funding, VTU purchases, transaction history, referrals, profile security, and customer support.

## Features

- Supabase email and Nigerian phone authentication
- Wallet and transaction history
- Data, airtime, electricity, and cable-TV purchases
- Transaction PIN setup and change
- Device biometric login and transaction authorization
- SecureStore-backed credentials and transaction PIN authorization
- Light, dark, and system theme support
- Expo Router navigation for iOS, Android, and web

## Requirements

- Node.js 18 or newer
- npm
- Expo CLI through the project-local `expo` package
- For native biometric testing: an iOS/Android development build or a compatible physical device/emulator

## Local setup

```bash
cd app
npm install
```

Create an environment file for local development:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-or-anon-key>
EXPO_PUBLIC_API_URL=https://<api-host-if-used>
```

`EXPO_PUBLIC_*` values are bundled into the application. Use only public Supabase client values there. Never place service-role keys, provider API keys, payment secrets, or transaction PIN hashes in the app.

## Development

```bash
npm start       # Start Expo
npm run android # Start Android target
npm run ios     # Start iOS target
npm run web     # Start Expo web target
npm run lint
npx tsc --noEmit
```

Use Expo Go only for features supported by the installed Expo Go runtime. Native modules such as `expo-local-authentication`, `expo-secure-store`, and `expo-asset` require a compatible development build when the runtime does not include them.

If you see `Cannot find native module 'ExpoAsset'` or another missing native module:

1. Stop Metro.
2. Run the command from the `app` directory.
3. Start with a clean cache:

   ```bash
   npx expo start --clear
   ```

4. Rebuild and reinstall the native development client after adding or changing native dependencies.

The `"main" has not been registered` message is usually a follow-on error from the earlier native-module failure, not the root cause.

## Native biometric builds

Adding or upgrading native Expo modules requires a new native binary. After installing dependencies:

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Use the appropriate platform command and development credentials. Test biometric login and transaction authorization on a device or emulator with Face ID, Touch ID, or fingerprint enrollment.

## Supabase integration

The app uses the Supabase client in `src/lib/supabase.ts` and shared purchase/authentication services under `src/services`, `src/context`, and `src/lib`. Supabase Edge Functions remain responsible for registration, PIN verification, PIN updates, wallet operations, purchases, and provider integrations.

The production app must use the same Supabase project and migrations as the web app. Deploy and validate the required functions from `web/supabase/functions` before testing mobile flows.

## Project structure

```text
app/
├── assets/              # App icons, fonts, and images
├── src/app/             # Expo Router routes and auth container
├── src/components/      # Reusable UI and checkout components
├── src/context/         # Auth, checkout, and app state
├── src/services/        # Data and biometric services
├── src/views/           # Feature screens
├── app.json             # Expo configuration
└── package.json         # Scripts and dependencies
```

## Security notes

- Never commit `.env` files or credentials.
- SecureStore is used for device-local biometric unlock data.
- Transaction PIN verification is performed by Supabase Edge Functions.
- Treat production builds and development builds as separate artifacts; rebuild after native dependency changes.
