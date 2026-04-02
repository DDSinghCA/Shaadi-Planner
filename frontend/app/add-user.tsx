import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ROLES = [
  { value: 'contributor', label: 'Contributor', desc: 'Can manage tasks & guests' },
  { value: 'viewer', label: 'Viewer', desc: 'Can view itinerary only' },
  { value: 'admin', label: 'Admin', desc: 'Full access to everything' },
];

export default function AddUserScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('contributor');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim() || !password.trim() || !name.trim()) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/users', {
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role,
      });
      Alert.alert('User Created', `${name} can now login with username "${username.trim().toLowerCase()}".\nThey will be asked to change their password on first login.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add User</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                testID="user-name-input"
                style={styles.input}
                placeholder="e.g., Priya Sharma"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                testID="user-username-input"
                style={styles.input}
                placeholder="e.g., priya"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Temporary Password *</Text>
              <TextInput
                testID="user-password-input"
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
              />
              <Text style={styles.hint}>User will change this on first login</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  testID={`role-${r.value}`}
                  style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                  onPress={() => setRole(r.value)}
                >
                  <View style={styles.roleLeft}>
                    <View style={[styles.radio, role === r.value && styles.radioActive]}>
                      {role === r.value && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>{r.label}</Text>
                      <Text style={styles.roleDesc}>{r.desc}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              testID="save-user-btn"
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText}>Create User</Text>
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
  hint: { fontSize: FontSizes.xs, color: Colors.text.secondary, marginLeft: Spacing.xs, fontStyle: 'italic' },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.ui.border,
    marginBottom: Spacing.xs,
  },
  roleCardActive: { borderColor: Colors.brand.maroon, backgroundColor: Colors.brand.maroon + '08' },
  roleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.ui.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.brand.maroon },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.maroon },
  roleLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  roleLabelActive: { color: Colors.brand.maroon },
  roleDesc: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
