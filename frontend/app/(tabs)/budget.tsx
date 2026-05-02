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

export default function BudgetScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [byEvent, setByEvent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBudget = useCallback(async () => {
    try {
      const [budgetRes, eventsRes] = await Promise.all([
        api.get('/budget'),
        api.get('/events'),
      ]);
      setData(budgetRes);
      setEvents(eventsRes);

      // Admin-only endpoint — fetch separately and fail-safe
      if (user?.role === 'admin') {
        try {
          const summaryRes = await api.get('/budget/by-event');
          setByEvent(Array.isArray(summaryRes) ? summaryRes : []);
        } catch (err) {
          console.log('by-event summary unavailable', err);
          setByEvent([]);
        }
      } else {
        setByEvent([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBudget();
    }, [fetchBudget])
  );

  const deleteItem = (item: any) => {
    Alert.alert('Delete Item', `Delete "${item.category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/budget/${item.id}`);
            fetchBudget();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const formatCurrency = (amt: number) => '\u20B9' + (amt || 0).toLocaleString('en-IN');

  const getEventName = (eventId: string | null | undefined) => {
    if (!eventId) return null;
    const ev = events.find((e: any) => e.id === eventId);
    return ev?.name || null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      </SafeAreaView>
    );
  }

  const isSummaryOnly = data?.summary_only;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
        {user?.role === 'admin' && (
          <TouchableOpacity
            testID="add-budget-btn"
            style={styles.addBtn}
            onPress={() => router.push('/add-budget')}
          >
            <Ionicons name="add" size={22} color={Colors.text.inverse} />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBudget(); }} tintColor={Colors.brand.maroon} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard} testID="budget-summary-card">
          <Text style={styles.summaryTitle}>Total Budget</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Planned</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(data?.total_planned)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Actual</Text>
              <Text style={[styles.summaryAmount, { color: Colors.ui.error }]}>{formatCurrency(data?.total_actual)}</Text>
            </View>
          </View>
          {data?.total_planned > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${Math.min((data.total_actual / data.total_planned) * 100, 100)}%` },
                  data.total_actual > data.total_planned && { backgroundColor: Colors.ui.error }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {Math.round((data.total_actual / data.total_planned) * 100)}% spent
              </Text>
            </View>
          )}
        </View>

        {/* Category Summary (for Contributors) */}
        {isSummaryOnly && data?.categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Category</Text>
            {data.categories.map((cat: any, idx: number) => (
              <View key={idx} style={styles.catCard} testID={`budget-category-${idx}`}>
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat.category}</Text>
                </View>
                <View style={styles.catAmounts}>
                  <Text style={styles.catPlanned}>Planned: {formatCurrency(cat.planned)}</Text>
                  <Text style={styles.catActual}>Spent: {formatCurrency(cat.actual)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* By Event Summary (Admin only) */}
        {!isSummaryOnly && byEvent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Event</Text>
            {byEvent.map((row: any, idx: number) => {
              const displayName =
                (row?.event_name && String(row.event_name).trim()) ||
                (row?.event_id ? `Event ${String(row.event_id).slice(-4)}` : 'Unlinked');
              const planned = row?.total_planned || 0;
              const actual = row?.total_actual || 0;
              const count = row?.item_count || 0;
              return (
                <View key={(row?.event_id || 'unlinked') + '-' + idx} style={styles.eventSummaryCard} testID={`budget-by-event-${idx}`}>
                  <View style={styles.eventSummaryHeader}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.brand.maroon} />
                    <Text style={styles.eventSummaryName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.eventSummaryCount}>{count} item{count === 1 ? '' : 's'}</Text>
                  </View>
                  <View style={styles.eventSummaryAmounts}>
                    <Text style={styles.eventSummaryPlanned}>Planned: {formatCurrency(planned)}</Text>
                    <Text style={styles.eventSummaryActual}>Spent: {formatCurrency(actual)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Line Items (for Admins) */}
        {!isSummaryOnly && data?.items?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Items</Text>
            {data.items.map((item: any, idx: number) => (
              <TouchableOpacity
                key={item.id || idx}
                testID={`budget-item-${idx}`}
                style={styles.itemCard}
                onPress={() => router.push({ pathname: '/add-budget', params: { itemId: item.id, edit: '1' } })}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.categoryBadge}>
                    <Ionicons name="pricetag" size={14} color={Colors.brand.gold} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    {item.description && <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>}
                    {getEventName(item.event_id) && (
                      <View style={styles.eventBadge}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.brand.maroon} />
                        <Text style={styles.eventBadgeText}>{getEventName(item.event_id)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPlanned}>{formatCurrency(item.planned_amount)}</Text>
                  <Text style={styles.itemActual}>{formatCurrency(item.actual_amount)}</Text>
                </View>
                {user?.role === 'admin' && (
                  <TouchableOpacity testID={`budget-delete-${idx}`} onPress={() => deleteItem(item)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.ui.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isSummaryOnly && (!data?.items || data.items.length === 0) && (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={60} color={Colors.brand.goldMuted} />
            <Text style={styles.emptyTitle}>No Budget Items</Text>
            <Text style={styles.emptyText}>Start tracking your wedding expenses</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.brand.maroon, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  addBtnText: { color: Colors.text.inverse, fontWeight: '600', fontSize: FontSizes.sm },
  summaryCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    backgroundColor: Colors.background.card, padding: Spacing.xl,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.ui.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text.secondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginBottom: 4 },
  summaryAmount: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  summaryDivider: { width: 1, height: 48, backgroundColor: Colors.ui.divider },
  progressContainer: { marginTop: Spacing.lg },
  progressBar: { height: 8, backgroundColor: Colors.background.secondary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brand.gold, borderRadius: 4 },
  progressText: { fontSize: FontSizes.xs, color: Colors.text.secondary, marginTop: 4, textAlign: 'right' },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md },
  catCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
  },
  catHeader: { marginBottom: Spacing.sm },
  catName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  catAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  catPlanned: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  catActual: { fontSize: FontSizes.sm, color: Colors.ui.error, fontWeight: '600' },
  eventSummaryCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
  },
  eventSummaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  eventSummaryName: { flex: 1, fontSize: FontSizes.md, fontWeight: '700', color: Colors.text.primary },
  eventSummaryCount: { fontSize: FontSizes.xs, color: Colors.text.secondary, fontWeight: '500' },
  eventSummaryAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  eventSummaryPlanned: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  eventSummaryActual: { fontSize: FontSizes.sm, color: Colors.ui.error, fontWeight: '600' },
  itemCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  categoryBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.brand.goldMuted, justifyContent: 'center',
    alignItems: 'center', marginRight: Spacing.md,
  },
  itemInfo: { flex: 1 },
  itemCategory: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  itemDesc: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  eventBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, backgroundColor: Colors.brand.maroon + '10',
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  eventBadgeText: { fontSize: FontSizes.xs, color: Colors.brand.maroon, fontWeight: '600' },
  itemRight: { alignItems: 'flex-end', marginRight: Spacing.sm },
  itemPlanned: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  itemActual: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text.primary },
  deleteBtn: { padding: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  emptyText: { fontSize: FontSizes.md, color: Colors.text.secondary },
});
