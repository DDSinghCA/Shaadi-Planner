import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const SIDES = ['bride', 'groom'];
const GROUPS = ['family', 'friends', 'vip'];

export default function AddGuestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ guestId?: string; edit?: string }>();
  const isEdit = params.edit === '1';

  const [name, setName] = useState('');
  const [side, setSide] = useState('bride');
  const [group, setGroup] = useState('family');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

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
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [isEdit, params.guestId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the guest name');
      return;
    }
    setLoading(true);
    try {
      const payload = { name: name.trim(), side, group, phone: phone || null, notes: notes || null };
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
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
