import { ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../lib/utils';

const MODE_COPY = {
  login: {
    title: 'Sign in',
    body: 'Go straight to your app.',
    cta: 'Sign in',
  },
  signup: {
    title: 'Create account',
    body: 'One login for profile, wardrobe, and looks.',
    cta: 'Create account',
  },
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const copy = useMemo(() => MODE_COPY[mode], [mode]);
  const redirectTo = location.state?.from || '/app/overview';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setPending(true);
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form.email, form.password);
      }
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(getApiError(submitError, 'Authentication failed.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-page__visual">
        <BrandMark />
        <div className="hero-kicker">
          <Sparkles size={15} />
          Simple access
        </div>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </section>

      <section className="auth-page__panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tabs__button ${mode === 'login' ? 'auth-tabs__button--active' : ''}`}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-tabs__button ${mode === 'signup' ? 'auth-tabs__button--active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Your password"
                required
              />
            </label>

            {mode === 'signup' ? (
              <label className="field">
                <span>Confirm password</span>
                <input
                  className="input"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  placeholder="Repeat password"
                  required
                />
              </label>
            ) : null}

            {error ? <div className="form-message form-message--error">{error}</div> : null}

            <button type="submit" className="button button--primary button--block" disabled={pending}>
              <KeyRound size={16} />
              {pending ? 'Working...' : copy.cta}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
