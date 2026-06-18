import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRTL } from '@/lib/rtl';

export default function AppLayout() {
  const { isRTL } = useRTL();
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: isRTL ? 'slide_from_left' : 'slide_from_right',
        }}
      />
    </ErrorBoundary>
  );
}
