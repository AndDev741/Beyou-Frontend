import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import i18next from 'i18next';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * App-level crash boundary — catches render errors anywhere below it and shows a
 * recoverable fallback instead of a white screen. A class component because error
 * boundaries can't be hooks; styling still works via NativeWind className, and
 * copy reads from the already-initialised i18next instance.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8" testID="error-boundary">
        <Text className="text-5xl">😵</Text>
        <Text className="text-secondary text-center text-lg font-bold">{i18next.t('SomethingWentWrong')}</Text>
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          testID="error-retry"
          className="rounded-full bg-primary px-5 py-2.5"
        >
          <Text className="text-background font-semibold">{i18next.t('TryAgain')}</Text>
        </Pressable>
      </View>
    );
  }
}
