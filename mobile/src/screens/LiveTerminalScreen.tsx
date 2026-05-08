import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { CapacityBar } from '../components/CapacityBar';

interface LiveData {
  current_capacity: number;
  max_capacity: number;
  infrastructure: Record<string, string>;
  compliance_queue: Array<{ action: string; priority: string }>;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
};

const STATUS_DOT: Record<string, string> = {
  operational: '#c8f000',
  degraded: '#f59e0b',
  down: '#ef4444',
};

export function LiveTerminalScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLive = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      const live = await api.request<LiveData>(`/api/venues/${user.tenant_id}/live`);
      setData(live);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLive]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No live data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Live Terminal</Text>
        <View style={styles.liveDot} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Capacity</Text>
        <CapacityBar
          label="Current"
          value={data.current_capacity}
          max={data.max_capacity}
          unit=" pax"
        />
      </View>

      {Object.keys(data.infrastructure).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Infrastructure</Text>
          {Object.entries(data.infrastructure).map(([name, status]) => (
            <View key={name} style={styles.infraRow}>
              <View style={[styles.dot, { backgroundColor: STATUS_DOT[status] ?? '#6b7280' }]} />
              <Text style={styles.infraName}>{name.replace(/_/g, ' ')}</Text>
              <Text style={[styles.infraStatus, { color: STATUS_DOT[status] ?? '#6b7280' }]}>{status}</Text>
            </View>
          ))}
        </View>
      )}

      {data.compliance_queue.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Compliance Queue</Text>
          {data.compliance_queue.map((item, i) => (
            <View key={i} style={styles.queueRow}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[item.priority] ?? '#6b7280' }]} />
              <Text style={styles.queueAction}>{item.action}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c15' },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0c15' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  heading: { color: '#f9fafb', fontSize: 22, fontWeight: '700' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c8f000' },
  card: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
  infraRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  infraName: { color: '#d1d5db', fontSize: 13, flex: 1 },
  infraStatus: { fontSize: 12, fontWeight: '600' },
  queueRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  queueAction: { color: '#9ca3af', fontSize: 13, flex: 1, lineHeight: 18 },
  empty: { color: '#4b5563', fontSize: 14 },
});
