import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';

interface Venue {
  id: string;
  name: string;
  venue_type?: string;
  address?: string;
  capacity?: number;
  renewal_date?: string;
  current_carrier?: string;
}

export function BrokerVenuesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVenues = searchQuery.trim()
    ? venues.filter(v => {
        const q = searchQuery.toLowerCase();
        return v.name.toLowerCase().includes(q)
          || v.address?.toLowerCase().includes(q)
          || v.venue_type?.toLowerCase().includes(q);
      })
    : venues;

  const fetchVenues = useCallback(async () => {
    try {
      const data = await api.request<Venue[]>('/api/venues');
      setVenues(Array.isArray(data) ? data : []);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchVenues(); }, [fetchVenues]));

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#c8f000" /></View>;
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>INSURED PORTFOLIO</Text>
        <Text style={styles.title}>Venues</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues..."
          placeholderTextColor="#4a4f65"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.sectionEyebrow}>
        {searchQuery.trim()
          ? `${filteredVenues.length} OF ${venues.length} VENUES`
          : `${venues.length} VENUES`}
      </Text>

      <FlatList
        data={filteredVenues}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchVenues(); }}
            tintColor="#c8f000"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate('VenueDetail', { venueId: item.id, venueName: item.name })}
          >
            {item.venue_type && (
              <Text style={styles.venueType}>{item.venue_type.toUpperCase()}</Text>
            )}
            <Text style={styles.venueName}>{item.name}</Text>
            {!!item.address && (
              <Text style={styles.venueAddress} numberOfLines={1}>{item.address}</Text>
            )}
            <View style={styles.metaRow}>
              {!!item.capacity && (
                <Text style={styles.metaItem}>CAP {item.capacity.toLocaleString()}</Text>
              )}
              {!!item.renewal_date && (
                <Text style={styles.metaItem}> · Renewal {item.renewal_date}</Text>
              )}
            </View>
            <Text style={styles.viewDetail}>View details →</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? 'No matches' : 'No venues'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery.trim()
                ? `No venues match "${searchQuery}".`
                : 'Portfolio is empty.'}
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

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  eyebrow: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'JetBrainsMono_700Bold', marginBottom: 4 },
  title: { color: '#eeeef5', fontSize: 32, fontWeight: '800', letterSpacing: -1, fontFamily: 'CormorantGaramond_700Bold' },

  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#0d0f1c',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchIcon: { color: '#4a4f65', fontSize: 18 },
  searchInput: {
    flex: 1,
    color: '#eeeef5',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    paddingVertical: 0,
  },

  sectionEyebrow: { color: '#4a4f65', fontSize: 10, fontWeight: '700', letterSpacing: 2, paddingHorizontal: 20, marginBottom: 12, fontFamily: 'JetBrainsMono_700Bold' },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: '#0d0f1c',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    gap: 4,
  },
  venueType: { color: '#4a4f65', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'JetBrainsMono_700Bold' },
  venueName: { color: '#eeeef5', fontSize: 18, fontWeight: '700', letterSpacing: -0.3, fontFamily: 'DMSans_600SemiBold' },
  venueAddress: { color: '#4a4f65', fontSize: 11, fontFamily: 'DMSans_400Regular' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaItem: { color: '#8b90a8', fontSize: 11, fontFamily: 'JetBrainsMono_400Regular' },

  viewDetail: { color: '#c8f000', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, fontFamily: 'JetBrainsMono_700Bold', marginTop: 6 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: '#eeeef5', fontSize: 18, fontWeight: '700', fontFamily: 'DMSans_700Bold' },
  emptySub: { color: '#4a4f65', fontSize: 14, fontFamily: 'DMSans_400Regular' },
});
