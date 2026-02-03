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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { profileAPI, userImagesAPI, aiProcessingAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

// --- Select options (ported from old ProfileScreen UX) ---
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
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
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

// --- Rich AI profile card (ported from old UserImagesScreen UX) ---
const COLOR_HEX_MAP = {
  black: '#111111',
  white: '#F7F7F7',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  beige: '#F5F5DC',
  tan: '#D2B48C',
  brown: '#8B5A2B',
  camel: '#C19A6B',
  chocolate: '#5C3317',
  grey: '#8E8E93',
  gray: '#8E8E93',
  charcoal: '#36454F',
  navy: '#001F3F',
  blue: '#2F6FED',
  sky: '#87CEEB',
  teal: '#008080',
  green: '#2ECC71',
  olive: '#808000',
  emerald: '#50C878',
  red: '#E74C3C',
  maroon: '#800000',
  burgundy: '#800020',
  pink: '#FF69B4',
  blush: '#F9C5D1',
  peach: '#FFCBA4',
  orange: '#F39C12',
  yellow: '#F1C40F',
  gold: '#D4AF37',
  purple: '#8E44AD',
  lavender: '#B57EDC',
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

        <View style={styles.aiSection}>
          <Text style={styles.aiSectionTitle}>✨ Style Profile</Text>
          <View style={styles.aiAttributeGrid}>
            {!!style.style_personality && <AiAttributeChip icon="✨" label="Vibe" value={style.style_personality} />}
            {!!style.observed_fit_preference && <AiAttributeChip icon="👕" label="Fit Preference" value={style.observed_fit_preference} />}
          </View>
        </View>

        {Array.isArray(style.recommended_colors) && style.recommended_colors.length > 0 && (
          <View style={styles.aiSection}>
            <Text style={styles.aiSectionTitle}>✅ Best Colors For You</Text>
            <View style={styles.aiColorTags}>
              {style.recommended_colors.slice(0, 8).map((color, idx) => (
                <View key={idx} style={styles.aiColorTag}>
                  <View style={[styles.aiColorSwatch, { backgroundColor: getColorHex(color) || COLORS.border }]} />
                  <Text style={styles.aiColorTagText}>{String(color)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {Array.isArray(style.colors_to_avoid) && style.colors_to_avoid.length > 0 && (
          <View style={styles.aiSection}>
            <Text style={styles.aiSectionTitle}>❌ Colors to Avoid</Text>
            <View style={styles.aiColorTags}>
              {style.colors_to_avoid.slice(0, 8).map((color, idx) => (
                <View key={idx} style={[styles.aiColorTag, styles.aiColorTagBad]}>
                  <View style={[styles.aiColorSwatch, { backgroundColor: getColorHex(color) || COLORS.border }]} />
                  <Text style={styles.aiColorTagText}>{String(color)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

        {(style.style_strengths || style.style_opportunities) && (
          <View style={styles.aiSection}>
            <Text style={styles.aiSectionTitle}>🎯 Style Strategy</Text>
            {!!style.style_strengths && (
              <View style={styles.aiStrategyBox}>
                <Text style={styles.aiStrategyLabel}>💪 Your Strengths</Text>
                <Text style={styles.aiStrategyText}>{String(style.style_strengths)}</Text>
              </View>
            )}
            {!!style.style_opportunities && (
              <View style={[styles.aiStrategyBox, { marginTop: 8 }]}>
                <Text style={styles.aiStrategyLabel}>🚀 Opportunities to Try</Text>
                <Text style={styles.aiStrategyText}>{String(style.style_opportunities)}</Text>
              </View>
            )}
          </View>
        )}

        {(style.accessory_suggestions || style.seasonal_recommendations) && (
          <View style={styles.aiSection}>
            <Text style={styles.aiSectionTitle}>💍 Accessories & Seasons</Text>
            {!!style.accessory_suggestions && (
              <View style={styles.aiStrategyBox}>
                <Text style={styles.aiStrategyLabel}>✨ Accessories</Text>
                <Text style={styles.aiStrategyText}>{String(style.accessory_suggestions)}</Text>
              </View>
            )}
            {!!style.seasonal_recommendations && (
              <View style={[styles.aiStrategyBox, { marginTop: 8 }]}>
                <Text style={styles.aiStrategyLabel}>🌤️ Seasonal Tip</Text>
                <Text style={styles.aiStrategyText}>{String(style.seasonal_recommendations)}</Text>
              </View>
            )}
          </View>
        )}

        {summaryPoints.length > 0 && (
          <View style={styles.aiNotesBox}>
            <Text style={styles.aiNotesLabel}>💡 Style Insights</Text>
            {summaryPoints.map((tip, idx) => (
              <Text key={idx} style={styles.aiNotesText}>• {String(tip)}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const ProfileEditModal = ({ visible, initialProfile, onClose, onSave, saving }) => {
  const [draft, setDraft] = useState(initialProfile || {});
  const [occupationMode, setOccupationMode] = useState('select'); // select | other
  const [occupationOther, setOccupationOther] = useState('');

  useEffect(() => {
    setDraft(initialProfile || {});
    const rawOcc = (initialProfile?.occupation || '').toString();
    const occupationKeys = new Set(OCCUPATIONS.map(o => o.value).filter(Boolean));
    const occIsKnown = occupationKeys.has(rawOcc);
    if (rawOcc && !occIsKnown) {
      setOccupationMode('other');
      setOccupationOther(rawOcc);
    } else {
      setOccupationMode('select');
      setOccupationOther('');
    }
  }, [initialProfile, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitle}>Edit profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }}
        >
          <View style={styles.formCard}>
            <Field
              label="Name"
              placeholder="Your name"
              value={draft.name || ''}
              onChangeText={(t) => setDraft((p) => ({ ...p, name: t }))}
            />
            <CustomSelect
              label="Gender"
              icon="🧑"
              options={GENDERS}
              value={draft.gender || ''}
              onChange={(v) => setDraft((p) => ({ ...p, gender: v }))}
            />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <Field
                  label="Age"
                  placeholder="e.g. 25"
                  keyboardType="numeric"
                  value={draft.age || ''}
                  onChangeText={(t) => setDraft((p) => ({ ...p, age: t }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Height (cm)"
                  placeholder="e.g. 170"
                  keyboardType="numeric"
                  value={draft.height || ''}
                  onChangeText={(t) => setDraft((p) => ({ ...p, height: t }))}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <Field
                  label="Weight (kg)"
                  placeholder="e.g. 65"
                  keyboardType="numeric"
                  value={draft.weight || ''}
                  onChangeText={(t) => setDraft((p) => ({ ...p, weight: t }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomSelect
                  label="Marital status"
                  icon="💍"
                  options={MARITAL_STATUSES}
                  value={draft.marital_status || ''}
                  onChange={(v) => setDraft((p) => ({ ...p, marital_status: v }))}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <CustomSelect
                  label="Body type"
                  icon="👤"
                  options={BODY_TYPES}
                  value={draft.body_type || ''}
                  onChange={(v) => setDraft((p) => ({ ...p, body_type: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomSelect
                  label="Skin tone"
                  icon="🎨"
                  options={FACE_TONES}
                  value={draft.face_tone || ''}
                  onChange={(v) => setDraft((p) => ({ ...p, face_tone: v }))}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SPACING.md }}>
                <CustomSelect
                  label="Country"
                  icon="🌍"
                  options={COUNTRIES}
                  value={draft.country || ''}
                  onChange={(v) => setDraft((p) => ({ ...p, country: v, state: '' }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomSelect
                  label={draft.country === 'united_kingdom' ? 'Region' : 'State'}
                  icon="📍"
                  options={STATES_BY_COUNTRY[draft.country] || [{ value: '', label: 'Select state', icon: '📍' }]}
                  value={draft.state || ''}
                  onChange={(v) => setDraft((p) => ({ ...p, state: v }))}
                />
              </View>
            </View>
            {occupationMode === 'other' ? (
              <View>
                <CustomSelect
                  label="Occupation"
                  icon="💼"
                  options={OCCUPATIONS}
                  value="other"
                  onChange={(v) => {
                    if (v === 'other') {
                      setOccupationMode('other');
                    } else {
                      setOccupationMode('select');
                      setOccupationOther('');
                      setDraft((p) => ({ ...p, occupation: v }));
                    }
                  }}
                />
                <Field
                  label="Occupation (other)"
                  placeholder="Type your occupation"
                  value={occupationOther || ''}
                  onChangeText={setOccupationOther}
                />
              </View>
            ) : (
              <CustomSelect
                label="Occupation"
                icon="💼"
                options={OCCUPATIONS}
                value={draft.occupation || ''}
                onChange={(v) => {
                  if (v === 'other') {
                    setOccupationMode('other');
                    setOccupationOther('');
                    setDraft((p) => ({ ...p, occupation: '' }));
                  } else {
                    setDraft((p) => ({ ...p, occupation: v }));
                  }
                }}
              />
            )}
            <Field
              label="Style preferences"
              placeholder="Minimalist, smart casual, neutral colors..."
              value={draft.additional_info || ''}
              multiline
              onChangeText={(t) => setDraft((p) => ({ ...p, additional_info: t }))}
            />

            <View style={styles.chipsContainer}>
              {STYLE_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.chip}
                  onPress={() => {
                    const current = (draft.additional_info || '').toString();
                    if (current.toLowerCase().includes(tag.toLowerCase())) return;
                    const newText = current ? `${current}, ${tag}` : tag;
                    setDraft((p) => ({ ...p, additional_info: newText }));
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, { textTransform: 'none' }]}>+ {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={() => {
              const occFinal =
                occupationMode === 'other'
                  ? (occupationOther || '').trim()
                  : (draft.occupation || '').trim();
              onSave?.({ ...draft, occupation: occFinal });
            }}
            disabled={saving}
            activeOpacity={0.9}
          >
            <LinearGradient colors={COLORS.gradients.primary} style={styles.primaryButtonGradient}>
              {saving ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.textPrimary} size="small" />
                  <Text style={styles.primaryButtonText}> Saving...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
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
      pollIntervalRef.current = null;
      pollTimeoutRef.current = null;
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
      const ai = parsedAdditional?.ai_profile_analysis || null;
      setAiProfile(ai);

      // small delay for tunnel stability
      await new Promise((r) => setTimeout(r, 250));

      const imgs = await userImagesAPI.getImages();
      const sorted = (imgs || []).slice().sort((a, b) => b.id - a.id);
      setImages(sorted);
    } catch (e) {
      if (e?.response?.status !== 401) {
        console.error('MeScreen load error:', e);
        Alert.alert('Error', 'Failed to load your profile/photos');
      }
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
    try {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          const newAssets = Array.from(files).map(file => ({
            uri: URL.createObjectURL(file),
            file,
            id: Math.random().toString(36).slice(2, 11),
          }));
          setSelectedAssets(prev => [...prev, ...newAssets]);
        };
        input.click();
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (!result.canceled && result.assets?.length) {
        const baseAssets = result.assets.map(a => ({ ...a, id: Math.random().toString(36).slice(2, 11) }));
        setSelectedAssets(prev => [...prev, ...baseAssets]);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to pick photos');
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
      const assetsToUpload = [...selectedAssets];

      for (const asset of assetsToUpload) {
        try {
          let finalUri = asset.uri;
          const fileObj = asset.file;

          if (!fileObj && Platform.OS !== 'web') {
            try {
              let resizeAction = {};
              if (asset.width && asset.height) {
                if (asset.width > asset.height) {
                  if (asset.width > 1536) resizeAction = { width: 1536 };
                } else {
                  if (asset.height > 1536) resizeAction = { height: 1536 };
                }
              }
              const actions = Object.keys(resizeAction).length ? [{ resize: resizeAction }] : [];
              if (actions.length) {
                const manipulated = await ImageManipulator.manipulateAsync(
                  asset.uri,
                  actions,
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                finalUri = manipulated.uri;
              }
            } catch {}
          }

          const uploaded = fileObj
            ? await userImagesAPI.uploadImage('user_image', fileObj)
            : await userImagesAPI.uploadImage('user_image', finalUri);

          if (uploaded?.id) successCount++;
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }

      if (successCount > 0) {
        setSelectedAssets([]);
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to upload photos');
      }
    } finally {
      setUploading(false);
    }
  };

  const analyzePending = async () => {
    if (pendingCount === 0) return;
    try {
      setProcessing(true);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      pollIntervalRef.current = null;
      pollTimeoutRef.current = null;

      await aiProcessingAPI.processUserImages();

      const checkStatus = setInterval(async () => {
        const data = await userImagesAPI.getImages();
        const allCompleted = data.every(img => img.processing_status === 'completed');
        if (allCompleted) {
          clearInterval(checkStatus);
          pollIntervalRef.current = null;
          await loadData();
          setProcessing(false);
        }
      }, 2000);
      pollIntervalRef.current = checkStatus;

      const timeoutId = setTimeout(() => {
        clearInterval(checkStatus);
        pollIntervalRef.current = null;
        setProcessing(false);
        loadData();
      }, 60000);
      pollTimeoutRef.current = timeoutId;
    } catch (e) {
      setProcessing(false);
      if (e?.response?.status !== 401) Alert.alert('Error', e?.response?.data?.detail || 'Failed to analyze');
    }
  };

  const deletePhoto = async (imageId) => {
    Alert.alert('Delete photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userImagesAPI.deleteImage(imageId);
            setImages(prev => prev.filter(img => img.id !== imageId));
          } catch {}
        },
      },
    ]);
  };

  const saveProfile = async (draft) => {
    try {
      setSavingProfile(true);

      // Preserve ai_profile_analysis while storing user text as user_style_preferences
      const existingObj = additionalInfoObj || safeJsonParse(profile?.additional_info) || {};
      const additionalInfoToSave =
        existingObj && typeof existingObj === 'object'
          ? JSON.stringify({ ...existingObj, user_style_preferences: draft.additional_info || '' })
          : (draft.additional_info || '');

      const payload = {
        name: (draft.name || '').trim() || null,
        gender: (draft.gender || '').trim() || null,
        age: draft.age ? parseInt(draft.age, 10) : null,
        height: draft.height ? parseFloat(draft.height) : null,
        weight: draft.weight ? parseFloat(draft.weight) : null,
        marital_status: (draft.marital_status || '').trim() || null,
        body_type: (draft.body_type || '').trim() || null,
        face_tone: (draft.face_tone || '').trim() || null,
        state: (draft.state || '').trim() || null,
        country: (draft.country || '').trim() || null,
        occupation: (draft.occupation || '').trim() || null,
        additional_info: additionalInfoToSave,
      };

      if (profile) {
        await profileAPI.updateProfile(payload);
      } else {
        await profileAPI.createProfile(payload);
      }

      setShowEdit(false);
      await loadData();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const aiHighlights = useMemo(() => {
    const analysis = aiProfile?.analysis || {};
    const style = analysis.style_assessment || {};
    const points = analysis.summary_points || [];
    const fallback = toBulletHighlights(style.style_notes, 3);
    return (Array.isArray(points) && points.length ? points : fallback).slice(0, 3);
  }, [aiProfile]);

  const bestColors = useMemo(() => {
    const analysis = aiProfile?.analysis || {};
    const style = analysis.style_assessment || {};
    const colors = style.recommended_colors || [];
    return Array.isArray(colors) ? colors.slice(0, 5) : [];
  }, [aiProfile]);

  const photoSlots = useMemo(() => {
    const slots = 6;
    const padded = images.slice(0, slots);
    return { slots, padded };
  }, [images]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading you...</Text>
      </View>
    );
  }

  const profileDraft = {
    name: profile?.name || '',
    gender: profile?.gender || '',
    age: profile?.age?.toString?.() || '',
    height: profile?.height?.toString?.() || '',
    weight: profile?.weight?.toString?.() || '',
    marital_status: profile?.marital_status || '',
    body_type: profile?.body_type || '',
    face_tone: profile?.face_tone || '',
    state: profile?.state || '',
    country: profile?.country || '',
    occupation: profile?.occupation || '',
    additional_info: (() => {
      // NEVER show raw JSON here; extract user_style_preferences if JSON.
      return extractUserStyleText(additionalInfoObj || profile?.additional_info || '');
    })(),
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

      <ProfileEditModal
        visible={showEdit}
        initialProfile={profileDraft}
        onClose={() => setShowEdit(false)}
        onSave={saveProfile}
        saving={savingProfile}
      />

      <ImagePreviewModal
        visible={showImageModal}
        imageUrl={selectedImageUrl}
        onClose={() => setShowImageModal(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Me</Text>
            <Text style={styles.subtitle}>Your profile + style photos</Text>
          </View>

          {/* Profile card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Profile</Text>
                <Text style={styles.cardSubtle} numberOfLines={1}>Personal details</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: statusPill.bg }]}>
                <Text style={styles.pillText}>{statusPill.text}</Text>
              </View>
            </View>

            <View style={styles.profileGrid}>
              <InfoChip label="Name" value={profile?.name || '—'} />
              <InfoChip label="Gender" value={profile?.gender || '—'} />
              <InfoChip label="Age" value={profile?.age ? String(profile.age) : '—'} />
              <InfoChip label="Height" value={profile?.height ? `${profile.height} cm` : '—'} />
              <InfoChip label="Weight" value={profile?.weight ? `${profile.weight} kg` : '—'} />
              <InfoChip label="Marital" value={profile?.marital_status || '—'} />
              <InfoChip label="Body type" value={profile?.body_type || (aiProfile?.analysis?.physical_attributes?.body_type || '—')} />
              <InfoChip label="Skin tone" value={profile?.face_tone || (aiProfile?.analysis?.physical_attributes?.skin_tone || '—')} />
              <InfoChip label="Location" value={(profile?.state || profile?.country) ? `${profile?.state || ''}${profile?.state && profile?.country ? ', ' : ''}${profile?.country || ''}` : '—'} />
              <InfoChip label="Occupation" value={profile?.occupation || '—'} />
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => setShowEdit(true)} activeOpacity={0.85}>
              <LinearGradient colors={COLORS.gradients.accent} style={styles.editButtonGrad}>
                <Text style={styles.editButtonText}>Edit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Progress card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Setup progress</Text>
              <Text style={styles.cardSubtle}>{setupProgress.done}/{setupProgress.target}</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient colors={COLORS.gradients.primary} style={[styles.progressFill, { width: `${setupProgress.pct}%` }]} />
            </View>
            <Text style={styles.hintText}>
              Add at least 3 clear photos to unlock your best recommendations.
            </Text>
          </View>

          {/* Photos card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Style photos</Text>
                <Text style={styles.cardSubtle}>
                  {images.length} uploaded • {analyzedCount} analyzed • {pendingCount} pending
                </Text>
              </View>
              <TouchableOpacity style={styles.ghostButton} onPress={pickImages} activeOpacity={0.85}>
                <Text style={styles.ghostButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {/* Selected strip */}
            {selectedAssets.length > 0 && (
              <View style={{ marginTop: SPACING.md }}>
                <Text style={styles.sectionLabel}>Ready to upload ({selectedAssets.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {selectedAssets.map((a) => (
                    <View key={a.id} style={styles.previewItem}>
                      <Image source={{ uri: a.uri }} style={styles.previewImage} contentFit="cover" />
                      <TouchableOpacity style={styles.previewRemove} onPress={() => removeSelectedAsset(a.id)} activeOpacity={0.9}>
                        <Text style={styles.previewRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.primaryButton, uploading && styles.buttonDisabled, { marginTop: SPACING.md }]}
                  onPress={uploadSelected}
                  disabled={uploading}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={COLORS.gradients.primary} style={styles.primaryButtonGradient}>
                    {uploading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color={COLORS.textPrimary} size="small" />
                        <Text style={styles.primaryButtonText}> Uploading...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>Upload selected</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Photo grid */}
            <View style={styles.photoGrid}>
              {Array.from({ length: photoSlots.slots }).map((_, idx) => {
                const item = photoSlots.padded[idx];
                const uri = item?.image_path
                  ? (item.image_path.startsWith('http') ? item.image_path : `${API_BASE_URL}/${item.image_path}`)
                  : null;
                const status = item?.processing_status || null;
                return (
                  <View key={idx} style={styles.photoTile}>
                    {uri ? (
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => openImage(uri)} activeOpacity={0.9}>
                        <Image source={{ uri }} style={styles.photoImage} contentFit="cover" transition={200} />
                        <View style={styles.photoOverlay}>
                          <View style={[styles.photoStatusPill, status === 'completed' ? styles.statusOk : (status === 'pending' ? styles.statusWarn : styles.statusMuted)]}>
                            <Text style={styles.photoStatusText}>
                              {status === 'completed' ? 'Done' : status === 'pending' ? 'Pending' : status === 'processing' ? 'Processing' : '—'}
                            </Text>
                          </View>
                          <TouchableOpacity style={styles.photoDelete} onPress={() => deletePhoto(item.id)} activeOpacity={0.9}>
                            <Text style={styles.photoDeleteText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.photoEmpty} onPress={pickImages} activeOpacity={0.85}>
                        <Text style={styles.photoEmptyIcon}>＋</Text>
                        <Text style={styles.photoEmptyText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {pendingCount > 0 && (
              <TouchableOpacity
                style={[styles.primaryButton, processing && styles.buttonDisabled, { marginTop: SPACING.md }]}
                onPress={analyzePending}
                disabled={processing}
                activeOpacity={0.9}
              >
                <LinearGradient colors={COLORS.gradients.accent} style={styles.primaryButtonGradient}>
                  {processing ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color={COLORS.textPrimary} size="small" />
                      <Text style={styles.primaryButtonText}> Analyzing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Analyze pending photos</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* AI snapshot */}
          {aiProfile?.analysis && (
            <AIProfileCard profile={aiProfile} />
          )}
        </View>
      </ScrollView>

      <FlowNavBar
        prev={null}
        next={{
          route: 'Wardrobe',
          label: analyzedCount >= 1 ? 'Next: Wardrobe' : 'Add photos first',
          icon: '👗',
          enabled: analyzedCount >= 1,
        }}
      />
    </View>
  );
}

const InfoChip = ({ label, value }) => (
  <View style={styles.infoChip}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{String(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.lg, color: COLORS.textSecondary, fontSize: 16 },

  header: { marginBottom: SPACING.lg, paddingTop: SPACING.md },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  cardSubtle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  pillText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },

  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  infoChip: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },

  editButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', alignSelf: 'flex-start' },
  editButtonGrad: { paddingVertical: 10, paddingHorizontal: 14 },
  editButtonText: { fontSize: 13, fontWeight: '900', color: COLORS.textPrimary },

  progressTrack: {
    height: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  progressFill: { height: '100%', borderRadius: 6 },
  hintText: { marginTop: 10, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  ghostButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ghostButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  previewItem: { width: 86, height: 110, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginRight: SPACING.sm },
  previewImage: { width: '100%', height: '100%', backgroundColor: COLORS.surfaceLight },
  previewRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRemoveText: { color: 'white', fontSize: 11, fontWeight: '900' },

  primaryButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  primaryButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary },
  buttonDisabled: { opacity: 0.6 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  photoTile: {
    width: '31%',
    aspectRatio: 0.78,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    alignItems: 'flex-start',
  },
  photoStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  photoStatusText: { fontSize: 10, fontWeight: '800', color: COLORS.textPrimary },
  statusOk: { backgroundColor: COLORS.success },
  statusWarn: { backgroundColor: COLORS.warning },
  statusMuted: { backgroundColor: COLORS.textMuted },
  photoDelete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoDeleteText: { color: 'white', fontSize: 12, fontWeight: '900' },
  photoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoEmptyIcon: { fontSize: 22, fontWeight: '900', color: COLORS.textMuted },
  photoEmptyText: { marginTop: 6, fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  chip: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize' },
  bullet: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 6 },

  // Chips grid (used in edit modal)
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },

  // Select (dropdown-like) inputs
  selectContainer: { marginBottom: SPACING.md },
  selectLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 6 },
  selectButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },
  selectArrow: { fontSize: 12, color: COLORS.textMuted, fontWeight: '900' },
  optionsContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    maxHeight: 220,
    overflow: 'hidden',
  },
  optionItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionItemSelected: { backgroundColor: COLORS.primary + '18' },
  optionText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  optionTextSelected: { color: COLORS.primary },
  checkmark: { fontSize: 14, color: COLORS.primary, fontWeight: '900' },

  // AI profile card
  aiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  aiHeaderGradient: { padding: SPACING.lg },
  aiTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  aiSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  aiSection: { marginBottom: SPACING.lg },
  aiSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  aiAttributeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  aiAttributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiAttributeIcon: { fontSize: 16, marginRight: SPACING.sm },
  aiAttributeLabel: { fontSize: 10, color: COLORS.textMuted },
  aiAttributeValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize' },
  aiColorTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  aiColorTag: {
    backgroundColor: COLORS.success + '30',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiColorTagBad: { backgroundColor: COLORS.error + '30' },
  aiStyleTag: { backgroundColor: COLORS.primary + '30' },
  aiColorTagText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '800', textTransform: 'capitalize' },
  aiColorSwatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  aiStrategyBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  aiStrategyLabel: { fontSize: 12, fontWeight: '900', color: COLORS.primary, marginBottom: 4, textTransform: 'uppercase' },
  aiStrategyText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  aiNotesBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.tertiary,
  },
  aiNotesLabel: { fontSize: 13, fontWeight: '900', color: COLORS.tertiary, marginBottom: SPACING.xs },
  aiNotesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Modals
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '900' },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 6 },
  inputContainer: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg },
  input: { padding: SPACING.md, fontSize: 15, color: COLORS.textPrimary },
  row: { flexDirection: 'row' },

  imagePreviewContainer: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, paddingTop: SPACING.xl },
  imagePreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  imagePreviewTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  imagePreviewBody: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  imagePreviewImage: { width: '100%', height: '100%' },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenterText: { fontSize: 14, color: COLORS.textMuted },
});

