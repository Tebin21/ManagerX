import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModuleCard } from './ModuleCard';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, ModuleDefinition } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';

export function ModuleGrid() {
  const { t } = useTranslation();
  const { modules } = useModuleStore();
  const { moduleColumns, isTablet } = useResponsive();

  const sortedModules = [...MODULES].sort((a, b) => {
    const orderA = modules[a.id]?.order ?? MODULES.findIndex((m) => m.id === a.id);
    const orderB = modules[b.id]?.order ?? MODULES.findIndex((m) => m.id === b.id);
    return orderA - orderB;
  });

  const displayModules = React.useMemo(() => {
    if (!isTablet) return sortedModules;
    // On iPad / tablet, swap the positions of 'inventory' and 'sales' per user request
    const salesIdx = sortedModules.findIndex((m) => m.id === 'sales');
    const invIdx = sortedModules.findIndex((m) => m.id === 'inventory');
    if (salesIdx !== -1 && invIdx !== -1) {
      const copy = [...sortedModules];
      const temp = copy[salesIdx];
      copy[salesIdx] = copy[invIdx];
      copy[invIdx] = temp;
      return copy;
    }
    return sortedModules;
  }, [sortedModules, isTablet]);

  const renderItem = ({ item }: { item: ModuleDefinition }) => {
    const config = modules[item.id];
    if (__DEV__ && !config) {
      console.warn(`[ModuleGrid] No store config for module "${item.id}" — rendering with defaults`);
    }
    return (
      <ModuleCard
        module={item}
        enabled={config?.enabled ?? true}
        label={t(`dashboard.${item.id}`)}
      />
    );
  };

  return (
    <FlatList
      key={`grid-${moduleColumns}`}
      data={displayModules}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={moduleColumns}
      scrollEnabled={false}
      contentContainerStyle={styles.grid}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 8,
  },
});
