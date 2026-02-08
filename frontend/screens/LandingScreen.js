import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Linking,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FontAwesome, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const openLink = async (url) => {
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

const FeatureCard = ({ icon, title, text }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconWrap}>
      <LinearGradient colors={COLORS.gradients.primary} style={styles.featureIconGrad}>
        <MaterialCommunityIcons name={icon} size={28} color={COLORS.textPrimary} />
      </LinearGradient>
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const FounderAvatar = ({ name }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  return (
    <View style={styles.avatar}>
      <LinearGradient colors={COLORS.gradients.accent} style={styles.avatarGrad}>
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>
    </View>
  );
};

const CustomModal = ({ visible, onClose, title, children }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 120,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
          <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}>
          {/* Glassmorphic Background */}
          {Platform.OS === 'web' ? (
            <LinearGradient colors={[COLORS.surface, COLORS.background]} style={StyleSheet.absoluteFill} />
          ) : (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          )}

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const AboutModal = ({ visible, onClose }) => (
  <CustomModal visible={visible} onClose={onClose} title="About Dripdirective">
    <View style={styles.modalSection}>
      <LinearGradient colors={COLORS.gradients.primary} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>What is Dripdirective?</Text>
      <Text style={styles.modalText}>
        Dripdirective is an AI-powered style assistant that helps you discover outfits from your own wardrobe.
        Upload your photos, add your clothes, and get personalized recommendations for any occasion.
      </Text>
    </View>

    <View style={styles.modalSection}>
      <LinearGradient colors={COLORS.gradients.accent} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="target" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>How it works</Text>

      {[
        { num: 1, title: 'Build your profile', desc: 'Tell us your body type, skin tone, location, and style preferences.' },
        { num: 2, title: 'Upload & analyze photos', desc: 'Upload a few photos and get an AI style profile with color recommendations.' },
        { num: 3, title: 'Add your wardrobe', desc: 'Upload images of your clothes. AI analyzes each item (color, style, fit).' },
        { num: 4, title: 'Ask for outfit ideas', desc: 'Describe what you need (e.g., "casual weekend", "work meeting") and get curated outfits.' }
      ].map((step, index) => (
        <View key={index} style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{step.num}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}
    </View>

    <View style={styles.modalSection}>
      <LinearGradient colors={['#FF9966', '#FF5E62']} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="sparkles" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>Features</Text>
      {[
        'AI-powered style analysis from your photos',
        'Smart outfit recommendations from your own wardrobe',
        'Virtual try-on to preview looks',
        'Personalized color and styling tips'
      ].map((feat, i) => (
        <View key={i} style={styles.bulletRow}>
          <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} style={{ marginTop: 2 }} />
          <Text style={styles.modalBullet}>{feat}</Text>
        </View>
      ))}
    </View>

    <View style={styles.modalSection}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="rocket-launch-outline" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>Coming Soon</Text>
      {[
        'iOS & Android mobile apps',
        'Advanced try-on with better quality',
        'Accessories & footwear recommendations',
        'Shopping links & capsule wardrobe builder'
      ].map((feat, i) => (
        <View key={i} style={styles.bulletRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textMuted} style={{ marginTop: 2 }} />
          <Text style={styles.modalBullet}>{feat}</Text>
        </View>
      ))}
    </View>
  </CustomModal>
);

const ContactModal = ({ visible, onClose }) => (
  <CustomModal visible={visible} onClose={onClose} title="Contact Us">
    <View style={styles.modalSection}>
      <LinearGradient colors={COLORS.gradients.primary} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="email-outline" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>Get in touch</Text>

      <TouchableOpacity style={styles.contactCard} onPress={() => openLink('mailto:dripdirectiveai@gmail.com')} activeOpacity={0.85}>
        <View style={styles.contactIconWrap}>
          <MaterialCommunityIcons name="email" size={24} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactLabel}>Email Support</Text>
          <Text style={styles.contactValue}>dripdirectiveai@gmail.com</Text>
        </View>
        <Feather name="arrow-right" size={20} color={COLORS.accentLight} />
      </TouchableOpacity>
    </View>

    <View style={styles.modalSection}>
      <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="share-variant-outline" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>Follow us</Text>

      <TouchableOpacity style={styles.contactCard} onPress={() => openLink('https://www.instagram.com/dripdirectiveai')} activeOpacity={0.85}>
        <View style={[styles.contactIconWrap, { backgroundColor: '#E1306C15', borderColor: '#E1306C30' }]}>
          <FontAwesome name="instagram" size={24} color="#E1306C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactLabel}>Instagram</Text>
          <Text style={styles.contactValue}>@dripdirectiveai</Text>
        </View>
        <Feather name="external-link" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactCard} onPress={() => openLink('https://www.youtube.com/@DripDirective')} activeOpacity={0.85}>
        <View style={[styles.contactIconWrap, { backgroundColor: '#FF000015', borderColor: '#FF000030' }]}>
          <FontAwesome name="youtube-play" size={24} color="#FF0000" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactLabel}>YouTube</Text>
          <Text style={styles.contactValue}>@DripDirective</Text>
        </View>
        <Feather name="external-link" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>

    <View style={styles.modalSection}>
      <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.sectionIconBg}>
        <MaterialCommunityIcons name="account-group-outline" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={styles.modalSectionTitle}>Founders</Text>

      <View style={styles.founderRow}>
        <FounderAvatar name="Tasnim Iram" />
        <View style={{ flex: 1 }}>
          <Text style={styles.founderName}>Tasnim Iram</Text>
          <TouchableOpacity
            style={styles.linkedInBtn}
            onPress={() => openLink('https://www.linkedin.com/in/tasnim-iram-55457822/')}
          >
            <FontAwesome name="linkedin-square" size={16} color="#0077B5" />
            <Text style={styles.founderLinkText}>Connect on LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.founderRow}>
        <FounderAvatar name="Suvom Shaw" />
        <View style={{ flex: 1 }}>
          <Text style={styles.founderName}>Suvom Shaw</Text>
          <TouchableOpacity
            style={styles.linkedInBtn}
            onPress={() => openLink('https://www.linkedin.com/in/suvomshaw/')}
          >
            <FontAwesome name="linkedin-square" size={16} color="#0077B5" />
            <Text style={styles.founderLinkText}>Connect on LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </CustomModal>
);

