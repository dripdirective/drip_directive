
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { wardrobeAPI, aiProcessingAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import * as ImageManipulator from 'expo-image-manipulator';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

const toBulletHighlights = (text, max = 2) => {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Prefer explicit bullets/newlines; otherwise split by sentence.
  const parts = (trimmed.includes('\n') || trimmed.includes('•'))
    ? trimmed.split(/\n|•/).map(s => s.trim()).filter(Boolean)
    : trimmed.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  return parts.slice(0, max);
};

const toStringOrNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return null;
};

const asArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [v].filter(Boolean);
};

const joinPretty = (arr) => {
  const a = asArray(arr).map(x => String(x).trim()).filter(Boolean);
  if (a.length === 0) return null;
  return a.join(', ');
};

const ListRow = ({ icon, label, items }) => {
  const text = joinPretty(items);
  if (!text) return null;
  return (
    <View style={styles.detailRowFull}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValueMultiline}>{text}</Text>
      </View>
    </View>
  );
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// ai_metadata can sometimes be double-encoded (JSON string inside JSON string).
// This normalizes it and returns the inner `clothing_analysis` object if present.
const parseWardrobeMetadata = (aiMetadata) => {
  if (!aiMetadata) return null;
  let v = aiMetadata;

  // Unwrap up to 2 layers of JSON strings.
  for (let i = 0; i < 2; i++) {
    if (typeof v === 'string') {
      const parsed = safeJsonParse(v);
      if (parsed === null) break;
      v = parsed;
      continue;
    }
    break;
  }

  // If we parsed to an object that contains clothing_analysis, unwrap it.
  if (v && typeof v === 'object' && v.clothing_analysis !== undefined) {
    let inner = v.clothing_analysis;
    if (typeof inner === 'string') {
      const parsedInner = safeJsonParse(inner);
      if (parsedInner && typeof parsedInner === 'object') inner = parsedInner;
    }
    if (inner && typeof inner === 'object') return inner;
  }

  return v && typeof v === 'object' ? v : null;
};

