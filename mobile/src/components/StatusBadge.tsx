import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open: { label: 'OPEN', color: '#ff9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.3)' },
  under_review: { label: 'REVIEW', color: '#5b8af5', bg: 'rgba(91,138,245,0.1)', border: 'rgba(91,138,245,0.3)' },
  closed: { label: 'CLOSED', color: '#00d97e', bg: 'rgba(0,217,126,0.08)', border: 'rgba(0,217,126,0.25)' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.toUpperCase(),
    color: '#8b90a8',
    bg: 'rgba(139,144,168,0.1)',
    border: 'rgba(139,144,168,0.2)',
  };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: 'JetBrainsMono_700Bold',
  },
});
