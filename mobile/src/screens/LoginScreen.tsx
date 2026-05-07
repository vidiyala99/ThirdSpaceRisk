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
      Alert.alert('Login failed', e.message ?? 'Invalid credentials');
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
        <Text style={styles.wordmark}>ThirdSpace</Text>
        <Text style={styles.subtitle}>Risk Operations</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#4b5563"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#4b5563"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0b0c15" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.hint}>venue@elsewhere.com / demo123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c15' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  wordmark: {
    color: '#c8f000',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 48 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f9fafb',
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#c8f000',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0b0c15', fontWeight: '700', fontSize: 15 },
  hint: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 32 },
});