// Detailed Item Modal - Shows ALL AI metadata
const ItemDetailModal = ({ visible, item, onClose }) => {
  if (!item) return null;

  const imageUrl = item.images && item.images[0]
    ? (item.images[0].image_path.startsWith('http')
      ? item.images[0].image_path
      : `${API_BASE_URL}/${item.images[0].image_path}`)
    : null;

  const metadata = parseWardrobeMetadata(item.ai_metadata);

  // Dev-only: log available keys so you can see what exists vs what UI renders
  if (__DEV__ && metadata) {
    try {
      const keys = Object.keys(metadata).sort();
      console.log('Wardrobe metadata keys:', keys);
      console.log('Wardrobe metadata preview:', JSON.stringify(metadata).slice(0, 1200));
    } catch {}
  }

  const styling = metadata?.styling_suggestions || {};
  const summaryBullets = toBulletHighlights(metadata?.summary_text, 2);
  const summaryPoints = asArray(metadata?.summary_points);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 Style Analysis</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Image */}
            {imageUrl && (
              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.modalImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}

            {metadata ? (
              <>
                {/* Basic Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📌 Basic Information</Text>
                  <DetailRow icon="👕" label="Garment Type" value={metadata.garment_type || metadata.garmentType} />
                  <DetailRow icon="📂" label="Category" value={metadata.category} />
                  <DetailRow icon="🎨" label="Primary Color" value={metadata.color} />
                  {metadata.secondary_colors && metadata.secondary_colors.length > 0 && (
                    <DetailRow icon="🌈" label="Secondary Colors" value={metadata.secondary_colors.join(', ')} />
                  )}
                </View>

                {/* Material & Fit */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>🧵 Material & Fit</Text>
                  <DetailRow icon="🧶" label="Material" value={metadata.material} />
                  {metadata.material_texture && (
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailIcon}>🪡</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Material Texture</Text>
                        <Text style={styles.detailValueMultiline}>{metadata.material_texture}</Text>
                      </View>
                    </View>
                  )}
                  <DetailRow icon="🔲" label="Pattern" value={metadata.pattern} />
                  {metadata.pattern_details && (
                    <DetailRow icon="🔍" label="Pattern Details" value={metadata.pattern_details} />
                  )}
                  <DetailRow icon="📐" label="Fit Type" value={metadata.fit_type || metadata.fit} />
                  {metadata.texture && <DetailRow icon="✨" label="Texture" value={metadata.texture} />}
                </View>

                {/* Construction & Silhouette */}
                {(metadata.neckline || metadata.collar_type || metadata.sleeve_type || metadata.length || metadata.closure_type) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>🧷 Construction & Silhouette</Text>
                    <DetailRow icon="👔" label="Neckline" value={toStringOrNull(metadata.neckline)} />
                    <DetailRow icon="🧣" label="Collar Type" value={toStringOrNull(metadata.collar_type)} />
                    <DetailRow icon="🧤" label="Sleeve Type" value={toStringOrNull(metadata.sleeve_type)} />
                    <DetailRow icon="📏" label="Length" value={toStringOrNull(metadata.length)} />
                    <DetailRow icon="🔘" label="Closure Type" value={toStringOrNull(metadata.closure_type)} />
                  </View>
                )}

                {/* Style Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>🎨 Style Details</Text>
                  <DetailRow icon="💫" label="Style" value={metadata.style} />
                  {metadata.style_vibe && (
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailIcon}>✨</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Style Vibe</Text>
                        <Text style={styles.detailValueMultiline}>{metadata.style_vibe}</Text>
                      </View>
                    </View>
                  )}
                  <DetailRow
                    icon="📊"
                    label="Formality"
                    value={metadata.formality_level ? `${metadata.formality_level}/10` : null}
                  />
                  <DetailRow
                    icon="🔄"
                    label="Versatility"
                    value={metadata.versatility_score ? `${metadata.versatility_score}/10` : null}
                  />
                  <DetailRow
                    icon="⭐"
                    label="Statement Piece"
                    value={metadata.statement_piece !== undefined ? (metadata.statement_piece ? 'Yes' : 'No') : null}
                  />
                </View>

                {/* Occasions & Seasons */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📅 When to Wear</Text>
                  {metadata.occasion && Array.isArray(metadata.occasion) && metadata.occasion.length > 0 && (
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailIcon}>🎯</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Occasions</Text>
                        <View style={styles.chipsContainer}>
                          {metadata.occasion.map((occ, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>{occ}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                  {metadata.season && Array.isArray(metadata.season) && metadata.season.length > 0 && (
                    <View style={styles.detailRowFull}>
                      <Text style={styles.detailIcon}>🌤️</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Seasons</Text>
                        <View style={styles.chipsContainer}>
                          {metadata.season.map((s, idx) => (
                            <View key={idx} style={[styles.chip, { backgroundColor: COLORS.secondary + '30' }]}>
                              <Text style={[styles.chipText, { color: COLORS.secondaryLight }]}>{s}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Styling Suggestions */}
                {(styling.pairs_well_with || styling.accessories || styling.shoes || metadata.color_pairing_suggestions) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>👔 Styling Suggestions</Text>
                    <ListRow icon="👖" label="Pairs Well With" items={styling.pairs_well_with} />
                    <ListRow icon="🧥" label="Layering Options" items={styling.layering_options} />
                    <ListRow icon="💍" label="Accessories" items={styling.accessories} />
                    <ListRow icon="👞" label="Footwear" items={styling.shoes} />
                    <ListRow icon="🚫" label="Avoid Pairing With" items={styling.avoid_pairing_with} />
                    <ListRow icon="🎨" label="Color Pairings" items={metadata.color_pairing_suggestions} />
                  </View>
                )}

                {/* Description / Care / Indicators */}
                {(metadata.description || metadata.care_observations || metadata.brand_style_indicators) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>🧾 Notes</Text>
                    {metadata.description && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>📝</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Description</Text>
                          <Text style={styles.detailValueMultiline}>{metadata.description}</Text>
                        </View>
                      </View>
                    )}
                    {metadata.brand_style_indicators && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>🏷️</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Brand / Style Indicators</Text>
                          <Text style={styles.detailValueMultiline}>{metadata.brand_style_indicators}</Text>
                        </View>
                      </View>
                    )}
                    {metadata.care_observations && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>🧼</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Care</Text>
                          <Text style={styles.detailValueMultiline}>{metadata.care_observations}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* AI Summary (full) */}
                {(metadata.summary_text || summaryPoints.length > 0) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📝 Summary</Text>
                    {summaryPoints.length > 0 ? (
                      summaryPoints.map((p, idx) => (
                        <Text key={idx} style={styles.summaryBullet}>• {String(p)}</Text>
                      ))
                    ) : (
                      <>
                        {summaryBullets.map((b, idx) => (
                          <Text key={idx} style={styles.summaryBullet}>• {b}</Text>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noMetadataContainer}>
                <Text style={styles.noMetadataText}>No analysis available yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Fullscreen Image Preview Modal
const ImagePreviewModal = ({ visible, imageUrl, onClose }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={styles.imagePreviewContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <View style={styles.imagePreviewHeader}>
          <Text style={styles.imagePreviewTitle}>🖼️ Image</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        {imageUrl ? (
          <View style={styles.imagePreviewBody}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.imagePreviewImage}
              contentFit="contain"
              transition={200}
            />
          </View>
        ) : (
          <View style={styles.noMetadataContainer}>
            <Text style={styles.noMetadataText}>No image available</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// Detail Row Component
const DetailRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

// Wardrobe Item Card - Image + Details side by side
const WardrobeItemCard = ({ item, serialNo, onDelete, onProcess, processing, onViewDetails, onViewImage }) => {
  const imageUrl = item.images && item.images[0]
    ? (item.images[0].image_path.startsWith('http')
      ? item.images[0].image_path
      : `${API_BASE_URL}/${item.images[0].image_path}`)
    : null;

  const metadata = parseWardrobeMetadata(item.ai_metadata);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { color: COLORS.success, icon: '✅', text: 'Analyzed' };
      case 'processing': return { color: COLORS.warning, icon: '⏳', text: 'Processing' };
      case 'failed': return { color: COLORS.error, icon: '❌', text: 'Failed' };
      default: return { color: COLORS.textMuted, icon: '⏸️', text: 'Pending' };
    }
  };

  const status = getStatusStyle(item.processing_status);

  const colorVal = toStringOrNull(metadata?.color) || toStringOrNull(item?.color);
  const styleVal = toStringOrNull(metadata?.style) || toStringOrNull(item?.style);
  const materialVal = toStringOrNull(metadata?.material);

  if (__DEV__ && metadata && !colorVal) {
    try {
      console.log('Wardrobe: metadata present but color missing', {
        id: item?.id,
        ai_metadata_type: typeof item?.ai_metadata,
        ai_metadata_preview: typeof item?.ai_metadata === 'string' ? item.ai_metadata.slice(0, 220) : JSON.stringify(item?.ai_metadata).slice(0, 220),
        keys: Object.keys(metadata || {}).slice(0, 50),
      });
    } catch {}
  }

  // Prefer AI-detected garment type (e.g., "saree") over the DB enum (which may default to "other")
  const displayNameRaw =
    (metadata && (metadata.garment_type || metadata.garmentType)) ||
    item.dress_type ||
    `Item ${serialNo || ''}`.trim();
  const displayName = String(displayNameRaw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.itemCard}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={{ flex: 1 }}
          onPress={() => onViewImage?.(imageUrl)}
          disabled={!imageUrl}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.itemImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>👕</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
        </View>
        {/* Quick image expand affordance (tap to open fullscreen) */}
        {imageUrl && (
          <TouchableOpacity
            style={styles.imageExpandBadge}
            onPress={() => onViewImage?.(imageUrl)}
            activeOpacity={0.85}
          >
            <Text style={styles.imageExpandText}>🔍</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* Header row: title + delete */}
        <View style={styles.cardHeaderRow}>
          <TouchableOpacity onPress={() => onViewDetails?.(item)} activeOpacity={0.85} style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>
              {displayName}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButtonInline} onPress={() => onDelete(item.id)}>
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>

        {/* Compact metadata grid (won't be covered by buttons) */}
        {metadata ? (
          <View style={styles.metaGrid}>
            {colorVal ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>🎨 {colorVal}</Text></View>
            ) : null}
            {styleVal ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>✨ {styleVal}</Text></View>
            ) : null}
            {materialVal ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>🧵 {materialVal}</Text></View>
            ) : null}
            {(metadata.fit_type || metadata.fit) ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>📐 {metadata.fit_type || metadata.fit}</Text></View>
            ) : null}
            {metadata.formality_level ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>📊 Formality {metadata.formality_level}/10</Text></View>
            ) : null}
            {metadata.versatility_score ? (
              <View style={styles.metaPill}><Text style={styles.metaPillText}>🔄 Versatility {metadata.versatility_score}/10</Text></View>
            ) : null}
          </View>
        ) : item.processing_status === 'pending' ? (
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={() => onProcess(item.id)}
            disabled={processing}
          >
            <Text style={styles.analyzeButtonText}>🤖 Analyze</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noDataText}>No details yet</Text>
        )}

        {/* Footer actions */}
        <View style={styles.cardFooterRow}>
          {item.processing_status === 'completed' ? (
            <TouchableOpacity
              style={styles.viewDetailsButtonPinned}
              onPress={() => onViewDetails?.(item)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradients.accent}
                style={styles.viewDetailsGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.viewDetailsText}>👁️ Full Analysis</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {imageUrl && (
            <TouchableOpacity
              style={styles.viewImageButton}
              onPress={() => onViewImage?.(imageUrl)}
              activeOpacity={0.85}
            >
              <Text style={styles.viewImageText}>🖼️ View</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default function WardrobeScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const pollIntervalRef = useRef(null);
  const pollTimeoutRef = useRef(null);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleViewImage = (imageUrl) => {
    if (!imageUrl) return;
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      pollIntervalRef.current = null;
      pollTimeoutRef.current = null;
    };
  }, []);

  const loadItems = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await wardrobeAPI.getItems();
      setItems(data || []);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('Error loading items:', error);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
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
        // Fix 413: Resize/Compress images before upload
        const processedAssets = await Promise.all(
          result.assets.map(async (asset) => {
            try {
              // Skip processing if no width/height info (shouldn't happen with Expo ImagePicker)
              if (!asset.width || !asset.height) return asset;

              // Constrain max dimension to 1200px to ensure file size is small enough
              let resizeAction = {};
              if (asset.width > asset.height) {
                if (asset.width > 1024) resizeAction = { width: 1024 };
              } else {
                if (asset.height > 1024) resizeAction = { height: 1024 };
              }

              const actions = Object.keys(resizeAction).length > 0 ? [{ resize: resizeAction }] : [];

              // Even if not resizing, we re-compress to ensuring 0.7 quality JPEG
              const manipulated = await ImageManipulator.manipulateAsync(
                asset.uri,
                actions,
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
              );

              return {
                ...asset,
                uri: manipulated.uri,
                width: manipulated.width,
                height: manipulated.height,
              };
            } catch (error) {
              console.error('Image manipulation failed:', error);
              return asset; // Fallback to original
            }
          })
        );

        await uploadImages(processedAssets);
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
            ? await wardrobeAPI.uploadImage(asset.file)
            : await wardrobeAPI.uploadImage(asset.uri);
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
        // Alert.alert('✨ Success', `${successCount} item(s) added!`);
        loadItems(false);
      } else if (assets.length > 0) {
        Alert.alert('Error', 'Failed to upload items');
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        Alert.alert('Duplicate Detected', 'One or more items have already been uploaded.');
      } else if (error?.response?.status !== 401) {
        Alert.alert('Error', 'Failed to upload');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleProcessAll = async () => {
    const pendingItems = items.filter(item => item.processing_status === 'pending');
    if (pendingItems.length === 0) {
      // Alert.alert('Info', 'All items are already analyzed');
      return;
    }

    try {
      setProcessing(true);
      await aiProcessingAPI.processAllWardrobe();
      // Alert.alert('🤖 Processing', 'Analyzing your wardrobe...');

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      pollIntervalRef.current = null;
      pollTimeoutRef.current = null;

      const checkStatus = setInterval(async () => {
        const data = await wardrobeAPI.getItems();
        const allCompleted = data.every(item =>
          item.processing_status !== 'pending' && item.processing_status !== 'processing'
        );
        if (allCompleted) {
          clearInterval(checkStatus);
          pollIntervalRef.current = null;
          setProcessing(false);
          setItems(data);
          // Alert.alert('✅ Complete', 'Analysis finished!');
        }
      }, 2000);
      pollIntervalRef.current = checkStatus;

      const timeoutId = setTimeout(() => {
        clearInterval(checkStatus);
        pollIntervalRef.current = null;
        setProcessing(false);
        loadItems(false);
      }, 60000);
      pollTimeoutRef.current = timeoutId;

    } catch (error) {
      setProcessing(false);
      if (error?.response?.status !== 401) {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to process');
      }
    }
  };

  const handleProcessItem = async (itemId) => {
    try {
      setProcessing(true);
      await aiProcessingAPI.processWardrobe(itemId);

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      pollIntervalRef.current = null;
      pollTimeoutRef.current = null;

      const checkStatus = setInterval(async () => {
        const data = await wardrobeAPI.getItems();
        const item = data.find(i => i.id === itemId);
        if (item && item.processing_status === 'completed') {
          clearInterval(checkStatus);
          pollIntervalRef.current = null;
          setProcessing(false);
          setItems(data);
        }
      }, 2000);
      pollIntervalRef.current = checkStatus;

      const timeoutId = setTimeout(() => {
        clearInterval(checkStatus);
        pollIntervalRef.current = null;
        setProcessing(false);
        loadItems(false);
      }, 30000);
      pollTimeoutRef.current = timeoutId;

    } catch (error) {
      setProcessing(false);
      if (error?.response?.status !== 401) {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to process');
      }
    }
  };

  const deleteItem = async (itemId) => {
    Alert.alert('Delete Item', 'Remove this item from your wardrobe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await wardrobeAPI.deleteItem(itemId);
            setItems(prev => prev.filter(i => i.id !== itemId));
          } catch (error) {
            if (error?.response?.status !== 401) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        },
      },
    ]);
  };

  const hasPendingItems = items.some(item => item.processing_status === 'pending');
  const analyzedCount = items.filter(i => i.processing_status === 'completed').length;
  const pendingCount = items.filter(i => i.processing_status === 'pending').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading your wardrobe...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

      {/* Detail Modal */}
      <ItemDetailModal
        visible={showDetailModal}
        item={selectedItem}
        onClose={() => setShowDetailModal(false)}
      />
      <ImagePreviewModal
        visible={showImageModal}
        imageUrl={selectedImageUrl}
        onClose={() => setShowImageModal(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>👗 My Wardrobe</Text>
            <Text style={styles.subtitle}>{items.length} items • {analyzedCount} analyzed</Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{items.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{analyzedCount}</Text>
              <Text style={styles.statLabel}>Analyzed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, uploading && styles.buttonDisabled]}
              onPress={pickImages}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.gradients.primary}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {uploading ? (
                  <ActivityIndicator color={COLORS.textPrimary} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>➕ Add Clothes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {hasPendingItems && (
              <TouchableOpacity
                style={[styles.actionButton, processing && styles.buttonDisabled]}
                onPress={handleProcessAll}
                disabled={processing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={COLORS.gradients.accent}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {processing ? (
                    <ActivityIndicator color={COLORS.textPrimary} size="small" />
                  ) : (
                    <Text style={styles.actionButtonText}>🤖 Analyze All</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Items List - Single Column */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👕</Text>
              <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
              <Text style={styles.emptyText}>
                Add photos of your clothes to get started with smart styling!
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemWrapper}>
                  <WardrobeItemCard
                    item={item}
                    serialNo={items.findIndex(i => i.id === item.id) + 1}
                    onDelete={deleteItem}
                    onProcess={handleProcessItem}
                    processing={processing}
                    onViewDetails={handleViewDetails}
                    onViewImage={handleViewImage}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FlowNavBar
        prev={{ route: 'Me', label: 'Back: Me', icon: '🧑', enabled: true }}
        next={{
          route: 'Recommendations',
          label: analyzedCount >= 2 ? 'Next: Style Studio' : 'Analyze 2 items first',
          icon: '✨',
          enabled: analyzedCount >= 2,
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
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Header
  header: { marginBottom: SPACING.md, paddingTop: SPACING.sm },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  // Actions
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionButton: { flex: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', ...SHADOWS.sm },
  buttonDisabled: { opacity: 0.6 },
  actionButtonGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  actionButtonText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },

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
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  // Items List
  itemsList: {},
  itemWrapper: {
    marginBottom: SPACING.md,
  },

  // Item Card (Image + Details)
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 180,
  },

  // Image Section
  imageSection: {
    width: 140, // Fixed width for image part
    height: '100%',
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 48, opacity: 0.5 },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fallback
  },
  statusIcon: { fontSize: 14 },
  imageExpandBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  imageExpandText: { fontSize: 14 },

  // Details Section
  detailsSection: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  // Card header/footer layout
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonInline: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  cardFooterRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Compact metadata pills
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaPill: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  metaPillText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // No Data
  noDataText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },

  // Analyze Button
  analyzeButton: {
    backgroundColor: COLORS.accent + '20',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  analyzeButtonText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },

  deleteButtonText: { fontSize: 16 },

  // View Details Button - Make it smaller/abs positioned or inline? 
  // For now keeping it hidden in card to save space, user can click card? 
  // Actually the original design had a button. Let's make the Whole Card clickable?
  // But we have delete button. Let's keep a small link.
  viewDetailsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewDetailsButtonPinned: {
    marginTop: 8,
    alignSelf: 'flex-start',
    marginRight: 44, // keep clear of delete button at bottom-right
  },
  viewDetailsGradient: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  viewDetailsText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  viewImageButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  viewImageText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  // Image preview modal
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  imagePreviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  imagePreviewBody: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },

  // Detail Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalImageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },

  // Detail Sections
  detailSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailRowFull: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  detailIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    width: 24,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginRight: SPACING.sm,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  detailContent: {
    flex: 1,
  },
  detailValueMultiline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },

  // Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  chipText: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Summary
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  summaryBullet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },

  // No Metadata
  noMetadataContainer: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  noMetadataText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
