import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PinPad from '../components/PinPad';

type Props = NativeStackScreenProps<any, 'PinPad'>;

export default function PinPadScreen({ navigation, route }: Props) {
  const { vaultLabel } = route.params || {};

  const handlePinComplete = (pin: string) => {
    if (pin.length !== 4) {
      return;
    }

    navigation.replace('Vault', {
      vaultId: route.params?.vaultId,
      vaultLabel,
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <PinPad
        title={vaultLabel ? `Unlock ${vaultLabel}` : 'Enter Vault PIN'}
        subtitle="Enter your 4-digit PIN to continue"
        onPinComplete={handlePinComplete}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
});
