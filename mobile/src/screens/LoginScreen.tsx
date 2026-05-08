import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Access denied', e.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>NYC NIGHTLIFE COVERAGE</Text>
          <Text style={styles.wordmark}>Third{'\n'}Space</Text>
          <Text style={styles.subtitle}>Risk Operations</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="operator@venue.com"
              placeholderTextColor="#2e3247"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#2e3247"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#07080f" />
            ) : (
              <Text style={styles.btnText}>SIGN IN</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>DEMO ACCESS</Text>
          <View style={styles.demoRow}>
            <Pressable
              style={({ pressed }) => [styles.demoBtn, pressed && styles.demoBtnPressed]}
              onPress={() => { setEmail('venue@elsewhere.com'); setPassword('demo123'); }}
            >
              <Text style={styles.demoBtnRole}>VENUE OPS</Text>
              <Text style={styles.demoBtnSub}>Elsewhere Brooklyn</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.demoBtn, pressed && styles.demoBtnPressed]}
              onPress={() => { setEmail('broker@thirdspace.risk'); setPassword('demo123'); }}
            >
              <Text style={styles.demoBtnRole}>BROKER</Text>
              <Text style={styles.demoBtnSub}>ThirdSpace Risk</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 },

  brandBlock: { gap: 6 },
  eyebrow: {
    color: '#c8f000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  wordmark: {
    color: '#eeeef5',
    fontSize: 60,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 58,
  },
  subtitle: {
    color: '#4a4f65',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 8,
  },

  form: { gap: 16 },
  inputWrap: { gap: 6 },
  inputLabel: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  input: {
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#eeeef5',
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#c8f000',
    borderRadius: 10,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#07080f', fontWeight: '800', fontSize: 13, letterSpacing: 1.5 },

  demoSection: { gap: 12 },
  demoLabel: {
    color: '#2e3247',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  demoRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,240,0,0.2)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 2,
  },
  demoBtnPressed: { backgroundColor: 'rgba(200,240,0,0.06)' },
  demoBtnRole: { color: '#c8f000', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  demoBtnSub: { color: '#4a4f65', fontSize: 12 },
});
