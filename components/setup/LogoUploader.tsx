import React from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface Props {
  uri: string | null;
  onSelect: (uri: string) => void;
}

export function LogoUploader({ uri, onSelect }: Props) {
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelect(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity onPress={pick} activeOpacity={0.8} style={styles.wrapper}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera" size={28} color={Colors.primary} />
          <Text style={styles.hint}>Upload Logo</Text>
        </View>
      )}
      <View style={styles.badge}>
        <Ionicons name="pencil" size={12} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'visible',
    alignSelf: 'center',
    marginBottom: 8,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.lightBlue,
  },
  placeholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.softBlue,
    borderWidth: 2,
    borderColor: Colors.lightBlue,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
