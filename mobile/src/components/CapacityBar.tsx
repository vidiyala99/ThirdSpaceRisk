import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  value: number;
  max?: number;
  unit?: string;
}

function barColor(pct: number) {
  if (pct < 0.6) return '#c8f000';
  if (pct < 0.85) return '#f59e0b';
  return '#ef4444';
}

export function CapacityBar({ label, value, max = 100, unit = '' }: Props) {
  const pct = Math.min(value / max, 1);
  const color = barColor(pct);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {value}{unit}{max !== 100 ? ` / ${max}${unit}` : ''}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#9ca3af', fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});
