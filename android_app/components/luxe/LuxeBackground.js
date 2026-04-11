import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';

/**
 * Luxury minimal background with subtle gold warmth.
 * Use as the first child in a screen container.
 */
export default function LuxeBackground({ children }) {
    return (
        <View style={styles.root}>
            <LinearGradient
                colors={[COLORS.background, COLORS.backgroundLight, COLORS.backgroundCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Subtle warm highlight */}
            <LinearGradient
                colors={['rgba(214, 177, 94, 0.14)', 'rgba(214, 177, 94, 0.00)']}
                style={styles.topGlow}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
            />

            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    topGlow: {
        position: 'absolute',
        top: -120,
        left: -80,
        right: -80,
        height: 280,
        borderRadius: 220,
    },
});
