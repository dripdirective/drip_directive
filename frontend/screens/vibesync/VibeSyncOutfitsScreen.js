import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/colors';

const OutfitCard = ({ occasion, match, items, isSecond }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={[
                styles.tag,
                { backgroundColor: isSecond ? '#fce7f3' : '#e0e7ff' }
            ]}>
                <Text style={[
                    styles.tagText,
                    { color: isSecond ? '#be185d' : '#4338ca' }
                ]}>
                    {occasion}
                </Text>
            </View>
            <Text style={styles.matchText}>{match}% match</Text>
        </View>

        <View style={styles.itemsRow}>
            {items.map((emoji, i) => (
                <View key={i} style={styles.itemBox}>
                    <Text style={{ fontSize: 32 }}>{emoji}</Text>
                </View>
            ))}
        </View>

        {!isSecond && (
            <View style={styles.confidenceSection}>
                <Text style={styles.confidenceLabel}>Style Confidence</Text>
                <View style={styles.barBg}>
                    <LinearGradient
                        colors={['#10b981', '#34d399']}
                        style={[styles.barFill, { width: '92%' }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                </View>
                <Text style={styles.confidenceValue}>92%</Text>
            </View>
        )}

        {isSecond ? (
            <TouchableOpacity style={[styles.wearBtn, styles.shopBtn]}>
                <Text style={[styles.wearBtnText, styles.shopBtnText]}>Shop Missing Piece</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={styles.wearBtn}>
                <Text style={styles.wearBtnText}>Wear This</Text>
            </TouchableOpacity>
        )}

    </View>
);

export default function VibeSyncOutfitsScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <Text style={styles.title}>Today's Suggestions</Text>
                <Text style={styles.subtitle}>Curated to match your Style DNA</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <OutfitCard
                    occasion="Work"
                    match={85}
                    items={['🧥', '👔', '👖', '👞']}
                />

                <OutfitCard
                    occasion="Date Night"
                    match={78}
                    items={['🧥', '👕', '👖', '👟']}
                    isSecond={true}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 6,
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    tagText: {
        fontWeight: '600',
        fontSize: 13, // 0.85em
    },
    matchText: {
        color: '#111827',
        fontWeight: '600',
    },
    itemsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingBottom: 10,
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    itemBox: {
        width: 70,
        height: 70,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    confidenceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginBottom: 15,
    },
    confidenceLabel: {
        fontSize: 13,
        color: '#374151',
    },
    barBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    confidenceValue: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '600',
    },
    wearBtn: {
        marginTop: 15,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    wearBtnText: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#111827',
    },
    shopBtn: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#667eea',
    },
    shopBtnText: {
        color: '#667eea',
    },
});
