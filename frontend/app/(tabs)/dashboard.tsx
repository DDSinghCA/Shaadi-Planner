import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { formatDisplayDate, isOverdue, isToday } from '@/src/utils/dates';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.maroon} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.maroon} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Namaste,</Text>
            <Text style={styles.userName}>{user?.name || user?.username}</Text>
          </View>
          <View style={styles.headerRight}>
            {user?.role === 'admin' && (
              <TouchableOpacity
                testID="manage-users-btn"
                onPress={() => router.push('/manage-users')}
                style={styles.iconBtn}
              >
                <Ionicons name="people-circle" size={28} color={Colors.brand.maroon} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="settings-btn"
              onPress={() => router.push('/change-password')}
              style={styles.iconBtn}
            >
              <Ionicons name="settings-outline" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="logout-btn"
              onPress={logout}
              style={styles.iconBtn}
            >
              <Ionicons name="log-out-outline" size={24} color={Colors.ui.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: Colors.brand.maroon }]}>
            <Text style={styles.statNumber}>{data?.my_tasks?.length || 0}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.brand.gold }]}>
            <Text style={styles.statNumber}>{data?.upcoming_events?.length || 0}</Text>
            <Text style={styles.statLabel}>Upcoming Events</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.ui.success }]}>
            <Text style={styles.statNumber}>{data?.guest_count || 0}</Text>
            <Text style={styles.statLabel}>Total Guests</Text>
          </View>
        </View>

        {/* Budget Summary */}
        {user?.role !== 'viewer' && data?.budget_summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
            <View style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Planned</Text>
                  <Text style={styles.budgetAmount}>
                    {'\u20B9'}{(data.budget_summary.total_planned || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Spent</Text>
                  <Text style={[styles.budgetAmount, { color: Colors.ui.error }]}>
                    {'\u20B9'}{(data.budget_summary.total_actual || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* My Pending Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pending Tasks</Text>
            <TouchableOpacity testID="view-all-tasks-btn" onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {data?.my_tasks?.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={40} color={Colors.brand.goldMuted} />
              <Text style={styles.emptyText}>All caught up! No pending tasks.</Text>
            </View>
          ) : (
            data?.my_tasks?.slice(0, 5).map((task: any, idx: number) => (
              <View key={task.id || idx} style={styles.taskCard} testID={`dashboard-task-${idx}`}>
                <View style={styles.taskLeft}>
                  <View style={[
                    styles.taskDot,
                    isOverdue(task.deadline) ? styles.dotOverdue :
                    isToday(task.deadline) ? styles.dotToday : styles.dotNormal
                  ]} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.deadline && (
                      <Text style={[
                        styles.taskDeadline,
                        isOverdue(task.deadline) && styles.overdue
                      ]}>
                        {isOverdue(task.deadline) ? 'Overdue: ' : isToday(task.deadline) ? 'Due today: ' : 'Due: '}
                        {formatDisplayDate(task.deadline)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity testID="view-all-events-btn" onPress={() => router.push('/(tabs)/itinerary')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {data?.upcoming_events?.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color={Colors.brand.goldMuted} />
              <Text style={styles.emptyText}>No upcoming events</Text>
            </View>
          ) : (
            data?.upcoming_events?.slice(0, 3).map((event: any, idx: number) => (
              <View key={event.id || idx} style={styles.eventCard} testID={`dashboard-event-${idx}`}>
                <View style={styles.eventDate}>
                  <Text style={styles.eventDay}>
                    {new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' })}
                  </Text>
                  <Text style={styles.eventMonth}>
                    {new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  {event.time && <Text style={styles.eventTime}>{event.time}</Text>}
                  {event.location && (
                    <Text style={styles.eventLocation}>
                      <Ionicons name="location-outline" size={12} color={Colors.text.secondary} /> {event.location}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  greeting: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  userName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: { padding: Spacing.xs },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.background.card, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statNumber: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  statLabel: { fontSize: FontSizes.xs, color: Colors.text.secondary, marginTop: 2 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text.primary },
  viewAll: { fontSize: FontSizes.sm, color: Colors.brand.maroon, fontWeight: '600' },
  budgetCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.ui.border,
  },
  budgetRow: { flexDirection: 'row', alignItems: 'center' },
  budgetItem: { flex: 1, alignItems: 'center' },
  budgetLabel: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginBottom: 4 },
  budgetAmount: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  budgetDivider: { width: 1, height: 40, backgroundColor: Colors.ui.divider },
  emptyCard: {
    backgroundColor: Colors.background.card, padding: Spacing.xl,
    borderRadius: BorderRadius.lg, alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
  },
  emptyText: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  taskCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md },
  dotNormal: { backgroundColor: Colors.brand.gold },
  dotToday: { backgroundColor: Colors.brand.maroon },
  dotOverdue: { backgroundColor: Colors.ui.error },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  taskDeadline: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  overdue: { color: Colors.ui.error, fontWeight: '600' },
  eventCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  eventDate: {
    width: 56, height: 56, borderRadius: BorderRadius.md,
    backgroundColor: Colors.brand.goldMuted, justifyContent: 'center',
    alignItems: 'center', marginRight: Spacing.lg,
  },
  eventDay: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.brand.maroon },
  eventMonth: { fontSize: FontSizes.xs, color: Colors.text.secondary, textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  eventTime: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  eventLocation: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
});
