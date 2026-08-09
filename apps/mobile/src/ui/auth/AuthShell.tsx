import type { ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '../BrandMark';

interface AuthShellProps {
  /** Screen title. Login and register skip it: the brand is the header. */
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Last line of the column ("New here? Register"). */
  footer?: ReactNode;
  testID?: string;
}

/**
 * The shell of the auth screens, in the web's phone-width design: brand on top
 * (symbol in accent, wordmark in text colour), the 360px column centred, and the
 * one-line footer that leads to the sibling screen.
 *
 * No Login|Register tabs: the web switches screens through a footer link, and
 * two big tabs up top pushed the form below the fold.
 *
 * No language selector: before an account exists the app follows the device
 * (`i18n.ts` reads `getLocales()`), the way the web follows the browser.
 * Switching language is something a signed-in user does, in Configuration.
 *
 * `title` is optional because on the web it is `sr-only` at this width. Login
 * and register pass none — the recovery and verification screens do, where the
 * title is the only thing that says what the screen is for (the app has no
 * address bar to tell you).
 */
export default function AuthShell({ title, subtitle, children, footer, testID }: AuthShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        testID={testID}
        keyboardShouldPersistTaps="handled"
        // Anchored at the TOP, like the mockup: centred vertically, the brand
        // landed mid-screen with a huge gap above it, and the keyboard shoved
        // the whole form on every focus.
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 32,
        }}
      >
        <View className="w-full max-w-[360px] self-center">
          <View className="mb-8 items-center gap-2">
            <BrandMark size={44} />
            <Text className="text-xl font-semibold tracking-[-0.02em] text-text">beyou</Text>
          </View>

          {title ? (
            <Text
              accessibilityRole="header"
              className="text-[17px] font-semibold tracking-[-0.015em] text-text"
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text className="mt-1.5 text-[13px] text-text-3">{subtitle}</Text> : null}

          {children}

          {footer ? <View className="mt-4 flex-row justify-center">{footer}</View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
