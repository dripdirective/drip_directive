import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { profileAPI } from '../services/api';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

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
  { value: 'medium', label: 'Medium', icon: '🧡' },
  { value: 'olive', label: 'Olive', icon: '💚' },
  { value: 'dark', label: 'Dark', icon: '🤎' },
  { value: 'deep', label: 'Deep', icon: '🖤' },
];

const COUNTRIES = [
  { value: '', label: 'Select country', icon: '🌍' },
  { value: 'india', label: 'India', icon: '🇮🇳' },
  { value: 'united_states', label: 'United States', icon: '🇺🇸' },
  { value: 'united_kingdom', label: 'United Kingdom', icon: '🇬🇧' },
  { value: 'canada', label: 'Canada', icon: '🇨🇦' },
];

const STATES_BY_COUNTRY = {
  india: [
    { value: '', label: 'Select state', icon: '📍' },
    // States
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
    { value: 'manipur', label: 'Manipur', icon: '📍' },
    { value: 'meghalaya', label: 'Meghalaya', icon: '📍' },
    { value: 'mizoram', label: 'Mizoram', icon: '📍' },
    { value: 'nagaland', label: 'Nagaland', icon: '📍' },
    { value: 'odisha', label: 'Odisha', icon: '📍' },
    { value: 'punjab', label: 'Punjab', icon: '📍' },
    { value: 'rajasthan', label: 'Rajasthan', icon: '📍' },
    { value: 'sikkim', label: 'Sikkim', icon: '📍' },
    { value: 'tamil_nadu', label: 'Tamil Nadu', icon: '📍' },
    { value: 'telangana', label: 'Telangana', icon: '📍' },
    { value: 'tripura', label: 'Tripura', icon: '📍' },
    { value: 'uttar_pradesh', label: 'Uttar Pradesh', icon: '📍' },
    { value: 'uttarakhand', label: 'Uttarakhand', icon: '📍' },
    { value: 'west_bengal', label: 'West Bengal', icon: '📍' },
    // Union Territories
    { value: 'andaman_and_nicobar_islands', label: 'Andaman and Nicobar Islands (UT)', icon: '📍' },
    { value: 'chandigarh', label: 'Chandigarh (UT)', icon: '📍' },
    { value: 'dadra_and_nagar_haveli_and_daman_and_diu', label: 'Dadra & Nagar Haveli and Daman & Diu (UT)', icon: '📍' },
    { value: 'delhi', label: 'Delhi (NCT)', icon: '📍' },
    { value: 'jammu_and_kashmir', label: 'Jammu and Kashmir (UT)', icon: '📍' },
    { value: 'ladakh', label: 'Ladakh (UT)', icon: '📍' },
    { value: 'lakshadweep', label: 'Lakshadweep (UT)', icon: '📍' },
    { value: 'puducherry', label: 'Puducherry (UT)', icon: '📍' },
  ],
  united_states: [
    { value: '', label: 'Select state', icon: '📍' },
    { value: 'alabama', label: 'Alabama', icon: '📍' },
    { value: 'alaska', label: 'Alaska', icon: '📍' },
    { value: 'arizona', label: 'Arizona', icon: '📍' },
    { value: 'arkansas', label: 'Arkansas', icon: '📍' },
    { value: 'california', label: 'California', icon: '📍' },
    { value: 'colorado', label: 'Colorado', icon: '📍' },
    { value: 'connecticut', label: 'Connecticut', icon: '📍' },
    { value: 'delaware', label: 'Delaware', icon: '📍' },
    { value: 'district_of_columbia', label: 'District of Columbia', icon: '📍' },
    { value: 'florida', label: 'Florida', icon: '📍' },
    { value: 'georgia', label: 'Georgia', icon: '📍' },
    { value: 'hawaii', label: 'Hawaii', icon: '📍' },
    { value: 'idaho', label: 'Idaho', icon: '📍' },
    { value: 'illinois', label: 'Illinois', icon: '📍' },
    { value: 'indiana', label: 'Indiana', icon: '📍' },
    { value: 'iowa', label: 'Iowa', icon: '📍' },
    { value: 'kansas', label: 'Kansas', icon: '📍' },
    { value: 'kentucky', label: 'Kentucky', icon: '📍' },
    { value: 'louisiana', label: 'Louisiana', icon: '📍' },
    { value: 'maine', label: 'Maine', icon: '📍' },
    { value: 'maryland', label: 'Maryland', icon: '📍' },
    { value: 'massachusetts', label: 'Massachusetts', icon: '📍' },
    { value: 'michigan', label: 'Michigan', icon: '📍' },
    { value: 'minnesota', label: 'Minnesota', icon: '📍' },
    { value: 'mississippi', label: 'Mississippi', icon: '📍' },
    { value: 'missouri', label: 'Missouri', icon: '📍' },
    { value: 'montana', label: 'Montana', icon: '📍' },
    { value: 'nebraska', label: 'Nebraska', icon: '📍' },
    { value: 'nevada', label: 'Nevada', icon: '📍' },
    { value: 'new_hampshire', label: 'New Hampshire', icon: '📍' },
    { value: 'new_jersey', label: 'New Jersey', icon: '📍' },
    { value: 'new_mexico', label: 'New Mexico', icon: '📍' },
    { value: 'new_york', label: 'New York', icon: '📍' },
    { value: 'north_carolina', label: 'North Carolina', icon: '📍' },
    { value: 'north_dakota', label: 'North Dakota', icon: '📍' },
    { value: 'ohio', label: 'Ohio', icon: '📍' },
    { value: 'oklahoma', label: 'Oklahoma', icon: '📍' },
    { value: 'oregon', label: 'Oregon', icon: '📍' },
    { value: 'pennsylvania', label: 'Pennsylvania', icon: '📍' },
    { value: 'rhode_island', label: 'Rhode Island', icon: '📍' },
    { value: 'south_carolina', label: 'South Carolina', icon: '📍' },
    { value: 'south_dakota', label: 'South Dakota', icon: '📍' },
    { value: 'tennessee', label: 'Tennessee', icon: '📍' },
    { value: 'texas', label: 'Texas', icon: '📍' },
    { value: 'utah', label: 'Utah', icon: '📍' },
    { value: 'vermont', label: 'Vermont', icon: '📍' },
    { value: 'virginia', label: 'Virginia', icon: '📍' },
    { value: 'washington', label: 'Washington', icon: '📍' },
    { value: 'west_virginia', label: 'West Virginia', icon: '📍' },
    { value: 'wisconsin', label: 'Wisconsin', icon: '📍' },
    { value: 'wyoming', label: 'Wyoming', icon: '📍' },
  ],
  united_kingdom: [
    { value: '', label: 'Select region', icon: '📍' },
    // Nations
    { value: 'england', label: 'England', icon: '📍' },
    { value: 'scotland', label: 'Scotland', icon: '📍' },
    { value: 'wales', label: 'Wales', icon: '📍' },
    { value: 'northern_ireland', label: 'Northern Ireland', icon: '📍' },
    // Major regions (England)
    { value: 'london', label: 'London', icon: '📍' },
    { value: 'south_east', label: 'South East', icon: '📍' },
    { value: 'south_west', label: 'South West', icon: '📍' },
    { value: 'east_of_england', label: 'East of England', icon: '📍' },
    { value: 'west_midlands', label: 'West Midlands', icon: '📍' },
    { value: 'east_midlands', label: 'East Midlands', icon: '📍' },
    { value: 'yorkshire_and_the_humber', label: 'Yorkshire and the Humber', icon: '📍' },
    { value: 'north_west', label: 'North West', icon: '📍' },
    { value: 'north_east', label: 'North East', icon: '📍' },
  ],
  canada: [
    { value: '', label: 'Select province/territory', icon: '📍' },
    // Provinces
    { value: 'alberta', label: 'Alberta', icon: '📍' },
    { value: 'british_columbia', label: 'British Columbia', icon: '📍' },
    { value: 'manitoba', label: 'Manitoba', icon: '📍' },
    { value: 'new_brunswick', label: 'New Brunswick', icon: '📍' },
    { value: 'newfoundland_and_labrador', label: 'Newfoundland and Labrador', icon: '📍' },
    { value: 'nova_scotia', label: 'Nova Scotia', icon: '📍' },
    { value: 'ontario', label: 'Ontario', icon: '📍' },
    { value: 'prince_edward_island', label: 'Prince Edward Island', icon: '📍' },
    { value: 'quebec', label: 'Quebec', icon: '📍' },
    { value: 'saskatchewan', label: 'Saskatchewan', icon: '📍' },
    // Territories
    { value: 'northwest_territories', label: 'Northwest Territories', icon: '📍' },
    { value: 'nunavut', label: 'Nunavut', icon: '📍' },
    { value: 'yukon', label: 'Yukon', icon: '📍' },
  ],
};

