import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { CapacityBar } from '../components/CapacityBar';

const TIER_COLOR: Record<string, string> = {
  A: '#c8f000', B: '#00d97e', C: '#ff9500', D: '#ff4557',
};

const STATUS_DOT: Record<string, string> = {
  operational: '#c8f000', active: '#c8f000', degraded: '#ff9500', down: '#ff4557',
};

export function BrokerVenueDetailScreen({ route, navigation }: any) {
  const { venueId, venueName } = route.params;
  const insets = useSafeAreaInsets();
  const [live, setLive] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [liveRaw, riskData, quoteData] = await Promise.all([
        api.request<any>(`/api/venues/${venueId}/live`),
        api.request<any>(`/api/venues/${venueId}/risk-score`).catch(() => null),
        api.request<any>(`/api/venues/${venueId}/quote`).catch(() => null),
      ]);

      let infra: { name: string; status: string; detail?: string; is_degraded?: boolean }[] = [];
      if (Array.isArray(liveRaw.infrastructure)) {
        infra = liveRaw.infrastructure.map((i: any) => ({
          name: String(i.name ?? ''), status: String(i.status ?? ''),
          detail: i.detail ? String(i.detail) : undefined, is_degraded: Boolean(i.is_degraded),
        }));
      } else if (liveRaw.infrastructure && typeof liveRaw.infrastructure === 'object') {
        infra = Object.entries(liveRaw.infrastructure).map(([k, v]: [string, any]) => ({
          name: typeof v === 'object' ? String(v.name ?? k) : k,
          status: typeof v === 'object' ? String(v.status ?? '') : String(v),
          detail: typeof v === 'object' && v.detail ? String(v.detail) : undefined,
          is_degraded: typeof v === 'object' ? Boolean(v.is_degraded) : false,
        }));
      }

      if (riskData?.factors) {
        const norm: Record<string, number> = {};
        for (const [k, v] of Object.entries(riskData.factors)) {
          norm[k] = typeof v === 'object' && v !== null ? Number((v as any).score ?? 0) : Number(v);
        }
        riskData.factors = norm;
      }

      const queue = (liveRaw.compliance_queue ?? []).map((item: any) => ({
        action: String(item.action ?? item.title ?? ''),
        priority: String(item.priority ?? item.severity ?? 'low').toLowerCase(),
      }));

      setLive({ ...liveRaw, infrastructure: infra, compliance_queue: queue });
      setRisk(riskData);
      setQuote(quoteData);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#c8f000" /></View>;

  const tier = risk?.tier ?? '—';
  const tierColor = TIER_COLOR[tier] ?? '#4a4f65';
  const capacityPct = live ? live.current_capacity / live.max_capacity : 0;
  const factors: Record<string, number> = risk?.factors ?? {};
  const savingsAnnual = quote?.savings_annual ?? 0;
  const renewalDate = quote?.renewal_date ?? null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      {/* Back */}
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel}>Portfolio</Text>
      </Pressable>

      {/* Header: LIVE TERMINAL + venue name + LIVE badge */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEyebrow}>LIVE TERMINAL</Text>
            <Text style={styles.venueName}>{venueName}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
            {renewalDate && <Text style={styles.renewalDate}>{renewalDate}</Text>}
          </View>
        </View>
      </View>

      {/* Live Occupancy — prominent, first */}
      {live && (
        <View style={[styles.card, capacityPct > 0.85 && styles.cardDanger]}>
          <View style={styles.occupancyHeader}>
            <Text style={styles.eyebrow}>LIVE OCCUPANCY</Text>
            <Text style={[styles.occupancyNumbers, { color: capacityPct > 0.85 ? '#ff4557' : '#ff9500' }]}>
              {live.current_capacity} / {live.max_capacity}
            </Text>
          </View>
          <CapacityBar label="" value={live.current_capacity} max={live.max_capacity} />
        </View>
      )}

      {/* Risk Profile card */}
      {risk && (
        <Pressable
          style={({ pressed }) => [styles.card, { borderColor: `${tierColor}22` }, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('RiskProfileDetail', { riskData: risk, quoteData: quote, venueName, isBroker: true })}
        >
          <View style={styles.riskHeader}>
            <Text style={styles.eyebrow}>RISK PROFILE</Text>
            <View style={[styles.tierBadge, { borderColor: tierColor }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>TIER {tier}</Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreBig, { color: tierColor }]}>{risk.total_score}</Text>
            <Text style={styles.scoreMax}> / 100</Text>
          </View>
          {Object.keys(factors).length > 0 && (
            <View style={styles.factorList}>
              {Object.entries(factors).map(([key, val]) => (
                <CapacityBar key={key} label={key.replace(/_/g, ' ').toUpperCase()} value={Number(val)} max={100} invertScale />
              ))}
            </View>
          )}
          <Text style={styles.tapHint}>→ View full risk analysis</Text>
        </Pressable>
      )}

      {/* Premium card with market rate comparison */}
      {quote && (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>PREMIUM</Text>
          <Text style={styles.premiumAmount}>${(quote.annual_premium ?? 0).toLocaleString()}<Text style={styles.premiumPer}> / Year</Text></Text>
          <Text style={styles.premiumMonthly}>${(quote.monthly_premium ?? 0).toLocaleString()} / month</Text>

          {savingsAnnual > 0 && (
            <View style={styles.savingsBox}>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsLabel}>MARKET RATE</Text>
                <Text style={styles.savingsValue}>${(quote.market_rate_annual ?? 0).toLocaleString()}/yr</Text>
              </View>
              <View style={styles.savingsRow}>
                <Text style={[styles.savingsLabel, { color: '#c8f000' }]}>CLIENT SAVES</Text>
                <Text style={[styles.savingsValue, { color: '#c8f000', fontWeight: '700' }]}>
                  ${savingsAnnual.toLocaleString()}/yr ({quote.savings_pct}%)
                </Text>
              </View>
            </View>
          )}

          <View style={styles.premiumMeta}>
            <Text style={styles.premiumMetaText}>↗ {tier} Tier Rate</Text>
            {renewalDate && <Text style={styles.premiumMetaText}>⊡ Renewal {renewalDate}</Text>}
          </View>
        </View>
      )}

      {/* Infrastructure */}
      {live?.infrastructure?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>INFRASTRUCTURE SYNC</Text>
          {live.infrastructure.some((i: any) => i.is_degraded) && (
            <View style={styles.degradedWarning}>
              <Text style={styles.degradedText}>⚠ Degraded systems weaken claims defense.</Text>
            </View>
          )}
          {live.infrastructure.map((item: any, i: number) => {
            const dotColor = item.is_degraded ? '#ff9500' : (STATUS_DOT[item.status.toLowerCase()] ?? '#4a4f65');
            return (
              <View key={i} style={styles.infraRow}>
                <View style={[styles.infraDot, { backgroundColor: dotColor }]} />
                <Text style={styles.infraName}>{item.name}</Text>
                <Text style={[styles.infraStatus, { color: dotColor }]}>
                  {item.detail ? `${item.status.toUpperCase()} ${item.detail}` : item.status.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Compliance Queue */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COMPLIANCE QUEUE</Text>
        {(!live?.compliance_queue || live.compliance_queue.length === 0) ? (
          <Text style={styles.complianceClear}>{'>'} No pending actions. All clear.</Text>
        ) : live.compliance_queue.map((item: any, i: number) => {
          const pColor = item.priority === 'high' || item.priority === 'urgent' ? '#ff4557' : item.priority === 'medium' ? '#ff9500' : '#4a4f65';
          return (
            <View key={i} style={[styles.queueRow, { borderLeftColor: pColor }]}>
              <Text style={styles.queueAction}>{item.action}</Text>
              <Text style={[styles.queuePriority, { color: pColor }]}>{item.priority.toUpperCase()}</Text>
            </View>
          );
        })}
      </View>

      {/* Coverage Breakdown */}
      {quote?.coverage_breakdown && (
        <View style={styles.card}>
          <Text style={styles.eyebrow}>COVERAGE</Text>
          {Object.entries(quote.coverage_breakdown).map(([key, val]: [string, any]) => {
            const isIncluded = val.included === true;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const statusText = isIncluded ? 'INCLUDED' : val.optional ? 'OPTIONAL' : '—';
            return (
              <View key={key} style={styles.coverageRow}>
                <Text style={styles.coverageName}>{label}</Text>
                <Text style={[styles.coverageStatus, { color: isIncluded ? '#c8f000' : '#4a4f65' }]}>{statusText}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080f' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backArrow: { color: '#c8f000', fontSize: 18 },
  backLabel: { color: '#c8f000', fontSize: 13, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },

  header: { marginBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, gap: 4 },
  headerEyebrow: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'JetBrainsMono_700Bold' },
  venueName: { color: '#eeeef5', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, fontFamily: 'CormorantGaramond_700Bold' },
  liveBadge: {
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(200,240,0,0.3)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(200,240,0,0.06)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c8f000' },
  liveBadgeText: { color: '#c8f000', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'JetBrainsMono_700Bold' },
  renewalDate: { color: '#4a4f65', fontSize: 9, fontFamily: 'JetBrainsMono_400Regular' },

  card: {
    backgroundColor: '#0d0f1c', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 16, marginBottom: 12, gap: 12,
  },
  cardDanger: { borderColor: 'rgba(255,69,87,0.25)', backgroundColor: 'rgba(255,69,87,0.04)' },
  eyebrow: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'JetBrainsMono_700Bold' },

  occupancyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  occupancyNumbers: { fontSize: 18, fontWeight: '800', fontFamily: 'JetBrainsMono_700Bold' },

  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'JetBrainsMono_700Bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreBig: { fontSize: 48, fontWeight: '800', letterSpacing: -2, fontFamily: 'JetBrainsMono_700Bold' },
  scoreMax: { color: '#4a4f65', fontSize: 18, fontFamily: 'DMSans_400Regular' },
  factorList: { gap: 14 },
  tapHint: { color: '#4a4f65', fontSize: 11, fontFamily: 'JetBrainsMono_400Regular' },

  premiumAmount: { color: '#eeeef5', fontSize: 36, fontWeight: '800', letterSpacing: -1, fontFamily: 'JetBrainsMono_700Bold' },
  premiumPer: { color: '#4a4f65', fontSize: 16, fontWeight: '400', fontFamily: 'DMSans_400Regular' },
  premiumMonthly: { color: '#4a4f65', fontSize: 14, fontFamily: 'JetBrainsMono_400Regular' },
  savingsBox: {
    backgroundColor: 'rgba(200,240,0,0.04)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,240,0,0.15)', borderRadius: 8, padding: 12, gap: 8,
  },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  savingsLabel: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'JetBrainsMono_700Bold' },
  savingsValue: { color: '#8b90a8', fontSize: 12, fontFamily: 'JetBrainsMono_400Regular' },
  premiumMeta: { flexDirection: 'row', gap: 16 },
  premiumMetaText: { color: '#4a4f65', fontSize: 11, fontFamily: 'JetBrainsMono_400Regular' },

  degradedWarning: {
    backgroundColor: 'rgba(255,149,0,0.08)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,149,0,0.3)', borderRadius: 8, padding: 10,
  },
  degradedText: { color: '#ff9500', fontSize: 12, fontFamily: 'JetBrainsMono_400Regular' },

  infraRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.04)' },
  infraDot: { width: 7, height: 7, borderRadius: 4, marginRight: 12 },
  infraName: { color: '#8b90a8', fontSize: 13, flex: 1, textTransform: 'capitalize', fontFamily: 'DMSans_400Regular' },
  infraStatus: { fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: 'JetBrainsMono_700Bold' },

  complianceClear: { color: '#4a4f65', fontSize: 13, fontFamily: 'JetBrainsMono_400Regular' },
  queueRow: { borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 4, gap: 2 },
  queueAction: { color: '#8b90a8', fontSize: 13, lineHeight: 18, fontFamily: 'DMSans_400Regular' },
  queuePriority: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, fontFamily: 'JetBrainsMono_700Bold' },

  coverageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  coverageName: { color: '#8b90a8', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  coverageStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'JetBrainsMono_700Bold' },
});
