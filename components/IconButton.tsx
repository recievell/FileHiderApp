import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GestureResponderEvent } from 'react-native';

interface IconButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  iconName?: string;
}

export default function IconButton({ title, onPress, iconName }: IconButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      {iconName ? (
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name={iconName as any} size={18} color="#ffffff" />
        </View>
      ) : null}
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: '#2f6fef',
    borderRadius: 10,
  },
  iconWrapper: {
    marginRight: 10,
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});
