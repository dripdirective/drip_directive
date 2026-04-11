import {
  CheckCircle2,
  Image as ImageIcon,
  Layers3,
  MoveRight,
  ScanFace,
  Sparkles,
} from 'lucide-react';
import { startTransition, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { workspaceAPI } from '../lib/api';
import { formatProcessingStatus, formatRelativeDate, getApiError } from '../lib/utils';

const EMPTY_SUMMARY = {
  profile_exists: false,
  profile_completion: 0,
  user_images_total: 0,
  user_images_processed: 0,
  wardrobe_items_total: 0,
  wardrobe_items_processed: 0,
  recommendations_total: 0,
  style_snapshot: null,
  latest_recommendation: null,
};

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const loadOverview = useEffectEvent(async () => {
    try {
      setLoading(true);
      setError('');
      const nextSummary = await workspaceAPI.summary();
      startTransition(() => {
        setSummary({ ...EMPTY_SUMMARY, ...(nextSummary || {}) });
      });
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load overview.'));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    loadOverview();
  }, []);

  const nextSteps = useMemo(() => {
    const items = [];

    if (!summary.profile_exists) {
      items.push('Finish your profile.');
    }
    if (summary.user_images_total === 0) {
      items.push('Add a photo.');
    } else if (summary.user_images_processed === 0) {
      items.push('Get your photo ready.');
    }
    if (summary.wardrobe_items_total === 0) {
      items.push('Add a few pieces.');
    } else if (summary.wardrobe_items_processed === 0) {
      items.push('Get your wardrobe ready.');
    }
    if (summary.recommendations_total === 0) {
      items.push('Generate your first look.');
    }

    return items.length > 0 ? items : ['Everything is ready.'];
  }, [
    summary.profile_exists,
    summary.user_images_total,
    summary.user_images_processed,
    summary.wardrobe_items_total,
    summary.wardrobe_items_processed,
    summary.recommendations_total,
  ]);

  const primaryAction = summary.profile_exists
    ? { label: 'Go to profile', href: '/app/profile' }
    : { label: 'Complete profile', href: '/app/profile' };

  return (
    <div className="page-stack">
      <section className="panel panel--hero">
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Overview</p>
            <h3>Your app at a glance.</h3>
          </div>
          <button type="button" className="button button--ghost" onClick={loadOverview}>
            Refresh
          </button>
        </div>

        {error ? <div className="form-message form-message--error">{error}</div> : null}

        <div className="stats-grid stats-grid--compact">
          <StatCard
            icon={<ScanFace size={18} />}
            label="Profile"
            value={`${summary.profile_completion}%`}
            note={summary.profile_exists ? 'Ready' : 'Start here'}
          />
          <StatCard
            icon={<ImageIcon size={18} />}
            label="Photos"
            value={`${summary.user_images_processed}/${summary.user_images_total}`}
            note={summary.user_images_processed > 0 ? 'Ready' : 'Needs setup'}
            tone="cool"
          />
          <StatCard
            icon={<Layers3 size={18} />}
            label="Wardrobe"
            value={`${summary.wardrobe_items_processed}/${summary.wardrobe_items_total}`}
            note={summary.wardrobe_items_processed > 0 ? 'Ready' : 'Needs setup'}
            tone="mint"
          />
          <StatCard
            icon={<Sparkles size={18} />}
            label="Looks"
            value={summary.recommendations_total}
            note="Saved"
            tone="gold"
          />
        </div>
      </section>

      <section className="two-up-grid">
        <article className="panel">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Next</p>
              <h4>What to do next</h4>
            </div>
          </div>

          <div className="check-list">
            {nextSteps.map((item) => (
              <div key={item} className="check-list__item">
                <CheckCircle2 size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="button-row">
            <Link className="button button--primary" to={primaryAction.href}>
              {primaryAction.label}
              <MoveRight size={16} />
            </Link>
            <Link className="button button--ghost" to="/app/wardrobe">
              Open wardrobe
            </Link>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <p className="section-heading__eyebrow">Style notes</p>
              <h4>{summary.style_snapshot ? 'Current read' : 'Not ready yet'}</h4>
            </div>
          </div>

          {loading && !summary.style_snapshot ? (
            <div className="empty-state empty-state--compact">Loading...</div>
          ) : summary.style_snapshot ? (
            <>
              {summary.style_snapshot.recommended_colors?.length ? (
                <div className="chip-row">
                  {summary.style_snapshot.recommended_colors.map((color) => (
                    <span key={color} className="chip chip--soft">
                      {color}
                    </span>
                  ))}
                </div>
              ) : null}

              {summary.style_snapshot.recommended_styles?.length ? (
                <div className="chip-row">
                  {summary.style_snapshot.recommended_styles.map((style) => (
                    <span key={style} className="chip">
                      {style}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="support-copy">
                {summary.style_snapshot.notes || 'Add a few photos to fill this section.'}
              </p>
            </>
          ) : (
            <div className="empty-state empty-state--compact">
              Add and process a few photos to unlock this.
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="section-heading__eyebrow">Latest look</p>
            <h4>
              {summary.latest_recommendation
                ? summary.latest_recommendation.query
                : 'No looks yet'}
            </h4>
          </div>
        </div>

        {summary.latest_recommendation ? (
          <div className="timeline-card">
            <div className="timeline-card__meta">
              <span className="pill pill--warm">
                {formatProcessingStatus(summary.latest_recommendation.status)}
              </span>
              <span>{formatRelativeDate(summary.latest_recommendation.created_at)}</span>
            </div>
            <p className="support-copy">
              {summary.latest_recommendation.outfit_count} outfit
              {summary.latest_recommendation.outfit_count === 1 ? '' : 's'} ready.
            </p>
            <div className="button-row">
              <Link className="button button--ghost" to="/app/recommendations">
                Open looks
                <MoveRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="empty-state empty-state--compact">
            Generate a look to start here.
          </div>
        )}
      </section>
    </div>
  );
}
