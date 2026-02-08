import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - SPACING.lg * 2 - SPACING.md * 2) / 3;

const mockItems = [
    { id: '1', emoji: '👔' },
    { id: '2', emoji: '👖' },
    { id: '3', emoji: '👗' },
    { id: '4', emoji: '👟' },
    { id: '5', emoji: '🧥' },
    { id: '6', emoji: '👕' },
    { id: '7', emoji: '👠' },
];

export default function VibeSyncWardrobeScreen({ navigation }) {
    const [cameraVisible, setCameraVisible] = useState(false);
    const [localItems, setLocalItems] = useState(mockItems);

    const handleTakePhoto = () => {
        // Mock photo taking
        const newItem = { id: Date.now().toString(), emoji: '📸' };
        setLocalItems([newItem, ...localItems]);
        setCameraVisible(false);
    };

    const renderItem = ({ item }) => {
        if (item.id === 'add') {
            return (
                <TouchableOpacity
                    style={[styles.item, styles.addItem]}
                    activeOpacity={0.8}
                    onPress={() => setCameraVisible(true)}
                >
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.addItemGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Text style={{ fontSize: 40, color: 'white' }}>+</Text>
                    </LinearGradient>
                </TouchableOpacity>
            );
        }
        return (
            <View style={styles.item}>
                <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
            </View>
        );
    };

    const data = [{ id: 'add' }, ...localItems];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.background, COLORS.backgroundCard]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <Text style={styles.title}>My Wardrobe</Text>
            </View>

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('VibeSyncOutfits')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.btnGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.btnText}>Get Outfit Suggestions</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Camera Modal */}
            <Modal
                visible={cameraVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCameraVisible(false)}
            >
                <View style={styles.cameraModal}>
                    <View style={styles.cameraPreview}>
                        <Text style={styles.cameraText}>📷 Camera Preview</Text>
                        <Text style={styles.cameraSubtext}>Tap to capture</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.captureBtn}
                        onPress={handleTakePhoto}
                    >
                        <Text style={styles.captureBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setCameraVisible(false)}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
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
        paddingBottom: SPACING.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
    },
    listContent: {
        padding: SPACING.lg,
    },
    columnWrapper: {
        gap: SPACING.md,
    },
    item: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: '#ccc',
        borderStyle: 'dashed',
    },
    addItem: {
        borderStyle: 'solid',
        borderWidth: 0,
        overflow: 'hidden',
    },
    addItemGrad: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    actionBtn: {
        width: '100%',
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
    },
    btnGrad: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Camera Modal Styles
    cameraModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cameraPreview: {
        width: '90%',
        height: '60%',
        backgroundColor: '#333',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        marginBottom: 20,
    },
    cameraText: {
        color: 'white',
        fontSize: 24,
        marginBottom: 10,
    },
    cameraSubtext: {
        color: '#ccc',
        fontSize: 14,
    },
    captureBtn: {
        backgroundColor: 'white',
        paddingVertical: 15,
        width: '90%',
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 10,
    },
    captureBtnText: {
        color: '#667eea',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: 15,
        width: '90%',
        borderRadius: 30,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
