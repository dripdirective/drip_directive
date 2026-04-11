import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../theme/colors';

export default function LuxeInput({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    autoComplete,
    multiline,
    right,
}) {
    const anim = useRef(new Animated.Value(0)).current;

    const borderColor = useMemo(
        () => anim.interpolate({ inputRange: [0, 1], outputRange: [COLORS.border, COLORS.borderAccent] }),
        [anim]
    );

    const onFocus = () => {
        Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
    };
    const onBlur = () => {
        Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    };

    return (
        <View style={styles.wrap}>
            {!!label && <Text style={styles.label}>{label}</Text>}
            <Animated.View style={[styles.box, { borderColor }]}>
                <TextInput
                    style={[styles.input, multiline && styles.multiline]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoComplete={autoComplete}
                    multiline={multiline}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                {!!right && <View style={styles.right}>{right}</View>}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginBottom: SPACING.md },
    label: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: 15,
    },
    multiline: {
        minHeight: 96,
        textAlignVertical: 'top',
        paddingTop: SPACING.md,
    },
    right: { paddingRight: SPACING.md },
});
