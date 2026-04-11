import {
  ArrowRight,
  Shirt,
  Sparkles,
  Stars,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';

const FEATURE_CARDS = [
  {
    icon: Shirt,
    title: 'Wardrobe',
    copy: 'Keep all your pieces in one clean grid.',
  },
  {
    icon: Sparkles,
    title: 'Looks',
    copy: 'Generate outfits and try them on fast.',
  },
  {
    icon: UserRound,
    title: 'Profile',
    copy: 'Set your photo once and reuse it everywhere.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? '/app/overview' : '/auth';
  const primaryLabel = isAuthenticated ? 'Open app' : 'Get started';

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero__copy reveal">
          <BrandMark />
          <div className="hero-kicker">
            <Stars size={15} />
            Personal styling
          </div>
          <h2 className="landing-hero__title">Upload. Style. Try on.</h2>
          <p className="landing-hero__body">
            A fast, uncluttered app for your photos, wardrobe, and looks.
          </p>

          <div className="landing-hero__actions">
            <Link className="button button--primary" to={primaryHref}>
              {primaryLabel}
              <ArrowRight size={16} />
            </Link>
            <Link className="button button--ghost" to="/auth">
              Sign in
            </Link>
          </div>
        </div>

        <div className="landing-hero__visual reveal reveal--delay">
          <div className="showcase-card showcase-card--primary">
            <div className="showcase-card__header">
              <span className="pill pill--warm">Simple flow</span>
              <span className="micro-copy">Profile, wardrobe, looks</span>
            </div>
            <div className="showcase-grid">
              <article className="preview-panel">
                <div className="preview-panel__eyebrow">
                  <UserRound size={15} />
                  Profile
                </div>
                <h3>Set your photo</h3>
                <p>Pick one default photo for quick try-on.</p>
              </article>

              <article className="preview-panel">
                <div className="preview-panel__eyebrow">
                  <Shirt size={15} />
                  Wardrobe
                </div>
                <h3>Add your pieces</h3>
                <p>Upload once and keep everything easy to find.</p>
              </article>

              <article className="preview-panel preview-panel--wide preview-panel--accent">
                <div className="preview-panel__eyebrow">
                  <Sparkles size={15} />
                  Looks
                </div>
                <h3>Get styled fast</h3>
                <p>Generate outfit ideas and try them on in the same place.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Inside the app</p>
          <h3>Only what you need.</h3>
        </div>

        <div className="feature-grid">
          {FEATURE_CARDS.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`feature-card reveal ${index % 2 === 1 ? 'reveal--delay' : ''}`}
              >
                <div className="feature-card__icon">
                  <Icon size={18} />
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
