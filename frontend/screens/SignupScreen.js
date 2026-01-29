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

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);

    if (result.success) {
      navigation.replace('Main');
    } else {
      Alert.alert('Signup Failed', result.error);
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
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.topNavRow}>
              <TouchableOpacity
                style={styles.backPill}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Landing'))}
                activeOpacity={0.85}
              >
                <Text style={styles.backPillText}>← Back</Text>
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={COLORS.gradients.accent}
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
              <Text style={styles.title}>Join Dripdirective</Text>
              <Text style={styles.subtitle}>Start your style journey today</Text>
            </View>

            {/* Signup Form */}
            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Create Account 🎉</Text>
              
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

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? [COLORS.surfaceLight, COLORS.surface] : COLORS.gradients.accent}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Create Account →</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Features */}
              <View style={styles.features}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🤖</Text>
                  <Text style={styles.featureText}>AI Style Analysis</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👗</Text>
                  <Text style={styles.featureText}>Smart Recommendations</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📸</Text>
                  <Text style={styles.featureText}>Virtual Try-On</Text>
                </View>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>
                  Already have an account? <Text style={styles.highlightText}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
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
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoGradient: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  
  // Form Card
  formCard: {
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeText: {
    fontSize: 20,
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
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  
  // Button
  button: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  
  // Features
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
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
    padding: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  highlightText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
