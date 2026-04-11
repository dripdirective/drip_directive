import {
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import Dropzone from '../components/Dropzone';
import { aiProcessingAPI, userImagesAPI, wardrobeAPI } from '../lib/api';
import {
  createNumberedLabelMap,
  extractWardrobeHighlights,
  formatProcessingStatus,
  getApiError,
  getWardrobeDisplayName,
  inferTryOnCategory,
  pickWardrobeImage,
  preferredTryOnImageStorage,
  resolveImageUrl,
  truncateText,
} from '../lib/utils';

export default function WardrobeStudioPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [userImages, setUserImages] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedUserImageId, setSelectedUserImageId] = useState(
    () => preferredTryOnImageStorage.get() || null
  );
  const [tryOnResultUrl, setTryOnResultUrl] = useState('');
  const deferredSearch = useDeferredValue(search);
  const pollRef = useRef(null);

  const loadWardrobe = useEffectEvent(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const [nextWardrobeItems, nextUserImages] = await Promise.all([
        wardrobeAPI.list(),
        userImagesAPI.list(),
      ]);

      const sortedItems = [...(nextWardrobeItems || [])].sort((left, right) => right.id - left.id);
      const sortedImages = [...(nextUserImages || [])].sort((left, right) => right.id - left.id);

      startTransition(() => {
        setWardrobeItems(sortedItems);
        setUserImages(sortedImages);
      });

      const preferredImageId = preferredTryOnImageStorage.get();
      const fallbackImageId = sortedImages.some((image) => image.id === preferredImageId)
        ? preferredImageId
        : sortedImages[0]?.id || null;
      setSelectedUserImageId(fallbackImageId);

      const fallbackItemId = selectedItemId && sortedItems.some((item) => item.id === selectedItemId)
        ? selectedItemId
        : null;
      setSelectedItemId(fallbackItemId);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load wardrobe lab.'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadWardrobe();
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  const selectedItem = useMemo(
    () => wardrobeItems.find((item) => item.id === selectedItemId) || null,
    [selectedItemId, wardrobeItems]
  );
  const garmentLabelById = useMemo(() => createNumberedLabelMap(wardrobeItems, 'Garment'), [wardrobeItems]);
  const photoLabelById = useMemo(() => createNumberedLabelMap(userImages, 'Photo'), [userImages]);

  const selectedItemLabel = useMemo(() => {
    if (!selectedItem) {
      return '';
    }
    return getWardrobeDisplayName(selectedItem, garmentLabelById);
  }, [garmentLabelById, selectedItem]);

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return wardrobeItems;
    }

    return wardrobeItems.filter((item) => {
      const meta = [
        item.dress_type,
        item.style,
        item.color,
        item.brand,
        item.size,
        item.item_summary_text,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return meta.includes(query);
    });
  }, [deferredSearch, wardrobeItems]);

  const processedWardrobeCount = useMemo(
    () => wardrobeItems.filter((item) => item.processing_status === 'completed').length,
    [wardrobeItems]
  );

  const selectedUserImage = useMemo(
    () => userImages.find((image) => image.id === selectedUserImageId) || null,
    [selectedUserImageId, userImages]
  );
  const selectedItemReady = selectedItem?.processing_status === 'completed';

  function startPollingForWardrobeUpdates() {
    let attempts = 0;
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      await loadWardrobe({ silent: true });
      if (attempts >= 12) {
        window.clearInterval(pollRef.current);
      }
    }, 3000);
  }

  async function handleWardrobeUpload(files) {
    try {
      setUploading(true);
      setError('');
      setNotice('');

      for (const file of files) {
        await wardrobeAPI.upload(file);
      }

      setNotice(`${files.length} piece${files.length === 1 ? '' : 's'} added.`);
      await loadWardrobe({ silent: true });
    } catch (uploadError) {
      setError(getApiError(uploadError, 'Unable to upload wardrobe images.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleProcessAllWardrobe() {
    try {
      setProcessing(true);
      setError('');
      await aiProcessingAPI.processAllWardrobe();
      setNotice('Preparing your pieces.');
      startPollingForWardrobeUpdates();
    } catch (processError) {
      setError(getApiError(processError, 'Unable to start wardrobe AI processing.'));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeleteWardrobeItem(itemId) {
    try {
      await wardrobeAPI.remove(itemId);
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
        setTryOnResultUrl('');
      }
      await loadWardrobe({ silent: true });
    } catch (deleteError) {
      setError(getApiError(deleteError, 'Unable to delete the wardrobe item.'));
    }
  }

  function handleSelectItem(item) {
    setSelectedItemId(item.id);
    setTryOnResultUrl('');
    setNotice(`${getWardrobeDisplayName(item, garmentLabelById)} selected.`);
  }

  async function handleDirectTryOn() {
    if (!selectedItem) {
      setError('Choose a piece first.');
      return;
    }

    if (!selectedUserImageId) {
      setError('Add a photo before running try-on.');
      return;
    }

    if (!selectedItemReady) {
      setError('Get this piece ready before try-on.');
      return;
    }

    try {
      setTryOnLoading(true);
      setError('');

      const response = await wardrobeAPI.generateTryOn(selectedItem.id, {
        user_image_id: selectedUserImageId,
        category: inferTryOnCategory(selectedItem),
        garment_photo_type: 'flat-lay',
      });

      setTryOnResultUrl(response?.image_path || '');
      setNotice('Try-on ready.');
    } catch (tryOnError) {
      setError(getApiError(tryOnError, 'Unable to generate the try-on.'));
    } finally {
      setTryOnLoading(false);
    }
  }

  return (
    <div className="page-stack">
      {notice ? <div className="form-message form-message--success">{notice}</div> : null}
      {error ? <div className="form-message form-message--error">{error}</div> : null}

      <section className="wardrobe-top-grid">
        <article className="panel panel--hero">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Wardrobe</p>
              <h3>Add your pieces.</h3>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button button--ghost"
                onClick={handleProcessAllWardrobe}
                disabled={processing || wardrobeItems.length === 0}
              >
                <WandSparkles size={16} />
                {processing ? 'Starting...' : 'Prepare pieces'}
              </button>
            </div>
          </div>

          <Dropzone
            title="Add wardrobe photos"
            hint="Upload garment photos, then process them once."
            onFilesSelected={handleWardrobeUpload}
          />

          {uploading ? <div className="support-copy">Uploading wardrobe items...</div> : null}

          <div className="stats-inline">
            <div className="mini-stat">
              <strong>{wardrobeItems.length}</strong>
              <span>Pieces</span>
            </div>
            <div className="mini-stat">
              <strong>{processedWardrobeCount}</strong>
              <span>Ready</span>
            </div>
            <div className="mini-stat">
              <strong>{userImages.length}</strong>
              <span>Photos</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Try-on</p>
              <h4>{selectedItem ? 'Ready when you are.' : 'Choose a piece from the grid.'}</h4>
            </div>
          </div>

          {selectedItem ? (
            <div className="tryon-studio">
              <div className="selected-image-inline selected-image-inline--compact">
                {pickWardrobeImage(selectedItem) ? (
                  <img
                    className="selected-image-inline__media"
                    src={pickWardrobeImage(selectedItem)}
                    alt={selectedItemLabel}
                  />
                ) : null}
                <div>
                  <strong>{selectedItemLabel}</strong>
                  <p className="support-copy">
                    {selectedItemReady ? 'Ready to try on.' : 'Get this piece ready before try-on.'}
                  </p>
                </div>
              </div>

              <label className="field">
                <span>Photo</span>
                <select
                  className="select"
                  value={selectedUserImageId || ''}
                  onChange={(event) => {
                    const nextId = event.target.value ? Number(event.target.value) : null;
                    setSelectedUserImageId(nextId);
                    preferredTryOnImageStorage.set(nextId);
                  }}
                >
                  <option value="">Choose a photo</option>
                  {userImages.map((image) => (
                    <option key={image.id} value={image.id}>
                      {photoLabelById[image.id] || 'Photo'}
                    </option>
                  ))}
                </select>
              </label>

              {selectedUserImage ? (
                <div className="selected-image-inline selected-image-inline--compact">
                  <img
                    className="selected-image-inline__media"
                    src={resolveImageUrl(selectedUserImage.image_path)}
                    alt={photoLabelById[selectedUserImage.id] || 'Selected photo'}
                  />
                  <div>
                    <strong>{photoLabelById[selectedUserImage.id] || 'Photo'}</strong>
                    <p className="support-copy">Used for this render.</p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="button button--primary"
                onClick={handleDirectTryOn}
                disabled={tryOnLoading || !selectedItemReady}
              >
                {tryOnLoading ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                {tryOnLoading ? 'Generating...' : 'Try on'}
              </button>

              {tryOnResultUrl ? (
                <div className="tryon-result">
                  <img src={resolveImageUrl(tryOnResultUrl)} alt="Try-on result" />
                </div>
              ) : (
                <div className="empty-state empty-state--compact">
                  Your result will appear here.
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              Choose a piece from the grid, then run try-on here.
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Your pieces</p>
            <h4>{loading ? 'Loading...' : `${filteredItems.length} piece${filteredItems.length === 1 ? '' : 's'}`}</h4>
          </div>
        </div>

        <label className="field">
          <span>Search</span>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              className="input input--with-icon"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type, color, style..."
            />
          </div>
        </label>

        {filteredItems.length === 0 ? (
          <div className="empty-state">No pieces match this search.</div>
        ) : (
          <div className="wardrobe-grid">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`wardrobe-card ${selectedItemId === item.id ? 'wardrobe-card--selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectItem(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectItem(item);
                  }
                }}
              >
                {pickWardrobeImage(item) ? (
                  <img src={pickWardrobeImage(item)} alt={getWardrobeDisplayName(item, garmentLabelById)} />
                ) : null}
                <div className="wardrobe-card__body">
                  <div className="media-card__title-row">
                    <strong>{getWardrobeDisplayName(item, garmentLabelById)}</strong>
                    <span className="pill pill--soft">{formatProcessingStatus(item.processing_status)}</span>
                  </div>

                  {item.item_summary_text ? (
                    <p className="support-copy">
                      {truncateText(item.item_summary_text, 120)}
                    </p>
                  ) : null}

                  <div className="chip-row">
                    {extractWardrobeHighlights(item).slice(0, 3).map((tag) => (
                      <span key={`${item.id}-${tag}`} className="chip chip--soft">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="button-row button-row--tight">
                    <button
                      type="button"
                      className={`button button--ghost ${selectedItemId === item.id ? 'button--selected' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectItem(item);
                      }}
                    >
                      <Sparkles size={16} />
                      {selectedItemId === item.id ? 'Using this' : 'Use this'}
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteWardrobeItem(item.id);
                      }}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
