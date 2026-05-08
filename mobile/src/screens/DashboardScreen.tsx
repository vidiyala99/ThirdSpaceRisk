import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { CapacityBar } from '../components/CapacityBar';

const TIER_COLOR: Record<string, string> = {
  A: '#c8f000',
  B: '#00d97e',
  C: '#ff9500',
  D: '#ff4557',
};

export function DashboardScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
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
      // Normalize factors to plain numbers so they never reach JSX as objects
      if (risk?.factors) {
        const normalized: Record<string, number> = {};
        for (const [k, v] of Object.entries(risk.factors)) {
          normalized[k] = typeof v === 'object' && v !== null ? Number((v as any).score ?? 0) : Number(v);
        }
        risk.factors = normalized;
      }
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

  if (user?.role === 'broker' || user?.role === 'admin') {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.venueName}>{user.name}</Text>
              <Text style={styles.venueLabel}>BROKER · THIRDSPACE RISK</Text>
            </View>
            <Text style={styles.signOut} onPress={signOut} accessibilityRole="button">SIGN OUT</Text>
          </View>
          <View style={[styles.tierCard, { borderColor: 'rgba(200,240,0,0.15)' }]}>
            <Text style={styles.sectionEyebrow}>PORTFOLIO ACCESS</Text>
            <Text style={[styles.tierGlyph, { color: '#c8f000', fontSize: 48, lineHeight: 56 }]}>
              Broker Portal
            </Text>
            <Text style={{ color: '#4a4f65', fontSize: 13, marginTop: 4 }}>
              Use the web portal to access the full portfolio, reports queue, and underwriting packets.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  const tier = riskData?.tier ?? '—';
  const score = riskData?.total_score ?? 0;
  const factors: Record<string, any> = riskData?.factors ?? {};
  const tierColor = TIER_COLOR[tier] ?? '#4a4f65';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c8f000" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.venueName}>{user?.name ?? 'Operator'}</Text>
          <Text style={styles.venueLabel}>RISK OPERATIONS</Text>
        </View>
        <Text style={styles.signOut} onPress={signOut} accessibilityRole="button">SIGN OUT</Text>
      </View>

      <View style={[styles.tierCard, { borderColor: `${tierColor}22` }]}>
        <Text style={styles.sectionEyebrow}>RISK TIER</Text>
        <View style={styles.tierRow}>
          <Text style={[styles.tierGlyph, { color: tierColor }]}>{tier}</Text>
          <View style={styles.tierMeta}>
            <Text style={[styles.tierScore, { color: tierColor }]}>{score}</Text>
            <Text style={styles.tierScoreMax}>/100</Text>
          </View>
        </View>
      </View>

      {quoteData && (
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>ANNUAL PREMIUM</Text>
          <Text style={styles.premiumAmount}>
            ${quoteData.annual_premium?.toLocaleString() ?? '—'}
          </Text>
          <Text style={styles.premiumSub}>
            ${quoteData.monthly_premium?.toLocaleString() ?? '—'} / month
          </Text>
        </View>
      )}

      {Object.keys(factors).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>RISK FACTORS</Text>
          <View style={styles.factorList}>
            {Object.entries(factors).map(([key, val]) => (
              <CapacityBar
                key={key}
                label={key.replace(/_/g, ' ').toUpperCase()}
                value={Number(val)}
                max={100}
                invertScale
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080f' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  venueName: { color: '#eeeef5', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  venueLabel: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  signOut: { color: '#2e3247', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingTop: 6 },

  tierCard: {
    backgroundColor: '#0d0f1c',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  tierRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 8 },
  tierGlyph: { fontSize: 96, fontWeight: '800', letterSpacing: -4, lineHeight: 96 },
  tierMeta: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingBottom: 10 },
  tierScore: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  tierScoreMax: { color: '#4a4f65', fontSize: 16, fontWeight: '500', paddingBottom: 2 },

  card: {
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#4a4f65',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },

  premiumAmount: { color: '#eeeef5', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  premiumSub: { color: '#4a4f65', fontSize: 13, marginTop: 4 },

  factorList: { gap: 16 },
});
