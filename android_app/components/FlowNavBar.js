import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

const routeIcons = {
  Me: 'person-outline',
  Profile: 'person-outline',
  UserImages: 'image-outline',
  Wardrobe: 'shirt-outline',
  Recommendations: 'sparkles-outline',
  VibeSync: 'color-palette-outline',
};

export default function FlowNavBar({ prev, next }) {
  const navigation = useNavigation();

  const go = (item) => {
    if (!item || item.enabled === false) return;
    if (item.route) navigation.navigate(item.route);
  };

  const prevEnabled = !!prev && prev.enabled !== false;
  const nextEnabled = !!next && next.enabled !== false;
  const prevIcon = routeIcons[prev?.route] || 'chevron-back';
  const nextIcon = routeIcons[next?.route] || 'chevron-forward';

  return (
    <View style={styles.wrap}>
      <View style={styles.container}>
        {prev ? (
          <TouchableOpacity
            style={[styles.ghostButton, !prevEnabled && styles.disabled]}
            onPress={() => go(prev)}
            activeOpacity={0.85}
            disabled={!prevEnabled}
          >
            <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
            <Ionicons name={prevIcon} size={16} color={COLORS.textSecondary} />
            <Text style={styles.ghostText} numberOfLines={1}>{prev.label}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        {next ? (
          <TouchableOpacity
            style={[styles.primaryButton, !nextEnabled && styles.disabled]}
            onPress={() => go(next)}
            activeOpacity={0.85}
            disabled={!nextEnabled}
          >
            <LinearGradient
              colors={nextEnabled ? COLORS.gradients.primary : [COLORS.surfaceLight, COLORS.surface]}
              style={styles.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryText} numberOfLines={1}>{next.label}</Text>
              <Ionicons name={nextIcon} size={16} color="#FFFAF4" />
              <Ionicons name="chevron-forward" size={16} color="#FFFAF4" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: { flex: 1 },
  disabled: { opacity: 0.45 },
  ghostButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    flexShrink: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  primaryGradient: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    flexShrink: 1,
    color: '#FFFAF4',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