const OCCUPATIONS = [
  { value: '', label: 'Select occupation', icon: '💼' },
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'software_engineer', label: 'Software Engineer', icon: '🧑‍💻' },
  { value: 'business', label: 'Business / Entrepreneur', icon: '📈' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'designer', label: 'Designer', icon: '🎨' },
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

const safeJsonParse = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Quick heuristic to avoid parsing regular text
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!looksJson) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const extractUserStyleText = (additionalInfoObj) => {
  if (!additionalInfoObj || typeof additionalInfoObj !== 'object') return '';
  return (
    additionalInfoObj.user_style_preferences ||
    additionalInfoObj.style_preferences ||
    additionalInfoObj.user_notes ||
    additionalInfoObj.additional_notes ||
    ''
  );
};

// Custom Select Component
const CustomSelect = ({ label, icon, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];
  
  return (
    <View style={styles.selectContainer}>
      <Text style={styles.label}>{icon} {label}</Text>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={styles.selectButtonText}>
          {selectedOption.icon} {selectedOption.label}
        </Text>
        <Text style={styles.selectArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionItem,
                value === option.value && styles.optionItemSelected
              ]}
              onPress={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <Text style={[
                styles.optionText,
                value === option.value && styles.optionTextSelected
              ]}>
                {option.icon} {option.label}
              </Text>
              {value === option.value && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    gender: '',
    height: '',
    weight: '',
    body_type: '',
    face_tone: '',
    state: '',
    country: '',
    occupation: '',
    additional_info: '',
  });
  const [isNew, setIsNew] = useState(false);
  const [additionalInfoObj, setAdditionalInfoObj] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [occupationMode, setOccupationMode] = useState('select'); // select | other
  const [occupationOther, setOccupationOther] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.getProfile();
      const parsedAdditional = safeJsonParse(data.additional_info);
      const styleText = parsedAdditional ? extractUserStyleText(parsedAdditional) : (data.additional_info || '');
      setAdditionalInfoObj(parsedAdditional);

      // Occupation: if it's not one of the known keys, treat it as "Other"
      const rawOccupation = (data.occupation || '').toString();
      const occupationKeys = new Set(OCCUPATIONS.map(o => o.value).filter(Boolean));
      const occIsKnown = occupationKeys.has(rawOccupation);
      if (rawOccupation && !occIsKnown) {
        setOccupationMode('other');
        setOccupationOther(rawOccupation);
      } else {
        setOccupationMode('select');
        setOccupationOther('');
      }

      setProfile({
        name: data.name || '',
        gender: data.gender || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
        body_type: data.body_type || '',
        face_tone: data.face_tone || '',
        state: data.state || '',
        country: data.country || '',
        occupation: rawOccupation || '',
        additional_info: styleText || '',
      });
      setIsNew(false);
      const snap = {
        name: data.name || '',
        gender: data.gender || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
        body_type: data.body_type || '',
        face_tone: data.face_tone || '',
        state: data.state || '',
        country: data.country || '',
        occupation: rawOccupation || '',
        additional_info: styleText || '',
      };
      setInitialSnapshot(snap);
    } catch (error) {
      if (error.response?.status === 404) {
        setIsNew(true);
        setInitialSnapshot({
          name: '',
          gender: '',
          height: '',
          weight: '',
          body_type: '',
          face_tone: '',
          state: '',
          country: '',
          occupation: '',
          additional_info: '',
        });
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    const keys = Object.keys(initialSnapshot);
    return keys.some((k) => (profile[k] || '') !== (initialSnapshot[k] || ''));
  }, [profile, initialSnapshot]);

  const saveButtonLabel = useMemo(() => {
    if (saving) return null;
    if (!isDirty && lastSavedAt) return '✅ Saved';
    if (isNew) return '✨ Create Profile';
    return '💾 Save Changes';
  }, [saving, isDirty, lastSavedAt, isNew]);

  const saveHintText = useMemo(() => {
    if (saving) return 'Saving...';
    if (!isDirty && lastSavedAt) return 'Saved. You can continue exploring or move to Photos.';
    if (isDirty) return 'Unsaved changes';
    return 'Tip: Save anytime — recommendations improve as you add more info.';
  }, [saving, isDirty, lastSavedAt]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedBanner(false);

      // Preserve any existing JSON in `additional_info` (e.g. ai_profile_analysis)
      // while storing the user's style preferences as human-readable text.
      const existingObj = additionalInfoObj || safeJsonParse(profile.additional_info);
      const additionalInfoToSave =
        existingObj && typeof existingObj === 'object'
          ? JSON.stringify({ ...existingObj, user_style_preferences: profile.additional_info || '' })
          : (profile.additional_info || '');

      const profileData = {
        ...profile,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null,
        additional_info: additionalInfoToSave,
      };

      // If occupation is "Other", store the typed text
      if (occupationMode === 'other') {
        profileData.occupation = (occupationOther || '').trim();
      }

      if (isNew) {
        await profileAPI.createProfile(profileData);
        Alert.alert('Success', 'Profile created successfully');
      } else {
        await profileAPI.updateProfile(profileData);
        Alert.alert('Success', 'Profile updated successfully');
      }
      setIsNew(false);
      setLastSavedAt(Date.now());
      setSavedBanner(true);
      setInitialSnapshot({ ...profile });
      if (existingObj && typeof existingObj === 'object') {
        setAdditionalInfoObj({ ...existingObj, user_style_preferences: profile.additional_info || '' });
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[COLORS.background, COLORS.backgroundLight]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>👤</Text>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.subtitle}>Tell us about yourself for better recommendations</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>✨ Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.textMuted}
                  value={profile.name}
                  onChangeText={(text) => setProfile({ ...profile, name: text })}
                />
              </View>
            </View>

            {/* Height & Weight Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.md }]}>
                <Text style={styles.label}>📏 Height (cm)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="170"
                    placeholderTextColor={COLORS.textMuted}
                    value={profile.height}
                    onChangeText={(text) => setProfile({ ...profile, height: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>⚖️ Weight (kg)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="65"
                    placeholderTextColor={COLORS.textMuted}
                    value={profile.weight}
                    onChangeText={(text) => setProfile({ ...profile, weight: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Gender - Custom Select */}
            <CustomSelect
              label="Gender"
              icon="🚻"
              options={GENDERS}
              value={profile.gender}
              onChange={(value) => setProfile({ ...profile, gender: value })}
            />

            {/* Body Type - Custom Select */}
            <CustomSelect
              label="Body Type"
              icon="🏃"
              options={BODY_TYPES}
              value={profile.body_type}
              onChange={(value) => setProfile({ ...profile, body_type: value })}
            />

            {/* Body type helper */}
            <View style={styles.helperBox}>
              <Text style={styles.helperTitle}>Body type guide</Text>
              <Text style={styles.helperItem}>• Slim: straighter silhouette, narrower shoulders/hips</Text>
              <Text style={styles.helperItem}>• Athletic: defined shoulders/arms, more muscle tone</Text>
              <Text style={styles.helperItem}>• Curvy/Plus size: fuller hips/bust; focus on comfort + structure</Text>
            </View>

            {/* Skin Tone - Custom Select */}
            <CustomSelect
              label="Skin Tone"
              icon="🎨"
              options={FACE_TONES}
              value={profile.face_tone}
              onChange={(value) => setProfile({ ...profile, face_tone: value })}
            />

            {/* Location Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.md }]}>
                <CustomSelect
                  label="Country"
                  icon="🌍"
                  options={COUNTRIES}
                  value={profile.country}
                  onChange={(value) => {
                    setProfile({ ...profile, country: value, state: '' });
                  }}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <CustomSelect
                  label="State"
                  icon="📍"
                  options={STATES_BY_COUNTRY[profile.country] || [{ value: '', label: 'Select country first', icon: '📍' }]}
                  value={profile.state}
                  onChange={(value) => setProfile({ ...profile, state: value })}
                />
              </View>
            </View>

            {/* Occupation */}
            <View style={styles.inputGroup}>
              <CustomSelect
                label="Occupation"
                icon="💼"
                options={OCCUPATIONS}
                value={occupationMode === 'other' ? 'other' : profile.occupation}
                onChange={(value) => {
                  if (value === 'other') {
                    setOccupationMode('other');
                    setProfile({ ...profile, occupation: '' });
                  } else {
                    setOccupationMode('select');
                    setOccupationOther('');
                    setProfile({ ...profile, occupation: value });
                  }
                }}
              />

              {occupationMode === 'other' && (
                <View style={[styles.inputContainer, { marginTop: SPACING.sm }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type your occupation"
                    placeholderTextColor={COLORS.textMuted}
                    value={occupationOther}
                    onChangeText={setOccupationOther}
                  />
                </View>
              )}
            </View>

            {/* Additional Info */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📝 Style Preferences</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about your style preferences, favorite colors, or any other details..."
                  placeholderTextColor={COLORS.textMuted}
                  value={profile.additional_info}
                  onChangeText={(text) => setProfile({ ...profile, additional_info: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
              {!!additionalInfoObj?.ai_profile_analysis && (
                <Text style={styles.noteText}>
                  ✅ Your AI photo analysis is saved separately and won’t be overwritten.
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || (!isDirty && !!lastSavedAt)) && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={!!saving || (!isDirty && !!lastSavedAt)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(saving || (!isDirty && !!lastSavedAt)) ? [COLORS.surfaceLight, COLORS.surface] : COLORS.gradients.primary}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {saveButtonLabel}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.saveHint, (!isDirty && lastSavedAt) && styles.saveHintSaved]}>
              {saveHintText}
            </Text>

          </View>
        </View>
      </ScrollView>

      <FlowNavBar
        prev={null}
        next={{
          route: 'UserImages',
          label: isNew ? 'Save profile first' : 'Next: Photos',
          icon: '📸',
          enabled: !isNew && !isDirty,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Form Card
  formCard: {
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  input: {
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  textAreaContainer: {
    minHeight: 100,
  },
  textArea: {
    textAlignVertical: 'top',
  },

  helperBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  helperTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  helperItem: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
  noteText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // Custom Select
  selectContainer: {
    marginBottom: SPACING.lg,
    zIndex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  optionsContainer: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  optionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Save Button
  saveButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  saveHint: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  saveHintSaved: {
    color: COLORS.success,
    fontWeight: '600',
  },
});
