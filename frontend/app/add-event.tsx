import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/utils/api';
import { formatDisplayDate, toISODate, parseISODate } from '@/src/utils/dates';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AddEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; edit?: string }>();
  const isEdit = params.edit === '1';

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [transportNotes, setTransportNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isEdit && params.eventId) {
      api.get('/events').then((events) => {
        const event = events.find((e: any) => e.id === params.eventId);
        if (event) {
          setName(event.name || '');
          setDate(event.date || '');
          setTime(event.time || '');
          setLocation(event.location || '');
          setNotes(event.notes || '');
          setTransportNotes(event.transport_notes || '');
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [isEdit, params.eventId]);

  const handleDateConfirm = (selectedDate: Date) => {
    setDate(toISODate(selectedDate));
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter event name');
      return;
    }
    if (!date) {
      Alert.alert('Required', 'Please select a date');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(), date: date,
        time: time || null, location: location || null,
        notes: notes || null, transport_notes: transportNotes || null,
      };
      if (isEdit && params.eventId) {
        await api.put(`/events/${params.eventId}`, payload);
      } else {
        await api.post('/events', payload);
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
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Event' : 'New Event'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Name *</Text>
              <TextInput
                testID="event-name-input"
                style={styles.input}
                placeholder="e.g., Mehndi Ceremony"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  testID="event-date-picker"
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.brand.maroon} />
                  <Text style={[styles.datePickerText, !date && styles.placeholder]}>
                    {date ? formatDisplayDate(date) : 'Select'}
                  </Text>
                </TouchableOpacity>
                <DateTimePickerModal
                  isVisible={showDatePicker}
                  mode="date"
                  date={date ? parseISODate(date) : new Date()}
                  onConfirm={handleDateConfirm}
                  onCancel={() => setShowDatePicker(false)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  testID="event-time-input"
                  style={styles.input}
                  placeholder="e.g., 6:00 PM"
                  placeholderTextColor="#999"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                testID="event-location-input"
                style={styles.input}
                placeholder="Venue name or address"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
              />
              <Text style={styles.hint}>Tip: Enter a full address for Google Maps link in itinerary</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                testID="event-notes-input"
                style={[styles.input, styles.textArea]}
                placeholder="Event details..."
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Transport Notes</Text>
              <TextInput
                testID="event-transport-input"
                style={[styles.input, styles.textArea]}
                placeholder="Pickup points, bus arrangements..."
                placeholderTextColor="#999"
                value={transportNotes}
                onChangeText={setTransportNotes}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              testID="save-event-btn"
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Event' : 'Add Event'}</Text>
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
  input: {
    backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56, paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md, color: Colors.text.primary,
  },
  textArea: { height: 90, paddingTop: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56, paddingHorizontal: Spacing.lg,
  },
  datePickerText: { flex: 1, fontSize: FontSizes.md, color: Colors.text.primary },
  placeholder: { color: '#999' },
  hint: { fontSize: FontSizes.xs, color: Colors.text.secondary, marginLeft: Spacing.xs, fontStyle: 'italic' },
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
