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
  Image,
  Platform,
  Animated,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { recommendationsAPI, wardrobeAPI } from '../services/api';
import { API_BASE_URL } from '../config/api';
import FlowNavBar from '../components/FlowNavBar';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme/colors';

// Cross-platform alert helper
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
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
const SidebarItem = ({ recommendation, isSelected, onSelect }) => {
  const date = formatDate(recommendation.created_at);
  const icon = getOccasionIcon(recommendation.query);
  const label = getOccasionLabel(recommendation.query);
  const outfitCount = recommendation.outfits?.length || 0;
  
  return (
    <TouchableOpacity
      style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
      onPress={() => onSelect(recommendation)}
      activeOpacity={0.7}
    >
      {isSelected && (
        <View style={styles.selectedIndicator} />
      )}
      <View style={styles.sidebarItemContent}>
        <View style={styles.sidebarItemHeader}>
          <Text style={styles.sidebarIcon}>{icon}</Text>
          <Text style={[styles.sidebarLabel, isSelected && styles.sidebarLabelSelected]}>
            {label}
          </Text>
        </View>
        <Text style={styles.sidebarDate}>{date}</Text>
        <Text style={styles.sidebarQuery} numberOfLines={2}>{recommendation.query}</Text>
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
              <Text style={styles.drawerTitle}>✨ Style AI</Text>
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
              recommendations.map((rec) => (
                <SidebarItem
                  key={rec.id}
                  recommendation={rec}
                  isSelected={selectedId === rec.id}
                  onSelect={() => onSelect(rec)}
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
const OutfitDisplay = ({ outfit, index, wardrobeItems, onTryOn, loadingTryOn, recommendationId }) => {
  const [showTryon, setShowTryon] = useState(false);
  
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
      
      {/* Items Grid */}
      <Text style={styles.sectionLabel}>Outfit Items ({itemIds.length})</Text>
      <View style={styles.itemsGrid}>
        {itemIds.map((itemId, idx) => {
          const imageUrl = getWardrobeImage(itemId);
          const itemName = getItemName(itemId);
          const wardrobeItem = getWardrobeItem(itemId);
          
          return (
            <View key={idx} style={styles.outfitItemCard}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.outfitItemImage} resizeMode="contain" />
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
              </View>
            </View>
          );
        })}
      </View>
      
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
      
      {/* Try-On Section */}
      <View style={styles.tryonSection}>
        <Text style={styles.sectionLabel}>Virtual Try-On</Text>
        
        {tryonImageUrl && (
          <TouchableOpacity 
            style={styles.tryonImageContainer}
            onPress={() => setShowTryon(!showTryon)}
          >
            {showTryon ? (
              <Image source={{ uri: tryonImageUrl }} style={styles.tryonImage} resizeMode="contain" />
            ) : (
              <View style={styles.tryonPreview}>
                <Text style={styles.tryonPreviewIcon}>🖼️</Text>
                <Text style={styles.tryonPreviewText}>Tap to view try-on result</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.tryonButton, loadingTryOn && styles.buttonDisabled]}
          onPress={() => onTryOn && onTryOn(recommendationId, index)}
          disabled={loadingTryOn}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loadingTryOn ? [COLORS.surface, COLORS.surfaceLight] : COLORS.gradients.accent}
            style={styles.tryonButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loadingTryOn ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
                <Text style={styles.tryonButtonText}>  Generating...</Text>
              </View>
            ) : (
              <Text style={styles.tryonButtonText}>
                {tryonImageUrl ? '🔄 Regenerate Try-On' : '👗 Try This On Me'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
        <LinearGradient colors={COLORS.gradients.accent} style={styles.generatingIcon}>
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

export default function RecommendationsScreen() {
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
      const sortedRecs = (recsData || []).sort((a, b) => b.id - a.id);
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
      
      const result = await recommendationsAPI.generate(query.trim());
      
      setGeneratingStatus({ status: '🤖 AI Working', message: 'Analyzing your style...', progress: 40 });
      
      const recommendationId = result.id;
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
          const rec = data.find(r => r.id === recommendationId);
          
          if (rec && rec.status === 'completed') {
            clearInterval(checkStatus);
            setGeneratingStatus({ status: '🎉 Done!', message: 'Your outfits are ready!', progress: 100 });
            
            setTimeout(() => {
              const sortedRecs = data.sort((a, b) => b.id - a.id);
              setRecommendations(sortedRecs);
              setSelectedRec(rec);
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
      showAlert('Error', error.response?.data?.detail || 'Failed to generate');
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
        
        showAlert('✨ Success', 'Your virtual try-on is ready!');
      }
    } catch (error) {
      showAlert('Error', error.response?.data?.detail || 'Failed to generate try-on');
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
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Style AI...</Text>
      </View>
    );
  }

  const processedCount = wardrobeItems.filter(item => item.processing_status === 'completed').length;
  const isMobileLayout = Platform.OS !== 'web' || windowWidth < 820;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundLight]} style={StyleSheet.absoluteFill} />

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
                <Text style={styles.mobileTitle}>Style AI</Text>
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
              <Text style={styles.sidebarTitle}>✨ Style AI</Text>
              <Text style={styles.sidebarSubtitle}>{recommendations.length} sessions</Text>
            </View>

            <TouchableOpacity
              style={styles.newButton}
              onPress={() => setShowNewForm(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.gradients.primary}
                style={styles.newButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.newButtonText}>+ New Request</Text>
              </LinearGradient>
            </TouchableOpacity>

            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {recommendations.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryIcon}>📭</Text>
                  <Text style={styles.emptyHistoryText}>No history yet</Text>
                </View>
              ) : (
                recommendations.map((rec) => (
                  <SidebarItem
                    key={rec.id}
                    recommendation={rec}
                    isSelected={selectedRec?.id === rec.id && !showNewForm}
                    onSelect={handleSelectRec}
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
            <ScrollView style={styles.newFormContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.newFormContent}>
                <Text style={styles.newFormTitle}>✨ Create New Outfit</Text>
                <Text style={styles.newFormSubtitle}>Tell me what you're looking for</Text>
                
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
                  />
                </View>
                
                {/* Generate Button */}
                <TouchableOpacity
                  style={[styles.generateButton, (!query.trim() || processedCount < 2) && styles.buttonDisabled]}
                  onPress={handleGenerate}
                  disabled={!query.trim() || processedCount < 2}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={(!query.trim() || processedCount < 2) 
                      ? [COLORS.surface, COLORS.surfaceLight] 
                      : COLORS.gradients.accent}
                    style={styles.generateButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.generateButtonText}>🚀 Generate Outfits</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {processedCount < 2 && (
                  <Text style={styles.warningText}>⚠️ Add at least 2 analyzed wardrobe items first</Text>
                )}
              </View>
            </ScrollView>
          )}
          
          {/* Selected Recommendation */}
          {!generating && !showNewForm && selectedRec && (
            <View style={styles.recommendationView}>
              {/* Recommendation Header */}
              <View style={styles.recHeader}>
                <View style={styles.recHeaderLeft}>
                  <Text style={styles.recIcon}>{getOccasionIcon(selectedRec.query)}</Text>
                  <View>
                    <Text style={styles.recTitle}>{getOccasionLabel(selectedRec.query)}</Text>
                    <Text style={styles.recDate}>{formatDate(selectedRec.created_at)}</Text>
                  </View>
                </View>
                <View style={[
                  styles.recStatusBadge,
                  { backgroundColor: selectedRec.status === 'completed' ? COLORS.success : COLORS.warning }
                ]}>
                  <Text style={styles.recStatusText}>
                    {selectedRec.status === 'completed' ? '✓ Complete' : '⏳ Processing'}
                  </Text>
                </View>
              </View>
              
              {/* Query */}
              <View style={styles.queryBox}>
                <Text style={styles.queryLabel}>Your Request:</Text>
                <Text style={styles.queryText}>"{selectedRec.query}"</Text>
              </View>
              
              {/* Outfit Tabs */}
              {selectedRec.outfits && selectedRec.outfits.length > 0 && (
                <>
                  <View style={styles.outfitTabs}>
                    {selectedRec.outfits.map((_, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.outfitTab, selectedOutfitIndex === idx && styles.outfitTabActive]}
                        onPress={() => setSelectedOutfitIndex(idx)}
                      >
                        <Text style={[styles.outfitTabText, selectedOutfitIndex === idx && styles.outfitTabTextActive]}>
                          Outfit {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Outfit Content */}
                  <ScrollView style={styles.outfitScroll} showsVerticalScrollIndicator={false}>
                    <OutfitDisplay
                      outfit={selectedRec.outfits[selectedOutfitIndex]}
                      index={selectedOutfitIndex}
                      wardrobeItems={wardrobeItems}
                      onTryOn={handleTryOn}
                      loadingTryOn={loadingTryOn}
                      recommendationId={selectedRec.id}
                    />
                  </ScrollView>
                </>
              )}
              
              {/* No Outfits */}
              {(!selectedRec.outfits || selectedRec.outfits.length === 0) && (
                <View style={styles.noOutfits}>
                  <Text style={styles.noOutfitsIcon}>
                    {selectedRec.status === 'processing' ? '⏳' : '❌'}
                  </Text>
                  <Text style={styles.noOutfitsText}>
                    {selectedRec.status === 'processing' 
                      ? 'AI is creating your outfits...' 
                      : 'No outfits generated'}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Empty State - No Selection */}
          {!generating && !showNewForm && !selectedRec && (
            <View style={styles.emptyContent}>
              <Text style={styles.emptyContentIcon}>👗</Text>
              <Text style={styles.emptyContentTitle}>Welcome to Style AI</Text>
              <Text style={styles.emptyContentText}>
                Click "New Request" to get AI-powered outfit recommendations from your wardrobe
              </Text>
            </View>
          )}
        </View>
      </View>

      <FlowNavBar
        prev={{ route: 'Wardrobe', label: 'Back: Wardrobe', icon: '👗', enabled: true }}
        next={null}
      />
    </View>
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
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  newButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  newButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  
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
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  recIcon: { fontSize: 32, marginRight: SPACING.md },
  recTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  recDate: { fontSize: 12, color: COLORS.textMuted },
  recStatusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  recStatusText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  
  // Query Box
  queryBox: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  queryLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  queryText: { fontSize: 14, color: COLORS.textPrimary, fontStyle: 'italic' },
  
  // Outfit Tabs
  outfitTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
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
  
  // Outfit Scroll
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
  
  // Try-On Section
  tryonSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  tryonImageContainer: { marginBottom: SPACING.md },
  tryonImage: { width: '100%', height: 400, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.surfaceLight },
  tryonPreview: {
    height: 120,
    backgroundColor: COLORS.backgroundGlass,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  tryonPreviewIcon: { fontSize: 36, marginBottom: SPACING.sm },
  tryonPreviewText: { fontSize: 14, color: COLORS.textMuted },
  tryonButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  tryonButtonGradient: { paddingVertical: SPACING.lg, alignItems: 'center' },
  tryonButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
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
