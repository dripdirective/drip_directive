import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // AuthContext sets isAuthenticated=true; AppNavigator will switch to MainTabs.
      return;
    } else {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight, COLORS.backgroundCard]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.topNavRow}>
              {navigation.canGoBack() ? (
                <TouchableOpacity
                  style={styles.backPill}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.backPillText}>← Back</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
            </View>

            {/* Logo & Title */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={COLORS.gradients.primary}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={require('../assets/dripdirective_logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="contain"
                    accessibilityLabel="Dripdirective logo"
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Dripdirective</Text>
              <Text style={styles.subtitle}>Your Smart Style Companion</Text>
            </View>

            {/* Elegant value proposition */}
            <View style={styles.pitchCard}>
              <View style={styles.pitchTopRow}>
                <Text style={styles.pitchTitle}>Build your style profile</Text>
                <View style={styles.pitchPill}>
                  <Text style={styles.pitchPillText}>3‑min setup</Text>
                </View>
              </View>
              <Text style={styles.pitchSubtitle}>
                Your <Text style={styles.pitchBold}>personal fashion stylist</Text> — understand your body & style, then get outfit ideas from your own wardrobe.
              </Text>

              <View style={styles.pitchBullets}>
                <View style={styles.pitchBulletRow}>
                  <Text style={styles.pitchBulletIcon}>✨</Text>
                  <Text style={styles.pitchBulletText}>Understand your body & style</Text>
                </View>
                <View style={styles.pitchBulletRow}>
                  <Text style={styles.pitchBulletIcon}>🧥</Text>
                  <Text style={styles.pitchBulletText}>No mannequin needed</Text>
                </View>
                <View style={styles.pitchBulletRow}>
                  <Text style={styles.pitchBulletIcon}>⚡</Text>
                  <Text style={styles.pitchBulletText}>Recommendations in minutes</Text>
                </View>
              </View>
            </View>

            {/* Login Form */}
            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Welcome Back! ✨</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.6}
              >
                <LinearGradient
                  colors={loading ? [COLORS.surfaceLight, COLORS.surface] : COLORS.gradients.primary}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>
                  Don't have an account? <Text style={styles.highlightText}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footerText}>
              Powered by Intelligence • Made with 💜
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.xl,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: SPACING.lg,
  },
  backPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  backPillText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },

  // Decorative Elements
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
  },
  decorCircle3: {
    position: 'absolute',
    top: '40%',
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  logoImage: {
    width: 68,
    height: 68,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  // Pitch card
  pitchCard: {
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  pitchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pitchTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
  },
  pitchPill: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  pitchPillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  pitchSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  pitchBold: {
    color: COLORS.textPrimary,
    fontWeight: '900',
  },
  pitchBullets: { marginTop: SPACING.lg, gap: 10 },
  pitchBulletRow: { flexDirection: 'row', alignItems: 'center' },
  pitchBulletIcon: { width: 22, fontSize: 14, marginRight: 10 },
  pitchBulletText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },

  // Form Card
  formCard: {
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backdropFilter: 'blur(10px)',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    fontSize: 18,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.md,
  },
  forgotPasswordText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Button
  button: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg,
    fontSize: 14,
  },

  // Secondary Button
  secondaryButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  highlightText: {
    color: COLORS.accent,
    fontWeight: '700',
  },

  // Footer
  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: SPACING.xxxl,
  },
});
