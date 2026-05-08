import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FormState {
  summary: string;
  location: string;
  reported_by: string;
  injury_observed: boolean;
  police_called: boolean;
  ems_called: boolean;
}

export function ReportIncidentScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>({
    summary: '',
    location: '',
    reported_by: user?.name ?? '',
    injury_observed: false,
    police_called: false,
    ems_called: false,
  });
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function pickImage(source: 'camera' | 'library') {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  }

  async function submit() {
    if (!form.summary.trim() || !form.location.trim()) {
      Alert.alert('Required', 'Summary and location are required.');
      return;
    }
    setSubmitting(true);
    try {
      const incident = await api.request<{ id: number }>(`/api/venues/${user!.tenant_id}/incidents`, {
        method: 'POST',
        body: JSON.stringify({ ...form, occurred_at: new Date().toISOString() }),
      });

      for (const uri of images) {
        const fd = new FormData();
        fd.append('file', { uri, name: 'evidence.jpg', type: 'image/jpeg' } as any);
        await api.upload(`/api/incidents/${incident.id}/evidence`, fd);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Filed', 'Incident report submitted.');
      setForm({ summary: '', location: '', reported_by: user?.name ?? '', injury_observed: false, police_called: false, ems_called: false });
      setImages([]);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <Text style={[styles.heading, { marginBottom: 0 }]}>Report{'\n'}Incident</Text>
          <Text style={{ color: '#8b90a8', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingTop: 8, fontFamily: 'JetBrainsMono_700Bold' }} onPress={signOut}>SIGN OUT</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>WHAT HAPPENED</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe the incident…"
            placeholderTextColor="#2e3247"
            multiline
            numberOfLines={4}
            value={form.summary}
            onChangeText={v => set('summary', v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rear Bar, Stairwell B"
            placeholderTextColor="#2e3247"
            value={form.location}
            onChangeText={v => set('location', v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>REPORTED BY</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#2e3247"
            value={form.reported_by}
            onChangeText={v => set('reported_by', v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FLAGS</Text>
          <View style={styles.toggleCard}>
            <ToggleRow label="Injury observed" value={form.injury_observed} onChange={v => set('injury_observed', v)} />
            <ToggleRow label="Police called" value={form.police_called} onChange={v => set('police_called', v)} />
            <ToggleRow label="EMS called" value={form.ems_called} onChange={v => set('ems_called', v)} last />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EVIDENCE</Text>
          <View style={styles.evidenceRow}>
            <Pressable
              style={({ pressed }) => [styles.evidenceBtn, pressed && styles.evidenceBtnPressed]}
              onPress={() => pickImage('camera')}
            >
              <Text style={styles.evidenceBtnText}>CAMERA</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.evidenceBtn, pressed && styles.evidenceBtnPressed]}
              onPress={() => pickImage('library')}
            >
              <Text style={styles.evidenceBtnText}>GALLERY</Text>
            </Pressable>
          </View>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitPressed, submitting && styles.submitDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#07080f" />
            : <Text style={styles.submitText}>FILE REPORT</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({ label, value, onChange, last }: { label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleRowBorder]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.06)', true: 'rgba(200,240,0,0.35)' }}
        thumbColor={value ? '#c8f000' : '#2e3247'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  heading: {
    color: '#eeeef5',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 42,
    marginBottom: 32,
    fontFamily: 'CormorantGaramond_700Bold',
  },

  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  input: {
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#eeeef5',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },

  toggleCard: {
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  toggleLabel: { color: '#8b90a8', fontSize: 14, fontFamily: 'DMSans_500Medium' },

  evidenceRow: { flexDirection: 'row', gap: 10 },
  evidenceBtn: {
    flex: 1,
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  evidenceBtnPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  evidenceBtnText: { color: '#8b90a8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'JetBrainsMono_700Bold' },
  thumbScroll: { marginTop: 10 },
  thumb: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },

  submitBtn: {
    backgroundColor: '#c8f000',
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  submitPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#07080f', fontWeight: '800', fontSize: 13, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold' },
});
