import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModuleCard } from './ModuleCard';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, ModuleDefinition } from '@/constants/config';

export function ModuleGrid() {
  const { t } = useTranslation();
  const { modules } = useModuleStore();

  const sortedModules = [...MODULES].sort((a, b) => {
    const orderA = modules[a.id]?.order ?? MODULES.findIndex((m) => m.id === a.id);
    const orderB = modules[b.id]?.order ?? MODULES.findIndex((m) => m.id === b.id);
    return orderA - orderB;
  });

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
      data={sortedModules}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
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
