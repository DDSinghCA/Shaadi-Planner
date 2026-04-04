import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.brand.maroon,
  contributor: Colors.brand.gold,
  viewer: Colors.text.secondary,
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  contributor: 'Contributor',
  viewer: 'Viewer',
};

export default function ManageUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  const deleteUser = (u: any) => {
    Alert.alert('Delete User', `Delete "${u.name || u.username}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/users/${u.id}`);
            fetchUsers();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const changeRole = (u: any) => {
    const roles = ['admin', 'contributor', 'viewer'].filter(r => r !== u.role);
    Alert.alert('Change Role', `Current: ${ROLE_LABELS[u.role]}`, 
      roles.map(r => ({
        text: ROLE_LABELS[r],
        onPress: async () => {
          try {
            await api.put(`/users/${u.id}`, { role: r });
            fetchUsers();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      })).concat([{ text: 'Cancel', onPress: () => {} }])
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity
          testID="add-user-btn"
          style={styles.addBtn}
          onPress={() => router.push('/add-user')}
        >
          <Ionicons name="person-add" size={18} color={Colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={Colors.brand.maroon} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {users.map((u, idx) => (
              <View key={u.id || idx} style={styles.userCard} testID={`user-item-${idx}`}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[u.role] + '20' }]}>
                  <Text style={[styles.avatarText, { color: ROLE_COLORS[u.role] }]}>
                    {(u.name || u.username)?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name || u.username}</Text>
                  <Text style={styles.userUsername}>@{u.username}</Text>
                  <TouchableOpacity
                    testID={`user-role-${idx}`}
                    onPress={() => changeRole(u)}
                    style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[u.role] + '15' }]}
                  >
                    <Text style={[styles.roleText, { color: ROLE_COLORS[u.role] }]}>{ROLE_LABELS[u.role]}</Text>
                    <Ionicons name="chevron-down" size={12} color={ROLE_COLORS[u.role]} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity testID={`user-delete-${idx}`} onPress={() => deleteUser(u)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.ui.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brand.maroon, justifyContent: 'center', alignItems: 'center',
  },
  list: { paddingHorizontal: Spacing.xl },
  userCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSizes.lg, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  userUsername: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginTop: 4,
  },
  roleText: { fontSize: FontSizes.xs, fontWeight: '600' },
  deleteBtn: { padding: Spacing.sm },
});
