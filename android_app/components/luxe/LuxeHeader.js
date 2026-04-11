import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../theme/colors';

/**
 * Simple premium header block used inside ScrollViews.
 */
export default function LuxeHeader({
    kicker,
    title,
    subtitle,
    right,
    onBack,
    backLabel = 'Back',
    style,
}) {
    return (
        <View style={[styles.wrap, style]}>
            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
                    {!!title && <Text style={styles.title}>{title}</Text>}
                    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {!!right && <View style={styles.right}>{right}</View>}
            </View>

            {!!onBack && (
                <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.9}>
                    <Text style={styles.backText}>← {backLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    kicker: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 6,
        letterSpacing: -0.4,
    },
    subtitle: {
        color: COLORS.textSecondary,
        marginTop: 6,
        lineHeight: 20,
    },
    right: { alignItems: 'flex-end', justifyContent: 'flex-start' },
    back: {
        marginTop: SPACING.md,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    backText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 12 },
});
