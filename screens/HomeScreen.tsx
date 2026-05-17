import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import VaultGrid from '../components/VaultGrid';
import { initializeAuthToken } from '../services/api';

type Props = NativeStackScreenProps<any, 'VaultGrid'>;

interface Vault {
  vault_id: string;
  icon_name: string;
  icon_label: string;
}

const defaultVaults: Vault[] = [
  { vault_id: 'vault_files', icon_name: 'folder-outline', icon_label: 'Files' },
  { vault_id: 'vault_images', icon_name: 'image-outline', icon_label: 'Images' },
  { vault_id: 'vault_videos', icon_name: 'video-outline', icon_label: 'Videos' },
  { vault_id: 'vault_docs', icon_name: 'file-document-outline', icon_label: 'Documents' },
  { vault_id: 'vault_secure', icon_name: 'shield-lock-outline', icon_label: 'Secure' },
  { vault_id: 'vault_camera', icon_name: 'camera-outline', icon_label: 'Camera' },
  { vault_id: 'vault_music', icon_name: 'music-note-outline', icon_label: 'Music' },
  { vault_id: 'vault_lock', icon_name: 'lock-outline', icon_label: 'Secure' },
  { vault_id: 'vault_key', icon_name: 'key-outline', icon_label: 'Keys' },
  { vault_id: 'vault_desktop', icon_name: 'desktop-mac', icon_label: 'Devices' },
  { vault_id: 'vault_email', icon_name: 'email-lock-outline', icon_label: 'Email' },
  { vault_id: 'vault_database', icon_name: 'database', icon_label: 'Database' },
  { vault_id: 'vault_clipboard', icon_name: 'clipboard-text-outline', icon_label: 'Notes' },
  { vault_id: 'vault_cloud', icon_name: 'cloud-upload-outline', icon_label: 'Cloud' },
  { vault_id: 'vault_calendar', icon_name: 'calendar-month', icon_label: 'Calendar' },
  { vault_id: 'vault_calculator', icon_name: 'calculator-variant', icon_label: 'Calculator' },
  { vault_id: 'vault_battery', icon_name: 'battery-charging-outline', icon_label: 'Power' },
  { vault_id: 'vault_flashlight', icon_name: 'flashlight', icon_label: 'Flash' },
  { vault_id: 'vault_timer', icon_name: 'timer-sand', icon_label: 'Timer' },
  { vault_id: 'vault_face', icon_name: 'face-recognition', icon_label: 'Face' },
  { vault_id: 'vault_clock', icon_name: 'clock-outline', icon_label: 'Clock' },
  { vault_id: 'vault_book', icon_name: 'book-open-outline', icon_label: 'Library' },
  { vault_id: 'vault_magnify', icon_name: 'magnify', icon_label: 'Search' },
  { vault_id: 'vault_shield', icon_name: 'shield-check-outline', icon_label: 'Guard' },
  { vault_id: 'vault_account', icon_name: 'account-lock-outline', icon_label: 'Account' },
];

export default function HomeScreen({ navigation }: Props) {
  const [vaults] = useState<Vault[]>(defaultVaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeAuthToken();
      setLoading(false);
    };
    init();
  }, []);

  const handleVaultPress = (vault: Vault) => {
    navigation.navigate('PinPad', {
      vaultId: vault.vault_id,
      vaultLabel: vault.icon_label,
    });
  };

  return (
    <View style={styles.container}>
      <VaultGrid
        vaults={vaults}
        loading={loading}
        onVaultPress={handleVaultPress}
        onAddVault={() => {}}
        canAddVault={false}
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
