import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AddBudgetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemId?: string; edit?: string }>();
  const isEdit = params.edit === '1';

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [planned, setPlanned] = useState('');
  const [actual, setActual] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    api.get('/events').then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && params.itemId) {
      api.get('/budget').then((data) => {
        const item = data.items?.find((i: any) => i.id === params.itemId);
        if (item) {
          setCategory(item.category || '');
          setDescription(item.description || '');
          setPlanned(item.planned_amount?.toString() || '');
          setActual(item.actual_amount?.toString() || '');
          setEventId(item.event_id || null);
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [isEdit, params.itemId]);

  const handleSave = async () => {
    if (!category.trim()) {
      Alert.alert('Required', 'Please enter a category');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        category: category.trim(),
        description: description || null,
        planned_amount: parseFloat(planned) || 0,
        actual_amount: parseFloat(actual) || 0,
        event_id: eventId || null,
      };
      if (isEdit && params.itemId) {
        await api.put(`/budget/${params.itemId}`, payload);
      } else {
        await api.post('/budget', payload);
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
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Budget Item' : 'New Budget Item'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <TextInput
                testID="budget-category-input"
                style={styles.input}
                placeholder="e.g., Venue, Catering, Decor"
                placeholderTextColor="#999"
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                testID="budget-description-input"
                style={styles.input}
                placeholder="Brief description"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Event Linking */}
            {events.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Linked Event (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    testID="budget-event-none"
                    style={[styles.eventChip, !eventId && styles.eventChipActive]}
                    onPress={() => setEventId(null)}
                  >
                    <Text style={[styles.eventChipText, !eventId && styles.eventChipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {events.map((ev: any) => (
                    <TouchableOpacity
                      key={ev.id}
                      testID={`budget-event-${ev.id}`}
                      style={[styles.eventChip, eventId === ev.id && styles.eventChipActive]}
                      onPress={() => setEventId(ev.id)}
                    >
                      <Text style={[styles.eventChipText, eventId === ev.id && styles.eventChipTextActive]}>
                        {ev.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Planned Amount</Text>
                <TextInput
                  testID="budget-planned-input"
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#999"
                  value={planned}
                  onChangeText={setPlanned}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Actual Amount</Text>
                <TextInput
                  testID="budget-actual-input"
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#999"
                  value={actual}
                  onChangeText={setActual}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              testID="save-budget-btn"
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Item' : 'Add Item'}</Text>
              )}
            </TouchableOpacity>
          </View>
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
  row: { flexDirection: 'row', gap: Spacing.md },
  eventChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm, borderWidth: 1, borderColor: 'transparent',
  },
  eventChipActive: { backgroundColor: Colors.brand.maroon + '15', borderColor: Colors.brand.maroon },
  eventChipText: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  eventChipTextActive: { color: Colors.brand.maroon, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
