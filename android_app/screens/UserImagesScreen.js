import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image as RNImage,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { Image } from 'expo-image';
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
  const summaryPoints = (() => {
    if (analysis.summary_points && Array.isArray(analysis.summary_points) && analysis.summary_points.length > 0) {
      return analysis.summary_points;
    }
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
        colors={[COLORS.primary, '#9d4edd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.profileHeaderGradient}
      >
        <Text style={styles.profileTitle}>Style Analysis</Text>
        <Text style={styles.profileSubtitle}>Based on your photos</Text>
      </LinearGradient>

      {/* Physical Attributes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Physical Attributes</Text>
        <View style={styles.attributeGrid}>
          {physical.body_type && (
            <AttributeChip icon="🏃" label="Body Type" value={physical.body_type} />
          )}
          {physical.shoulder_type && (
            <AttributeChip icon="📐" label="Shoulders" value={physical.shoulder_type} />
          )}
          {physical.vertical_proportions && (
            <AttributeChip icon="📏" label="Proportions" value={physical.vertical_proportions} />
          )}
          {physical.waist_type && (
            <AttributeChip icon="👖" label="Waist" value={physical.waist_type} />
          )}
          {physical.skin_tone && (
            <AttributeChip icon="🎨" label="Skin Tone" value={physical.skin_tone} />
          )}
          {physical.contrast_level && (
            <AttributeChip icon="🌗" label="Contrast" value={physical.contrast_level} />
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Style Profile</Text>
        <View style={styles.attributeGrid}>
          {style.style_personality && (
            <AttributeChip icon="✨" label="Vibe" value={style.style_personality} />
          )}
          {style.observed_fit_preference && (
            <AttributeChip icon="👕" label="Fit Preference" value={style.observed_fit_preference} />
          )}
        </View>
      </View>

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

      {/* Detailed Style Strategy */}
      {(style.style_strengths || style.style_opportunities) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Style Strategy</Text>
          {style.style_strengths && (
            <View style={styles.strategyBox}>
              <Text style={styles.strategyLabel}>💪 Your Strengths</Text>
              <Text style={styles.strategyText}>{style.style_strengths}</Text>
            </View>
          )}
          {style.style_opportunities && (
            <View style={[styles.strategyBox, { marginTop: 8 }]}>
              <Text style={styles.strategyLabel}>🚀 Opportunities to Try</Text>
              <Text style={styles.strategyText}>{style.style_opportunities}</Text>
            </View>
          )}
        </View>
      )}

      {/* Accessories & Seasonal */}
      {(style.accessory_suggestions || style.seasonal_recommendations) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💍 Accessories & Seasons</Text>
          {style.accessory_suggestions && (
            <View style={styles.strategyBox}>
              <Text style={styles.strategyLabel}>✨ Accessories</Text>
              <Text style={styles.strategyText}>{style.accessory_suggestions}</Text>
            </View>
          )}
          {style.seasonal_recommendations && (
            <View style={[styles.strategyBox, { marginTop: 8 }]}>
              <Text style={styles.strategyLabel}>🌤️ Seasonal Tip</Text>
              <Text style={styles.strategyText}>{style.seasonal_recommendations}</Text>
            </View>
          )}
        </View>
      )}

      {summaryPoints.length > 0 && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>💡 Style Insights</Text>
          {summaryPoints.map((tip, idx) => (
            <Text key={idx} style={styles.notesText}>• {tip}</Text>
          ))}
        </View>
      )}
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
  const [selectedAssets, setSelectedAssets] = useState([]); // Buffer for selected but not uploaded
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);
  const pollIntervalRef = useRef(null);
  const pollTimeoutRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
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
      // Serialize requests to avoid tunnel 503 errors (too many concurrent requests)
      const imagesData = await userImagesAPI.getImages();

      if (imagesData && Array.isArray(imagesData)) {
        setImages(imagesData.sort((a, b) => b.id - a.id));
      }

      // Small delay to let the tunnel breathe
      await new Promise(resolve => setTimeout(resolve, 500));

      await loadAIProfile();
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
          if (__DEV__) {
            try {
              console.log('AI profile keys:', Object.keys(info.ai_profile_analysis || {}).sort());
              console.log('AI profile preview:', JSON.stringify(info.ai_profile_analysis).slice(0, 1200));
            } catch {}
          }
          return info.ai_profile_analysis;
        }
      }
    } catch (error) {
      // Ignore 404 (no profile) and 503 (tunnel busy) to prevent user alarm
      const status = error?.response?.status;
      if (status !== 404 && status !== 503) {
        console.error('Error loading AI profile:', error);
      }
    }
    return null;
  };

  const pickImages = async () => {
    try {
      if (typeof document !== 'undefined') {
        // Web handling
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const newAssets = Array.from(files).map(file => ({
              uri: URL.createObjectURL(file), // Create preview URL
              file: file,
              id: Math.random().toString(36).slice(2, 11), // Temp ID
            }));
            setSelectedAssets(prev => [...prev, ...newAssets]);
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
        mediaTypes: ['images'], // Safest cross-version option
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Staggered loading effect - slowed down for premium feel
        const baseAssets = result.assets.map(a => ({
          ...a,
          id: Math.random().toString(36).slice(2, 11)
        }));

        // Use async loop instead of recursion for better safety/readability
        const addAssetsSequentially = async () => {
          for (const asset of baseAssets) {
            if (!asset || !asset.uri) continue; // Skip invalid assets

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedAssets(prev => [...prev, asset]);

            // 200ms stagger for premium "thud" feel
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        };

        addAssetsSequentially().catch(err => console.error('Stagger error:', err));
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick images');
    }
  };

  const removeSelectedAsset = (tempId) => {
    setSelectedAssets(prev => prev.filter(a => a.id !== tempId));
  };

  const handleUploadSelected = async () => {
    if (selectedAssets.length === 0) return;

    try {
      setUploading(true);

      // Sequential processing and upload to avoid race conditions and improve stability
      let successCount = 0;
      const total = selectedAssets.length;

      // Clone array to avoid mutation issues during iteration
      const assetsToUpload = [...selectedAssets];

      for (let i = 0; i < total; i++) {
        const asset = assetsToUpload[i];

        try {
          // 1. Process image (if needed)
          let finalUri = asset.uri;
          let fileObj = asset.file;

          // Only manipulate if not a web file object
          if (!fileObj && Platform.OS !== 'web') {
            try {
              let resizeAction = {};
              if (asset.width > asset.height) {
                if (asset.width > 1536) resizeAction = { width: 1536 }; // Increased from 1024 for better quality
              } else {
                if (asset.height > 1536) resizeAction = { height: 1536 };
              }

              const actions = Object.keys(resizeAction).length > 0 ? [{ resize: resizeAction }] : [];

              if (actions.length > 0) {
                const manipulated = await ImageManipulator.manipulateAsync(
                  asset.uri,
                  actions,
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // Higher quality
                );
                finalUri = manipulated.uri;
              }
            } catch (processErr) {
              console.warn('Image processing failed, using original', processErr);
            }
          }

          // 2. Upload
          console.log(`Uploading ${i + 1}/${total}...`);
          const uploaded = fileObj
            ? await userImagesAPI.uploadImage('user_image', fileObj)
            : await userImagesAPI.uploadImage('user_image', finalUri);

          if (uploaded?.id) {
            successCount++;
            // Optional: Remove from selection immediately on success? 
            // For now, we'll clear all at the end to be safe.
          }

        } catch (uploadErr) {
          console.error(`Upload failed for item ${i + 1}:`, uploadErr);
          // Continue to next item even if one fails
        }
      }

      if (successCount > 0) {
        // Clear selection on success
        setSelectedAssets([]);
        // Refresh list
        loadData();

        if (successCount < total) {
          Alert.alert('Upload Partially Complete', `${successCount} of ${total} images uploaded successfully.`);
        }
      } else {
        Alert.alert('Error', 'Failed to upload images. Please check your connection and try again.');
      }

    } catch (error) {
      Alert.alert('Error', error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const pendingImages = images.filter(img => img.processing_status === 'pending');

    if (pendingImages.length === 0) return; // Silent return

    try {
      setProcessing(true);
      // Clear any previous polling (safety)
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
          setProcessing(false);
          await loadAIProfile();
          loadData();
        }
      }, 2000);
      pollIntervalRef.current = checkStatus;

      // Timeout fallback
      const timeoutId = setTimeout(() => {
        clearInterval(checkStatus);
        pollIntervalRef.current = null;
        setProcessing(false);
        loadData();
      }, 60000);
      pollTimeoutRef.current = timeoutId;

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
            // silent fail or mild alert
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
          <View style={styles.header}>
            <Text style={styles.title}>📸 My Photos</Text>
            <Text style={styles.subtitle}>Upload your photos for style analysis</Text>
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

          {/* Step 1: Select & Upload */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Add Photos</Text>
                <Text style={styles.stepSubtitle}>Select clear, full-body shots</Text>
              </View>
            </View>

            {/* PREVIEW GRID (Staging Area) */}
            {selectedAssets.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Ready to upload ({selectedAssets.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
                  {selectedAssets.map((asset) => (
                    <View key={asset.id} style={styles.previewItem}>
                      {/* Use RNImage for preview to ensure immediate update without caching weirdness */}
                      <RNImage source={{ uri: asset.uri }} style={styles.previewImage} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => removeSelectedAsset(asset.id)}
                      >
                        <Text style={styles.previewRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.actionRow}>
              {/* Select Button */}
              <TouchableOpacity
                style={[styles.outlineButton, uploading && styles.buttonDisabled]}
                onPress={pickImages}
                disabled={uploading}
              >
                <Text style={styles.outlineButtonText}>
                  {selectedAssets.length > 0 ? '+ Add More' : '📷 Select Photos'}
                </Text>
              </TouchableOpacity>

              {/* Upload Button (Only if items selected) */}
              {selectedAssets.length > 0 && (
                <TouchableOpacity
                  style={[styles.primaryButton, uploading && styles.buttonDisabled]}
                  onPress={handleUploadSelected}
                  disabled={uploading}
                >
                  <LinearGradient
                    colors={COLORS.gradients.primary}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {uploading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color={COLORS.textPrimary} size="small" />
                        <Text style={styles.primaryButtonText}> Uploading...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>⬆️ Upload All</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Photos Grid */}
          {images.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionLabel}>Your Gallery ({images.length})</Text>
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
                        contentFit="cover"
                        transition={200}
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
                  <Text style={styles.stepTitle}>Run Analysis</Text>
                  <Text style={styles.stepSubtitle}>
                    {pendingCount > 0
                      ? `${pendingCount} new photo(s) to analyze`
                      : 'All photos analyzed'
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
                  <Text style={styles.stepTitle}>Your Style Profile</Text>
                  <Text style={styles.stepSubtitle}>Personalized analysis complete!</Text>
                </View>
              </View>

              <AIProfileCard profile={aiProfile} />
            </View>
          )}

          {/* Empty State */}
          {images.length === 0 && selectedAssets.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={styles.emptyTitle}>Start Your Profile</Text>
              <Text style={styles.emptyText}>
                Upload photos to get your personalized style analysis.
              </Text>
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
  strategyBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  strategyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  strategyText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
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
  // Preview Staging
  previewContainer: {
    marginBottom: SPACING.md,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  previewScroll: {
    flexDirection: 'row',
  },
  previewItem: {
    width: 80,
    height: 100,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
  },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRemoveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  primaryButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  primaryButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
