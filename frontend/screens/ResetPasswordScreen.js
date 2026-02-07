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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

export default function ResetPasswordScreen({ navigation }) {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!token || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await authAPI.resetPassword(token, password);
            setLoading(false);
            navigation.navigate('Login');
        } catch (error) {
            setLoading(false);
            Alert.alert('Error', error?.response?.data?.detail || 'Failed to reset password');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.background, COLORS.backgroundLight, COLORS.backgroundCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        <View style={styles.topNavRow}>
                            <TouchableOpacity
                                style={styles.backPill}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.backPillText}>← Back</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.header}>
                            <Text style={styles.title}>New Password 🔒</Text>
                            <Text style={styles.subtitle}>Enter the token from your email</Text>
                        </View>

                        <View style={styles.formCard}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🎟️</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Reset Token"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={token}
                                    onChangeText={setToken}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🛡️</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm New Password"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleReset}
                                disabled={loading}
                                activeOpacity={0.8}
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
                                        <Text style={styles.buttonText}>Reset Password →</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    content: { padding: SPACING.xl },
    topNavRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: SPACING.lg },
    backPill: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
    },
    backPillText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 13 },
    header: { alignItems: 'center', marginBottom: SPACING.xxxl },
    title: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
    formCard: {
        backgroundColor: COLORS.backgroundGlass,
        borderRadius: BORDER_RADIUS.xxl,
        padding: SPACING.xxl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: { fontSize: 18, paddingHorizontal: SPACING.lg },
    input: { flex: 1, padding: SPACING.lg, fontSize: 16, color: COLORS.textPrimary },
    button: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md, ...SHADOWS.md },
    buttonDisabled: { opacity: 0.7 },
    buttonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
    buttonText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
});
