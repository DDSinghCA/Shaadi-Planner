import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ImageBackground, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.force_password_change) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)/tasks');
      }
    }
  }, [user, authLoading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const loggedUser = await login(username.trim(), password);
      if (loggedUser.force_password_change) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)/tasks');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.brand.maroon} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="heart" size={32} color={Colors.brand.maroon} />
              </View>
            </View>
            <Text style={styles.title}>Shaadi Planner</Text>
            <Text style={styles.subtitle}>Your Wedding, Simplified</Text>
            <View style={styles.goldLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox} testID="login-error">
                <Ionicons name="alert-circle" size={18} color={Colors.ui.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  testID="login-username-input"
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  testID="toggle-password-btn"
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Made with love for your special day</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoContainer: { marginBottom: Spacing.lg },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.brand.goldMuted,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.brand.gold,
  },
  title: {
    fontSize: FontSizes.xxxl, fontWeight: '700',
    color: Colors.brand.maroon, letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSizes.md, color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  goldLine: {
    width: 60, height: 3, backgroundColor: Colors.brand.gold,
    marginTop: Spacing.md, borderRadius: 2,
  },
  form: { gap: Spacing.lg },
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
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56,
  },
  inputIcon: { marginLeft: Spacing.lg },
  input: {
    flex: 1, paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md, color: Colors.text.primary,
  },
  eyeBtn: { padding: Spacing.md },
  loginBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center',
    alignItems: 'center', marginTop: Spacing.md,
    shadowColor: Colors.brand.maroon, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: Colors.text.inverse, fontSize: FontSizes.lg,
    fontWeight: '600', letterSpacing: 0.5,
  },
  footer: {
    textAlign: 'center', color: Colors.text.secondary,
    fontSize: FontSizes.xs, marginTop: Spacing.xxxl,
  },
});
