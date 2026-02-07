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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { wardrobeAPI, aiProcessingAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
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

// Detailed Item Modal - Shows ALL AI metadata
const ItemDetailModal = ({ visible, item, onClose }) => {
  if (!item) return null;

  const imageUrl = item.images && item.images[0]
    ? (item.images[0].image_path.startsWith('http')
      ? item.images[0].image_path
      : `${API_BASE_URL}/${item.images[0].image_path}`)
    : null;

  let metadata = null;
  if (item.ai_metadata) {
    try {
      metadata = typeof item.ai_metadata === 'string' ? JSON.parse(item.ai_metadata) : item.ai_metadata;
      metadata = metadata.clothing_analysis || metadata;
    } catch (e) { }
  }

  const styling = metadata?.styling_suggestions || {};
  const summaryBullets = toBulletHighlights(metadata?.summary_text, 2);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI Analysis</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Image */}
            {imageUrl && (
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.modalImage} resizeMode="contain" />
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
                  <DetailRow icon="🔲" label="Pattern" value={metadata.pattern} />
                  {metadata.pattern_details && (
                    <DetailRow icon="🔍" label="Pattern Details" value={metadata.pattern_details} />
                  )}
                  <DetailRow icon="📐" label="Fit Type" value={metadata.fit_type || metadata.fit} />
                  {metadata.texture && <DetailRow icon="✨" label="Texture" value={metadata.texture} />}
                </View>

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
                    {styling.pairs_well_with && Array.isArray(styling.pairs_well_with) && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>👖</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Pairs Well With</Text>
                          <Text style={styles.detailValueMultiline}>{styling.pairs_well_with.join(', ')}</Text>
                        </View>
                      </View>
                    )}
                    {styling.accessories && Array.isArray(styling.accessories) && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>💍</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Accessories</Text>
                          <Text style={styles.detailValueMultiline}>{styling.accessories.join(', ')}</Text>
                        </View>
                      </View>
                    )}
                    {styling.shoes && Array.isArray(styling.shoes) && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>👞</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Footwear</Text>
                          <Text style={styles.detailValueMultiline}>{styling.shoes.join(', ')}</Text>
                        </View>
                      </View>
                    )}
                    {metadata.color_pairing_suggestions && Array.isArray(metadata.color_pairing_suggestions) && (
                      <View style={styles.detailRowFull}>
                        <Text style={styles.detailIcon}>🎨</Text>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Color Pairings</Text>
                          <Text style={styles.detailValueMultiline}>{metadata.color_pairing_suggestions.join(', ')}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* AI Summary (short) */}
                {summaryBullets.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📝 Quick Summary</Text>
                    {summaryBullets.map((b, idx) => (
                      <Text key={idx} style={styles.summaryBullet}>• {b}</Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noMetadataContainer}>
                <Text style={styles.noMetadataText}>No AI analysis available yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
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
const WardrobeItemCard = ({ item, onDelete, onProcess, processing, onViewDetails }) => {
  const imageUrl = item.images && item.images[0]
    ? (item.images[0].image_path.startsWith('http')
      ? item.images[0].image_path
      : `${API_BASE_URL}/${item.images[0].image_path}`)
    : null;

  let metadata = null;
  if (item.ai_metadata) {
    try {
      metadata = typeof item.ai_metadata === 'string' ? JSON.parse(item.ai_metadata) : item.ai_metadata;
      metadata = metadata.clothing_analysis || metadata;
    } catch (e) { }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { color: COLORS.success, icon: '✅', text: 'Analyzed' };
      case 'processing': return { color: COLORS.warning, icon: '⏳', text: 'Processing' };
      case 'failed': return { color: COLORS.error, icon: '❌', text: 'Failed' };
      default: return { color: COLORS.textMuted, icon: '⏸️', text: 'Pending' };
    }
  };

  const status = getStatusStyle(item.processing_status);

  // Prefer AI-detected garment type (e.g., "saree") over the DB enum (which may default to "other")
  const displayNameRaw =
    (metadata && (metadata.garment_type || metadata.garmentType)) ||
    item.dress_type ||
    `Item #${item.id}`;
  const displayName = String(displayNameRaw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.itemCard}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>👕</Text>
          </View>
        )}
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
        </View>
      </View>

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* Item Name */}
        <Text style={styles.itemName} numberOfLines={1}>
          {displayName}
        </Text>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>

        {/* AI Details */}
        {metadata ? (
          <View style={styles.metadataContainer}>
            {metadata.color && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>🎨</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>{metadata.color}</Text>
              </View>
            )}
            {metadata.style && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>✨</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>{metadata.style}</Text>
              </View>
            )}
            {metadata.material && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>🧵</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>{metadata.material}</Text>
              </View>
            )}
            {(metadata.fit_type || metadata.fit) && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>📐</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>{metadata.fit_type || metadata.fit}</Text>
              </View>
            )}
            {metadata.formality_level && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>📊</Text>
                <Text style={styles.metadataValue}>Formality: {metadata.formality_level}/10</Text>
              </View>
            )}
            {metadata.versatility_score && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataIcon}>🔄</Text>
                <Text style={styles.metadataValue}>Versatility: {metadata.versatility_score}/10</Text>
              </View>
            )}
            {metadata.occasion && (
              <View style={styles.tagsRow}>
                {(Array.isArray(metadata.occasion) ? metadata.occasion : [metadata.occasion]).map((occ, idx) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{occ}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* View Full Details Button */}
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => onViewDetails(item)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradients.accent}
                style={styles.viewDetailsGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.viewDetailsText}>👁️ View Full AI Analysis →</Text>
              </LinearGradient>
            </TouchableOpacity>
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

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
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

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  useEffect(() => { loadItems(); }, []);

  const loadItems = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await wardrobeAPI.getItems();
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
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
      let successCount = 0;

      for (const asset of assets) {
        try {
          const uploaded = asset.file
            ? await wardrobeAPI.uploadImage(asset.file)
            : await wardrobeAPI.uploadImage(asset.uri);
          if (uploaded?.id) successCount++;
        } catch (error) {
          console.error('Upload error:', error);
        }
      }

      if (successCount > 0) {
        Alert.alert('✨ Success', `${successCount} item(s) added!`);
        loadItems(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessAll = async () => {
    const pendingItems = items.filter(item => item.processing_status === 'pending');
    if (pendingItems.length === 0) {
      Alert.alert('Info', 'All items are already analyzed');
      return;
    }

    try {
      setProcessing(true);
      await aiProcessingAPI.processAllWardrobe();
      Alert.alert('🤖 Processing', 'AI is analyzing your wardrobe...');

      const checkStatus = setInterval(async () => {
        const data = await wardrobeAPI.getItems();
        const allCompleted = data.every(item =>
          item.processing_status !== 'pending' && item.processing_status !== 'processing'
        );
        if (allCompleted) {
          clearInterval(checkStatus);
          setProcessing(false);
          setItems(data);
          Alert.alert('✅ Complete', 'AI analysis finished!');
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(checkStatus);
        setProcessing(false);
        loadItems(false);
      }, 60000);

    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process');
    }
  };

  const handleProcessItem = async (itemId) => {
    try {
      setProcessing(true);
      await aiProcessingAPI.processWardrobe(itemId);

      const checkStatus = setInterval(async () => {
        const data = await wardrobeAPI.getItems();
        const item = data.find(i => i.id === itemId);
        if (item && item.processing_status === 'completed') {
          clearInterval(checkStatus);
          setProcessing(false);
          setItems(data);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(checkStatus);
        setProcessing(false);
        loadItems(false);
      }, 30000);

    } catch (error) {
      setProcessing(false);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process');
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
            Alert.alert('Error', 'Failed to delete');
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

  // Split items into pairs for 2-per-row layout
  const itemPairs = [];
  for (let i = 0; i < items.length; i += 2) {
    itemPairs.push(items.slice(i, i + 2));
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

          {/* Items List */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👕</Text>
              <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
              <Text style={styles.emptyText}>
                Add photos of your clothes to get started with AI styling!
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {/* Column Headers */}
              <View style={styles.columnHeaders}>
                <Text style={styles.columnHeader}>Image</Text>
                <Text style={styles.columnHeader}>Details</Text>
                <Text style={styles.columnHeader}>Image</Text>
                <Text style={styles.columnHeader}>Details</Text>
              </View>

              {/* Item Rows - 2 items per row */}
              {itemPairs.map((pair, rowIndex) => (
                <View key={rowIndex} style={styles.itemRow}>
                  {pair.map((item) => (
                    <WardrobeItemCard
                      key={item.id}
                      item={item}
                      onDelete={deleteItem}
                      onProcess={handleProcessItem}
                      processing={processing}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                  {/* Fill empty space if odd number of items */}
                  {pair.length === 1 && <View style={styles.emptySlot} />}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FlowNavBar
        prev={{ route: 'Me', label: 'Back: Me', icon: '👤', enabled: true }}
        next={{
          route: 'Recommendations',
          label: analyzedCount >= 2 ? 'Next: Style AI' : 'Analyze 2 items first',
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
  columnHeaders: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  columnHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Item Row (2 items per row)
  itemRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },

  // Item Card (Image + Details)
  itemCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 280,
  },
  emptySlot: {
    flex: 1,
  },

  // Image Section
  imageSection: {
    width: '50%',
    aspectRatio: 0.75,
    position: 'relative',
    minHeight: 280,
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
  },
  statusIcon: { fontSize: 14 },

  // Details Section
  detailsSection: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  // Metadata
  metadataContainer: {
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataIcon: { fontSize: 16, marginRight: 8 },
  metadataValue: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
    textTransform: 'capitalize',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  tagChip: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // No Data
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },

  // Analyze Button
  analyzeButton: {
    backgroundColor: COLORS.accent + '20',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  analyzeButtonText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '700',
  },

  // Delete Button
  deleteButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: SPACING.sm,
  },
  deleteButtonText: { fontSize: 18 },

  // View Details Button
  viewDetailsButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  viewDetailsGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '800',
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