export default function LandingScreen({ navigation }) {
  const { isAuthenticated } = useAuth(); // Fix: Get isAuthenticated from context
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.14, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    );
    const blob1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, { toValue: 1, duration: 4500, useNativeDriver: true }),
        Animated.timing(blob1Anim, { toValue: 0, duration: 4500, useNativeDriver: true }),
      ])
    );
    const blob2Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(blob2Anim, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );

    floatLoop.start();
    glowLoop.start();
    blob1Loop.start();
    blob2Loop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
      blob1Loop.stop();
      blob2Loop.stop();
      pulseLoop.stop();
    };
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const blob1Y = blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const blob1X = blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const blob2Y = blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const blob2X = blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight, COLORS.backgroundCard]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
      <ContactModal visible={showContact} onClose={() => setShowContact(false)} />

      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
        {/* Top navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setShowAbout(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              style={styles.navBtnGrad}
            >
              <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#FFFFFF" />
              <Text style={styles.navBtnText}>About Us</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setShowContact(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.navBtnGrad}
            >
              <MaterialCommunityIcons name="card-account-mail" size={18} color="#FFFFFF" />
              <Text style={styles.navBtnText}>Contact</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Y }, { translateX: blob1X }] }]} />
            <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Y }, { translateX: blob2X }] }]} />

            <View style={styles.heroContent}>
              <Animated.View style={[styles.logoContainer, { transform: [{ scale: glowAnim }] }]}>
                <LinearGradient colors={COLORS.gradients.primary} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Image
                    source={require('../assets/dripdirective_logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="contain"
                    accessibilityLabel="Dripdirective"
                  />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.mainTitle}>Dripdirective</Text>
              <Animated.View style={[styles.taglineWrap, { transform: [{ translateY: floatY }] }]}>
                <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.taglineGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.tagline}>Your AI Style Companion</Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.heroDesc}>
                Discover personalized outfit ideas from your own wardrobe. Upload your photos, add your clothes, and let AI curate looks that match your vibe.
              </Text>

              <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', maxWidth: 320, alignItems: 'center' }}>
                <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
                  <LinearGradient colors={['#25D366', '#128C7E']} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.ctaText}>✨ Try Web App</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.appStoreRow}>
                <View style={styles.appStoreBadge}>
                  <MaterialCommunityIcons name="google-play" size={24} color={COLORS.textSecondary} />
                  <View>
                    <Text style={styles.appStoreSub}>Coming Soon</Text>
                    <Text style={styles.appStoreMain}>Google Play</Text>
                  </View>
                </View>
                <View style={styles.appStoreBadge}>
                  <FontAwesome name="apple" size={24} color={COLORS.textSecondary} />
                  <View>
                    <Text style={styles.appStoreSub}>Coming Soon</Text>
                    <Text style={styles.appStoreMain}>App Store</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            <FeatureCard icon="account-circle-outline" title="Smart Profile" text="AI learns your body type, tone, and style vibe" />
            <FeatureCard icon="camera-outline" title="Photo Analysis" text="Upload photos, get personalized color & style tips" />
            <FeatureCard icon="wardrobe-outline" title="Wardrobe AI" text="Add your clothes, let AI tag and organize them" />
            <FeatureCard icon="magic-staff" title="Outfit Ideas" text="Get curated looks for any occasion in seconds" />
          </View>

          {/* Social Bar */}
          <View style={styles.socialBar}>
            <Text style={styles.socialBarTitle}>Follow our journey</Text>
            <View style={styles.socialIconsRow}>
              <TouchableOpacity style={styles.socialIconBtn} onPress={() => openLink('https://www.instagram.com/dripdirectiveai')} activeOpacity={0.85}>
                <LinearGradient colors={['#E1306C', '#C13584']} style={styles.socialIconGrad}>
                  <FontAwesome name="instagram" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIconBtn} onPress={() => openLink('https://www.youtube.com/@DripDirective')} activeOpacity={0.85}>
                <LinearGradient colors={['#FF0000', '#CC0000']} style={styles.socialIconGrad}>
                  <FontAwesome name="youtube-play" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialIconBtn} onPress={() => openLink('mailto:dripdirectiveai@gmail.com')} activeOpacity={0.85}>
                <LinearGradient colors={COLORS.gradients.primary} style={styles.socialIconGrad}>
                  <MaterialCommunityIcons name="email" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>© {new Date().getFullYear()} Dripdirective • Made with 💜</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  wrapper: { flex: 1 },

  topNav: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  navBtn: {
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.md,
    backgroundColor: 'transparent',
  },
  navBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  navBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.2 },

  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },

  hero: {
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.accent,
    opacity: 0.14,
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.12,
  },

  heroContent: { alignItems: 'center', width: '100%', maxWidth: 600 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.lg,
    marginBottom: SPACING.lg,
  },
  logoGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 88, height: 88 },

  mainTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  taglineWrap: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  taglineGrad: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  tagline: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  heroDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 480,
  },

  ctaButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  ctaGrad: { paddingVertical: SPACING.lg, alignItems: 'center' },
  ctaText: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: 0.4 },

  ctaText: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: 0.4 },

  dnaCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
    marginTop: SPACING.md,
  },
  dnaCardGrad: {
    padding: SPACING.lg,
  },
  dnaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  dnaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dnaTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  dnaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },

  appStoreRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  appStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    opacity: 0.6,
  },
  appStoreSub: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  appStoreMain: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800' },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  featureIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' },
  featureText: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, textAlign: 'center' },

  socialBar: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  socialBarTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, marginBottom: SPACING.md },
  socialIconsRow: { flexDirection: 'row', gap: SPACING.md },
  socialIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  socialIconGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12 },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    flex: 1,
  },
  modalContainer: {
    height: '92%',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.95)' : 'transparent',
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  modalScrollContent: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSection: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  sectionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  modalSectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  modalText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'center' },

  bulletRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: SPACING.sm,
  },
  modalBullet: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, flex: 1 },

  stepRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '30',
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, fontWeight: '900', color: COLORS.primaryLight },
  stepTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 2 },
  stepDesc: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  contactValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '800' },

  founderRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  founderName: { fontSize: 16, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4 },

  linkedInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0077B515',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  founderLinkText: { fontSize: 13, color: '#0077B5', fontWeight: '700' },
});
