import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
    Alert,
    Platform,
    ImageBackground,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, FlipType } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

export default function PhotoUploadScreen({ navigation }) {
    const [facing, setFacing] = useState('front');
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        (async () => {
            if (permission && !permission.granted) {
                await requestPermission();
            }
        })();
    }, [permission]);

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
                    <Text style={styles.permButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    function toggleCamera() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    async function takePicture() {
        if (cameraRef.current && cameraReady) {
            try {
                const data = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: true,
                });

                // Normalizing photo orientation and handling front-camera mirroring
                const actions = [];
                if (facing === 'front') {
                    actions.push({ flip: FlipType.Horizontal });
                }

                const result = await manipulateAsync(
                    data.uri,
                    actions,
                    { compress: 0.8, format: 'jpeg' }
                );

                setPhoto(result.uri);
            } catch (error) {
                console.error('Take photo error:', error);
                Alert.alert("Error", "Failed to take photo.");
            }
        }
    }

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 1,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleRetake = () => {
        setPhoto(null);
        // Don't auto-open camera on retake, let them choose again or we could stay in mode.
        // For simplicity, let's keep them in the current mode (Camera or Gallery result).
        // If they took a photo, showCamera is true. If they picked, showCamera is false.
        // Actually, if we want to "Retake", we likely want to go back to the capture method.
        // But since Gallery doesn't have a "capture" UI, it just opens picker.
        // Let's just reset photo. User sees camera if showCamera=true.
    };

    const handleContinue = () => {
        // Navigate to next step - e.g. Analysis
        // For now, just go back or show success
        Alert.alert("Success", "Photo captured! Analysis would start here.", [
            { text: "OK", onPress: () => navigation.goBack() }
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={18} color="#FFF" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Full Body Scan</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.contentContainer}>
                {photo ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: photo }} style={styles.previewImage} resizeMode="cover" />
                        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + SPACING.xl }]}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
                                <Text style={styles.secondaryBtnText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
                                <LinearGradient
                                    colors={COLORS.gradients.primary}
                                    style={styles.primaryBtnGrad}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.primaryBtnText}>Next</Text>
                                    <MaterialCommunityIcons name="magic-staff" size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : showCamera ? (
                    <View style={{ flex: 1, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', margin: SPACING.md }}>
                        <CameraView
                            style={styles.camera}
                            facing={facing}
                            ref={cameraRef}
                            onCameraReady={() => setCameraReady(true)}
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
                                style={StyleSheet.absoluteFill}
                            />

                            {/* Camera Overlay Controls */}
                            <View style={styles.cameraOverlay}>
                                <View style={styles.camTopRow}>
                                    <TouchableOpacity style={styles.closeCamBtn} onPress={() => setShowCamera(false)}>
                                        <Ionicons name="close" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.flipBtn} onPress={toggleCamera}>
                                        <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.shotControls}>
                                    <View style={{ width: 50 }} />
                                    <TouchableOpacity style={styles.shutterBtnOut} onPress={takePicture}>
                                        <View style={styles.shutterBtnIn} />
                                    </TouchableOpacity>
                                    <View style={{ width: 50 }} />
                                </View>
                            </View>
                        </CameraView>
                    </View>
                ) : (
                    <View style={styles.container}>
                        <ImageBackground
                            source={require('../assets/model_guide_front.png')}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                                style={StyleSheet.absoluteFill}
                            />

                            <View style={[styles.topInfo]}>

                                <Text style={styles.scanSubtitle}>
                                    Chest height. Neutral pose.
                                </Text>
                            </View>

                            <View style={styles.guideContainer}>
                                <View style={styles.dashedBoxOuter}>
                                    <View style={styles.dashedBoxInner} />
                                </View>
                            </View>

                            <View style={[styles.bottomArea, { paddingBottom: insets.bottom + SPACING.xl }]}>
                                <View style={styles.privacyContainer}>
                                    <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.privacyText}>
                                        Your photo is encrypted. Used only to generate outfits on you.
                                    </Text>
                                </View>

                                <View style={styles.bottomBtnRow}>
                                    <TouchableOpacity style={styles.galleryBtnWide} onPress={pickImage} activeOpacity={0.7}>
                                        <View style={styles.btnContent}>
                                            <Ionicons name="images-outline" size={20} color="#FFF" />
                                            <Text style={styles.galleryBtnText}>Gallery</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.cameraBtnWide} onPress={() => setShowCamera(true)} activeOpacity={0.8}>
                                        <LinearGradient
                                            colors={[COLORS.primary, COLORS.primaryDark]}
                                            style={styles.cameraBtnGrad}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.cameraBtnText}>Take Photo</Text>
                                            <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ImageBackground>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
        zIndex: 10,
    },
    backButton: {
        padding: 10,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.full,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    message: {
        textAlign: 'center',
        color: COLORS.textPrimary,
        marginTop: 100,
        marginBottom: 20,
        fontSize: 16,
    },
    permButton: {
        alignSelf: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
    },
    permButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        padding: SPACING.lg,
        justifyContent: 'space-between',
    },
    camTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.md,
    },
    closeCamBtn: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 10,
        borderRadius: BORDER_RADIUS.full,
    },
    flipBtn: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 10,
        borderRadius: BORDER_RADIUS.full,
    },
    shotControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.md,
    },
    galleryBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    shutterBtnOut: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 5,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    shutterBtnIn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF',
    },

    // Preview Styles
    previewContainer: {
        flex: 1,
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        flex: 1,
        width: '100%',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingTop: SPACING.xl,
    },
    secondaryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    secondaryBtnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    primaryBtn: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    primaryBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    primaryBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // Updated Layout Styles
    topInfo: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        zIndex: 10,
        marginBottom: 0,
    },
    scanTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 1,
    },
    scanSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '400',
    },

    guideContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -60, // Shifted upwards
    },
    dashedBoxOuter: {
        width: width * 0.8,
        height: height * 0.65,
        borderWidth: 2,
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderStyle: 'dashed',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dashedBoxInner: {
        width: '85%',
        height: '75%',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderStyle: 'dashed',
        borderRadius: 15,
    },

    bottomArea: {
        paddingHorizontal: SPACING.xl,
        backgroundColor: 'transparent',
    },
    bottomBtnRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    galleryBtnWide: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    galleryBtnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    cameraBtnWide: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    cameraBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    cameraBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },

    privacyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: SPACING.xl,
    },
    privacyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'center',
    },
});
