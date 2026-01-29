import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { userImagesAPI, aiProcessingAPI, profileAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

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
  // try common forms like "light blue", "dark green"
  const parts = n.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (COLOR_HEX_MAP[last]) return COLOR_HEX_MAP[last];
  return null;
};

// AI Profile Card Component
const AIProfileCard = ({ profile }) => {
  if (!profile || !profile.analysis) return null;

  const { analysis } = profile;
  const physical = analysis.physical_attributes || {};
  const facial = analysis.facial_features || {};
  const style = analysis.style_assessment || {};
  const styleNotes = (() => {
    const raw = style.style_notes;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 6);
    if (typeof raw === 'string') {
      const chunks = raw
        .split(/\n|•|- |\.\s+/)
        .map(s => s.trim())
        .filter(Boolean);
      return chunks.slice(0, 6);
    }
    return [];
  })();

  return (
    <View style={styles.profileCard}>
      <LinearGradient
        colors={[COLORS.primary + '20', COLORS.accent + '10']}
        style={styles.profileCardGradient}
      >
        <View style={styles.profileHeader}>
          <Text style={styles.profileEmoji}>🤖</Text>
          <View>
            <Text style={styles.profileTitle}>AI Style Analysis</Text>
            <Text style={styles.profileSubtitle}>
              Based on {profile.images_analyzed?.length || 0} photos
            </Text>
          </View>
        </View>

        {/* Physical Attributes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Physical Attributes</Text>
          <View style={styles.attributeGrid}>
            {physical.body_type && (
              <AttributeChip icon="🏃" label="Body Type" value={physical.body_type} />
            )}
            {physical.skin_tone && (
              <AttributeChip icon="🎨" label="Skin Tone" value={physical.skin_tone} />
            )}
            {physical.height_category && (
              <AttributeChip icon="📏" label="Height" value={physical.height_category} />
            )}
            {physical.estimated_age_range && (
              <AttributeChip icon="🎂" label="Age Range" value={physical.estimated_age_range} />
            )}
          </View>
        </View>

        {/* Facial Features */}
        {(facial.face_shape || facial.hair_color) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Facial Features</Text>
            <View style={styles.attributeGrid}>
              {facial.face_shape && (
                <AttributeChip icon="🔷" label="Face Shape" value={facial.face_shape} />
              )}
              {facial.hair_color && (
                <AttributeChip icon="💇" label="Hair" value={facial.hair_color} />
              )}
              {facial.eye_color && (
                <AttributeChip icon="👁️" label="Eyes" value={facial.eye_color} />
              )}
            </View>
          </View>
        )}

        {/* Style Recommendations */}
        {style.recommended_colors && style.recommended_colors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Best Colors For You</Text>
            <View style={styles.colorTags}>
              {style.recommended_colors.slice(0, 6).map((color, idx) => (
                <View key={idx} style={styles.colorTag}>
                  <View style={[
                    styles.colorSwatch,
                    { backgroundColor: getColorHex(color) || COLORS.border }
                  ]} />
                  <Text style={styles.colorTagText}>{color}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {style.colors_to_avoid && style.colors_to_avoid.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>❌ Colors to Avoid</Text>
            <View style={styles.colorTags}>
              {style.colors_to_avoid.slice(0, 4).map((color, idx) => (
                <View key={idx} style={[styles.colorTag, styles.colorTagBad]}>
                  <View style={[
                    styles.colorSwatch,
                    { backgroundColor: getColorHex(color) || COLORS.border }
                  ]} />
                  <Text style={styles.colorTagText}>{color}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {style.recommended_styles && style.recommended_styles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👗 Recommended Styles</Text>
            <View style={styles.colorTags}>
              {style.recommended_styles.slice(0, 4).map((s, idx) => (
                <View key={idx} style={[styles.colorTag, styles.styleTag]}>
                  <Text style={styles.colorTagText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {styleNotes.length > 0 && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>💡 Personalized Tips</Text>
            {styleNotes.map((tip, idx) => (
              <Text key={idx} style={styles.notesText}>• {tip}</Text>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const AttributeChip = ({ icon, label, value }) => (
  <View style={styles.attributeChip}>
    <Text style={styles.attributeIcon}>{icon}</Text>
    <View>
      <Text style={styles.attributeLabel}>{label}</Text>
      <Text style={styles.attributeValue}>{value}</Text>
    </View>
  </View>
);

export default function UserImagesScreen() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [imagesData, profileData] = await Promise.all([
        userImagesAPI.getImages(),
        loadAIProfile(),
      ]);

      if (imagesData && Array.isArray(imagesData)) {
        setImages(imagesData.sort((a, b) => b.id - a.id));
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('Error loading data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAIProfile = async () => {
    try {
      const profile = await profileAPI.getProfile();
      if (profile && profile.additional_info) {
        let info = profile.additional_info;
        if (typeof info === 'string') {
          try {
            info = JSON.parse(info);
          } catch {
            info = null;
          }
        }
        if (info && info.ai_profile_analysis) {
          setAiProfile(info.ai_profile_analysis);
          return info.ai_profile_analysis;
        }
      }
    } catch (error) {
      // Profile may not exist yet for new users (404) — don't treat as fatal.
      if (error?.response?.status !== 404) {
        console.error('Error loading AI profile:', error);
      }
    }
    return null;
  };

  const pickImages = async () => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            await uploadImages(Array.from(files).map(file => ({ file })));
          }
        };
        input.click();
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Reverted to fix crash
        allowsMultipleSelection: true,
        selectionLimit: 0, // 0 means unlimited
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        await uploadImages(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick images');
    }
  };

  const uploadImages = async (assets) => {
    try {
      setUploading(true);

      const uploadPromises = assets.map(async (asset) => {
        try {
          const uploaded = asset.file
            ? await userImagesAPI.uploadImage('user_image', asset.file)
            : await userImagesAPI.uploadImage('user_image', asset.uri);
          return uploaded?.id ? 1 : 0;
        } catch (error) {
          console.error('Upload error:', error);
          if (error?.response?.status === 401) {
            // let auth context handle redirect
            return 0;
          }
          return 0;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.reduce((a, b) => a + b, 0);

      if (successCount > 0) {
        Alert.alert('✨ Success', `${successCount} photo(s) uploaded! Click "Analyze Photos" to get your AI style profile.`);
        const data = await userImagesAPI.getImages();
        if (data && Array.isArray(data)) {
          setImages(data.sort((a, b) => b.id - a.id));
        }
      } else if (assets.length > 0) {
        // Only show error if we tried to upload but got 0 successes
        Alert.alert('Error', 'Failed to upload images');
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        Alert.alert('Error', 'Failed to upload images');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const pendingImages = images.filter(img => img.processing_status === 'pending');

    if (pendingImages.length === 0) {
      Alert.alert('Info', 'All photos are already analyzed');
      return;
    }

    try {
      setProcessing(true);
      await aiProcessingAPI.processUserImages();
      Alert.alert('🤖 Analyzing', 'AI is analyzing your photos. This may take a moment...');

      const checkStatus = setInterval(async () => {
        const data = await userImagesAPI.getImages();
        const allCompleted = data.every(img => img.processing_status === 'completed');
        if (allCompleted) {
          clearInterval(checkStatus);
          setProcessing(false);
          setImages(data);
          await loadAIProfile();
          Alert.alert('✅ Complete', 'Your AI style profile is ready!');
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(checkStatus);
        setProcessing(false);
        loadData();
      }, 60000);

    } catch (error) {
      setProcessing(false);
      if (error?.response?.status !== 401) {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to analyze');
      }
    }
  };

  const deleteImage = async (imageId) => {
    Alert.alert('Delete Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userImagesAPI.deleteImage(imageId);
            setImages(prev => prev.filter(img => img.id !== imageId));
          } catch (error) {
            if (error?.response?.status !== 401) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        },
      },
    ]);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { bg: COLORS.success, text: '✅ Analyzed' };
      case 'processing': return { bg: COLORS.warning, text: '⏳ Processing' };
      case 'failed': return { bg: COLORS.error, text: '❌ Failed' };
      default: return { bg: COLORS.textMuted, text: '⏸️ Pending' };
    }
  };

  const pendingCount = images.filter(img => img.processing_status === 'pending').length;
  const analyzedCount = images.filter(img => img.processing_status === 'completed').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📸 My Photos</Text>
            <Text style={styles.subtitle}>Upload your photos for AI style analysis</Text>
            <Text style={styles.subtitleHint}>You can explore other tabs anytime — this is just a helpful flow.</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{images.length}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{analyzedCount}</Text>
              <Text style={styles.statLabel}>Analyzed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Step 1: Upload */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Upload Your Photos</Text>
                <Text style={styles.stepSubtitle}>Add clear, well-lit photos of yourself</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.buttonDisabled]}
              onPress={pickImages}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.gradients.primary}
                style={styles.uploadButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {uploading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={COLORS.textPrimary} size="small" />
                    <Text style={styles.uploadButtonText}>  Uploading...</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadButtonText}>📷 Upload Photos</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Photos Grid */}
          {images.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionLabel}>Your Photos ({images.length})</Text>
              <View style={styles.photosGrid}>
                {images.map((item) => {
                  const status = getStatusStyle(item.processing_status);
                  return (
                    <View key={item.id} style={styles.photoCard}>
                      <Image
                        source={{
                          uri: item.image_path.startsWith('http')
                            ? item.image_path
                            : `${API_BASE_URL}/${item.image_path}`
                        }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlay}>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                          <Text style={styles.statusText}>{status.text}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => deleteImage(item.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 2: Analyze */}
          {images.length > 0 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, pendingCount === 0 && styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>{pendingCount === 0 ? '✓' : '2'}</Text>
                </View>
                <View>
                  <Text style={styles.stepTitle}>Analyze with AI</Text>
                  <Text style={styles.stepSubtitle}>
                    {pendingCount > 0
                      ? `${pendingCount} photo(s) ready for analysis`
                      : 'All photos analyzed!'
                    }
                  </Text>
                </View>
              </View>

              {pendingCount > 0 && (
                <TouchableOpacity
                  style={[styles.analyzeButton, processing && styles.buttonDisabled]}
                  onPress={handleAnalyze}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={COLORS.gradients.accent}
                    style={styles.analyzeButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {processing ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color={COLORS.textPrimary} size="small" />
                        <Text style={styles.analyzeButtonText}>  Analyzing...</Text>
                      </View>
                    ) : (
                      <Text style={styles.analyzeButtonText}>🤖 Analyze Photos</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step 3: AI Profile Results */}
          {aiProfile && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>✓</Text>
                </View>
                <View>
                  <Text style={styles.stepTitle}>Your AI Style Profile</Text>
                  <Text style={styles.stepSubtitle}>Personalized analysis complete!</Text>
                </View>
              </View>

              <AIProfileCard profile={aiProfile} />
            </View>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptyText}>
                Upload clear photos of yourself to get personalized AI style recommendations!
              </Text>
              <View style={styles.tips}>
                <Text style={styles.tipsTitle}>📋 Tips for best results:</Text>
                <Text style={styles.tipItem}>• Use well-lit, clear photos</Text>
                <Text style={styles.tipItem}>• Include full body shots</Text>
                <Text style={styles.tipItem}>• Show different angles</Text>
                <Text style={styles.tipItem}>• Avoid heavy filters</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <FlowNavBar
        prev={{ route: 'Profile', label: 'Back: Profile', icon: '👤', enabled: true }}
        next={{
          route: 'Wardrobe',
          label: analyzedCount > 0 ? 'Next: Wardrobe' : 'Analyze photos first',
          icon: '👗',
          enabled: analyzedCount > 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.lg, color: COLORS.textSecondary, fontSize: 16 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  // Header
  header: { marginBottom: SPACING.lg, paddingTop: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  subtitleHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Step Card
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberDone: { backgroundColor: COLORS.success },
  stepNumberText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  stepTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  stepSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  // Upload Button
  uploadButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  buttonDisabled: { opacity: 0.6 },
  uploadButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  uploadButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Analyze Button
  analyzeButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  analyzeButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  analyzeButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  // Photos Section
  photosSection: { marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoCard: {
    width: '31%',
    aspectRatio: 0.8,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: { fontSize: 9, color: COLORS.textPrimary, fontWeight: '600' },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },

  // AI Profile Card
  profileCard: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  profileCardGradient: { padding: SPACING.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  profileEmoji: { fontSize: 36, marginRight: SPACING.md },
  profileTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  profileSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },

  attributeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attributeIcon: { fontSize: 16, marginRight: SPACING.sm },
  attributeLabel: { fontSize: 10, color: COLORS.textMuted },
  attributeValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' },

  colorTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  colorTag: {
    backgroundColor: COLORS.success + '30',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorTagBad: { backgroundColor: COLORS.error + '30' },
  styleTag: { backgroundColor: COLORS.primary + '30' },
  colorTagText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  notesBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.tertiary,
  },
  notesLabel: { fontSize: 13, fontWeight: '600', color: COLORS.tertiary, marginBottom: SPACING.xs },
  notesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Empty State
  emptyState: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xxxl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  tips: {
    backgroundColor: COLORS.backgroundGlass,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
  },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  tipItem: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
});
