import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ChangePasswordScreen() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();
  const isForced = user?.force_password_change;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async () => {
    if (!isForced && !currentPassword.trim()) {
      setError('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/change-password', {
        current_password: isForced ? undefined : currentPassword,
        new_password: newPassword,
      });
      if (user) {
        updateUser({ ...user, force_password_change: false });
      }
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/tasks') }
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            {!isForced && (
              <TouchableOpacity
                testID="back-btn"
                onPress={() => router.back()}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            )}
            <View style={styles.iconWrap}>
              <Ionicons name="key" size={32} color={Colors.brand.maroon} />
            </View>
            <Text style={styles.title}>
              {isForced ? 'Set New Password' : 'Change Password'}
            </Text>
            {isForced && (
              <Text style={styles.subtitle}>
                You must change your password before continuing
              </Text>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox} testID="change-password-error">
              <Ionicons name="alert-circle" size={18} color={Colors.ui.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isForced && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                testID="current-password-input"
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              testID="new-password-input"
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              testID="confirm-password-input"
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            testID="change-password-submit-btn"
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleChange}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>

          {isForced && (
            <TouchableOpacity
              testID="logout-btn"
              style={styles.logoutBtn}
              onPress={logout}
            >
              <Text style={styles.logoutText}>Sign Out Instead</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: Spacing.sm },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.brand.goldMuted,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.brand.maroon },
  subtitle: {
    fontSize: FontSizes.sm, color: Colors.text.secondary,
    textAlign: 'center', marginTop: Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FEE8E8', padding: Spacing.md,
    borderRadius: BorderRadius.md, borderLeftWidth: 3, borderLeftColor: Colors.ui.error,
  },
  errorText: { color: Colors.ui.error, fontSize: FontSizes.sm, flex: 1 },
  inputGroup: { gap: Spacing.xs },
  label: {
    fontSize: FontSizes.sm, fontWeight: '600',
    color: Colors.text.primary, marginLeft: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background.card,
    borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md, color: Colors.text.primary,
  },
  submitBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center',
    alignItems: 'center', marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600',
  },
  logoutBtn: { alignItems: 'center', marginTop: Spacing.md },
  logoutText: { color: Colors.text.secondary, fontSize: FontSizes.md },
});
