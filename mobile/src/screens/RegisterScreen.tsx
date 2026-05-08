import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'venue_operator' | 'broker'>('venue_operator');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim(), role);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration failed', e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>RISK OS</Text>
          <Text style={styles.wordmark}>Create{'\n'}Account</Text>
          <Text style={styles.tagline}>Join the network.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#2e3247"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@venue.com"
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
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>I AM A</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[styles.roleBtn, role === 'venue_operator' && styles.roleBtnActive]}
                onPress={() => setRole('venue_operator')}
              >
                <Text style={[styles.roleBtnLabel, role === 'venue_operator' && styles.roleBtnLabelActive]}>
                  VENUE OPS
                </Text>
                <Text style={styles.roleBtnSub}>Venue Owner</Text>
              </Pressable>
              <Pressable
                style={[styles.roleBtn, role === 'broker' && styles.roleBtnActive]}
                onPress={() => setRole('broker')}
              >
                <Text style={[styles.roleBtnLabel, role === 'broker' && styles.roleBtnLabelActive]}>
                  BROKER
                </Text>
                <Text style={styles.roleBtnSub}>ThirdSpace Risk</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#07080f" />
            ) : (
              <Text style={styles.btnText}>CREATE ACCOUNT</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  inner: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48, gap: 40 },

  brandBlock: { gap: 6 },
  eyebrow: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 8,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  wordmark: {
    color: '#eeeef5',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 52,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  tagline: {
    color: '#c8f000',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 8,
    fontFamily: 'CormorantGaramond_600SemiBold_Italic',
  },

  form: { gap: 16 },
  inputWrap: { gap: 6 },
  inputLabel: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'JetBrainsMono_700Bold',
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
    fontFamily: 'DMSans_400Regular',
  },

  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,240,0,0.2)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 2,
  },
  roleBtnActive: {
    borderColor: '#c8f000',
    backgroundColor: 'rgba(200,240,0,0.06)',
  },
  roleBtnLabel: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  roleBtnLabelActive: { color: '#c8f000' },
  roleBtnSub: { color: '#4a4f65', fontSize: 12, fontFamily: 'DMSans_400Regular' },

  btn: {
    backgroundColor: '#c8f000',
    borderRadius: 10,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#07080f', fontWeight: '800', fontSize: 13, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold' },

  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { color: '#4a4f65', fontSize: 13, fontFamily: 'DMSans_400Regular' },
});
