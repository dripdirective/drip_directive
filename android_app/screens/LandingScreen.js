import React, { useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    Easing,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LuxeBackground from '../components/luxe/LuxeBackground';
import LuxeButton from '../components/luxe/LuxeButton';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../theme/colors';

const TRUST_POINTS = [
    { t: 'Wardrobe-first', d: 'No random looks. Built from what you own.' },
    { t: 'AI profile', d: 'Use photos for fit + color harmony — only if you want.' },
    { t: 'Occasion-aware', d: 'Work, date, party, travel — tuned per prompt.' },
];

const FEATURES = [
    {
        t: 'Profiling',
        d: 'A quick vibe + preference profile so recommendations feel like you (not generic).',
        icon: '🧬',
    },
    {
        t: 'VibeSync',
        d: 'Answer a short quiz and explore curated style lanes that match your taste (no try-on required).',
        icon: '🧭',
    },
    {
        t: 'Wardrobe onboarding',
        d: 'Upload and analyze your pieces. See AI details for every garment so it’s easy to build outfits.',
        icon: '👚',
    },
    {
        t: 'Style AI Studio',
        d: 'Ask for an outfit like you’d ask a stylist. Get 3–5 looks with “why it works”.',
        icon: '✨',
    },
];

const HOW_IT_WORKS = [
    {
        t: 'Add your wardrobe',
        d: 'Upload a few pieces (start small). We analyze fabric, fit signals, and color families.',
    },
    {
        t: 'Tell us the vibe',
        d: 'Occasion + mood + constraints (weather, dress code, “no white sneakers”).',
    },
    {
        t: 'Get premium outfits',
        d: '3–5 looks with clear reasoning, swaps, and what to buy next (only if needed).',
    },
];

function SectionHeader({ kicker, title, subtitle }) {
    return (
        <View style={{ marginBottom: SPACING.md }}>
            {kicker ? <Text style={styles.sectionKicker}>{kicker}</Text> : null}
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
    );
}

function AnimatedCard({ progress, style, children }) {
    const opacity = progress;
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
    return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export default function LandingScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isNarrow = width < 720;

    const fade = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(10)).current;
    const sheen = useRef(new Animated.Value(0)).current;
    const logoGlow = useRef(new Animated.Value(0)).current;
    const logoSpin = useRef(new Animated.Value(0)).current;

    const featureProgress = useRef(FEATURES.map(() => new Animated.Value(0))).current;
    const howProgress = useRef(HOW_IT_WORKS.map(() => new Animated.Value(0))).current;
    const trustProgress = useRef(TRUST_POINTS.map(() => new Animated.Value(0))).current;

    const featureCardStyle = useMemo(
        () => [styles.feature, { width: isNarrow ? '100%' : '48%' }],
        [isNarrow]
    );

    const sectionCardStyle = useMemo(
        () => [styles.step, { width: isNarrow ? '100%' : '32.2%' }],
        [isNarrow]
    );

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
        ]).start();

        // Stagger in sections so the page feels alive.
        const staggered = [
            ...trustProgress.map((p) => Animated.timing(p, { toValue: 1, duration: 480, useNativeDriver: true })),
            ...featureProgress.map((p) => Animated.timing(p, { toValue: 1, duration: 520, useNativeDriver: true })),
            ...howProgress.map((p) => Animated.timing(p, { toValue: 1, duration: 520, useNativeDriver: true })),
        ];

        Animated.stagger(90, staggered).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(sheen, { toValue: 1, duration: 2600, useNativeDriver: true }),
                Animated.timing(sheen, { toValue: 0, duration: 2600, useNativeDriver: true }),
            ])
        ).start();

        // Subtle logo glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoGlow, { toValue: 1, duration: 1800, useNativeDriver: true }),
                Animated.timing(logoGlow, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        ).start();

        // Modern halo spin
        Animated.loop(
            Animated.timing(logoSpin, {
                toValue: 1,
                duration: 5200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const sheenX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-40, 240] });
    const logoAuraScale = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.06] });
    const logoAuraOpacity = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });
    const logoAuraRotate = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <LuxeBackground>
            <Animated.View style={[styles.wrap, { opacity: fade, transform: [{ translateY: y }] }]}>
                <View style={styles.topNav}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => navigation.navigate('About')} activeOpacity={0.9}>
                        <Text style={styles.navLink}>About</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Contact')} activeOpacity={0.9}>
                        <Text style={styles.navLink}>Contact</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    <View style={styles.heroCard}>
                        <View style={styles.heroRow}>
                            <View style={styles.heroRight}>
                                <View style={styles.logoWrap}>
                                    <Animated.View
                                        pointerEvents="none"
                                        style={[
                                            styles.logoAura,
                                            {
                                                opacity: logoAuraOpacity,
                                                transform: [{ scale: logoAuraScale }, { rotate: logoAuraRotate }],
                                            },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={[
                                                'rgba(214, 177, 94, 0.00)',
                                                'rgba(214, 177, 94, 0.55)',
                                                'rgba(255, 255, 255, 0.10)',
                                                'rgba(214, 177, 94, 0.25)',
                                                'rgba(214, 177, 94, 0.00)',
                                            ]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.logoAuraGrad}
                                        />
                                    </Animated.View>

                                    <View style={styles.logoBox}>
                                        <Image
                                            source={require('../assets/dripdirective_logo.jpg')}
                                            style={styles.logo}
                                            resizeMode="contain"
                                            accessibilityLabel="Dripdirective"
                                            onError={(e) => console.log('Logo load error', e?.nativeEvent)}
                                        />
                                    </View>
                                </View>

                                <Text style={styles.kicker}>STYLE STUDIO</Text>
                                <Text style={styles.title}>Dripdirective</Text>
                                <Text style={styles.subtitle}>
                                    Ask like you’d ask a stylist — get premium outfits from your own wardrobe, with clear “why it works”.
                                </Text>

                                <View style={styles.ctaRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.ctaGlowWrap}>
                                            <Animated.View
                                                pointerEvents="none"
                                                style={[
                                                    styles.ctaGlow,
                                                    {
                                                        opacity: logoAuraOpacity,
                                                        transform: [{ scale: logoAuraScale }],
                                                    },
                                                ]}
                                            >
                                                <LinearGradient
                                                    colors={[
                                                        'rgba(214, 177, 94, 0.00)',
                                                        'rgba(214, 177, 94, 0.55)',
                                                        'rgba(255, 255, 255, 0.12)',
                                                        'rgba(214, 177, 94, 0.35)',
                                                        'rgba(214, 177, 94, 0.00)',
                                                    ]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.ctaGlowGrad}
                                                />
                                            </Animated.View>

                                            <LuxeButton
                                                title="Enter AI Studio"
                                                rightIcon="→"
                                                onPress={() => navigation.navigate('Login')}
                                                style={{ width: '100%' }}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.storeRow}>
                                    <View style={styles.storeBadge}>
                                        <Text style={styles.storeIcon}></Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.storeSmall}>App Store</Text>
                                            <Text style={styles.storeBig}>Coming soon</Text>
                                        </View>
                                    </View>

                                    <View style={styles.storeBadge}>
                                        <Text style={styles.storeIcon}>▶</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.storeSmall}>Google Play</Text>
                                            <Text style={styles.storeBig}>Coming soon</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={{ height: SPACING.lg }} />

                        <View style={styles.trustRow}>
                            {TRUST_POINTS.map((x, idx) => (
                                <AnimatedCard key={x.t} progress={trustProgress[idx]} style={styles.trustPill}>
                                    <Text style={styles.trustTitle}>{x.t}</Text>
                                    <Text style={styles.trustDesc}>{x.d}</Text>
                                </AnimatedCard>
                            ))}
                        </View>

                        {/* Subtle gold sheen */}
                        <Animated.View style={[styles.sheen, { transform: [{ translateX: sheenX }] }]} />
                    </View>

                    <View style={styles.sectionWrap}>
                        <SectionHeader
                            kicker="WHAT YOU CAN DO"
                            title="What you get"
                            subtitle="Everything is designed to make decisions easier (and make your wardrobe more useful)."
                        />

                        <View style={styles.grid}>
                            {FEATURES.map((f, idx) => (
                                <AnimatedCard key={f.t} progress={featureProgress[idx]} style={featureCardStyle}>
                                    <View style={styles.featureTop}>
                                        <Text style={styles.featureIcon}>{f.icon}</Text>
                                        <Text style={styles.featureTitle}>{f.t}</Text>
                                    </View>
                                    <Text style={styles.featureDesc}>{f.d}</Text>
                                </AnimatedCard>
                            ))}
                        </View>
                    </View>

                    <View style={styles.sectionWrap}>
                        <SectionHeader
                            kicker="HOW IT WORKS"
                            title="Fewer steps. Better outfits."
                            subtitle="Start in minutes — the system gets smarter as you add pieces."
                        />

                        <View style={styles.stepsRow}>
                            {HOW_IT_WORKS.map((s, idx) => (
                                <AnimatedCard key={s.t} progress={howProgress[idx]} style={sectionCardStyle}>
                                    <Text style={styles.stepNum}>{String(idx + 1).padStart(2, '0')}</Text>
                                    <Text style={styles.stepTitle}>{s.t}</Text>
                                    <Text style={styles.stepDesc}>{s.d}</Text>
                                </AnimatedCard>
                            ))}
                        </View>
                    </View>

                    <View style={styles.bottomCtas}>
                        <Text style={styles.bottomTitle}>Ready to build your best fits?</Text>
                        <Text style={styles.bottomSub}>Start with 2–3 items. Generate looks. Learn what works — and why.</Text>
                    </View>

                    <Text style={styles.footer}>© {new Date().getFullYear()} Dripdirective</Text>
                    <View style={{ height: 120 }} />
                </ScrollView>
            </Animated.View>
        </LuxeBackground>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1 },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    navLink: {
        color: COLORS.textSecondary,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    scroll: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },
    sectionWrap: {
        marginTop: SPACING.xl,
    },
    sectionKicker: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.3,
        marginTop: 6,
    },
    sectionSubtitle: {
        color: COLORS.textSecondary,
        marginTop: 8,
        lineHeight: 21,
        maxWidth: 680,
    },
    heroCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    heroRow: {
        alignItems: 'center',
    },
    heroRight: { flex: 1, alignItems: 'center', width: '100%' },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        backgroundColor: 'rgba(214, 177, 94, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    logoAura: {
        position: 'absolute',
        width: 124,
        height: 124,
        borderRadius: 36,
        overflow: 'hidden',
    },
    logoAuraGrad: {
        flex: 1,
    },
    logo: { width: 66, height: 66 },
    kicker: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1,
        marginTop: 6,
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        marginTop: 10,
        lineHeight: 22,
        maxWidth: 520,
        textAlign: 'center',
        alignSelf: 'center',
    },
    ctaRow: {
        flexDirection: 'row',
        marginTop: SPACING.lg,
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
    },
    ctaGlowWrap: {
        width: '100%',
        borderRadius: BORDER_RADIUS.full,
        ...SHADOWS.glow,
    },
    ctaGlow: {
        position: 'absolute',
        inset: -6,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    ctaGlowGrad: {
        flex: 1,
    },
    storeRow: {
        marginTop: SPACING.lg,
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
        maxWidth: 520,
        justifyContent: 'center',
        alignSelf: 'center',
        opacity: 0.9,
    },
    storeBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    storeIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        textAlign: 'center',
        textAlignVertical: 'center',
        backgroundColor: 'rgba(214, 177, 94, 0.10)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        overflow: 'hidden',
        color: COLORS.textPrimary,
        fontWeight: '900',
    },
    storeSmall: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    storeBig: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '900',
        marginTop: 2,
    },
    trustRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    trustPill: {
        flexGrow: 1,
        minWidth: 200,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
    },
    trustTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 12, letterSpacing: 0.2 },
    trustDesc: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12, lineHeight: 18 },
    sheen: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 120,
        backgroundColor: 'rgba(214, 177, 94, 0.10)',
        transform: [{ skewX: '-18deg' }],
        opacity: 0.35,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    feature: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    featureTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    featureIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        textAlign: 'center',
        textAlignVertical: 'center',
        backgroundColor: 'rgba(214, 177, 94, 0.10)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        overflow: 'hidden',
    },
    featureTitle: { color: COLORS.textPrimary, fontWeight: '900', marginBottom: 6 },
    featureDesc: { color: COLORS.textSecondary, lineHeight: 20, fontSize: 12 },

    stepsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    step: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    stepNum: {
        color: COLORS.textAccent,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
        fontSize: 11,
    },
    stepTitle: {
        color: COLORS.textPrimary,
        fontWeight: '900',
        fontSize: 14,
    },
    stepDesc: {
        color: COLORS.textSecondary,
        marginTop: 8,
        lineHeight: 20,
        fontSize: 12,
    },
    bottomCtas: {
        marginTop: SPACING.lg,
        backgroundColor: 'rgba(214, 177, 94, 0.06)',
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xl,
        ...SHADOWS.glow,
    },
    bottomTitle: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 18 },
    bottomSub: { color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
    footer: {
        marginTop: SPACING.xl,
        textAlign: 'center',
        color: COLORS.textMuted,
        fontSize: 12,
    },
});
