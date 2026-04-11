import {
  Camera,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
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
import Dropzone from '../components/Dropzone';
import { aiProcessingAPI, profileAPI, userImagesAPI } from '../lib/api';
import {
  buildAdditionalInfoPayload,
  createNumberedLabelMap,
  extractUserStyleText,
  formatProcessingStatus,
  getAiProfile,
  getApiError,
  preferredTryOnImageStorage,
  resolveImageUrl,
} from '../lib/utils';

const DEFAULT_FORM = {
  name: '',
  gender: '',
  age: '',
  marital_status: '',
  occupation: '',
  country: '',
  state: '',
  body_type: '',
  face_tone: '',
  additional_info: '',
};

const GENDER_OPTIONS = ['', 'male', 'female', 'non-binary', 'prefer_not_to_say'];
const BODY_TYPE_OPTIONS = ['', 'slim', 'athletic', 'average', 'curvy', 'plus_size'];
const FACE_TONE_OPTIONS = ['', 'fair', 'medium', 'olive', 'dark', 'deep'];

function getProfileSafely() {
  return profileAPI.getProfile().catch((error) => {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  });
}

function toPayload(form, existingAdditionalInfo) {
  return {
    ...form,
    age: form.age ? Number(form.age) : null,
    name: form.name || null,
    gender: form.gender || null,
    marital_status: form.marital_status || null,
    occupation: form.occupation || null,
    country: form.country || null,
    state: form.state || null,
    body_type: form.body_type || null,
    face_tone: form.face_tone || null,
    additional_info: buildAdditionalInfoPayload(existingAdditionalInfo, form.additional_info),
  };
}

export default function ProfileStudioPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState(null);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [preferredImageId, setPreferredImageId] = useState(() => preferredTryOnImageStorage.get());
  const pollRef = useRef(null);

  const loadPage = useEffectEvent(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');

      const [nextProfile, nextImages] = await Promise.all([
        getProfileSafely(),
        userImagesAPI.list(),
      ]);

      const sortedImages = [...(nextImages || [])].sort((left, right) => right.id - left.id);

      startTransition(() => {
        setProfile(nextProfile);
        setImages(sortedImages);
        setForm(
          nextProfile
            ? {
                name: nextProfile.name || '',
                gender: nextProfile.gender || '',
                age: nextProfile.age || '',
                marital_status: nextProfile.marital_status || '',
                occupation: nextProfile.occupation || '',
                country: nextProfile.country || '',
                state: nextProfile.state || '',
                body_type: nextProfile.body_type || '',
                face_tone: nextProfile.face_tone || '',
                additional_info: extractUserStyleText(nextProfile.additional_info),
              }
            : DEFAULT_FORM
        );
      });

      const storedPreferredImageId = preferredTryOnImageStorage.get();
      const validPreferredImageId = sortedImages.some((image) => image.id === storedPreferredImageId)
        ? storedPreferredImageId
        : sortedImages[0]?.id || null;
      setPreferredImageId(validPreferredImageId);
      if (validPreferredImageId) {
        preferredTryOnImageStorage.set(validPreferredImageId);
      }
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load profile studio.'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadPage();
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  const aiProfile = useMemo(() => getAiProfile(profile), [profile]);
  const styleAssessment = aiProfile?.analysis?.style_assessment || {};
  const photoLabelById = useMemo(() => createNumberedLabelMap(images, 'Photo'), [images]);
  const preferredImage = useMemo(
    () => images.find((image) => image.id === preferredImageId) || images[0] || null,
    [images, preferredImageId]
  );

  function startPollingForImageUpdates() {
    let attempts = 0;
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      await loadPage({ silent: true });
      if (attempts >= 10) {
        window.clearInterval(pollRef.current);
      }
    }, 3000);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      const savedProfile = await profileAPI.saveProfile(
        toPayload(form, profile?.additional_info),
        Boolean(profile)
      );
      setProfile(savedProfile);
      setNotice('Profile saved.');
      await loadPage({ silent: true });
    } catch (saveError) {
      setError(getApiError(saveError, 'Unable to save the profile.'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(files) {
    try {
      setUploading(true);
      setError('');
      setNotice('');

      for (const file of files) {
        await userImagesAPI.upload(file, 'user_image');
      }

      setNotice(`${files.length} self photo${files.length === 1 ? '' : 's'} uploaded.`);
      await loadPage({ silent: true });
    } catch (uploadError) {
      setError(getApiError(uploadError, 'Unable to upload self-photos.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId) {
    try {
      setError('');
      await userImagesAPI.remove(imageId);
      if (preferredImageId === imageId) {
        preferredTryOnImageStorage.set(null);
        setPreferredImageId(null);
      }
      await loadPage({ silent: true });
    } catch (deleteError) {
      setError(getApiError(deleteError, 'Unable to delete the image.'));
    }
  }

  async function handleProcessImages() {
    try {
      setProcessing(true);
      setError('');
      await aiProcessingAPI.processUserImages();
      setNotice('Analyzing your photos.');
      startPollingForImageUpdates();
    } catch (processError) {
      setError(getApiError(processError, 'Unable to start AI image processing.'));
    } finally {
      setProcessing(false);
    }
  }

  const analyzedCount = images.filter((image) => image.processing_status === 'completed').length;

  return (
    <div className="page-stack">
      <section className="profile-summary-grid">
        <article className="panel panel--hero">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Profile</p>
              <h3>Keep your basics ready.</h3>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button button--ghost"
                onClick={handleProcessImages}
                disabled={processing || images.length === 0}
              >
                <WandSparkles size={16} />
                {processing ? 'Starting...' : 'Analyze photos'}
              </button>
            </div>
          </div>

          {notice ? <div className="form-message form-message--success">{notice}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}

          <div className="stats-inline">
            <div className="mini-stat">
              <strong>{images.length}</strong>
              <span>Photos</span>
            </div>
            <div className="mini-stat">
              <strong>{analyzedCount}</strong>
              <span>Ready</span>
            </div>
            <div className="mini-stat">
              <strong>{preferredImage ? 'Set' : '—'}</strong>
              <span>Default photo</span>
            </div>
          </div>

          <div className="panel-copy">
            <p className="support-copy">
              Keep one clear default photo and a few extra options for try-on.
            </p>

            {preferredImage ? (
              <div className="selected-image-inline">
                <img
                  className="selected-image-inline__media"
                  src={resolveImageUrl(preferredImage.image_path)}
                  alt="Default try-on photo"
                />
                <div>
                  <strong>Default photo selected.</strong>
                  <p className="support-copy">
                    This photo is used first when you open try-on.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Style notes</p>
              <h4>{aiProfile?.analysis ? 'Ready' : 'Waiting for photos'}</h4>
            </div>
          </div>

          {aiProfile?.analysis ? (
            <>
              <div className="chip-row">
                {(styleAssessment.recommended_colors || []).slice(0, 8).map((color) => (
                  <span key={color} className="chip chip--soft">
                    {color}
                  </span>
                ))}
              </div>
              <div className="chip-row">
                {(styleAssessment.recommended_styles || []).slice(0, 8).map((style) => (
                  <span key={style} className="chip">
                    {style}
                  </span>
                ))}
              </div>
              <p className="support-copy">
                {(styleAssessment.style_notes || '')
                  .toString()
                  .split(/\n|•/)
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(' ') || 'Style notes will show up here after photo analysis.'}
              </p>
            </>
          ) : (
            <p className="support-copy">
              Upload and process a few photos to unlock this.
            </p>
          )}
        </article>
      </section>

      <form className="panel" onSubmit={handleSaveProfile}>
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Basics</p>
            <h4>Keep it simple.</h4>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading profile fields...</div>
        ) : (
          <div className="form-grid form-grid--profile">
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="What should we call you?"
              />
            </label>

            <label className="field">
              <span>Gender</span>
              <select
                className="select"
                value={form.gender}
                onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option || 'blank'} value={option}>
                    {option || 'Select'}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Age</span>
              <input
                className="input"
                type="number"
                min="1"
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                placeholder="27"
              />
            </label>

            <label className="field">
              <span>Marital status</span>
              <input
                className="input"
                value={form.marital_status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, marital_status: event.target.value }))
                }
                placeholder="Single, married, prefer not to say..."
              />
            </label>

            <label className="field">
              <span>Occupation</span>
              <input
                className="input"
                value={form.occupation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, occupation: event.target.value }))
                }
                placeholder="Designer, founder, student..."
              />
            </label>

            <label className="field">
              <span>Country</span>
              <input
                className="input"
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                placeholder="India, Canada, United States..."
              />
            </label>

            <label className="field">
              <span>State / region</span>
              <input
                className="input"
                value={form.state}
                onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                placeholder="Karnataka, California, Ontario..."
              />
            </label>

            <label className="field">
              <span>Body type</span>
              <select
                className="select"
                value={form.body_type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, body_type: event.target.value }))
                }
              >
                {BODY_TYPE_OPTIONS.map((option) => (
                  <option key={option || 'blank'} value={option}>
                    {option || 'Select'}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Skin tone</span>
              <select
                className="select"
                value={form.face_tone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, face_tone: event.target.value }))
                }
              >
                {FACE_TONE_OPTIONS.map((option) => (
                  <option key={option || 'blank'} value={option}>
                    {option || 'Select'}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Style notes or preferences</span>
              <textarea
                className="textarea"
                rows="4"
                value={form.additional_info}
                onChange={(event) =>
                  setForm((current) => ({ ...current, additional_info: event.target.value }))
                }
                placeholder="Fit preferences, favorite colors, pieces you avoid..."
              />
            </label>
          </div>
        )}

        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Photos</p>
            <h4>Choose a default and keep moving.</h4>
          </div>
        </div>

        <Dropzone
          title="Add photos"
          hint="Upload clear front-facing photos for try-on."
          onFilesSelected={handlePhotoUpload}
        />

        {uploading ? <div className="support-copy">Uploading photos...</div> : null}

        {images.length === 0 ? (
          <div className="empty-state">
            <Camera size={18} />
            No self-photos uploaded yet.
          </div>
        ) : (
          <div className="media-grid">
            {images.map((image) => (
              <article key={image.id} className="media-card">
                <img src={resolveImageUrl(image.image_path)} alt={photoLabelById[image.id] || 'Photo'} />
                <div className="media-card__body">
                  <div className="media-card__title-row">
                    <strong>{photoLabelById[image.id] || 'Photo'}</strong>
                    <span className="pill pill--soft">{formatProcessingStatus(image.processing_status)}</span>
                  </div>
                  <div className="button-row button-row--tight">
                    <button
                      type="button"
                      className={`button button--ghost ${preferredImageId === image.id ? 'button--selected' : ''}`}
                      onClick={() => {
                        preferredTryOnImageStorage.set(image.id);
                        setPreferredImageId(image.id);
                        setNotice(`${photoLabelById[image.id] || 'Photo'} is now your default.`);
                      }}
                    >
                      <Sparkles size={16} />
                      {preferredImageId === image.id ? 'Default' : 'Set as default'}
                    </button>

                    <button
                      type="button"
                      className="button button--ghost button--danger"
                      onClick={() => handleDeleteImage(image.id)}
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
