import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

const FILTERS = ['all', 'open', 'under_review', 'closed'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  open: 'Open',
  under_review: 'Under Review',
  closed: 'Closed',
};

interface Incident {
  id: number;
  summary: string;
  status: string;
  occurred_at: string;
  location: string;
}

export function IncidentListScreen() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIncidents = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      const data = await api.request<Incident[]>(`/api/venues/${user.tenant_id}/incidents`);
      setIncidents(data);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8f000" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {FILTER_LABEL[f]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIncidents(); }} tintColor="#c8f000" />}
        ListEmptyComponent={<Text style={styles.empty}>No incidents</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
              <Text style={styles.date}>
                {new Date(item.occurred_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
            <View style={styles.rowBottom}>
              <StatusBadge status={item.status} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c15' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0c15' },
  filterBar: { flexGrow: 0, paddingTop: 16 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: { backgroundColor: 'rgba(200,240,0,0.12)', borderColor: '#c8f000' },
  filterText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#c8f000', fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  row: {
    backgroundColor: '#13151f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  location: { color: '#f9fafb', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  date: { color: '#4b5563', fontSize: 12 },
  summary: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  rowBottom: { flexDirection: 'row' },
  empty: { color: '#4b5563', textAlign: 'center', marginTop: 60, fontSize: 14 },
});
