import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/colors';
import { profileAPI } from '../../services/api';

const archetypes = {
    architect: {
        name: "The Architect",
        icon: "🏛️",
        desc: "Clean lines, power dressing, and intentional quality. You prioritize structure and timelessness over trends.",
        colors: ['#2C3E50', '#E67E22', '#ECF0F1']
    },
    bohemian: {
        name: "The Bohemian",
        icon: "🌿",
        desc: "Flowy, artistic, and globally inspired. You value comfort and self-expression through eclectic pieces.",
        colors: ['#5D4037', '#8D6E63', '#FFCC80']
    },
    minimalist: {
        name: "The Minimalist",
        icon: "⬜",
        desc: "Intentional, neutral, and capsule-focused. You believe less is more and quality trumps quantity.",
        colors: ['#212121', '#9E9E9E', '#FAFAFA']
    },
    maximalist: {
        name: "The Maximalist",
        icon: "🌈",
        desc: "Bold, experimental, and joy-sparking. You use fashion as art and aren't afraid to stand out.",
        colors: ['#D500F9', '#FFEB3B', '#00E676']
    }
};

const calculateArchetype = (scores) => {
    if (!scores) return 'architect'; // Default
    // Simple logic matching the HTML
    if (scores.aesthetic < 3 && scores.comfort < 5) return 'architect';
    if (scores.aesthetic > 7) return 'maximalist';
    if (scores.aesthetic < 3) return 'minimalist';
    return 'bohemian';
};

const StatRow = ({ label, value, color }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: value,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [value]);

    return (
        <View style={styles.statRow}>
            <View style={styles.statLabelRow}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{Math.round(value)}%</Text>
            </View>
            <View style={styles.statBarBg}>
                <Animated.View
                    style={[
                        styles.statBarFill,
                        {
                            width: widthAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%']
                            }),
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
        </View>
    );
};

export default function VibeSyncResultsScreen({ route, navigation }) {
    const { finalScores, saved } = route.params || {};
    const [saving, setSaving] = useState(false);

    const type = calculateArchetype(finalScores || { aesthetic: 5, comfort: 5, pattern: 5 });
    const info = archetypes[type];

    // Normalize scores
    const aestheticPct = Math.min((finalScores?.aesthetic || 0) * 5, 100);
    const comfortPct = Math.min((finalScores?.comfort || 0) * 5, 100);
    const patternPct = Math.min((finalScores?.pattern || 0) * 5, 100);

    useEffect(() => {
        const saveResults = async () => {
            if (!finalScores || saved) return;

            try {
                setSaving(true);
                // 1. Get current profile to preserve other info
                const currentProfile = await profileAPI.getProfile();
                let currentAdditional = {};
                try {
                    if (currentProfile.additional_info) {
                        // specific handling if it's already an object (some backends do this)
                        if (typeof currentProfile.additional_info === 'object') {
                            currentAdditional = currentProfile.additional_info;
                        } else {
                            currentAdditional = JSON.parse(currentProfile.additional_info);
                        }
                    }
                } catch (e) {
                    console.log('Error parsing current additional_info', e);
                }

                // 2. Merge new VibeSync results
                const updatedAdditional = {
                    ...currentAdditional,
                    vibesync_results: {
                        archetype: type,
                        scores: finalScores,
                        timestamp: new Date().toISOString(),
                        version: '1.0'
                    }
                };

                // 3. Update profile
                // The API expects stringified JSON for additional_info usually, 
                // but let's check if api.js handles it. 
                // api.js doesn't stringify automatically in updateProfile, so we should probably send it as is?
                // Actually MeScreen sends it as is if backend handles JSON field, or string if text.
                // Looking at MeScreen: `additional_info: draft.additional_info` (which is string or obj).
                // Let's assume it should be stringified if the backend expects text, but if it expects JSONB it can be object.
                // Safest is to stringify if it was string coming back.
                // But `updateProfile` in `MeScreen` seems to treat it as string in `profileDraft`.
                // Let's send it as string to be safe if `safeJsonParse` is used.

                await profileAPI.updateProfile({
                    additional_info: JSON.stringify(updatedAdditional)
                });
                console.log('VibeSync Results saved to profile');

            } catch (error) {
                console.error('Failed to save VibeSync results:', error);
                // Optional: Alert.alert('Error', 'Could not save your results to profile.');
            } finally {
                setSaving(false);
            }
        };

        saveResults();
    }, [finalScores, saved, type]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.resultCard}>
                    {saving && (
                        <View style={styles.savingOverlay}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.savingText}>Saving result...</Text>
                        </View>
                    )}

                    <Text style={styles.icon}>{info.icon}</Text>
                    <Text style={styles.archetypeName}>{info.name}</Text>
                    <Text style={styles.desc}>{info.desc}</Text>

                    <View style={styles.paletteContainer}>
                        {info.colors.map((c, i) => (
                            <View key={i} style={[styles.colorSwatch, { backgroundColor: c }]} />
                        ))}
                    </View>

                    <View style={styles.dnaSection}>
                        <StatRow
                            label="Minimal ↔ Maximal"
                            value={aestheticPct}
                            color="#667eea"
                        />
                        <StatRow
                            label="Authority ↔ Security"
                            value={comfortPct}
                            color="#764ba2"
                        />
                        <StatRow
                            label="Structure ↔ Organic"
                            value={patternPct}
                            color="#f093fb"
                        />
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => navigation.replace('VibeSyncQuiz')}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.secondaryBtnText}>Retake Quiz</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => navigation.navigate('Main', { screen: 'Me' })}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.btnGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.btnText}>Back to Me</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    resultCard: {
        backgroundColor: 'white',
        borderRadius: 22,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 520,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 10,
    },
    icon: {
        fontSize: 60,
        marginBottom: 15,
    },
    archetypeName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 10,
        textAlign: 'center',
    },
    desc: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
    },
    paletteContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 25,
    },
    colorSwatch: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    dnaSection: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 18,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statRow: {
        marginBottom: 15,
    },
    statLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '700',
    },
    statBarBg: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    statBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    actionRow: {
        width: '100%',
        gap: 12,
    },
    actionBtn: {
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    actionBtnSecondary: {
        backgroundColor: 'white',
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#667eea',
        paddingVertical: 14,
        alignItems: 'center',
    },
    btnGrad: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryBtnText: {
        color: '#667eea',
        fontWeight: '700',
        fontSize: 16,
    },
});
