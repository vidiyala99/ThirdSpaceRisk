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

interface FormState {
  summary: string;
  location: string;
  reported_by: string;
  injury_observed: boolean;
  police_called: boolean;
  ems_called: boolean;
}

export function ReportIncidentScreen() {
  const { user } = useAuth();
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
        body: JSON.stringify({
          ...form,
          occurred_at: new Date().toISOString(),
        }),
      });

      for (const uri of images) {
        const fd = new FormData();
        fd.append('file', { uri, name: 'evidence.jpg', type: 'image/jpeg' } as any);
        await api.upload(`/api/incidents/${incident.id}/evidence`, fd);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Incident reported successfully.');
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Report Incident</Text>

        <Label>Summary</Label>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe what happened…"
          placeholderTextColor="#4b5563"
          multiline
          numberOfLines={4}
          value={form.summary}
          onChangeText={v => set('summary', v)}
        />

        <Label>Location</Label>
        <TextInput
          style={styles.input}
          placeholder="e.g. Main Bar, Room 3"
          placeholderTextColor="#4b5563"
          value={form.location}
          onChangeText={v => set('location', v)}
        />

        <Label>Reported By</Label>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#4b5563"
          value={form.reported_by}
          onChangeText={v => set('reported_by', v)}
        />

        <View style={styles.toggleSection}>
          <ToggleRow label="Injury observed" value={form.injury_observed} onChange={v => set('injury_observed', v)} />
          <ToggleRow label="Police called" value={form.police_called} onChange={v => set('police_called', v)} />
          <ToggleRow label="EMS called" value={form.ems_called} onChange={v => set('ems_called', v)} />
        </View>

        <Label>Evidence</Label>
        <View style={styles.evidenceRow}>
          <Pressable style={styles.evidenceBtn} onPress={() => pickImage('camera')}>
            <Text style={styles.evidenceBtnText}>Camera</Text>
          </Pressable>
          <Pressable style={styles.evidenceBtn} onPress={() => pickImage('library')}>
            <Text style={styles.evidenceBtnText}>Gallery</Text>
          </Pressable>
        </View>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>
        )}

        <Pressable style={[styles.submitBtn, submitting && styles.submitDisabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#0b0c15" /> : <Text style={styles.submitText}>Submit Report</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#1f2937', true: 'rgba(200,240,0,0.4)' }}
        thumbColor={value ? '#c8f000' : '#4b5563'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c15' },
  content: { padding: 20, paddingBottom: 48 },
  heading: { color: '#f9fafb', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f9fafb',
    fontSize: 14,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  toggleSection: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    marginTop: 16,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  toggleLabel: { color: '#d1d5db', fontSize: 14 },
  evidenceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  evidenceBtn: {
    flex: 1,
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  evidenceBtnText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  thumbScroll: { marginTop: 10 },
  thumb: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  submitBtn: {
    backgroundColor: '#c8f000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#0b0c15', fontWeight: '700', fontSize: 15 },
});
