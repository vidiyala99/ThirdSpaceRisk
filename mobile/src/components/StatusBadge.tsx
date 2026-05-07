import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  under_review: { label: 'Under Review', color: '#c8f000', bg: 'rgba(200,240,0,0.12)' },
  closed: { label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.15)',
  };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
