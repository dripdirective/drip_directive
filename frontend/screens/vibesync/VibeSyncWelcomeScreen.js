import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function VibeSyncWelcomeScreen({ navigation }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.logoContainer}>
                    <Text style={styles.title}>✨ VibeSync</Text>
                    <Text style={styles.subtitle}>Discover your Style DNA</Text>
                </View>

                <TouchableOpacity
                    style={styles.btn}
                    onPress={() => navigation.navigate('VibeSyncQuiz')}
                    activeOpacity={0.9}
                >
                    <Text style={styles.btnText}>Take Style DNA Quiz</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => navigation.navigate('VibeSyncResults')}
                >
                    <Text style={styles.btnSecondaryText}>View Demo Results</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        padding: SPACING.xl,
        alignItems: 'center',
        maxWidth: 480,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: 'white',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
    },
    btn: {
        backgroundColor: 'white',
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
        marginBottom: 15,
    },
    btnText: {
        color: '#667eea',
        fontSize: 18,
        fontWeight: 'bold',
    },
    btnSecondary: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'white',
        width: '100%',
        alignItems: 'center',
    },
    btnSecondaryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
