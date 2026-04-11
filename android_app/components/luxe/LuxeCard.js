import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../theme/colors';

/**
 * Standard luxury surface card.
 */
export default function LuxeCard({ children, style, padded = true }) {
    return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.sm,
    },
    padded: {
        padding: SPACING.lg,
    },
});
