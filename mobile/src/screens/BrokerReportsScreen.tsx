import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'all' | 'needs_review' | 'approved' | 'blocked';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff4557',
  high: '#ff4557',
  medium: '#ff9500',
  low: '#c8f000',
  unknown: '#4a4f65',
};

const STATUS_COLOR: Record<string, string> = {
  needs_review: '#ff9500',
  approved: '#00d97e',
  blocked: '#ff4557',
  draft: '#4a4f65',
  processing: '#5b8af5',
};

export function BrokerReportsScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [packets, setPackets] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackets = useCallback(async () => {
    try {
      const data = await api.request<any[]>('/api/packets?limit=50');
      setPackets(data);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPackets(); }, [fetchPackets]);

  const filtered = filter === 'all' ? packets : packets.filter(p => p.status === filter);

  const counts = {
    needs_review: packets.filter(p => p.status === 'needs_review').length,
    approved: packets.filter(p => p.status === 'approved').length,
    blocked: packets.filter(p => p.status === 'blocked').length,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.signOut} onPress={signOut}>SIGN OUT</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={[styles.statNum, { color: '#ff9500' }]}>{counts.needs_review}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statNum, { color: '#00d97e' }]}>{counts.approved}</Text>
            <Text style={styles.statLabel}>APPROVED</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={[styles.statNum, { color: '#ff4557' }]}>{counts.blocked}</Text>
            <Text style={styles.statLabel}>BLOCKED</Text>
          </View>
        </View>
        <View style={styles.filters}>
          {(['all', 'needs_review', 'approved', 'blocked'] as Filter[]).map(f => (
            <Pressable
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f === 'needs_review' ? 'Pending' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPackets(); }} tintColor="#c8f000" />}
        renderItem={({ item }) => {
          const severity = item.risk_signals?.severity ?? 'unknown';
          const severityColor = SEVERITY_COLOR[severity] ?? '#4a4f65';
          const statusColor = STATUS_COLOR[item.status] ?? '#4a4f65';
          const confidence = item.risk_signals?.confidence ?? 0;

          return (
            <View style={[styles.card, { borderLeftColor: severityColor }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardMeta}>
                  <Text style={styles.packetId}>{item.id}</Text>
                  <Text style={styles.venueId}>{item.venue_id}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: `${statusColor}44`, backgroundColor: `${statusColor}12` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status === 'needs_review' ? 'PENDING' : (item.status ?? '').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.signalRow}>
                <View style={[styles.severityPill, { backgroundColor: `${severityColor}15` }]}>
                  <Text style={[styles.severityText, { color: severityColor }]}>{severity.toUpperCase()}</Text>
                </View>
                <View style={styles.confidenceWrap}>
                  <View style={styles.confidenceTrack}>
                    <View style={[styles.confidenceFill, { width: `${confidence * 100}%` as any, backgroundColor: severityColor }]} />
                  </View>
                  <Text style={[styles.confidenceNum, { color: severityColor }]}>{Math.round(confidence * 100)}%</Text>
                </View>
              </View>

              {item.memo?.summary ? (
                <Text style={styles.memo} numberOfLines={2}>{item.memo.summary}</Text>
              ) : item.risk_signals?.explanation ? (
                <Text style={styles.memo} numberOfLines={2}>{item.risk_signals.explanation}</Text>
              ) : null}

              <Text style={styles.date}>
                {item.generated_at ? new Date(item.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : ''}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No packets</Text>
            <Text style={styles.emptySub}>
              {filter === 'all' ? 'No underwriting packets yet.' : `No ${filter.replace('_', ' ')} packets.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080f' },

  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  title: { color: '#eeeef5', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flex: 1,
    backgroundColor: '#0d0f1c',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: '#4a4f65', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  filters: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0d0f1c',
  },
  chipActive: { backgroundColor: '#c8f000', borderColor: '#c8f000' },
  chipText: { color: '#4a4f65', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#07080f' },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: '#0d0f1c',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { gap: 2 },
  packetId: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  venueId: { color: '#eeeef5', fontSize: 14, fontWeight: '700' },
  statusBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },

  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  severityText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  confidenceWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: { height: '100%', borderRadius: 2 },
  confidenceNum: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

  memo: { color: '#8b90a8', fontSize: 13, lineHeight: 18 },
  date: { color: '#2e3247', fontSize: 11 },

  signOut: { color: '#2e3247', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: '#eeeef5', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#4a4f65', fontSize: 14, textAlign: 'center' },
});
