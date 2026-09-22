import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppProvider, useApp } from '@/context/AppContext';
import { CheckoutProvider } from '@/context/CheckoutContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ICON_FONTS = {
  ...Ionicons.font,
  ...MaterialIcons.font,
  ...MaterialCommunityIcons.font,
};

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 1200;

/** Inner shell — can call useApp() because it's inside <AppProvider> */
function ThemedNavigationShell() {
  const { effectiveTheme, theme } = useApp();
  const isDark = effectiveTheme === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.canvas}
        translucent={false}
      />
      <Slot />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);
  const retryCount = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function loadWithRetry() {
      while (retryCount.current < MAX_RETRIES) {
        try {
          await Font.loadAsync(ICON_FONTS);
          if (isMounted.current) {
            setFontsReady(true);
          }
          return;
        } catch {
          retryCount.current += 1;
          if (retryCount.current < MAX_RETRIES && isMounted.current) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, RETRY_DELAY_MS)
            );
          }
        }
      }
      // After all retries, render the app anyway (icons will show as blank placeholders)
      if (isMounted.current) {
        setFontsReady(true);
      }
    }

    loadWithRetry();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <AppProvider>
      <CheckoutProvider>
        <ThemedNavigationShell />
      </CheckoutProvider>
    </AppProvider>
  );
}
