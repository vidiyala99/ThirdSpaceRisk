import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { CapacityBar } from '../components/CapacityBar';

const TIER_COLOR: Record<string, string> = {
  A: '#c8f000',
  B: '#22d3ee',
  C: '#f59e0b',
  D: '#ef4444',
};

export function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [riskData, setRiskData] = useState<any>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      const [risk, quote] = await Promise.all([
        api.request<any>(`/api/venues/${user.tenant_id}/risk-score`),
        api.request<any>(`/api/venues/${user.tenant_id}/quote`),
      ]);
      setRiskData(risk);
      setQuoteData(quote);
    } catch {
      // data stays stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  const tier = riskData?.risk_tier ?? '—';
  const score = riskData?.overall_score ?? 0;
  const factors: Record<string, number> = riskData?.factors ?? {};

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c8f000" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good evening,</Text>
          <Text style={styles.name}>{user?.name ?? 'Operator'}</Text>
        </View>
        <Text style={styles.signOut} onPress={signOut}>Sign out</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Risk Tier</Text>
        <View style={styles.tierRow}>
          <Text style={[styles.tier, { color: TIER_COLOR[tier] ?? '#9ca3af' }]}>{tier}</Text>
          <Text style={styles.score}>{score.toFixed(0)} / 100</Text>
        </View>
      </View>

      {quoteData && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Premium Estimate</Text>
          <Text style={styles.premium}>
            ${quoteData.annual_premium?.toLocaleString() ?? '—'} / yr
          </Text>
          <Text style={styles.premiumSub}>
            ${quoteData.monthly_premium?.toLocaleString() ?? '—'} / mo
          </Text>
        </View>
      )}

      {Object.keys(factors).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Risk Factors</Text>
          {Object.entries(factors).map(([key, val]) => (
            <CapacityBar
              key={key}
              label={key.replace(/_/g, ' ')}
              value={val as number}
              max={100}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c15' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0c15' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: '#6b7280', fontSize: 13 },
  name: { color: '#f9fafb', fontSize: 20, fontWeight: '700' },
  signOut: { color: '#4b5563', fontSize: 13, paddingTop: 4 },
  card: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  cardLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  tierRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  tier: { fontSize: 56, fontWeight: '800', letterSpacing: -2 },
  score: { color: '#9ca3af', fontSize: 16 },
  premium: { color: '#c8f000', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  premiumSub: { color: '#6b7280', fontSize: 14, marginTop: 4 },
});
