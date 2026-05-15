import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';

type Props = NativeStackScreenProps<any, 'AdminDashboard'>;

interface User {
  userid: string;
  username: string;
  email: string;
  sex: string;
  created_at: string;
  vaultCount: number;
  storageUsed: string;
  lastActivity: string;
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalStorage: '0 MB' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setUsers(data.users);
      setStats({
        totalUsers: data.totalUsers,
        totalStorage: data.totalStorage,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${user.username}" and all their data? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteUser(user),
        },
      ]
    );
  };

  const confirmDeleteUser = async (user: User) => {
    try {
      await adminAPI.deleteUser(user.userid);
      Alert.alert('Success', 'User deleted successfully');
      loadUsers(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete user');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.username}>{item.username}</Text>
          <View style={styles.userStats}>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#4f97f7" />
              <Text style={styles.statText}>{item.vaultCount} vaults</Text>
            </View>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="database" size={14} color="#4f97f7" />
              <Text style={styles.statText}>{item.storageUsed}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.details}>
          Gender: {item.sex} • Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.details}>
          Last Activity: {new Date(item.lastActivity).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteUser(item)}
      >
        <MaterialCommunityIcons name="delete-outline" size={20} color="#e53e3e" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f97f7" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left-bold" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-group-outline" size={24} color="#4f97f7" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons name="server-network" size={24} color="#4f97f7" />
          <Text style={styles.statNumber}>{stats.totalStorage}</Text>
          <Text style={styles.statLabel}>Total Storage</Text>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.userid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={48} color="#2d3748" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a3a52',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d5a80',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1419',
  },
  loadingText: {
    fontSize: 16,
    color: '#a0a0a0',
    marginTop: 16,
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3748',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  email: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: '#696969',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0a0',
    marginTop: 16,
  },
});