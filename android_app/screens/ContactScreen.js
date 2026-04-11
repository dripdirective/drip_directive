import React, { useEffect, useRef } from 'react';
import { Animated, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LuxeBackground from '../components/luxe/LuxeBackground';
import LuxeButton from '../components/luxe/LuxeButton';
import LuxeCard from '../components/luxe/LuxeCard';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../theme/colors';

const open = async (url) => {
    try {
        if (Platform.OS === 'web') {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }
        await Linking.openURL(url);
    } catch {
        // ignore
    }
};

const ContactRow = ({ icon, title, subtitle, onPress }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
        <View style={styles.rowIcon}>
            <Text style={styles.rowIconText}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
        <Text style={styles.rowArrow}>→</Text>
    </Pressable>
);

export default function ContactScreen({ navigation }) {
    const fade = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
        ]).start();
    }, []);

    return (
        <LuxeBackground>
            <Animated.View style={[styles.wrap, { opacity: fade, transform: [{ translateY: y }] }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    <View style={styles.headerRow}>
                        <View style={styles.logoBox}>
                            <Image
                                source={require('../assets/dripdirective_logo.jpg')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.kicker}>SUPPORT</Text>
                            <Text style={styles.title}>Contact</Text>
                            <Text style={styles.subtitle}>We usually respond within 24–48 hours.</Text>
                        </View>
                    </View>

                    <LuxeCard style={styles.card}>
                        <Text style={styles.cardTitle}>Get in touch</Text>
                        <ContactRow
                            icon="✉️"
                            title="Email"
                            subtitle="dripdirectiveai@gmail.com"
                            onPress={() => open('mailto:dripdirectiveai@gmail.com')}
                        />
                        <ContactRow
                            icon="📷"
                            title="Instagram"
                            subtitle="@dripdirectiveai"
                            onPress={() => open('https://www.instagram.com/dripdirectiveai')}
                        />
                        <ContactRow
                            icon="▶️"
                            title="YouTube"
                            subtitle="@DripDirective"
                            onPress={() => open('https://www.youtube.com/@DripDirective')}
                        />
                    </LuxeCard>

                    <View style={styles.note}>
                        <Text style={styles.noteTitle}>Tip</Text>
                        <Text style={styles.noteText}>Include your account email and a screenshot for faster help.</Text>
                    </View>

                    <View style={{ height: SPACING.lg }} />
                    <LuxeButton title="Back" variant="ghost" leftIcon="←" onPress={() => navigation.goBack()} />
                    <View style={{ height: 120 }} />
                </ScrollView>
            </Animated.View>
        </LuxeBackground>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1 },
    scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: 32 },
    headerRow: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'flex-start', marginBottom: SPACING.lg },
    logoBox: {
        width: 72,
        height: 72,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        backgroundColor: 'rgba(214, 177, 94, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: { width: 56, height: 56 },
    kicker: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 30,
        fontWeight: '900',
        marginTop: 6,
    },
    subtitle: { color: COLORS.textSecondary, marginTop: 8 },
    card: {},
    cardTitle: { color: COLORS.textAccent, fontWeight: '900', marginBottom: SPACING.md },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    rowIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(214, 177, 94, 0.08)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        marginRight: SPACING.md,
    },
    rowIconText: {
        fontSize: 18,
    },
    rowTitle: { color: COLORS.textPrimary, fontWeight: '800' },
    rowSub: { color: COLORS.textSecondary, marginTop: 3 },
    rowArrow: { color: COLORS.textMuted, fontWeight: '900', marginLeft: SPACING.md },
    note: {
        marginTop: SPACING.md,
        backgroundColor: 'rgba(214, 177, 94, 0.06)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.glow,
    },
    noteTitle: { color: COLORS.textPrimary, fontWeight: '900', marginBottom: 6 },
    noteText: { color: COLORS.textSecondary, lineHeight: 22 },
});
