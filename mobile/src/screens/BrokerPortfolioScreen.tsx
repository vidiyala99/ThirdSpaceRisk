import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TIER_COLOR: Record<string, string> = {
  A: '#c8f000',
  B: '#00d97e',
  C: '#ff9500',
  D: '#ff4557',
};

export function BrokerPortfolioScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await api.request<any[]>('/api/portfolio');
      setVenues(data);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  const totalVenues = venues.length;
  const avgScore = venues.length
    ? Math.round(venues.reduce((s, v) => s + (v.risk_score?.total_score ?? 0), 0) / venues.length)
    : 0;
  const pendingReviews = venues.reduce((s, v) => s + (v.open_incident_count ?? 0), 0);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>BROKER · THIRDSPACE RISK</Text>
        </View>
        <Text style={styles.signOut} onPress={signOut} accessibilityRole="button">SIGN OUT</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalVenues}</Text>
          <Text style={styles.statLabel}>VENUES</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#c8f000' }]}>{avgScore}</Text>
          <Text style={styles.statLabel}>AVG SCORE</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: pendingReviews > 0 ? '#ff9500' : '#c8f000' }]}>
            {pendingReviews}
          </Text>
          <Text style={styles.statLabel}>OPEN INC.</Text>
        </View>
      </View>

      <Text style={styles.sectionEyebrow}>PORTFOLIO — {totalVenues} VENUES</Text>

      <FlatList
        data={venues}
        keyExtractor={item => item.venue_id ?? item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPortfolio(); }} tintColor="#c8f000" />}
        renderItem={({ item }) => {
          const tier = item.risk_score?.tier ?? item.tier ?? '—';
          const score = item.risk_score?.total_score ?? item.total_score ?? 0;
          const tierColor = TIER_COLOR[tier] ?? '#4a4f65';
          const capacity = item.live?.current_capacity ?? 0;
          const maxCapacity = item.live?.max_capacity ?? 0;
          const capacityPct = maxCapacity > 0 ? capacity / maxCapacity : 0;

          return (
            <View style={[styles.venueCard, { borderLeftColor: tierColor }]}>
              <View style={styles.venueHeader}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{item.name ?? item.venue_id}</Text>
                  <Text style={styles.venueType}>{(item.venue_type ?? '').replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.tierBadge}>
                  <Text style={[styles.tierLetter, { color: tierColor }]}>{tier}</Text>
                  <Text style={[styles.tierScore, { color: tierColor }]}>{score}</Text>
                </View>
              </View>

              {maxCapacity > 0 && (
                <View style={styles.capacityRow}>
                  <View style={styles.capacityTrack}>
                    <View style={[styles.capacityFill, {
                      width: `${capacityPct * 100}%` as any,
                      backgroundColor: capacityPct > 0.85 ? '#ff4557' : capacityPct > 0.6 ? '#ff9500' : '#c8f000',
                    }]} />
                  </View>
                  <Text style={styles.capacityLabel}>{capacity} / {maxCapacity} pax</Text>
                </View>
              )}

              {(item.open_incident_count ?? 0) > 0 && (
                <View style={styles.incidentPill}>
                  <Text style={styles.incidentPillText}>{item.open_incident_count} open incident{item.open_incident_count > 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No venues</Text>
            <Text style={styles.emptySub}>Portfolio is empty.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080f' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  name: { color: '#eeeef5', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  role: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  signOut: { color: '#2e3247', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingTop: 6 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#0d0f1c',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { color: '#eeeef5', fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel: { color: '#4a4f65', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  sectionEyebrow: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  venueCard: {
    backgroundColor: '#0d0f1c',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
    padding: 16,
    gap: 10,
  },
  venueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  venueInfo: { flex: 1, gap: 3 },
  venueName: { color: '#eeeef5', fontSize: 16, fontWeight: '700' },
  venueType: { color: '#4a4f65', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  tierBadge: { alignItems: 'flex-end', gap: 0 },
  tierLetter: { fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 32 },
  tierScore: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  capacityRow: { gap: 6 },
  capacityTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  capacityFill: { height: '100%', borderRadius: 2 },
  capacityLabel: { color: '#4a4f65', fontSize: 11 },

  incidentPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,149,0,0.3)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  incidentPillText: { color: '#ff9500', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: '#eeeef5', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#4a4f65', fontSize: 14 },
});
