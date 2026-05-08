import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

const SEVERITY_COLOR: Record<string, string> = {
  urgent: '#ff4557',
  high: '#ff4557',
  medium: '#ff9500',
  low: '#4a4f65',
};

export function BrokerComplianceScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const portfolio = await api.request<any[]>('/api/portfolio');
      // Only show venues with compliance actions
      const withActions = portfolio.filter(v => (v.compliance_actions ?? 0) > 0);
      setVenues(withActions);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#c8f000" /></View>;
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Compliance</Text>
            <Text style={styles.subtitle}>Pending actions across portfolio</Text>
          </View>
          <Text style={styles.signOut} onPress={signOut}>SIGN OUT</Text>
        </View>
      </View>

      {venues.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySub}>No pending compliance actions across portfolio.</Text>
        </View>
      ) : (
        <FlatList
          data={venues}
          keyExtractor={item => item.venue_id ?? item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#c8f000" />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{item.name ?? item.venue_id}</Text>
                  <Text style={styles.venueType}>{(item.venue_type ?? '').replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countNum}>{item.compliance_actions}</Text>
                  <Text style={styles.countLabel}>PENDING</Text>
                </View>
              </View>

              {item.address ? (
                <Text style={styles.address}>{item.address}</Text>
              ) : null}

              {/* Compliance items from live state if available */}
              {Array.isArray(item.compliance_queue) && item.compliance_queue.length > 0 && (
                <View style={styles.itemList}>
                  {item.compliance_queue.map((q: any, i: number) => {
                    const sev = (q.severity ?? q.priority ?? 'low').toLowerCase();
                    const sevColor = SEVERITY_COLOR[sev] ?? '#4a4f65';
                    return (
                      <View key={i} style={[styles.queueItem, { borderLeftColor: sevColor }]}>
                        <Text style={styles.queueText}>{q.description ?? q.action ?? q.title ?? q.id}</Text>
                        <Text style={[styles.queueSev, { color: sevColor }]}>{sev.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080f' },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#eeeef5', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#4a4f65', fontSize: 13, marginTop: 4 },
  signOut: { color: '#8b90a8', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingTop: 6 },

  list: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  card: {
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  venueInfo: { flex: 1, gap: 3 },
  venueName: { color: '#eeeef5', fontSize: 16, fontWeight: '700' },
  venueType: { color: '#4a4f65', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  countBadge: { alignItems: 'center', backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  countNum: { color: '#ff9500', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  countLabel: { color: '#ff9500', fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
  address: { color: '#4a4f65', fontSize: 12 },

  itemList: { gap: 8 },
  queueItem: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 4, gap: 2 },
  queueText: { color: '#8b90a8', fontSize: 13, lineHeight: 18 },
  queueSev: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 10 },
  emptyIcon: { fontSize: 48, color: '#c8f000' },
  emptyTitle: { color: '#eeeef5', fontSize: 20, fontWeight: '700' },
  emptySub: { color: '#4a4f65', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
