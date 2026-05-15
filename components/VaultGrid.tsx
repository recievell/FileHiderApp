import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Vault {
  vault_id: string;
  icon_name: string;
  icon_label: string;
}

interface VaultGridProps {
  vaults: Vault[];
  loading: boolean;
  onVaultPress: (vault: Vault) => void;
  onAddVault: () => void;
  canAddVault?: boolean;
  onDeleteVault?: (vault: Vault) => void;
}

const ICON_MAP: { [key: string]: string } = {
  'clock-outline': 'clock-outline',
  'compass-outline': 'compass-outline',
  'lock-outline': 'lock-outline',
  'folder-outline': 'folder-outline',
  'calendar-month': 'calendar-month',
  'calculator-variant': 'calculator-variant',
  'camera-outline': 'camera-outline',
  'cloud-upload-outline': 'cloud-upload-outline',
  'music-note-outline': 'music-note-outline',
  'email-lock-outline': 'email-lock-outline',
  'face-recognition': 'face-recognition',
  'battery-charging-outline': 'battery-charging-outline',
  'desktop-mac': 'desktop-mac',
  'flashlight': 'flashlight',
  'timer-sand': 'timer-sand',
  'key-outline': 'key-outline',
  'cash-multiple': 'cash-multiple',
  'clipboard-text-outline': 'clipboard-text-outline',
  'database': 'database',
  'fingerprint': 'fingerprint',
  'keyboard-outline': 'keyboard-outline',
  'key-change': 'key-change',
  'file-search-outline': 'file-search-outline',
  'cog-outline': 'cog-outline',
  'shield-lock-outline': 'shield-lock-outline',
  'file-document-outline': 'file-document-outline',
  'account-lock-outline': 'account-lock-outline',
  'magnify': 'magnify',
  'shield-check-outline': 'shield-check-outline',
  'book-open-outline': 'book-open-outline',
};

export default function VaultGrid({ vaults, loading, onVaultPress, onAddVault, canAddVault = true, onDeleteVault }: VaultGridProps) {
  const renderVaultItem = ({ item }: { item: Vault }) => {
    if (item.vault_id.startsWith('FILLER_')) {
      return <View style={styles.vaultCard} />;
    }

    const iconName = ICON_MAP[item.icon_name] || 'lock';

    return (
      <TouchableOpacity
        style={styles.vaultCard}
        onPress={() => onVaultPress(item)}
        onLongPress={() => onDeleteVault?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={iconName as any} size={36} color="#ffffff" />
        </View>
        <Text style={styles.vaultLabel}>{item.icon_label}</Text>
      </TouchableOpacity>
    );
  };

  const addNewItem = { vault_id: 'ADD_NEW', icon_name: 'plus', icon_label: 'Add New' } as any;
  const baseItems = canAddVault ? [...vaults, addNewItem] : [...vaults];
  const numColumns = 5;
  const remainder = baseItems.length % numColumns;
  const fillerItems = [] as Vault[];

  if (remainder === 1) {
    const fillersNeeded = numColumns - 1;
    const before = Math.floor(fillersNeeded / 2);
    const after = fillersNeeded - before;

    for (let i = 0; i < before; i += 1) {
      fillerItems.push({ vault_id: `FILLER_BEFORE_${i}`, icon_name: '', icon_label: '' });
    }

    for (let i = 0; i < after; i += 1) {
      fillerItems.push({ vault_id: `FILLER_AFTER_${i}`, icon_name: '', icon_label: '' });
    }
  }

  const data = remainder === 1
    ? [...vaults, ...fillerItems.slice(0, Math.floor(fillerItems.length / 2)), addNewItem, ...fillerItems.slice(Math.floor(fillerItems.length / 2))]
    : baseItems;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f97f7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IconSentry</Text>
        <Text style={styles.subtitle}>Tap an icon to unlock its vault</Text>
      </View>

      <FlatList
        data={data}
        renderItem={({ item }) => {
          if (item.vault_id === 'ADD_NEW') {
            return (
              <TouchableOpacity
                style={[styles.vaultCard, styles.addCard]}
                onPress={onAddVault}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="plus" size={40} color="#ffffff" />
                </View>
        
                <Text style={styles.vaultLabel}>Add New</Text>
              </TouchableOpacity>
            );
          }
          return renderVaultItem({ item });
        }}
        keyExtractor={(item) => item.vault_id}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={() => (
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#4f97f7" />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Only you know which icons matter</Text>
                <Text style={styles.bannerSubtitle}>Each icon has its own PIN. Default is filled.</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  subtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 6,
 marginBottom: 10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1419',
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: 1,
    marginBottom: 30,
  },
  vaultCard: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCard: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 60,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#4a7ba7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },
  vaultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  banner: {
    marginHorizontal: 12,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1a3a52',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d5a80',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#a0a0a0',
  },
});
