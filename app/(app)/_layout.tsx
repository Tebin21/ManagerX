import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function AppLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ErrorBoundary>
  );
}
