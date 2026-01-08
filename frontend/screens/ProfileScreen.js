import React, { useState, useEffect } from 'react';
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
import { profileAPI } from '../services/api';
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

const GENDERS = [
  { value: '', label: 'Select gender', icon: '🧑' },
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'non-binary', label: 'Non-binary', icon: '🧑‍🤝‍🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
];

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
    city: '',
    additional_info: '',
  });
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.getProfile();
      setProfile({
        name: data.name || '',
        gender: data.gender || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
        body_type: data.body_type || '',
        face_tone: data.face_tone || '',
        state: data.state || '',
        city: data.city || '',
        additional_info: data.additional_info || '',
      });
      setIsNew(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setIsNew(true);
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const profileData = {
        ...profile,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null,
      };

      if (isNew) {
        await profileAPI.createProfile(profileData);
        Alert.alert('Success', 'Profile created successfully');
      } else {
        await profileAPI.updateProfile(profileData);
        Alert.alert('Success', 'Profile updated successfully');
      }
      setIsNew(false);
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
      
      <ScrollView showsVerticalScrollIndicator={false}>
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
                <Text style={styles.label}>📍 State</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    placeholderTextColor={COLORS.textMuted}
                    value={profile.state}
                    onChangeText={(text) => setProfile({ ...profile, state: text })}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>🏙️ City</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    placeholderTextColor={COLORS.textMuted}
                    value={profile.city}
                    onChangeText={(text) => setProfile({ ...profile, city: text })}
                  />
                </View>
              </View>
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
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={saving ? [COLORS.surfaceLight, COLORS.surface] : COLORS.gradients.primary}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isNew ? '✨ Create Profile' : '💾 Save Changes'}
                  </Text>
                )}
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
    backgroundColor: COLORS.background,
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
});
