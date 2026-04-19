import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert, Switch
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const SIDES = ['bride', 'groom'];
const GROUPS = ['family', 'friends', 'vip'];
const STATUSES = ['invited', 'confirmed', 'declined'];

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  invited: { color: Colors.brand.gold, icon: 'mail-outline' },
  confirmed: { color: Colors.ui.success, icon: 'checkmark-circle-outline' },
  declined: { color: Colors.ui.error, icon: 'close-circle-outline' },
};

export default function AddGuestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ guestId?: string; edit?: string }>();
  const isEdit = params.edit === '1';

  const [name, setName] = useState('');
  const [side, setSide] = useState('bride');
  const [group, setGroup] = useState('family');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [roomRequired, setRoomRequired] = useState(false);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    api.get('/events').then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && params.guestId) {
      api.get('/guests').then((guests) => {
        const guest = guests.find((g: any) => g.id === params.guestId);
        if (guest) {
          setName(guest.name || '');
          setSide(guest.side || 'bride');
          setGroup(guest.group || 'family');
          setPhone(guest.phone || '');
          setNotes(guest.notes || '');
          setStatus(guest.status || null);
          setRoomRequired(guest.room_required || false);
          setEventIds(guest.event_ids || []);
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [isEdit, params.guestId]);

  const toggleEvent = (eventId: string) => {
    setEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the guest name');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        side,
        group,
        phone: phone || null,
        notes: notes || null,
        status: status || null,
        room_required: roomRequired,
        event_ids: eventIds,
      };
      if (isEdit && params.guestId) {
        await api.put(`/guests/${params.guestId}`, payload);
      } else {
        await api.post('/guests', payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Guest' : 'New Guest'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Guest Name *</Text>
              <TextInput
                testID="guest-name-input"
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Side</Text>
              <View style={styles.chipRow}>
                {SIDES.map(s => (
                  <TouchableOpacity
                    key={s}
                    testID={`side-${s}`}
                    style={[styles.chip, side === s && styles.chipActive]}
                    onPress={() => setSide(s)}
                  >
                    <Text style={[styles.chipText, side === s && styles.chipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Group</Text>
              <View style={styles.chipRow}>
                {GROUPS.map(g => (
                  <TouchableOpacity
                    key={g}
                    testID={`group-${g}`}
                    style={[styles.chip, group === g && styles.chipActive]}
                    onPress={() => setGroup(g)}
                  >
                    <Text style={[styles.chipText, group === g && styles.chipTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* RSVP Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>RSVP Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  const isActive = status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      testID={`status-${s}`}
                      style={[styles.statusChip, isActive && { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}
                      onPress={() => setStatus(isActive ? null : s)}
                    >
                      <Ionicons name={cfg.icon as any} size={16} color={isActive ? cfg.color : Colors.text.secondary} />
                      <Text style={[styles.statusChipText, isActive && { color: cfg.color, fontWeight: '700' }]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Room Required */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.label}>Room Required</Text>
                <Text style={styles.hint}>Does this guest need accommodation?</Text>
              </View>
              <Switch
                testID="room-required-switch"
                value={roomRequired}
                onValueChange={setRoomRequired}
                trackColor={{ false: Colors.ui.border, true: Colors.brand.maroon + '50' }}
                thumbColor={roomRequired ? Colors.brand.maroon : '#f4f3f4'}
              />
            </View>

            {/* Event Tagging */}
            {events.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Invited to Events</Text>
                <Text style={styles.hint}>Select which events this guest is invited to</Text>
                {events.map((ev: any) => {
                  const isTagged = eventIds.includes(ev.id);
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      testID={`event-tag-${ev.id}`}
                      style={[styles.eventTag, isTagged && styles.eventTagActive]}
                      onPress={() => toggleEvent(ev.id)}
                    >
                      <Ionicons
                        name={isTagged ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isTagged ? Colors.brand.maroon : Colors.text.secondary}
                      />
                      <View style={styles.eventTagInfo}>
                        <Text style={[styles.eventTagName, isTagged && styles.eventTagNameActive]}>{ev.name}</Text>
                        {ev.date && <Text style={styles.eventTagDate}>{ev.date}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone (Optional)</Text>
              <TextInput
                testID="guest-phone-input"
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                testID="guest-notes-input"
                style={[styles.input, styles.textArea]}
                placeholder="Any special notes..."
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              testID="save-guest-btn"
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Guest' : 'Add Guest'}</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  form: { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  inputGroup: { gap: Spacing.xs },
  label: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text.primary, marginLeft: Spacing.xs },
  hint: { fontSize: FontSizes.xs, color: Colors.text.secondary, marginLeft: Spacing.xs },
  input: {
    backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56, paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md, color: Colors.text.primary,
  },
  textArea: { height: 100, paddingTop: Spacing.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: Colors.brand.maroon + '15', borderColor: Colors.brand.maroon },
  chipText: { fontSize: FontSizes.md, color: Colors.text.secondary, fontWeight: '500' },
  chipTextActive: { color: Colors.brand.maroon, fontWeight: '700' },
  statusChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary, borderWidth: 1, borderColor: 'transparent',
  },
  statusChipText: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.ui.border,
  },
  eventTag: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.card, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.ui.border,
    marginTop: Spacing.xs,
  },
  eventTagActive: { borderColor: Colors.brand.maroon, backgroundColor: Colors.brand.maroon + '08' },
  eventTagInfo: { flex: 1 },
  eventTagName: { fontSize: FontSizes.md, color: Colors.text.primary },
  eventTagNameActive: { fontWeight: '600', color: Colors.brand.maroon },
  eventTagDate: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
