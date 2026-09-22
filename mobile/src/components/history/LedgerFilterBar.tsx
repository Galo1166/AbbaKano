import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';
import { TransactionType, TransactionStatus } from '@/constants/mockData';

interface LedgerFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export const LedgerFilterBar: React.FC<LedgerFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
}) => {
  const categories = [
    { key: 'ALL', label: 'All Services' },
    { key: 'DATA', label: 'Data Bundles' },
    { key: 'AIRTIME', label: 'Airtime' },
    { key: 'ELECTRICITY', label: 'Electricity' },
    { key: 'CABLE_TV', label: 'Cable TV' },
    { key: 'FUND_WALLET', label: 'Wallet Funding' },
  ];

  const statuses = [
    { key: 'ALL', label: 'All Status' },
    { key: 'SUCCESSFUL', label: 'Successful' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'FAILED', label: 'Failed' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Palette.onSurfaceMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={Palette.onSurfaceMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={Palette.onSurfaceMuted} />
          </Pressable>
        )}
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {categories.map((c) => {
          const isSelected = selectedCategory === c.key;
          return (
            <Pressable
              key={c.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectCategory(c.key)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {statuses.map((s) => {
          const isSelected = selectedStatus === s.key;
          return (
            <Pressable
              key={s.key}
              style={[styles.statusChip, isSelected && styles.statusChipSelected]}
              onPress={() => onSelectStatus(s.key)}
            >
              <Text style={[styles.statusChipText, isSelected && styles.statusChipTextSelected]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.three,
  },
  searchBox: {
    height: 44,
    borderRadius: Rounded.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.twoAndHalf,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: Spacing.two,
    color: Palette.onSurface,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Rounded.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryContainer,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: 4,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statusChipSelected: {
    backgroundColor: Palette.surfaceHigh,
    borderColor: Palette.borderHigh,
  },
  statusChipText: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
  },
  statusChipTextSelected: {
    color: Palette.primaryLight,
    fontWeight: '700',
  },
});
