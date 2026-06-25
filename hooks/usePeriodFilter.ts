import { useCallback, useMemo, useState } from 'react';
import { getPeriodBounds, type PeriodKey } from '@/utils/dateRanges';

export function usePeriodFilter() {
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>();
  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);

  const bounds = useMemo(
    () => getPeriodBounds(period, customRange?.from, customRange?.to),
    [period, customRange]
  );

  const handlePeriodSelect = useCallback((key: PeriodKey, from?: string, to?: string) => {
    setPeriod(key);
    setCustomRange(key === 'custom' ? { from: from!, to: to! } : undefined);
    setPeriodSheetVisible(false);
  }, []);

  return { period, bounds, periodSheetVisible, setPeriodSheetVisible, handlePeriodSelect };
}
