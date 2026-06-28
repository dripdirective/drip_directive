import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image as RNImage,
  Platform,
  Animated,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getApiErrorMessage, recommendationsAPI, wardrobeAPI, myntraAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import FlowNavBar from '../components/FlowNavBar';
import LuxeBackground from '../components/luxe/LuxeBackground';
import LuxeButton from '../components/luxe/LuxeButton';
import LuxeHeader from '../components/luxe/LuxeHeader';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

// Cross-platform alert helper
const showAlert = (title, message) => {
  const safeMessage = typeof message === 'string' ? message : String(message || '');
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${safeMessage}`);
  } else {
    Alert.alert(title, safeMessage);
  }
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toWhyBullets = (text, max = 2) => {
  if (!text || typeof text !== 'string') return [];
  const t = text.trim();
  if (!t) return [];
  const parts = (t.includes('\n') || t.includes('•') || t.includes('- '))
    ? t.split(/\n|•/).map(s => s.replace(/^\-\s*/, '').trim()).filter(Boolean)
    : t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  return parts.slice(0, max);
};

// Fullscreen Image Preview Modal (outfit item / try-on)
const ImagePreviewModal = ({ visible, imageUrl, onClose }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={styles.imagePreviewContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <View style={styles.imagePreviewHeader}>
          <Text style={styles.imagePreviewTitle}>🖼️ Image</Text>
          <TouchableOpacity onPress={onClose} style={styles.drawerClose} activeOpacity={0.85}>
            <Text style={styles.drawerCloseText}>✕</Text>
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
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryIcon}>🖼️</Text>
            <Text style={styles.emptyHistoryText}>No image available</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// Get occasion icon
const getOccasionIcon = (query) => {
  const q = (query || '').toLowerCase();
  if (q.includes('casual') || q.includes('weekend')) return '👕';
  if (q.includes('business') || q.includes('work') || q.includes('meeting')) return '💼';
  if (q.includes('party') || q.includes('club')) return '🎉';
  if (q.includes('date') || q.includes('romantic')) return '💕';
  if (q.includes('formal') || q.includes('elegant')) return '🎭';
  if (q.includes('wedding')) return '💒';
  if (q.includes('sport') || q.includes('gym')) return '🏃';
  if (q.includes('travel') || q.includes('outdoor')) return '✈️';
  return '✨';
};

// Get occasion label
const getOccasionLabel = (query) => {
  const q = (query || '').toLowerCase();
  if (q.includes('casual') || q.includes('weekend')) return 'Casual';
  if (q.includes('business') || q.includes('work') || q.includes('meeting')) return 'Business';
  if (q.includes('party') || q.includes('club')) return 'Party';
  if (q.includes('date') || q.includes('romantic')) return 'Date Night';
  if (q.includes('formal') || q.includes('elegant')) return 'Formal';
  if (q.includes('wedding')) return 'Wedding';
  if (q.includes('sport') || q.includes('gym')) return 'Sporty';
  if (q.includes('travel') || q.includes('outdoor')) return 'Travel';
  return 'Style';
};

// Quick Prompts
const QUICK_PROMPTS = [
  { text: "Casual weekend look", icon: "👕" },
  { text: "Business meeting outfit", icon: "💼" },
  { text: "Date night style", icon: "💕" },
  { text: "Party outfit", icon: "🎉" },
  { text: "Travel comfortable", icon: "✈️" },
];

// Sidebar Item Component
const SidebarItem = ({ recommendation, isSelected, onSelect, index, total }) => {
  const date = formatDate(recommendation.created_at);
  const icon = getOccasionIcon(recommendation.query);
  const label = getOccasionLabel(recommendation.query);
  const outfitCount = recommendation.outfits?.length || 0;
  // History is shown newest-first, but numbering should be oldest-first:
  // oldest = #1, newest (top) = #N
  const serial = Math.max(1, (Number(total) || 0) - (Number(index) || 0));

  return (
    <TouchableOpacity
      style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
      onPress={() => onSelect(recommendation)}
      activeOpacity={0.7}
    >
      {isSelected && (
        <View style={styles.selectedIndicator} />
      )}
      <View style={styles.sidebarIndexBadge}>
        <Text style={styles.sidebarIndexText}>{serial}</Text>
      </View>
      <View style={styles.sidebarItemContent}>
        <View style={styles.sidebarItemHeader}>
          <Text style={styles.sidebarIcon}>{icon}</Text>
          <Text style={[styles.sidebarLabel, isSelected && styles.sidebarLabelSelected]} numberOfLines={1}>
            {(recommendation.query || '').trim() || label}
          </Text>
        </View>
        <Text style={styles.sidebarDate}>{date} • {label}</Text>
        <View style={styles.sidebarMeta}>
          <View style={[
            styles.statusDot,
            { backgroundColor: recommendation.status === 'completed' ? COLORS.success : COLORS.warning }
          ]} />
          <Text style={styles.sidebarOutfits}>{outfitCount} outfit{outfitCount !== 1 ? 's' : ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Mobile drawer (ChatGPT-style sidebar)
const MobileDrawer = ({
  visible,
  onClose,
  recommendations,
  selectedId,
  onSelect,
  onNewRequest,
}) => {
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 160 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -320, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
        </TouchableOpacity>

        <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.drawerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.drawerTitle}>✨ Style Studio</Text>
              <Text style={styles.drawerSubtitle}>{recommendations.length} sessions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose} activeOpacity={0.85}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.drawerNewButton} onPress={onNewRequest} activeOpacity={0.9}>
            <LinearGradient
              colors={COLORS.gradients.primary}
              style={styles.drawerNewButtonGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.drawerNewButtonText}>＋ New Request</Text>
            </LinearGradient>
          </TouchableOpacity>

          <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
            {recommendations.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryIcon}>📭</Text>
                <Text style={styles.emptyHistoryText}>No history yet</Text>
              </View>
            ) : (
              recommendations.map((rec, idx) => (
                <SidebarItem
                  key={rec.id}
                  recommendation={rec}
                  isSelected={selectedId === rec.id}
                  onSelect={() => onSelect(rec)}
                  index={idx}
                  total={recommendations.length}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Outfit Display Component
const OutfitDisplay = ({ outfit, index, wardrobeItems, onTryOn, loadingTryOn, recommendationId, onViewImage, showTryOnSection = false }) => {
  const [showWhy, setShowWhy] = useState(true);
  // Virtual try-on with layering. `look` is the current composed result the user is
  // building; `path` is its stored path used as the base for the next garment.
  const [look, setLook] = useState(null);   // { url, path, itemIds: [id, ...] }
  const [busyItemId, setBusyItemId] = useState(null);
  const [tryonError, setTryonError] = useState(null);

  // Curated Myntra items to shop/try for this outfit.
  const [myntraItems, setMyntraItems] = useState([]);
  useEffect(() => {
    let active = true;
    myntraAPI
      .getProducts(null, 6)
      .then((items) => { if (active) setMyntraItems(Array.isArray(items) ? items : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // layer=false → wear on the raw user photo; layer=true → wear on top of the current look.
  const runTryOn = async (itemId, { layer }) => {
    setTryonError(null);
    setBusyItemId(itemId);
    try {
      const options = layer && look?.path ? { base_image_path: look.path } : {};
      const res = await wardrobeAPI.generateItemTryOn(itemId, options);
      const path = res?.image_path;
      if (!path) {
        setTryonError('Could not generate the try-on. Please try again.');
        return;
      }
      const url = path.startsWith('http') ? path : `${API_BASE_URL}/${path}`;
      setLook((prev) => {
        const baseItems = layer && prev ? prev.itemIds.filter((id) => id !== itemId) : [];
        const label = layer && prev ? prev.label : undefined;
        return { url, path, itemIds: [...baseItems, itemId], label };
      });
    } catch (e) {
      setTryonError(getApiErrorMessage(e, 'Failed to generate try-on'));
    } finally {
      setBusyItemId(null);
    }
  };

  // Try a Myntra product on the user (starts a fresh look from the raw photo).
  const runMyntraTryOn = async (product) => {
    setTryonError(null);
    const key = `myntra:${product.product_id}`;
    setBusyItemId(key);
    try {
      const res = await myntraAPI.tryOnProduct(product.product_id);
      const path = res?.image_path;
      if (!path) {
        setTryonError('Could not generate the try-on. Please try again.');
        return;
      }
      const url = path.startsWith('http') ? path : `${API_BASE_URL}/${path}`;
      setLook({ url, path, itemIds: [], label: `${product.brand || 'Myntra'} (Myntra)` });
    } catch (e) {
      setTryonError(getApiErrorMessage(e, 'Failed to generate try-on'));
    } finally {
      setBusyItemId(null);
    }
  };

  const openBuy = (product) => {
    if (product?.product_url) Linking.openURL(product.product_url).catch(() => {});
  };

  const getWardrobeItem = (itemId) => {
    return wardrobeItems.find(w => w.id === itemId);
  };

  const getWardrobeImage = (itemId) => {
    const item = getWardrobeItem(itemId);
    if (item && item.images && item.images.length > 0) {
      const imagePath = item.images[0].image_path;
      return imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}/${imagePath}`;
    }
    return null;
  };

  const getItemName = (itemId) => {
    const item = getWardrobeItem(itemId);
    if (item) {
      if (item.dress_type) {
        return item.dress_type.replace('_', ' ').charAt(0).toUpperCase() + item.dress_type.slice(1).replace('_', ' ');
      }
      return `Item ${item.id}`;
    }
    return `Item ${itemId}`;
  };

  const tryonImageUrl = outfit.tryon_image_path
    ? (outfit.tryon_image_path.startsWith('http')
      ? outfit.tryon_image_path
      : `${API_BASE_URL}/${outfit.tryon_image_path}`)
    : null;

  // Use wardrobe_item_ids if items array is empty
  const itemIds = outfit.wardrobe_item_ids || outfit.items?.map(i => i.wardrobe_item_id) || [];
  const whyText = outfit.style_reasoning || outfit.why_it_works || '';
  const whyBullets = toWhyBullets(whyText, 2);

  return (
    <View style={styles.outfitContainer}>
      {/* Outfit Header */}
      <View style={styles.outfitHeader}>
        <View style={styles.outfitNumberBadge}>
          <Text style={styles.outfitNumber}>{index + 1}</Text>
        </View>
        <View style={styles.outfitTitleContainer}>
          <Text style={styles.outfitName}>{outfit.outfit_name || `Outfit ${index + 1}`}</Text>
          {outfit.occasion && (
            <Text style={styles.outfitOccasion}>📍 {outfit.occasion}</Text>
          )}
        </View>
      </View>

      {/* Why selected (simple) */}
      {whyBullets.length > 0 && (
        <View style={[styles.descriptionBox, { borderLeftColor: COLORS.primary }]}>
          <TouchableOpacity onPress={() => setShowWhy(!showWhy)} activeOpacity={0.85}>
            <Text style={[styles.descriptionLabel, { color: COLORS.primary }]}>
              💡 Why this outfit {showWhy ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {showWhy && whyBullets.map((b, idx) => (
            <Text key={idx} style={styles.descriptionText}>• {b}</Text>
          ))}
        </View>
      )}

      {/* Items Grid */}
      <Text style={styles.sectionLabel}>Outfit Items ({itemIds.length})</Text>
      {itemIds.length === 0 && (
        <View style={styles.emptyOutfitBox}>
          <Text style={styles.emptyOutfitIcon}>🧩</Text>
          <Text style={styles.emptyOutfitText}>No matching wardrobe items for this outfit.</Text>
        </View>
      )}
      <View style={styles.itemsGrid}>
        {itemIds.map((itemId, idx) => {
          const imageUrl = getWardrobeImage(itemId);
          const itemName = getItemName(itemId);
          const wardrobeItem = getWardrobeItem(itemId);

          return (
            <View key={idx} style={styles.outfitItemCard}>
              {imageUrl ? (
                <TouchableOpacity onPress={() => onViewImage?.(imageUrl)} activeOpacity={0.9}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.outfitItemImage}
                    contentFit="contain"
                    transition={200}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.outfitItemPlaceholder}>
                  <Text style={styles.placeholderIcon}>👕</Text>
                </View>
              )}
              <View style={styles.outfitItemInfo}>
                <Text style={styles.outfitItemName} numberOfLines={2}>{itemName}</Text>
                {wardrobeItem?.color && (
                  <Text style={styles.outfitItemTip} numberOfLines={1}>🎨 {wardrobeItem.color}</Text>
                )}

                {showTryOnSection && (
                  <TouchableOpacity
                    style={[
                      styles.itemTryonBtn,
                      look?.itemIds?.includes(itemId) && styles.itemTryonBtnActive,
                      busyItemId === itemId && styles.buttonDisabled,
                    ]}
                    onPress={() => runTryOn(itemId, { layer: false })}
                    disabled={busyItemId != null}
                    activeOpacity={0.85}
                  >
                    {busyItemId === itemId ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.itemTryonBtnText}>👗 Try on</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Missing Items (Complete the Look) */}
      {outfit.missing_items && outfit.missing_items.length > 0 && (
        <View style={[styles.descriptionBox, { borderLeftColor: COLORS.warning, backgroundColor: COLORS.warning + '10' }]}>
          <Text style={[styles.descriptionLabel, { color: COLORS.warning }]}>🛍️ Missing Items</Text>
          <Text style={[styles.descriptionText, { marginBottom: 4 }]}>To complete this look, add:</Text>
          {outfit.missing_items.map((item, idx) => (
            <Text key={idx} style={[styles.descriptionText, { fontWeight: '600' }]}>+ {item}</Text>
          ))}
        </View>
      )}

      {/* Description */}
      {outfit.description && (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionLabel}>📝 About This Outfit</Text>
          <Text style={styles.descriptionText}>{outfit.description}</Text>
        </View>
      )}

      {/* Why It Works */}
      {outfit.why_it_works && (
        <View style={[styles.descriptionBox, { borderLeftColor: COLORS.success }]}>
          <Text style={[styles.descriptionLabel, { color: COLORS.success }]}>✅ Why It Works</Text>
          <Text style={styles.descriptionText}>{outfit.why_it_works}</Text>
        </View>
      )}

      {/* Styling Tips */}
      {outfit.styling_tips && outfit.styling_tips.length > 0 && (
        <View style={[styles.descriptionBox, { borderLeftColor: COLORS.tertiary }]}>
          <Text style={[styles.descriptionLabel, { color: COLORS.tertiary }]}>💡 Styling Tips</Text>
          {outfit.styling_tips.map((tip, idx) => (
            <Text key={idx} style={styles.descriptionText}>• {tip}</Text>
          ))}
        </View>
      )}

      {/* Virtual Try-On — build a full look by trying items and layering more on top */}
      {showTryOnSection && (
        <View style={styles.tryonSection}>
          <Text style={styles.sectionLabel}>Virtual Try-On</Text>

          {busyItemId != null ? (
            <View style={styles.tryonLoadingBox}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.tryonLoadingTitle}>
                {look ? `Adding ${getItemName(busyItemId)} to your look…` : `Trying on ${getItemName(busyItemId)}…`}
              </Text>
              <Text style={styles.tryonLoadingHint}>This can take up to a minute the first time.</Text>
            </View>
          ) : look ? (
            <>
              <Text style={styles.tryonWearingLabel}>
                Wearing: {[look.label, ...look.itemIds.map((id) => getItemName(id))].filter(Boolean).join(' + ')}
              </Text>
              <TouchableOpacity
                style={styles.tryonImageContainer}
                onPress={() => onViewImage?.(look.url)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: look.url }}
                  style={styles.tryonImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.tryonExpandBadge}>
                  <Text style={styles.tryonExpandBadgeText}>⛶  Tap to expand</Text>
                </View>
              </TouchableOpacity>

              {/* Layer the remaining items onto the current look */}
              {itemIds.filter((id) => !look.itemIds.includes(id)).length > 0 && (
                <>
                  <Text style={styles.tryonAddLabel}>Add another item to this look:</Text>
                  <View style={styles.tryonAddRow}>
                    {itemIds
                      .filter((id) => !look.itemIds.includes(id))
                      .map((id) => (
                        <TouchableOpacity
                          key={id}
                          style={styles.tryonAddChip}
                          onPress={() => runTryOn(id, { layer: true })}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.tryonAddChipText}>➕ {getItemName(id)}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </>
              )}

              {tryonError ? <Text style={styles.tryonErrorText}>{tryonError}</Text> : null}
            </>
          ) : tryonError ? (
            <Text style={styles.tryonErrorText}>{tryonError}</Text>
          ) : (
            <Text style={styles.tryonHint}>
              Tap “👗 Try on” on any item above to wear it on your photo. Then add more pieces to build the full look — your choice, top or bottom first.
            </Text>
          )}
        </View>
      )}

      {/* Shop this look on Myntra — try the real product on, or buy it */}
      {showTryOnSection && myntraItems.length > 0 && (
        <View style={styles.myntraSection}>
          <Text style={styles.sectionLabel}>🛍️  Shop this look on Myntra</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myntraRow}>
            {myntraItems.map((p) => {
              const busy = busyItemId === `myntra:${p.product_id}`;
              return (
                <View key={p.product_id} style={styles.myntraCard}>
                  <Image source={{ uri: p.image }} style={styles.myntraImage} contentFit="cover" transition={150} />
                  <View style={styles.myntraInfo}>
                    <Text style={styles.myntraBrand} numberOfLines={1}>{p.brand || 'Brand'}</Text>
                    <Text style={styles.myntraName} numberOfLines={2}>{p.name || ''}</Text>
                    <View style={styles.myntraPriceRow}>
                      <Text style={styles.myntraPrice}>₹{p.price ?? p.mrp ?? '--'}</Text>
                      {p.mrp && p.price && p.mrp > p.price ? (
                        <Text style={styles.myntraMrp}>₹{p.mrp}</Text>
                      ) : null}
                    </View>
                    <View style={styles.myntraBtnRow}>
                      <TouchableOpacity
                        style={[styles.myntraTryBtn, busyItemId != null && styles.buttonDisabled]}
                        onPress={() => runMyntraTryOn(p)}
                        disabled={busyItemId != null}
                        activeOpacity={0.85}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.myntraTryBtnText}>👗 Try on</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.myntraBuyBtn} onPress={() => openBuy(p)} activeOpacity={0.85}>
                        <Text style={styles.myntraBuyBtnText}>🛒 Buy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Generating Animation
const GeneratingView = ({ status, message, progress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.generatingContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient colors={COLORS.gradients.primary} style={styles.generatingIcon}>
          <Text style={styles.generatingEmoji}>✨</Text>
        </LinearGradient>
      </Animated.View>
      <Text style={styles.generatingTitle}>{status}</Text>
      <Text style={styles.generatingMessage}>{message}</Text>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={COLORS.gradients.primary}
          style={[styles.progressFill, { width: `${progress}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );
};

export default function RecommendationsScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const [recommendations, setRecommendations] = useState([]);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [selectedRec, setSelectedRec] = useState(null);
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [loadingTryOn, setLoadingTryOn] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  // On mobile: default to New Request on first load (ChatGPT-like)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setShowNewForm(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recsData, wardrobeData] = await Promise.all([
        recommendationsAPI.getAll(),
        wardrobeAPI.getItems(),
      ]);
      // Sort newest-first (ChatGPT-style). Prefer created_at, fall back to id.
      const sortedRecs = (recsData || []).slice().sort((a, b) => {
        const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (bT !== aT) return bT - aT;
        return (b?.id || 0) - (a?.id || 0);
      });
      setRecommendations(sortedRecs);
      setWardrobeItems(wardrobeData || []);

      // Select the latest one by default
      if (sortedRecs.length > 0 && !selectedRec) {
        setSelectedRec(sortedRecs[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = (url) => {
    if (!url) return;
    setSelectedImageUrl(url);
    setShowImageModal(true);
  };

  const handleGenerate = async () => {
    const processedItems = wardrobeItems.filter(item => item.processing_status === 'completed');

    if (processedItems.length < 2) {
      showAlert('Not Enough Items', 'Please add and analyze at least 2 wardrobe items first.');
      return;
    }

    if (!query.trim()) {
      showAlert('Enter a Prompt', 'Please describe what kind of outfit you\'re looking for.');
      return;
    }

    try {
      setGenerating(true);
      setShowNewForm(false);
      setGeneratingStatus({ status: '🚀 Starting', message: 'Preparing request...', progress: 10 });

      const startedAt = Date.now();
      const targetQuery = query.trim();
      await recommendationsAPI.generate(targetQuery);

      setGeneratingStatus({ status: '🤖 Style Studio Working', message: 'Analyzing your style...', progress: 40 });

      let attempts = 0;
      const maxAttempts = 30;

      const checkStatus = setInterval(async () => {
        attempts++;
        const progress = Math.min(40 + (attempts / maxAttempts) * 55, 95);

        setGeneratingStatus({
          status: '✨ Creating Outfits',
          message: 'Curating perfect looks...',
          progress
        });

        try {
          const data = await recommendationsAPI.getAll();
          const sorted = (data || []).slice().sort((a, b) => {
            const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
            if (bT !== aT) return bT - aT;
            return (b?.id || 0) - (a?.id || 0);
          });
          // The /generate endpoint does NOT return an id. Find the newest rec that matches this query after we started.
          const rec = sorted.find(r => {
            const sameQuery = String(r?.query || '').trim().toLowerCase() === targetQuery.toLowerCase();
            const createdAt = r?.created_at ? new Date(r.created_at).getTime() : 0;
            return sameQuery && createdAt >= (startedAt - 10_000);
          }) || sorted[0];

          if (rec && rec.status === 'completed') {
            clearInterval(checkStatus);
            setGeneratingStatus({ status: '🎉 Done!', message: 'Your outfits are ready!', progress: 100 });

            setTimeout(() => {
              const sortedRecs = (data || []).slice().sort((a, b) => b.id - a.id);
              // Ensure newest-first after refresh
              sortedRecs.sort((a, b) => {
                const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
                const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
                if (bT !== aT) return bT - aT;
                return (b?.id || 0) - (a?.id || 0);
              });
              setRecommendations(sortedRecs);
              // Always open the request we just triggered (or the newest if not found)
              setSelectedRec(rec || sortedRecs[0] || null);
              setSelectedOutfitIndex(0);
              setGenerating(false);
              setGeneratingStatus(null);
              setQuery('');
            }, 800);
          } else if (rec && rec.status === 'failed') {
            clearInterval(checkStatus);
            setGenerating(false);
            setGeneratingStatus(null);
            showAlert('Failed', 'Unable to generate. Please try again.');
          }
        } catch (error) {
          console.error('Poll error:', error);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkStatus);
          setGenerating(false);
          setGeneratingStatus(null);
          loadData();
        }
      }, 2000);

    } catch (error) {
      setGenerating(false);
      setGeneratingStatus(null);
      showAlert('Error', getApiErrorMessage(error, 'Failed to generate'));
    }
  };

  const handleTryOn = async (recommendationId, outfitIndex) => {
    try {
      setLoadingTryOn(true);
      const result = await recommendationsAPI.generateTryOn(recommendationId, outfitIndex);

      if (result && result.image_path) {
        setRecommendations(prev => prev.map(rec => {
          if (rec.id === recommendationId && rec.outfits) {
            const updatedOutfits = [...rec.outfits];
            if (updatedOutfits[outfitIndex]) {
              updatedOutfits[outfitIndex] = {
                ...updatedOutfits[outfitIndex],
                tryon_image_path: result.image_path,
              };
            }
            return { ...rec, outfits: updatedOutfits };
          }
          return rec;
        }));

        // Update selected rec
        if (selectedRec && selectedRec.id === recommendationId) {
          setSelectedRec(prev => {
            const updatedOutfits = [...(prev.outfits || [])];
            if (updatedOutfits[outfitIndex]) {
              updatedOutfits[outfitIndex] = {
                ...updatedOutfits[outfitIndex],
                tryon_image_path: result.image_path,
              };
            }
            return { ...prev, outfits: updatedOutfits };
          });
        }

        // showAlert('✨ Success', 'Your virtual try-on is ready!');
      }
    } catch (error) {
      showAlert('Error', getApiErrorMessage(error, 'Failed to generate try-on'));
    } finally {
      setLoadingTryOn(false);
    }
  };

  const handleSelectRec = (rec) => {
    setSelectedRec(rec);
    setSelectedOutfitIndex(0);
    setShowNewForm(false);
    setShowDrawer(false);
  };

  if (loading) {
    return (
      <LuxeBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Style Studio...</Text>
        </View>
      </LuxeBackground>
    );
  }

  const processedCount = wardrobeItems.filter(item => item.processing_status === 'completed').length;
  const isMobileLayout = Platform.OS !== 'web' || windowWidth < 820;

  const openNewRequest = () => {
    setShowNewForm(true);
    setShowDrawer(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // iOS needs padding; Android "height" can break scroll gestures on some devices.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Offset to keep the multiline input visible above keyboard + bottom nav (iOS)
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LuxeBackground>
        <View style={styles.container}>
          <View style={[styles.mainLayout, isMobileLayout ? styles.mainLayoutMobile : styles.mainLayoutDesktop]}>
            {isMobileLayout ? (
              <>
                {/* Mobile Header */}
                <View style={styles.mobileHeader}>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setShowDrawer(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.menuButtonText}>☰</Text>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.mobileTitle}>Style Studio</Text>
                    <Text style={styles.mobileSubtitle}>Ask for outfits from your wardrobe</Text>
                  </View>

                  <TouchableOpacity style={styles.newRequestPill} onPress={() => setShowNewForm(true)} activeOpacity={0.9}>
                    <LinearGradient
                      colors={COLORS.gradients.primary}
                      style={styles.newRequestPillGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.newRequestPillText}>＋ New</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <MobileDrawer
                  visible={showDrawer}
                  onClose={() => setShowDrawer(false)}
                  recommendations={recommendations}
                  selectedId={selectedRec?.id}
                  onSelect={handleSelectRec}
                  onNewRequest={() => {
                    setShowNewForm(true);
                    setShowDrawer(false);
                  }}
                />
              </>
            ) : (
              /* Desktop Sidebar */
              <View style={styles.sidebar}>
                <View style={styles.sidebarHeader}>
                  <Text style={styles.sidebarTitle}>Style Studio</Text>
                  <Text style={styles.sidebarSubtitle}>{recommendations.length} sessions</Text>
                </View>

                <LuxeButton title="New Request" leftIcon="＋" onPress={openNewRequest} style={styles.newButton} />

                <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                  {recommendations.length === 0 ? (
                    <View style={styles.emptyHistory}>
                      <Text style={styles.emptyHistoryIcon}>📭</Text>
                      <Text style={styles.emptyHistoryText}>No history yet</Text>
                    </View>
                  ) : (
                    recommendations.map((rec, idx) => (
                      <SidebarItem
                        key={rec.id}
                        recommendation={rec}
                        isSelected={selectedRec?.id === rec.id && !showNewForm}
                        onSelect={handleSelectRec}
                        index={idx}
                        total={recommendations.length}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {/* Main Content */}
            <View style={styles.contentArea}>
              {/* Generating State */}
              {generating && generatingStatus && (
                <GeneratingView {...generatingStatus} />
              )}

              {/* New Form */}
              {!generating && showNewForm && (
                <ScrollView
                  style={styles.newFormContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingBottom: 140 }}
                >
                  <View style={styles.newFormContent}>
                    <LuxeHeader
                      kicker="NEW REQUEST"
                      title="Create Outfit"
                      subtitle="Describe what you want — I'll curate from your wardrobe."
                      style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: SPACING.lg }}
                    />

                    {/* Quick Prompts */}
                    <Text style={styles.quickPromptsLabel}>Quick suggestions:</Text>
                    <View style={styles.quickPromptsGrid}>
                      {QUICK_PROMPTS.map((p, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.quickPromptCard, query === p.text && styles.quickPromptCardActive]}
                          onPress={() => setQuery(p.text)}
                        >
                          <Text style={styles.quickPromptIcon}>{p.icon}</Text>
                          <Text style={[styles.quickPromptText, query === p.text && styles.quickPromptTextActive]}>
                            {p.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Custom Input */}
                    <Text style={styles.inputLabel}>Or describe your own:</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Smart casual for a networking event..."
                        placeholderTextColor={COLORS.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        multiline
                        maxLength={200}
                        returnKeyType="done"
                      />
                    </View>

                    {/* Generate Button */}
                    <LuxeButton
                      title="Generate Outfits"
                      leftIcon="✨"
                      onPress={handleGenerate}
                      disabled={!query.trim() || processedCount < 2}
                    />

                    {processedCount < 2 && (
                      <Text style={styles.warningText}>⚠️ Add at least 2 analyzed wardrobe items first</Text>
                    )}
                  </View>
                </ScrollView>
              )}

              {/* Selected Recommendation */}
              {!generating && !showNewForm && selectedRec && (
                <ScrollView
                  style={styles.recommendationScroll}
                  contentContainerStyle={styles.recommendationScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                >
                  {/* Compact Header */}
                  <View style={styles.recHeaderCompact}>
                    <View style={styles.recHeaderLeft}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recTitleSmall} numberOfLines={2}>
                          {(selectedRec.query || '').trim()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.recNewPill} onPress={openNewRequest} activeOpacity={0.9}>
                      <LinearGradient
                        colors={COLORS.gradients.primary}
                        style={styles.recNewPillGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.recNewPillText}>＋ New</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Outfit Tabs */}
                  {selectedRec.outfits && selectedRec.outfits.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.outfitTabsRow}
                      nestedScrollEnabled
                    >
                      {selectedRec.outfits.map((_, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.outfitTab, selectedOutfitIndex === idx && styles.outfitTabActive]}
                          onPress={() => setSelectedOutfitIndex(idx)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.outfitTabText, selectedOutfitIndex === idx && styles.outfitTabTextActive]}>
                            #{idx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Outfit Content (no nested ScrollView) */}
                  {selectedRec.outfits && selectedRec.outfits.length > 0 ? (
                    <OutfitDisplay
                      key={`${selectedRec.id}-${selectedOutfitIndex}`}
                      outfit={selectedRec.outfits[selectedOutfitIndex]}
                      index={selectedOutfitIndex}
                      wardrobeItems={wardrobeItems}
                      onTryOn={handleTryOn}
                      loadingTryOn={loadingTryOn}
                      recommendationId={selectedRec.id}
                      onViewImage={handleViewImage}
                      showTryOnSection={true}
                    />
                  ) : (
                    <View style={styles.noOutfits}>
                      <Text style={styles.noOutfitsIcon}>
                        {selectedRec.status === 'processing' ? '⏳' : '❌'}
                      </Text>
                      <Text style={styles.noOutfitsText}>
                        {selectedRec.status === 'processing'
                          ? 'Creating your outfits...'
                          : 'No outfits generated'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Empty State - No Selection */}
              {!generating && !showNewForm && !selectedRec && (
                <View style={styles.emptyContent}>
                  <Text style={styles.emptyContentIcon}>👗</Text>
                  <Text style={styles.emptyContentTitle}>Welcome to Style Studio</Text>
                  <Text style={styles.emptyContentText}>
                    Click "New Request" to get smart outfit recommendations from your wardrobe
                  </Text>

                  <View style={{ marginTop: SPACING.lg }}>
                    <LuxeButton title="Generate Outfits" leftIcon="✨" onPress={openNewRequest} />
                  </View>
                </View>
              )}
            </View>
          </View>

          <ImagePreviewModal
            visible={showImageModal}
            imageUrl={selectedImageUrl}
            onClose={() => setShowImageModal(false)}
          />

          <FlowNavBar prev={{ route: 'Wardrobe', label: 'Back: Wardrobe', icon: '👗', enabled: true }} next={null} />
        </View>
      </LuxeBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.lg, color: COLORS.textSecondary, fontSize: 16 },

  // Main Layout
  mainLayout: {
    flex: 1,
  },
  mainLayoutMobile: {
    flexDirection: 'column',
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
  },

  // Mobile header / history
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  mobileTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  mobileSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '900' },

  newRequestPill: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOWS.md },
  newRequestPillGrad: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: BORDER_RADIUS.full },
  newRequestPillText: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 13 },

  // Drawer
  drawerOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawerPanel: {
    width: 320,
    height: '100%',
    backgroundColor: COLORS.background,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: SPACING.xl,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  drawerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  drawerSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  drawerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCloseText: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 16 },
  drawerNewButton: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  drawerNewButtonGrad: { paddingVertical: SPACING.md, alignItems: 'center' },
  drawerNewButtonText: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 14 },
  drawerList: { flex: 1 },

  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  sidebarHeader: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebarTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  sidebarSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // New Button
  newButton: {
    margin: SPACING.md,
  },


  // History List
  historyList: { flex: 1 },
  emptyHistory: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyHistoryIcon: { fontSize: 32, marginBottom: SPACING.sm },
  emptyHistoryText: { fontSize: 13, color: COLORS.textMuted },

  // Sidebar Item
  sidebarItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebarIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  sidebarIndexText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  sidebarItemSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
  },
  sidebarItemContent: { flex: 1, paddingLeft: SPACING.xs },
  sidebarItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sidebarIcon: { fontSize: 16, marginRight: SPACING.xs },
  sidebarLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  sidebarLabelSelected: { color: COLORS.primary },
  sidebarDate: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  sidebarQuery: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  sidebarMeta: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: SPACING.xs },
  sidebarOutfits: { fontSize: 10, color: COLORS.textMuted },

  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Generating
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  generatingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  generatingEmoji: { fontSize: 36 },
  generatingTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  generatingMessage: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  progressBar: {
    width: 250,
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, color: COLORS.textMuted },

  // New Form
  newFormContainer: { flex: 1 },
  newFormContent: { padding: SPACING.xl },
  newFormTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  newFormSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  quickPromptsLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.md },
  quickPromptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  quickPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPromptCardActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  quickPromptIcon: { fontSize: 18, marginRight: SPACING.sm },
  quickPromptText: { fontSize: 13, color: COLORS.textSecondary },
  quickPromptTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  inputLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.sm },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  input: {
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  generateButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  buttonDisabled: { opacity: 0.5 },
  generateButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  generateButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  warningText: { fontSize: 12, color: COLORS.warning, marginTop: SPACING.md, textAlign: 'center' },

  // Recommendation View
  recommendationView: { flex: 1 },
  recommendationScroll: { flex: 1 },
  recommendationScrollContent: { paddingBottom: 160 },
  // Compact header to save space (mobile-first)
  recHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  recHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  recIconSmall: { fontSize: 22, marginRight: SPACING.sm },
  recTitleSmall: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  recMetaSmall: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // CTA pill in header (helps users find "Generate Outfits" again)
  recNewPill: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginLeft: SPACING.md,
    ...SHADOWS.md,
  },
  recNewPillGrad: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
  },
  recNewPillText: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 12,
  },

  // Query Box
  queryBoxCompact: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  queryLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  queryTextCompact: { fontSize: 13, color: COLORS.textPrimary },

  // Outfit Tabs
  outfitTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  outfitTabsRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  outfitTab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outfitTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  outfitTabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  outfitTabTextActive: { color: COLORS.textPrimary },

  // Outfit Scroll (legacy, no longer used for selected recommendation)
  outfitScroll: { flex: 1 },

  // Outfit Container
  outfitContainer: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  outfitHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  outfitNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  outfitNumber: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  outfitTitleContainer: { flex: 1 },
  outfitName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  outfitOccasion: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  // Section Label
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.md, marginTop: SPACING.sm },

  // Items Grid
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
  outfitItemCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outfitItemImage: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.backgroundLight,
  },
  outfitItemPlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 40, opacity: 0.5 },
  outfitItemInfo: { padding: SPACING.md, backgroundColor: COLORS.surface },
  outfitItemName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  outfitItemTip: { fontSize: 12, color: COLORS.textMuted },
  outfitItemTapHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  itemTryonBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  itemTryonBtnActive: { backgroundColor: COLORS.accentDark },
  itemTryonBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

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
    fontWeight: '900',
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

  // Description Box
  descriptionBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  descriptionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.secondary, marginBottom: SPACING.sm },
  descriptionText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  // Empty outfit
  emptyOutfitBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyOutfitIcon: { fontSize: 28, marginBottom: 6 },
  emptyOutfitText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  // Try-On Section
  tryonSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  tryonImageContainer: { marginBottom: SPACING.md, position: 'relative' },
  tryonImage: { width: '100%', height: 420, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surfaceLight },
  tryonExpandBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  tryonExpandBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  tryonWearingLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  tryonErrorText: { fontSize: 13, color: COLORS.error || '#C0392B', paddingVertical: SPACING.md },
  tryonAddLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  tryonAddRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tryonAddChip: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tryonAddChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Myntra "shop this look"
  myntraSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  myntraRow: { gap: SPACING.md, paddingVertical: SPACING.sm, paddingRight: SPACING.md },
  myntraCard: {
    width: 170,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  myntraImage: { width: '100%', height: 200, backgroundColor: COLORS.border },
  myntraInfo: { padding: SPACING.sm },
  myntraBrand: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  myntraName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, minHeight: 32 },
  myntraPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  myntraPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  myntraMrp: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  myntraBtnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  myntraTryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  myntraTryBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  myntraBuyBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myntraBuyBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  tryonHint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 18 },
  // Primary CTA: branded dark gradient + white text so it clearly reads as a button
  tryonPrimaryButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  tryonButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  tryonPrimaryText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  // Secondary CTA: outlined, visually subordinate to the primary
  tryonRegenButton: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tryonRegenText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  tryonLoadingBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  tryonLoadingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  tryonLoadingHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // No Outfits
  noOutfits: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  noOutfitsIcon: { fontSize: 48, marginBottom: SPACING.md },
  noOutfitsText: { fontSize: 16, color: COLORS.textMuted },

  // Empty Content
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  emptyContentIcon: { fontSize: 64, marginBottom: SPACING.lg },
  emptyContentTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyContentText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', maxWidth: 300 },
});
