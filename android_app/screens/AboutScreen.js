import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LuxeBackground from '../components/luxe/LuxeBackground';
import LuxeButton from '../components/luxe/LuxeButton';
import LuxeCard from '../components/luxe/LuxeCard';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../theme/colors';

const SECTIONS = [
    {
        title: 'Our mission',
        text: 'Turn your wardrobe into fewer, better outfits — with guidance you can actually use.',
    },
    {
        title: 'What makes it different',
        text: 'Wardrobe-first recommendations with “why it works” — so you learn your style, not just copy a look.',
    },
    {
        title: 'Designed to feel premium',
        text: 'No clutter. No endless boards. Just a clean flow that gets you dressed faster — and better.',
    },
    {
        title: 'Privacy-first',
        text: 'Your photos are private by default. You control what gets uploaded and processed, and when.',
    },
    {
        title: 'Coming soon',
        text:
            '• AI Try-On previews\n' +
            '• Concierge Stylist (human expert + AI co-pilot)\n' +
            '• Personalized shopping guide based on your personality + style\n' +
            '• And more — built with the same premium, privacy-first approach.',
    },
];

function Section({ title, children, progress, style }) {
    const opacity = progress;
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
            <LuxeCard style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionText}>{children}</Text>
            </LuxeCard>
        </Animated.View>
    );
}

export default function AboutScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isNarrow = width < 720;

    const fade = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(12)).current;
    const sectionProgress = useRef(SECTIONS.map(() => new Animated.Value(0))).current;

    const cardStyle = useMemo(() => ({ width: isNarrow ? '100%' : '49%' }), [isNarrow]);
    const centeredCardStyle = useMemo(
        () => ({ width: isNarrow ? '100%' : '62%', alignSelf: 'center' }),
        [isNarrow]
    );

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
        ]).start();

        Animated.stagger(
            100,
            sectionProgress.map((p) => Animated.timing(p, { toValue: 1, duration: 520, useNativeDriver: true }))
        ).start();
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
                            <Text style={styles.kicker}>DRIPDIRECTIVE</Text>
                            <Text style={styles.title}>About</Text>
                            <Text style={styles.subtitle}>
                                A luxury-minimal style studio that helps you decide what to wear — from what you already own.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.grid}>
                        {SECTIONS.map((s, idx) => (
                            // Center the last card when we have an odd count.
                            <Section
                                key={s.title}
                                title={s.title}
                                progress={sectionProgress[idx]}
                                style={idx === SECTIONS.length - 1 ? centeredCardStyle : cardStyle}
                            >
                                {s.text}
                            </Section>
                        ))}
                    </View>

                    <View style={styles.promise}>
                        <Text style={styles.promiseTitle}>Our promise</Text>
                        <Text style={styles.promiseText}>
                            Elegant UX, practical recommendations, and a calm experience that respects your time.
                        </Text>
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
    subtitle: {
        color: COLORS.textSecondary,
        marginTop: 8,
        lineHeight: 22,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    section: { padding: SPACING.xl, minHeight: 150 },
    sectionTitle: { color: COLORS.textAccent, fontWeight: '900', marginBottom: 8, letterSpacing: 0.2 },
    sectionText: { color: COLORS.textSecondary, lineHeight: 22 },
    promise: {
        marginTop: SPACING.lg,
        backgroundColor: 'rgba(214, 177, 94, 0.08)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xl,
        ...SHADOWS.glow,
    },
    promiseTitle: { color: COLORS.textPrimary, fontWeight: '900', marginBottom: 6, fontSize: 16 },
    promiseText: { color: COLORS.textSecondary, lineHeight: 22 },
});
