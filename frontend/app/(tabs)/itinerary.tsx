import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, SafeAreaView, Alert, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { formatDisplayDate, openGoogleMaps } from '@/src/utils/dates';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ItineraryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events');
      setEvents(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchEvents();
    }, [fetchEvents])
  );

  const deleteEvent = (event: any) => {
    Alert.alert('Delete Event', `Delete "${event.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/events/${event.id}`);
            fetchEvents();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const handleLocationPress = (event: any) => {
    const url = event.maps_link || openGoogleMaps(event.location);
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const isPast = (date: string) => {
    return new Date(date + 'T23:59:59') < new Date();
  };

  const isToday = (date: string) => {
    return date === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Itinerary</Text>
        {user?.role === 'admin' && (
          <TouchableOpacity
            testID="add-event-btn"
            style={styles.addBtn}
            onPress={() => router.push('/add-event')}
          >
            <Ionicons name="add" size={22} color={Colors.text.inverse} />
            <Text style={styles.addBtnText}>Add Event</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor={Colors.brand.maroon} />}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={60} color={Colors.brand.goldMuted} />
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyText}>Add wedding events to your itinerary</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {events.map((event, idx) => {
              const past = isPast(event.date);
              const today = isToday(event.date);
              return (
                <View key={event.id || idx} style={styles.timelineItem} testID={`event-item-${idx}`}>
                  {/* Timeline line */}
                  <View style={styles.timelineLine}>
                    <View style={[
                      styles.timelineDot,
                      today && styles.dotToday,
                      past && styles.dotPast,
                    ]} />
                    {idx < events.length - 1 && <View style={[styles.timelineConnector, past && styles.connectorPast]} />}
                  </View>

                  {/* Event card */}
                  <TouchableOpacity
                    style={[styles.eventCard, past && styles.eventCardPast, today && styles.eventCardToday]}
                    onPress={() => user?.role === 'admin' ? router.push({ pathname: '/add-event', params: { eventId: event.id, edit: '1' } }) : null}
                    activeOpacity={user?.role === 'admin' ? 0.7 : 1}
                  >
                    {today && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>TODAY</Text>
                      </View>
                    )}
                    <Text style={[styles.eventDate, past && styles.pastText]}>
                      {formatDisplayDate(event.date)}
                    </Text>
                    <Text style={[styles.eventName, past && styles.pastText]}>{event.name}</Text>
                    {event.time && (
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={past ? Colors.text.secondary : Colors.brand.maroon} />
                        <Text style={[styles.infoText, past && styles.pastText]}>{event.time}</Text>
                      </View>
                    )}
                    {event.location && (
                      <TouchableOpacity
                        testID={`event-location-${idx}`}
                        style={styles.locationRow}
                        onPress={() => handleLocationPress(event)}
                      >
                        <Ionicons name="location" size={16} color={Colors.brand.gold} />
                        <Text style={[styles.locationText, past && styles.pastText]}>{event.location}</Text>
                        <Ionicons name="open-outline" size={14} color={Colors.brand.maroon} />
                      </TouchableOpacity>
                    )}
                    {event.notes && (
                      <Text style={[styles.notes, past && styles.pastText]}>{event.notes}</Text>
                    )}
                    {event.transport_notes && (
                      <View style={styles.transportBox}>
                        <Ionicons name="car-outline" size={14} color={Colors.brand.gold} />
                        <Text style={styles.transportText}>{event.transport_notes}</Text>
                      </View>
                    )}
                    {user?.role === 'admin' && (
                      <View style={styles.cardActions}>
                        <TouchableOpacity testID={`event-delete-${idx}`} onPress={() => deleteEvent(event)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={16} color={Colors.ui.error} />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
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
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  emptyText: { fontSize: FontSizes.md, color: Colors.text.secondary },
  timeline: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineLine: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.brand.gold, borderWidth: 3, borderColor: Colors.brand.goldLight,
    zIndex: 1,
  },
  dotToday: { backgroundColor: Colors.brand.maroon, borderColor: Colors.brand.maroonLight, width: 18, height: 18, borderRadius: 9 },
  dotPast: { backgroundColor: Colors.ui.border, borderColor: Colors.background.secondary },
  timelineConnector: {
    width: 2, flex: 1, backgroundColor: Colors.brand.goldLight, marginTop: -2,
  },
  connectorPast: { backgroundColor: Colors.ui.border },
  eventCard: {
    flex: 1, backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginLeft: Spacing.md,
    borderWidth: 1, borderColor: Colors.ui.border,
  },
  eventCardPast: { opacity: 0.6 },
  eventCardToday: { borderColor: Colors.brand.maroon, borderWidth: 2 },
  todayBadge: {
    backgroundColor: Colors.brand.maroon, paddingHorizontal: Spacing.sm,
    paddingVertical: 2, borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginBottom: Spacing.xs,
  },
  todayBadgeText: { color: Colors.text.inverse, fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 1 },
  eventDate: { fontSize: FontSizes.sm, color: Colors.brand.gold, fontWeight: '600', marginBottom: 4 },
  eventName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.sm },
  pastText: { color: Colors.text.secondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  infoText: { fontSize: FontSizes.sm, color: Colors.text.primary },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4,
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.brand.goldMuted + '60', borderRadius: BorderRadius.sm,
  },
  locationText: { flex: 1, fontSize: FontSizes.sm, color: Colors.brand.maroon, fontWeight: '500' },
  notes: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: Spacing.sm, fontStyle: 'italic' },
  transportBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.sm, backgroundColor: Colors.brand.goldMuted,
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
  },
  transportText: { fontSize: FontSizes.sm, color: Colors.text.primary, flex: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: Spacing.xs },
  deleteBtnText: { fontSize: FontSizes.sm, color: Colors.ui.error },
});
