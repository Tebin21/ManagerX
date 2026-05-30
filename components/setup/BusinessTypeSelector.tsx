import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { BUSINESS_TYPES, BusinessType } from '@/constants/config';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface Props {
  selected: BusinessType | null;
  onSelect: (type: BusinessType) => void;
}

export function BusinessTypeSelector({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {BUSINESS_TYPES.map((type) => {
        const isSelected = selected === type.id;
        return (
          <TouchableOpacity
            key={type.id}
            onPress={() => onSelect(type.id)}
            activeOpacity={0.8}
          >
            <MotiView
              animate={{
                borderColor: isSelected ? Colors.primary : Colors.gray200,
                backgroundColor: isSelected ? Colors.softBlue : '#FFFFFF',
                scale: isSelected ? 1.02 : 1,
              }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
              style={styles.chip}
            >
              <Text style={styles.emoji}>{type.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                ]}
              >
                {type.labelKey.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
            </MotiView>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    gap: 10,
    flexDirection: 'row',
  },
  chip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    minWidth: 90,
    ...Theme.shadow.soft,
  },
  emoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray600,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
