import {
  LoaderCircle,
  MoveRight,
  RefreshCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { recommendationsAPI, userImagesAPI, wardrobeAPI } from '../lib/api';
import {
  createNumberedLabelMap,
  formatProcessingStatus,
  formatRelativeDate,
  getApiError,
  getWardrobeDisplayName,
  inferTryOnCategory,
  preferredTryOnImageStorage,
  resolveImageUrl,
  truncateText,
} from '../lib/utils';

const QUICK_PROMPTS = [
  'Smart casual dinner look',
  'Easy airport outfit',
  'Polished founder meeting look',
  'Date-night outfit',
];

const RECOMMENDATION_TYPES = ['', 'casual', 'business', 'party', 'date', 'travel', 'wedding'];

function makeTryOnKey(recommendationId, outfitIndex) {
  return `${recommendationId}:${outfitIndex}`;
}

function buildDefaultTryOnControl(outfit, userImages, wardrobeMap) {
  const defaultUserImageId = preferredTryOnImageStorage.get() || userImages[0]?.id || '';
  const defaultWardrobeItemId = outfit.wardrobe_item_ids?.[0] || '';
  const inferredCategory = defaultWardrobeItemId && wardrobeMap[defaultWardrobeItemId]
    ? inferTryOnCategory(wardrobeMap[defaultWardrobeItemId])
    : 'tops';

  return {
    userImageId: String(defaultUserImageId || ''),
    wardrobeItemId: String(defaultWardrobeItemId || ''),
    category: inferredCategory,
    garmentPhotoType: 'flat-lay',
  };
}

export default function RecommendationsLabPage() {
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [recommendationType, setRecommendationType] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [userImages, setUserImages] = useState([]);
  const [tryOnControls, setTryOnControls] = useState({});
  const [tryOnBusyKey, setTryOnBusyKey] = useState('');
  const pollRef = useRef(null);

  const wardrobeMap = useMemo(
    () => Object.fromEntries(wardrobeItems.map((item) => [item.id, item])),
    [wardrobeItems]
  );
  const garmentLabelById = useMemo(() => createNumberedLabelMap(wardrobeItems, 'Garment'), [wardrobeItems]);
  const photoLabelById = useMemo(() => createNumberedLabelMap(userImages, 'Photo'), [userImages]);

  const loadSupportingData = useEffectEvent(async () => {
    try {
      setSupportLoading(true);
      const [nextWardrobeItems, nextUserImages] = await Promise.all([
        wardrobeAPI.list(),
        userImagesAPI.list(),
      ]);

      startTransition(() => {
        setWardrobeItems((nextWardrobeItems || []).sort((left, right) => right.id - left.id));
        setUserImages((nextUserImages || []).sort((left, right) => right.id - left.id));
      });
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load supporting recommendation data.'));
    } finally {
      setSupportLoading(false);
    }
  });

  const loadRecommendationDetail = useEffectEvent(async (recommendationId) => {
    if (!recommendationId) {
      setSelectedRecommendation(null);
      return null;
    }

    const detail = await recommendationsAPI.getOne(recommendationId);
    startTransition(() => setSelectedRecommendation(detail));
    return detail;
  });

  const loadHistory = useEffectEvent(async ({ focusLatest = false, silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const history = await recommendationsAPI.list(100);
      const sortedHistory = [...(history || [])].sort((left, right) => right.id - left.id);

      startTransition(() => setRecommendations(sortedHistory));

      const validSelectedId =
        selectedRecommendationId && sortedHistory.some((item) => item.id === selectedRecommendationId)
          ? selectedRecommendationId
          : null;
      const nextSelectedId = focusLatest
        ? sortedHistory[0]?.id || null
        : validSelectedId || sortedHistory[0]?.id || null;

      setSelectedRecommendationId(nextSelectedId);
      if (nextSelectedId) {
        await loadRecommendationDetail(nextSelectedId);
      } else {
        setSelectedRecommendation(null);
      }
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load recommendations.'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadSupportingData();
    loadHistory();
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  function startPollingForUpdates({ focusLatest = false } = {}) {
    let attempts = 0;
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      await loadHistory({ focusLatest, silent: true });
      if (attempts >= 12) {
        window.clearInterval(pollRef.current);
      }
    }, 4000);
  }

  async function handleGenerateRecommendation(event) {
    event.preventDefault();
    if (!query.trim()) {
      setError('Write a recommendation request first.');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      await recommendationsAPI.generate({
        query: query.trim(),
        recommendation_type: recommendationType || null,
      });
      setNotice('Creating your looks.');
      startPollingForUpdates({ focusLatest: true });
    } catch (generateError) {
      setError(getApiError(generateError, 'Unable to generate recommendations.'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelectRecommendation(recommendationId) {
    try {
      setSelectedRecommendationId(recommendationId);
      setError('');
      await loadRecommendationDetail(recommendationId);
    } catch (detailError) {
      setError(getApiError(detailError, 'Unable to load recommendation details.'));
    }
  }

  function getTryOnControl(key, outfit) {
    return tryOnControls[key] || buildDefaultTryOnControl(outfit, userImages, wardrobeMap);
  }

  function updateTryOnControl(key, outfit, patch) {
    setTryOnControls((current) => ({
      ...current,
      [key]: {
        ...(current[key] || buildDefaultTryOnControl(outfit, userImages, wardrobeMap)),
        ...patch,
      },
    }));
  }

  async function handleGenerateTryOn(outfit, outfitIndex) {
    if (!selectedRecommendation) {
      return;
    }

    const key = makeTryOnKey(selectedRecommendation.id, outfitIndex);
    const control = getTryOnControl(key, outfit);

    if (!control.userImageId) {
      setError('Upload or select a user photo before running try-on.');
      return;
    }

    try {
      setTryOnBusyKey(key);
      setError('');

      const response = await recommendationsAPI.generateTryOn(selectedRecommendation.id, {
        outfit_index: outfitIndex,
        user_image_id: Number(control.userImageId),
        wardrobe_item_id: control.wardrobeItemId ? Number(control.wardrobeItemId) : undefined,
        category: control.category || undefined,
        garment_photo_type: control.garmentPhotoType,
      });

      setNotice('Try-on ready.');

      startTransition(() => {
        setSelectedRecommendation((current) => {
          if (!current) {
            return current;
          }
          const nextOutfits = [...(current.outfits || [])];
          nextOutfits[outfitIndex] = {
            ...nextOutfits[outfitIndex],
            tryon_image_path: response.image_path,
          };
          return {
            ...current,
            outfits: nextOutfits,
          };
        });

        setRecommendations((current) =>
          current.map((item) =>
            item.id === selectedRecommendation.id
              ? {
                  ...item,
                  outfits: (item.outfits || []).map((entry, index) =>
                    index === outfitIndex
                      ? { ...entry, tryon_image_path: response.image_path }
                      : entry
                  ),
                }
              : item
          )
        );
      });
    } catch (tryOnError) {
      setError(getApiError(tryOnError, 'Unable to generate try-on.'));
    } finally {
      setTryOnBusyKey('');
    }
  }

  return (
    <div className="page-stack">
      <section className="panel panel--hero">
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Looks</p>
            <h3>Describe the look you want.</h3>
          </div>
          <button type="button" className="button button--ghost" onClick={() => loadHistory()}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {notice ? <div className="form-message form-message--success">{notice}</div> : null}
        {error ? <div className="form-message form-message--error">{error}</div> : null}

        <form className="recommendation-form" onSubmit={handleGenerateRecommendation}>
          <label className="field field--full">
            <span>What do you want to wear?</span>
            <textarea
              className="textarea"
              rows="3"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: Smart casual dinner look that feels polished but easy."
            />
          </label>

          <label className="field">
            <span>Occasion</span>
            <select
              className="select"
              value={recommendationType}
              onChange={(event) => setRecommendationType(event.target.value)}
            >
              {RECOMMENDATION_TYPES.map((option) => (
                <option key={option || 'blank'} value={option}>
                  {option || 'Auto'}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="button button--primary" disabled={generating}>
            {generating ? <LoaderCircle size={16} className="spin" /> : <WandSparkles size={16} />}
            {generating ? 'Working...' : 'Generate'}
          </button>
        </form>

        <div className="chip-row">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chip chip--interactive"
              onClick={() => setQuery(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="recommendation-layout">
        <aside className="panel recommendation-history">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Saved looks</p>
              <h4>{loading ? 'Loading...' : `${recommendations.length} saved`}</h4>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="empty-state">No looks yet.</div>
          ) : (
            <div className="history-list">
              {recommendations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`history-list__item ${
                    selectedRecommendationId === item.id ? 'history-list__item--active' : ''
                  }`}
                  onClick={() => handleSelectRecommendation(item.id)}
                >
                  <div className="history-list__meta">
                    <span className="pill pill--soft">{formatProcessingStatus(item.status)}</span>
                    <span>{formatRelativeDate(item.created_at)}</span>
                  </div>
                  <strong>{item.query}</strong>
                  <p>{item.outfits?.length || 0} outfit{item.outfits?.length === 1 ? '' : 's'}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="page-stack">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="section-heading__eyebrow">Details</p>
                <h4>{selectedRecommendation?.query || 'Choose a saved look'}</h4>
              </div>
            </div>

            {!selectedRecommendation ? (
              <div className="empty-state">Pick a saved look to see the outfits.</div>
            ) : selectedRecommendation.status === 'processing' || !selectedRecommendation.outfits?.length ? (
              <div className="empty-state">
                <LoaderCircle size={18} className="spin" />
                Still working on this look.
              </div>
            ) : (
              <div className="page-stack">
                <div className="session-meta-grid">
                  <div className="mini-stat">
                    <strong>{formatProcessingStatus(selectedRecommendation.status)}</strong>
                    <span>Status</span>
                  </div>
                  <div className="mini-stat">
                    <strong>{selectedRecommendation.outfits?.length || 0}</strong>
                    <span>Outfits</span>
                  </div>
                  <div className="mini-stat">
                    <strong>{formatRelativeDate(selectedRecommendation.created_at)}</strong>
                    <span>Saved</span>
                  </div>
                </div>

                {selectedRecommendation.outfits.map((outfit, outfitIndex) => {
                  const key = makeTryOnKey(selectedRecommendation.id, outfitIndex);
                  const control = getTryOnControl(key, outfit);
                  const outfitImage = outfit.tryon_image_path
                    ? resolveImageUrl(outfit.tryon_image_path)
                    : '';

                  return (
                    <article key={`${selectedRecommendation.id}-${outfitIndex}`} className="outfit-card">
                      <div className="outfit-card__header">
                        <div>
                          <p className="section-heading__eyebrow">Outfit {outfitIndex + 1}</p>
                          <h4>{outfit.outfit_name || `Look ${outfitIndex + 1}`}</h4>
                        </div>
                        <span className="pill pill--warm">{outfit.occasion || 'Styled look'}</span>
                      </div>

                      <div className="outfit-card__layout">
                        <div className="outfit-card__copy">
                          <p className="support-copy">
                            {truncateText(outfit.description || outfit.why_it_works || '', 180) || 'No details yet.'}
                          </p>

                          <div className="chip-row">
                            {(outfit.wardrobe_item_ids || []).map((itemId) => (
                              <span key={`${key}-${itemId}`} className="chip chip--soft">
                                {getWardrobeDisplayName(wardrobeMap[itemId], garmentLabelById)}
                              </span>
                            ))}
                          </div>

                          {Array.isArray(outfit.styling_tips) && outfit.styling_tips.length > 0 ? (
                            <ul className="bullet-list">
                              {outfit.styling_tips.slice(0, 3).map((tip) => (
                                <li key={`${key}-${tip}`}>{tip}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>

                        <div className="tryon-workbench">
                          <div className="form-grid form-grid--tryon">
                            <label className="field">
                              <span>Photo</span>
                              <select
                                className="select"
                                value={control.userImageId}
                                onChange={(event) => {
                                  const nextId = event.target.value;
                                  updateTryOnControl(key, outfit, { userImageId: nextId });
                                  if (nextId) {
                                    preferredTryOnImageStorage.set(Number(nextId));
                                  }
                                }}
                              >
                                <option value="">Choose a photo</option>
                                {userImages.map((image) => (
                                  <option key={image.id} value={String(image.id)}>
                                    {photoLabelById[image.id] || 'Photo'}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="field">
                              <span>Piece</span>
                              <select
                                className="select"
                                value={control.wardrobeItemId}
                                onChange={(event) => {
                                  const nextWardrobeItemId = event.target.value;
                                  const nextItem = wardrobeMap[Number(nextWardrobeItemId)];
                                  updateTryOnControl(key, outfit, {
                                    wardrobeItemId: nextWardrobeItemId,
                                    category: nextItem ? inferTryOnCategory(nextItem) : control.category,
                                  });
                                }}
                              >
                                {(outfit.wardrobe_item_ids || []).map((itemId) => (
                                  <option key={itemId} value={String(itemId)}>
                                    {getWardrobeDisplayName(wardrobeMap[itemId], garmentLabelById)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <button
                            type="button"
                            className="button button--primary"
                            onClick={() => handleGenerateTryOn(outfit, outfitIndex)}
                            disabled={tryOnBusyKey === key || supportLoading}
                          >
                            {tryOnBusyKey === key ? (
                              <LoaderCircle size={16} className="spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                            {tryOnBusyKey === key ? 'Working...' : 'Try on'}
                            <MoveRight size={16} />
                          </button>

                          {outfitImage ? (
                            <div className="tryon-result">
                              <img
                                src={outfitImage}
                                alt={`Try-on for ${outfit.outfit_name || `outfit ${outfitIndex + 1}`}`}
                              />
                            </div>
                          ) : (
                            <div className="empty-state empty-state--compact">
                              Your try-on will appear here.
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
