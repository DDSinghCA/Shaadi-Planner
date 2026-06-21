import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const SIDES = ['All', 'Bride', 'Groom'];
const GROUPS = ['All', 'Family', 'Friends', 'VIP'];

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  invited: { color: Colors.brand.gold, icon: 'mail-outline', label: 'Invited' },
  confirmed: { color: Colors.ui.success, icon: 'checkmark-circle', label: 'Confirmed' },
  declined: { color: Colors.ui.error, icon: 'close-circle', label: 'Declined' },
};

export default function GuestsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sideFilter, setSideFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');

  const fetchGuests = useCallback(async () => {
    try {
      let params = '';
      const q: string[] = [];
      if (sideFilter !== 'All') q.push(`side=${sideFilter.toLowerCase()}`);
      if (groupFilter !== 'All') q.push(`group=${groupFilter.toLowerCase()}`);
      if (q.length > 0) params = '?' + q.join('&');
      const res = await api.get(`/guests${params}`);
      setGuests(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sideFilter, groupFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGuests();
    }, [fetchGuests])
  );

  const deleteGuest = (guest: any) => {
    Alert.alert('Delete Guest', `Remove "${guest.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/guests/${guest.id}`);
            fetchGuests();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const getSideBadgeColor = (side: string) => {
    return side === 'bride' ? Colors.brand.maroon : Colors.brand.gold;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Guest List</Text>
          <Text style={styles.count}>{guests.length} guests</Text>
        </View>
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <TouchableOpacity
            testID="add-guest-btn"
            style={styles.addBtn}
            onPress={() => router.push('/add-guest')}
          >
            <Ionicons name="person-add" size={18} color={Colors.text.inverse} />
            <Text style={styles.addBtnText}>Add Guest</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Side</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {SIDES.map(s => (
            <TouchableOpacity
              key={s}
              testID={`filter-side-${s.toLowerCase()}`}
              style={[styles.filterChip, sideFilter === s && styles.filterChipActive]}
              onPress={() => setSideFilter(s)}
            >
              <Text style={[styles.filterChipText, sideFilter === s && styles.filterChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.filterLabel, { marginTop: Spacing.sm }]}>Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {GROUPS.map(g => (
            <TouchableOpacity
              key={g}
              testID={`filter-group-${g.toLowerCase()}`}
              style={[styles.filterChip, groupFilter === g && styles.filterChipActive]}
              onPress={() => setGroupFilter(g)}
            >
              <Text style={[styles.filterChipText, groupFilter === g && styles.filterChipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGuests(); }} tintColor={Colors.brand.maroon} />}
          showsVerticalScrollIndicator={false}
        >
          {guests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color={Colors.brand.goldMuted} />
              <Text style={styles.emptyTitle}>No Guests Yet</Text>
              <Text style={styles.emptyText}>Start adding guests to your list</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {guests.map((guest, idx) => (
                <TouchableOpacity
                  key={guest.id || idx}
                  testID={`guest-item-${idx}`}
                  style={styles.guestCard}
                  onPress={() => router.push({ pathname: '/add-guest', params: { guestId: guest.id, edit: '1' } })}
                >
                  <View style={[styles.avatar, { backgroundColor: getSideBadgeColor(guest.side) + '20' }]}>
                    <Text style={[styles.avatarText, { color: getSideBadgeColor(guest.side) }]}>
                      {guest.name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{guest.name}</Text>
                    <View style={styles.guestTags}>
                      <View style={[styles.tag, { backgroundColor: getSideBadgeColor(guest.side) + '20' }]}>
                        <Text style={[styles.tagText, { color: getSideBadgeColor(guest.side) }]}>
                          {guest.side?.charAt(0)?.toUpperCase() + guest.side?.slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: Colors.background.secondary }]}>
                        <Text style={styles.tagTextMuted}>
                          {guest.group?.charAt(0)?.toUpperCase() + guest.group?.slice(1)}
                        </Text>
                      </View>
                      {guest.status && STATUS_CONFIG[guest.status] && (
                        <View style={[styles.tag, { backgroundColor: STATUS_CONFIG[guest.status].color + '18' }]}>
                          <Ionicons name={STATUS_CONFIG[guest.status].icon as any} size={12} color={STATUS_CONFIG[guest.status].color} />
                          <Text style={[styles.tagText, { color: STATUS_CONFIG[guest.status].color, marginLeft: 2 }]}>
                            {STATUS_CONFIG[guest.status].label}
                          </Text>
                        </View>
                      )}
                      {guest.room_required && (
                        <View style={[styles.tag, { backgroundColor: Colors.brand.goldMuted }]}>
                          <Ionicons name="bed-outline" size={12} color={Colors.brand.gold} />
                          <Text style={[styles.tagText, { color: Colors.brand.gold, marginLeft: 2 }]}>Room</Text>
                        </View>
                      )}
                      {guest.room_type && guest.room_type !== 'none' && (
                        <View style={[styles.tag, { backgroundColor: Colors.brand.goldMuted }]}>
                          <Ionicons name="bed-outline" size={12} color={Colors.brand.gold} />
                          <Text style={[styles.tagText, { color: Colors.brand.gold, marginLeft: 2 }]}>
                            {guest.room_type.charAt(0).toUpperCase() + guest.room_type.slice(1)}
                          </Text>
                        </View>
                      )}
                      {(guest.guest_count ?? 1) > 1 && (
                        <View style={[styles.tag, { backgroundColor: Colors.ui.success + '18' }]}>
                          <Ionicons name="people-outline" size={12} color={Colors.ui.success} />
                          <Text style={[styles.tagText, { color: Colors.ui.success, marginLeft: 2 }]}>
                            {guest.guest_count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {user?.role === 'admin' && (
                    <TouchableOpacity testID={`guest-delete-${idx}`} onPress={() => deleteGuest(guest)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.ui.error} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  count: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.brand.maroon, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  addBtnText: { color: Colors.text.inverse, fontWeight: '600', fontSize: FontSizes.sm },
  filterSection: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  filterLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.text.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm, borderWidth: 1, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: Colors.brand.maroon + '10', borderColor: Colors.brand.maroon },
  filterChipText: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  filterChipTextActive: { color: Colors.brand.maroon, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  emptyText: { fontSize: FontSizes.md, color: Colors.text.secondary },
  guestCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSizes.lg, fontWeight: '700' },
  guestInfo: { flex: 1 },
  guestName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  guestTags: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  tagText: { fontSize: FontSizes.xs, fontWeight: '600' },
  tagTextMuted: { fontSize: FontSizes.xs, color: Colors.text.secondary },
  deleteBtn: { padding: Spacing.sm },
});
