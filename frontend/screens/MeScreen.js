import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { profileAPI, userImagesAPI, aiProcessingAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

// --- Select options ---
const BODY_TYPES = [
    { value: '', label: 'Select body type', icon: '👤' },
    { value: 'slim', label: 'Slim', icon: '🧍' },
    { value: 'athletic', label: 'Athletic', icon: '💪' },
    { value: 'average', label: 'Average', icon: '🙂' },
    { value: 'curvy', label: 'Curvy', icon: '✨' },
    { value: 'plus_size', label: 'Plus Size', icon: '🌟' },
];

const FACE_TONES = [
    { value: '', label: 'Select skin tone', icon: '🎨' },
    { value: 'fair', label: 'Fair', icon: '🤍' },
    { value: 'light', label: 'Light', icon: '🤍' },
    { value: 'medium', label: 'Medium', icon: '🧡' },
    { value: 'olive', label: 'Olive', icon: '💚' },
    { value: 'tan', label: 'Tan', icon: '🟤' },
    { value: 'dark', label: 'Dark', icon: '🤎' },
    { value: 'deep', label: 'Deep', icon: '🖤' },
];

const COUNTRIES = [
    { value: '', label: 'Select country', icon: '🌍' },
    { value: 'canada', label: 'Canada', icon: '🇨🇦' },
    { value: 'india', label: 'India', icon: '🇮🇳' },
    { value: 'united_kingdom', label: 'United Kingdom', icon: '🇬🇧' },
    { value: 'united_states', label: 'United States', icon: '🇺🇸' },
];

const STATES_BY_COUNTRY = {
    india: [
        { value: '', label: 'Select state', icon: '📍' },
        { value: 'andhra_pradesh', label: 'Andhra Pradesh', icon: '📍' },
        { value: 'arunachal_pradesh', label: 'Arunachal Pradesh', icon: '📍' },
        { value: 'assam', label: 'Assam', icon: '📍' },
        { value: 'bihar', label: 'Bihar', icon: '📍' },
        { value: 'chhattisgarh', label: 'Chhattisgarh', icon: '📍' },
        { value: 'goa', label: 'Goa', icon: '📍' },
        { value: 'gujarat', label: 'Gujarat', icon: '📍' },
        { value: 'haryana', label: 'Haryana', icon: '📍' },
        { value: 'himachal_pradesh', label: 'Himachal Pradesh', icon: '📍' },
        { value: 'jharkhand', label: 'Jharkhand', icon: '📍' },
        { value: 'karnataka', label: 'Karnataka', icon: '📍' },
        { value: 'kerala', label: 'Kerala', icon: '📍' },
        { value: 'madhya_pradesh', label: 'Madhya Pradesh', icon: '📍' },
        { value: 'maharashtra', label: 'Maharashtra', icon: '📍' },
        { value: 'odisha', label: 'Odisha', icon: '📍' },
        { value: 'punjab', label: 'Punjab', icon: '📍' },
        { value: 'rajasthan', label: 'Rajasthan', icon: '📍' },
        { value: 'tamil_nadu', label: 'Tamil Nadu', icon: '📍' },
        { value: 'telangana', label: 'Telangana', icon: '📍' },
        { value: 'uttar_pradesh', label: 'Uttar Pradesh', icon: '📍' },
        { value: 'west_bengal', label: 'West Bengal', icon: '📍' },
        { value: 'delhi', label: 'Delhi (NCT)', icon: '📍' },
    ],
    united_states: [
        { value: '', label: 'Select state', icon: '📍' },
        { value: 'california', label: 'California', icon: '📍' },
        { value: 'new_york', label: 'New York', icon: '📍' },
        { value: 'texas', label: 'Texas', icon: '📍' },
        { value: 'florida', label: 'Florida', icon: '📍' },
        { value: 'washington', label: 'Washington', icon: '📍' },
    ],
    united_kingdom: [
        { value: '', label: 'Select region', icon: '📍' },
        { value: 'england', label: 'England', icon: '📍' },
        { value: 'scotland', label: 'Scotland', icon: '📍' },
        { value: 'wales', label: 'Wales', icon: '📍' },
        { value: 'northern_ireland', label: 'Northern Ireland', icon: '📍' },
        { value: 'london', label: 'London', icon: '📍' },
    ],
    canada: [
        { value: '', label: 'Select province/territory', icon: '📍' },
        { value: 'ontario', label: 'Ontario', icon: '📍' },
        { value: 'quebec', label: 'Quebec', icon: '📍' },
        { value: 'british_columbia', label: 'British Columbia', icon: '📍' },
        { value: 'alberta', label: 'Alberta', icon: '📍' },
    ],
};

const OCCUPATIONS = [
    { value: '', label: 'Select occupation', icon: '💼' },
    { value: 'student', label: 'Student', icon: '🎓' },
    { value: 'software_engineer', label: 'Software Engineer', icon: '🧑‍💻' },
    { value: 'business', label: 'Business / Entrepreneur', icon: '📈' },
    { value: 'marketing', label: 'Marketing', icon: '📣' },
    { value: 'fashion_designer', label: 'Fashion Designer', icon: '👗' },
    { value: 'model', label: 'Model', icon: '📸' },
    { value: 'influencer', label: 'Influencer', icon: '🤳' },
    { value: 'doctor', label: 'Doctor', icon: '🩺' },
    { value: 'teacher', label: 'Teacher', icon: '📚' },
    { value: 'sales', label: 'Sales', icon: '🤝' },
    { value: 'homemaker', label: 'Homemaker', icon: '🏠' },
    { value: 'other', label: 'Other', icon: '✍️' },
];

const GENDERS = [
    { value: '', label: 'Select gender', icon: '🧑' },
    { value: 'male', label: 'Male', icon: '👨' },
    { value: 'female', label: 'Female', icon: '👩' },
    { value: 'non-binary', label: 'Non-binary', icon: '🧑‍🤝‍🧑' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
];

const MARITAL_STATUSES = [
    { value: '', label: 'Select status', icon: '💍' },
    { value: 'single', label: 'Single', icon: '👤' },
    { value: 'married', label: 'Married', icon: '💑' },
    { value: 'divorced', label: 'Divorced', icon: '💔' },
    { value: 'widowed', label: 'Widowed', icon: '🕯️' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
];

const STYLE_TAGS = [
    'Minimalist', 'Streetwear', 'Vintage', 'Bohemian', 'Classic',
    'Preppy', 'Edgy', 'Comfort First', 'Bright Colors', 'Neutral Tones',
    'Modest', 'Sustainable', 'Luxury', 'Athleisure',
];

const safeJsonParse = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    const t = value.trim();
    if (!t) return null;
    if (!t.startsWith('{') && !t.startsWith('[')) return null;
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
};

const extractUserStyleText = (additionalInfoObjOrString) => {
    const obj = safeJsonParse(additionalInfoObjOrString);
    if (obj && typeof obj === 'object') {
        return (
            obj.user_style_preferences ||
            obj.style_preferences ||
            obj.user_notes ||
            obj.additional_notes ||
            ''
        );
    }
    // If it's not JSON, treat as plain text preferences
    if (typeof additionalInfoObjOrString === 'string') return additionalInfoObjOrString;
    return '';
};

const CustomSelect = ({ label, icon, options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <View style={styles.selectContainer}>
            <Text style={styles.selectLabel}>{icon} {label}</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.85}>
                <Text style={styles.selectButtonText}>{selectedOption.icon} {selectedOption.label}</Text>
                <Text style={styles.selectArrow}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {isOpen && (
                <View style={styles.optionsContainer}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.optionItem, value === option.value && styles.optionItemSelected]}
                                onPress={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.optionText, value === option.value && styles.optionTextSelected]}>
                                    {option.icon} {option.label}
                                </Text>
                                {value === option.value && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const toBulletHighlights = (text, max = 3) => {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!trimmed) return [];
    const parts = (trimmed.includes('\n') || trimmed.includes('•'))
        ? trimmed.split(/\n|•/).map(s => s.trim()).filter(Boolean)
        : trimmed.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    return parts.slice(0, max);
};

const ImagePreviewModal = ({ visible, imageUrl, onClose }) => {
    if (!visible) return null;
    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
            <View style={styles.imagePreviewContainer}>
                <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
                <View style={styles.imagePreviewHeader}>
                    <Text style={styles.imagePreviewTitle}>🖼️ Photo</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
                {imageUrl ? (
                    <View style={styles.imagePreviewBody}>
                        <Image source={{ uri: imageUrl }} style={styles.imagePreviewImage} contentFit="contain" transition={200} />
                    </View>
                ) : (
                    <View style={styles.emptyCenter}>
                        <Text style={styles.emptyCenterText}>No image available</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const COLOR_HEX_MAP = {
    black: '#111111', white: '#F7F7F7', ivory: '#FFFFF0', cream: '#FFFDD0',
    beige: '#F5F5DC', tan: '#D2B48C', brown: '#8B5A2B', camel: '#C19A6B',
    chocolate: '#5C3317', grey: '#8E8E93', gray: '#8E8E93', charcoal: '#36454F',
    navy: '#001F3F', blue: '#2F6FED', sky: '#87CEEB', teal: '#008080',
    green: '#2ECC71', olive: '#808000', emerald: '#50C878', red: '#E74C3C',
    maroon: '#800000', burgundy: '#800020', pink: '#FF69B4', blush: '#F9C5D1',
    peach: '#FFCBA4', orange: '#F39C12', yellow: '#F1C40F', gold: '#D4AF37',
    purple: '#8E44AD', lavender: '#B57EDC',
};

const normalizeColor = (name) => (name || '').toString().trim().toLowerCase();
const getColorHex = (name) => {
    const n = normalizeColor(name);
    if (!n) return null;
    if (n.startsWith('#') && (n.length === 4 || n.length === 7)) return n;
    if (COLOR_HEX_MAP[n]) return COLOR_HEX_MAP[n];
    const parts = n.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (COLOR_HEX_MAP[last]) return COLOR_HEX_MAP[last];
    return null;
};

const AiAttributeChip = ({ icon, label, value }) => (
    <View style={styles.aiAttributeChip}>
        <Text style={styles.aiAttributeIcon}>{icon}</Text>
        <View>
            <Text style={styles.aiAttributeLabel}>{label}</Text>
            <Text style={styles.aiAttributeValue}>{String(value)}</Text>
        </View>
    </View>
);

const AIProfileCard = ({ profile }) => {
    if (!profile || !profile.analysis) return null;
    const { analysis } = profile;
    const physical = analysis.physical_attributes || {};
    const facial = analysis.facial_features || {};
    const style = analysis.style_assessment || {};

    const summaryPoints = (() => {
        if (Array.isArray(analysis.summary_points) && analysis.summary_points.length > 0) return analysis.summary_points;
        const raw = style.style_notes;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 6);
        if (typeof raw === 'string') {
            const chunks = raw.split(/\n|•|- |\.\s+/).map(s => s.trim()).filter(Boolean);
            return chunks.slice(0, 6);
        }
        return [];
    })();

    return (
        <View style={styles.aiCard}>
            <LinearGradient
                colors={[COLORS.primary, '#9d4edd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiHeaderGradient}
            >
                <Text style={styles.aiTitle}>Style Analysis</Text>
                <Text style={styles.aiSubtitle}>Based on your photos</Text>
            </LinearGradient>

            <View style={{ padding: SPACING.lg }}>
                <View style={styles.aiSection}>
                    <Text style={styles.aiSectionTitle}>📊 Physical Attributes</Text>
                    <View style={styles.aiAttributeGrid}>
                        {!!physical.body_type && <AiAttributeChip icon="🏃" label="Body Type" value={physical.body_type} />}
                        {!!physical.shoulder_type && <AiAttributeChip icon="📐" label="Shoulders" value={physical.shoulder_type} />}
                        {!!physical.vertical_proportions && <AiAttributeChip icon="📏" label="Proportions" value={physical.vertical_proportions} />}
                        {!!physical.waist_type && <AiAttributeChip icon="👖" label="Waist" value={physical.waist_type} />}
                        {!!physical.skin_tone && <AiAttributeChip icon="🎨" label="Skin Tone" value={physical.skin_tone} />}
                        {!!physical.contrast_level && <AiAttributeChip icon="🌗" label="Contrast" value={physical.contrast_level} />}
                    </View>
                </View>

                {(facial.face_shape || facial.hair_color || facial.eye_color) && (
                    <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>👤 Facial Features</Text>
                        <View style={styles.aiAttributeGrid}>
                            {!!facial.face_shape && <AiAttributeChip icon="🔷" label="Face Shape" value={facial.face_shape} />}
                            {!!facial.hair_color && <AiAttributeChip icon="💇" label="Hair" value={facial.hair_color} />}
                            {!!facial.eye_color && <AiAttributeChip icon="👁️" label="Eyes" value={facial.eye_color} />}
                        </View>
                    </View>
                )}

                {/* Simplified for brevity - assume other sections match Android code or key parts */}
                {Array.isArray(style.recommended_styles) && style.recommended_styles.length > 0 && (
                    <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>👗 Recommended Styles</Text>
                        <View style={styles.aiColorTags}>
                            {style.recommended_styles.slice(0, 8).map((s, idx) => (
                                <View key={idx} style={[styles.aiColorTag, styles.aiStyleTag]}>
                                    <Text style={styles.aiColorTagText}>{String(s)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const ProfileEditModal = ({ visible, initialProfile, onClose, onSave, saving }) => {
    const [draft, setDraft] = useState(initialProfile || {});
    const [occupationMode, setOccupationMode] = useState('select');
    const [occupationOther, setOccupationOther] = useState('');

    useEffect(() => {
        setDraft(initialProfile || {});
        // ... occupation logic ...
        const rawOcc = (initialProfile?.occupation || '').toString();
        const occupationKeys = new Set(OCCUPATIONS.map(o => o.value).filter(Boolean));
        if (rawOcc && !occupationKeys.has(rawOcc)) {
            setOccupationMode('other'); setOccupationOther(rawOcc);
        } else {
            setOccupationMode('select'); setOccupationOther('');
        }
    }, [initialProfile, visible]);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: COLORS.background }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

                <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>Edit profile</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }}>
                    <View style={styles.formCard}>
                        <Field label="Name" placeholder="Your name" value={draft.name || ''} onChangeText={(t) => setDraft((p) => ({ ...p, name: t }))} />
                        <CustomSelect label="Gender" icon="🧑" options={GENDERS} value={draft.gender || ''} onChange={(v) => setDraft((p) => ({ ...p, gender: v }))} />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: SPACING.md }}>
                                <Field label="Age" placeholder="25" keyboardType="numeric" value={draft.age || ''} onChangeText={(t) => setDraft((p) => ({ ...p, age: t }))} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Field label="Height (cm)" placeholder="170" keyboardType="numeric" value={draft.height || ''} onChangeText={(t) => setDraft((p) => ({ ...p, height: t }))} />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: SPACING.md }}>
                                <Field label="Weight (kg)" placeholder="65" keyboardType="numeric" value={draft.weight || ''} onChangeText={(t) => setDraft((p) => ({ ...p, weight: t }))} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomSelect label="Marital" icon="💍" options={MARITAL_STATUSES} value={draft.marital_status || ''} onChange={(v) => setDraft((p) => ({ ...p, marital_status: v }))} />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: SPACING.md }}>
                                <CustomSelect label="Body type" icon="👤" options={BODY_TYPES} value={draft.body_type || ''} onChange={(v) => setDraft((p) => ({ ...p, body_type: v }))} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomSelect label="Skin tone" icon="🎨" options={FACE_TONES} value={draft.face_tone || ''} onChange={(v) => setDraft((p) => ({ ...p, face_tone: v }))} />
                            </View>
                        </View>

                        <CustomSelect label="Country" icon="🌍" options={COUNTRIES} value={draft.country || ''} onChange={(v) => setDraft((p) => ({ ...p, country: v, state: '' }))} />
                        <CustomSelect label="State/Region" icon="📍" options={STATES_BY_COUNTRY[draft.country] || [{ value: '', label: 'Select state', icon: '📍' }]} value={draft.state || ''} onChange={(v) => setDraft((p) => ({ ...p, state: v }))} />

                        <CustomSelect
                            label="Occupation"
                            icon="💼"
                            options={OCCUPATIONS}
                            value={occupationMode === 'other' ? 'other' : (draft.occupation || '')}
                            onChange={(v) => {
                                if (v === 'other') { setOccupationMode('other'); }
                                else { setOccupationMode('select'); setDraft((p) => ({ ...p, occupation: v })); }
                            }}
                        />
                        {occupationMode === 'other' && (
                            <Field label="Occupation (other)" placeholder="Type occupation" value={occupationOther || ''} onChangeText={setOccupationOther} />
                        )}

                        <Field label="Style preferences" placeholder="Minimalist..." value={draft.additional_info || ''} multiline onChangeText={(t) => setDraft((p) => ({ ...p, additional_info: t }))} />
                        <View style={styles.chipsContainer}>
                            {STYLE_TAGS.map((tag) => (
                                <TouchableOpacity key={tag} style={styles.chip} onPress={() => {
                                    const current = (draft.additional_info || '').toString();
                                    if (!current.toLowerCase().includes(tag.toLowerCase())) {
                                        setDraft((p) => ({ ...p, additional_info: current ? `${current}, ${tag}` : tag }));
                                    }
                                }}>
                                    <Text style={styles.chipText}>+ {tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, saving && styles.buttonDisabled]}
                        onPress={() => {
                            const occFinal = occupationMode === 'other' ? (occupationOther || '').trim() : (draft.occupation || '').trim();
                            onSave?.({ ...draft, occupation: occFinal });
                        }}
                        disabled={saving}
                    >
                        <LinearGradient colors={COLORS.gradients.primary} style={styles.primaryButtonGradient}>
                            {saving ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.primaryButtonText}>Save</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
    <View style={{ marginBottom: SPACING.md }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.inputContainer, multiline && { minHeight: 90 }]}>
            <TextInput
                style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                keyboardType={keyboardType}
                multiline={multiline}
            />
        </View>
    </View>
);

export default function MeScreen() {
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [additionalInfoObj, setAdditionalInfoObj] = useState(null);
    const [aiProfile, setAiProfile] = useState(null);
    const [images, setImages] = useState([]);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    const pollIntervalRef = useRef(null);
    const pollTimeoutRef = useRef(null);

    useEffect(() => {
        loadData();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const p = await profileAPI.getProfile().catch((e) => {
                if (e?.response?.status === 404) return null;
                throw e;
            });
            setProfile(p);
            const parsedAdditional = p?.additional_info ? safeJsonParse(p.additional_info) : null;
            setAdditionalInfoObj(parsedAdditional);
            setAiProfile(parsedAdditional?.ai_profile_analysis || null);

            const imgs = await userImagesAPI.getImages();
            setImages((imgs || []).sort((a, b) => b.id - a.id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const analyzedCount = useMemo(() => images.filter(i => i.processing_status === 'completed').length, [images]);
    const pendingCount = useMemo(() => images.filter(i => i.processing_status === 'pending').length, [images]);
    const setupProgress = useMemo(() => {
        const target = 3;
        const done = Math.min(analyzedCount, target);
        return { done, target, pct: Math.round((done / target) * 100) };
    }, [analyzedCount]);

    const statusPill = useMemo(() => {
        if (analyzedCount >= 3 && aiProfile?.analysis) return { text: 'Ready', bg: COLORS.success };
        if (pendingCount > 0) return { text: 'Needs analysis', bg: COLORS.warning };
        return { text: 'Setup', bg: COLORS.primary };
    }, [analyzedCount, pendingCount, aiProfile]);

    const openImage = (uri) => {
        if (!uri) return;
        setSelectedImageUrl(uri);
        setShowImageModal(true);
    };

    const pickImages = async () => {
        if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                const newAssets = Array.from(files).map(file => ({
                    uri: URL.createObjectURL(file), // Create blob URL for preview
                    file, // Store actual File object for upload
                    id: Math.random().toString(36).slice(2, 11),
                }));
                setSelectedAssets(prev => [...prev, ...newAssets]);
            };
            input.click();
        } else {
            Alert.alert('Not supported', 'Web only feature');
        }
    };

    const removeSelectedAsset = (tempId) => {
        setSelectedAssets(prev => prev.filter(a => a.id !== tempId));
    };

    const uploadSelected = async () => {
        if (selectedAssets.length === 0) return;
        try {
            setUploading(true);
            let successCount = 0;
            for (const asset of selectedAssets) {
                try {
                    if (!asset.file) continue;
                    const uploaded = await userImagesAPI.uploadImage('user_image', asset.file);
                    if (uploaded?.id) successCount++;
                } catch (err) { console.error(err); }
            }
            if (successCount > 0) {
                setSelectedAssets([]);
                await loadData();
            } else { Alert.alert('Error', 'Failed to upload'); }
        } finally {
            setUploading(false);
        }
    };

    const analyzePending = async () => {
        try {
            setProcessing(true);
            await aiProcessingAPI.processUserImages();
            // Polling logic simplified for brevity
            const checkStatus = setInterval(async () => {
                const data = await userImagesAPI.getImages();
                if (data.every(img => img.processing_status === 'completed')) {
                    clearInterval(checkStatus);
                    await loadData();
                    setProcessing(false);
                }
            }, 3000);
            pollIntervalRef.current = checkStatus;
            setTimeout(() => { clearInterval(checkStatus); setProcessing(false); loadData(); }, 60000);
        } catch (e) {
            setProcessing(false);
            Alert.alert('Error', 'Failed to analyze');
        }
    };

    const deletePhoto = async (imageId) => {
        if (confirm('Delete photo?')) {
            try {
                await userImagesAPI.deleteImage(imageId);
                setImages(prev => prev.filter(img => img.id !== imageId));
            } catch { }
        }
    };

    const saveProfile = async (draft) => {
        try {
            setSavingProfile(true);
            const payload = {
                name: draft.name, gender: draft.gender, age: draft.age, height: draft.height, weight: draft.weight,
                marital_status: draft.marital_status, body_type: draft.body_type, face_tone: draft.face_tone,
                state: draft.state, country: draft.country, occupation: draft.occupation, additional_info: draft.additional_info
            };
            if (profile) await profileAPI.updateProfile(payload);
            else await profileAPI.createProfile(payload);
            setShowEdit(false);
            await loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save');
        } finally { setSavingProfile(false); }
    };

    const photoSlots = useMemo(() => {
        const slots = 6;
        const padded = images.slice(0, slots);
        return { slots, padded };
    }, [images]);

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    const profileDraft = { ...profile, additional_info: extractUserStyleText(additionalInfoObj || profile?.additional_info) };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
            <ProfileEditModal visible={showEdit} initialProfile={profileDraft} onClose={() => setShowEdit(false)} onSave={saveProfile} saving={savingProfile} />
            <ImagePreviewModal visible={showImageModal} imageUrl={selectedImageUrl} onClose={() => setShowImageModal(false)} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Me</Text>
                        <Text style={styles.subtitle}>Your profile + style photos</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <View><Text style={styles.cardTitle}>Profile</Text><Text style={styles.cardSubtle}>Details</Text></View>
                            <View style={[styles.pill, { backgroundColor: statusPill.bg }]}><Text style={styles.pillText}>{statusPill.text}</Text></View>
                        </View>
                        <View style={styles.profileGrid}>
                            <Text style={styles.profileText}><Text style={styles.profileLabel}>Name: </Text>{profile?.name}</Text>
                            <Text style={styles.profileText}><Text style={styles.profileLabel}>Gender: </Text>{profile?.gender}</Text>
                        </View>
                        <TouchableOpacity style={styles.editButton} onPress={() => setShowEdit(true)}><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Photos ({images.length})</Text>
                            <TouchableOpacity onPress={pickImages}><Text style={styles.ghostButtonText}>+ Add</Text></TouchableOpacity>
                        </View>
                        {selectedAssets.length > 0 && (
                            <View style={styles.uploadQueue}>
                                <Text style={styles.uploadText}>{selectedAssets.length} selected</Text>
                                <TouchableOpacity onPress={uploadSelected} disabled={uploading} style={styles.uploadButton}>
                                    <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Upload Now'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.photoGrid}>
                            {images.map((item, idx) => {
                                const uri = item?.image_path ? (item.image_path.startsWith('http') ? item.image_path : `${API_BASE_URL}/${item.image_path}`) : null;
                                return (
                                    <View key={item.id || idx} style={styles.photoTile}>
                                        <TouchableOpacity onPress={() => openImage(uri)} style={{ flex: 1 }}>
                                            <Image source={{ uri }} style={styles.photoImage} contentFit="cover" />
                                            <TouchableOpacity style={styles.photoDelete} onPress={() => deletePhoto(item.id)}>
                                                <Text style={styles.photoDeleteText}>✕</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {images.length === 0 && (
                                <View style={styles.emptyPhotos}>
                                    <Text style={styles.emptyPhotoText}>No photos yet</Text>
                                    <TouchableOpacity onPress={pickImages} style={styles.addPhotoButton}>
                                        <Text style={styles.addPhotoText}>+ Add Photo</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        {pendingCount > 0 && <TouchableOpacity onPress={analyzePending} disabled={processing}><Text>Analyze Pending</Text></TouchableOpacity>}
                    </View>

                    {aiProfile?.analysis && <AIProfileCard profile={aiProfile} />}
                </View>
            </ScrollView>
            <FlowNavBar next={{ route: 'Wardrobe', label: analyzedCount >= 1 ? 'Next: Wardrobe' : 'Add photos first', icon: '👗', enabled: analyzedCount >= 1 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { paddingBottom: SPACING.xl },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: SPACING.lg },
    title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary },
    subtitle: { fontSize: 13, color: COLORS.textMuted },
    card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.sm },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    cardSubtle: { fontSize: 12, color: COLORS.textSecondary },
    pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
    pillText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
    profileGrid: { gap: SPACING.sm, marginTop: SPACING.md },
    editButton: { marginTop: SPACING.md, padding: 10, backgroundColor: COLORS.surfaceHighlight, borderRadius: BORDER_RADIUS.lg },
    editButtonText: { fontWeight: '900', color: COLORS.textPrimary },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
    photoTile: { width: 100, height: 100, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
    photoImage: { width: '100%', height: '100%' },
    photoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    photoDelete: { position: 'absolute', top: 0, right: 0, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)' },
    selectContainer: { marginBottom: SPACING.md },
    selectLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
    selectButton: { padding: SPACING.md, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.lg, flexDirection: 'row', justifyContent: 'space-between' },
    selectButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    selectArrow: { fontSize: 12, color: COLORS.textMuted },
    optionsContainer: { marginTop: 6, maxHeight: 200, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surface },
    optionItem: { padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between' },
    optionItemSelected: { backgroundColor: COLORS.primary + '20' },
    optionText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    optionTextSelected: { color: COLORS.primary },
    checkmark: { color: COLORS.primary },
    // ... AI Card styles
    aiCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg },
    aiHeaderGradient: { padding: SPACING.lg },
    aiTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
    aiSubtitle: { fontSize: 12, color: COLORS.textPrimary }, // Made brighter
    aiSection: { marginBottom: SPACING.md },
    aiSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
    aiAttributeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    aiAttributeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, padding: 8, borderRadius: 8 },
    aiAttributeIcon: { marginRight: 5, fontSize: 16 },
    aiAttributeLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
    aiAttributeValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
    aiColorTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    aiColorTag: { padding: 5, backgroundColor: COLORS.surfaceHighlight, borderRadius: 20 },
    aiColorTagText: { fontSize: 12, color: COLORS.textPrimary },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.lg, marginTop: 40 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
    closeButton: { padding: 10 },
    closeButtonText: { fontSize: 18, color: COLORS.textPrimary },
    formCard: { padding: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl },
    fieldLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, color: COLORS.textSecondary },
    inputContainer: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
    input: { padding: SPACING.md, fontSize: 15, color: COLORS.textPrimary },
    primaryButton: { marginTop: 20, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
    primaryButtonGradient: { padding: 15, alignItems: 'center' },
    primaryButtonText: { color: COLORS.textPrimary, fontWeight: '900' },
    row: { flexDirection: 'row' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: { padding: 8, backgroundColor: COLORS.primary + '20', borderRadius: 20 },
    chipText: { fontSize: 12 },
    imagePreviewContainer: { flex: 1 },
    imagePreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50 },
    imagePreviewBody: { flex: 1, padding: 20 },
    imagePreviewImage: { width: '100%', height: '100%' },
    emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // New styles
    profileLabel: { color: COLORS.textSecondary, fontWeight: '700' },
    profileText: { color: COLORS.textPrimary, fontSize: 15, marginBottom: 4 },
    ghostButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
    uploadQueue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceLight, padding: 10, borderRadius: 8, marginBottom: 10 },
    uploadText: { color: COLORS.textPrimary, fontWeight: '600' },
    uploadButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 6 },
    uploadButtonText: { color: 'white', fontWeight: '700', fontSize: 12 },
    photoDeleteText: { color: 'white', fontWeight: 'bold' },
    emptyPhotos: { width: '100%', padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
    emptyPhotoText: { color: COLORS.textMuted, marginBottom: 10 },
    addPhotoButton: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 8 },
    addPhotoText: { color: COLORS.textPrimary, fontWeight: '600' }
});
