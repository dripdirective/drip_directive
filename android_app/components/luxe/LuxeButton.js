import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../theme/colors';

export default function LuxeButton({
    title,
    onPress,
    disabled,
    variant = 'primary', // primary | ghost
    leftIcon,
    rightIcon,
    style,
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const colors = useMemo(() => {
        if (variant === 'ghost') return null;
        return disabled ? [COLORS.surfaceLight, COLORS.surface] : COLORS.gradients.primary;
    }, [variant, disabled]);

    const onPressIn = () => {
        if (disabled) return;
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 30,
            bounciness: 0,
        }).start();
    };
    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 0,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <Pressable
                onPress={disabled ? undefined : onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={({ pressed }) => [
                    styles.base,
                    variant === 'ghost' ? styles.ghost : styles.primary,
                    disabled && styles.disabled,
                    pressed && !disabled && styles.pressed,
                ]}
            >
                {variant === 'ghost' ? (
                    <Text style={styles.ghostText}>
                        {leftIcon ? `${leftIcon} ` : ''}
                        {title}
                        {rightIcon ? ` ${rightIcon}` : ''}
                    </Text>
                ) : (
                    <LinearGradient
                        colors={colors}
                        style={styles.grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={[styles.primaryText, disabled && styles.primaryTextDisabled]}>
                            {leftIcon ? `${leftIcon} ` : ''}
                            {title}
                            {rightIcon ? ` ${rightIcon}` : ''}
                        </Text>
                    </LinearGradient>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    primary: {
        ...SHADOWS.md,
    },
    grad: {
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: {
        color: '#0B0B0C',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    // On disabled state we use a dark surface gradient; keep text readable.
    primaryTextDisabled: {
        color: COLORS.textSecondary,
    },
    ghost: {
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        backgroundColor: 'rgba(214, 177, 94, 0.08)',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghostText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.95 },
});
