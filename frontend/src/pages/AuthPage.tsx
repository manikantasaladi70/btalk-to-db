import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useStore } from '../store/useStore'
import { Database, ArrowRight, Check } from 'lucide-react'

const FEATURES = [
  'Connect PostgreSQL, MySQL, or SQLite',
  'Natural language to SQL — no SQL needed',
  'Redis-powered query caching',
  'Full query history & export to CSV',
]

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useStore(s => s.setToken)
  const navigate = useNavigate()

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      let res
      if (mode === 'login') {
        res = await authApi.login(email, password)
      } else {
        res = await authApi.register(email, password, name)
      }
      setToken(res.data.access_token)
      navigate('/')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.logoWrap}><Database size={18} color="#000" strokeWidth={2.5} /></div>
          <span style={styles.logoText}>BtalkToDB</span>
        </div>

        <div style={styles.leftBody}>
          <div style={styles.pill}>AI-powered SQL interface</div>
          <h1 style={styles.headline}>
            Ask your database<br />
            <span style={{ color: 'var(--accent)' }}>anything.</span>
          </h1>
          <p style={styles.sub}>
            Connect any database and start asking questions in plain English.
            No SQL knowledge required.
          </p>

          <div style={styles.featureList}>
            {FEATURES.map(f => (
              <div key={f} style={styles.featureItem}>
                <div style={styles.checkWrap}><Check size={11} color="var(--accent)" strokeWidth={3} /></div>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.leftFooter}>
          <div style={styles.stat}><span style={styles.statNum}>3</span><span style={styles.statLabel}>DB types</span></div>
          <div style={styles.statDivider} />
          <div style={styles.stat}><span style={styles.statNum}>∞</span><span style={styles.statLabel}>Queries</span></div>
          <div style={styles.statDivider} />
          <div style={styles.stat}><span style={styles.statNum}>0</span><span style={styles.statLabel}>SQL needed</span></div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
              {mode === 'login' ? 'Sign in to continue to your workspace' : 'Get started — it only takes a moment'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <button className="btn btn-primary"
            style={{ width: '100%', marginTop: 20, justifyContent: 'center', padding: '12px', fontSize: 14 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            {!loading && <ArrowRight size={15} />}
          </button>

          <p style={styles.toggle}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button style={styles.toggleBtn}
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
  left: {
    flex: 1, background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '36px 48px',
    position: 'relative', overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 34, height: 34, borderRadius: 9, background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' },
  leftBody: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420 },
  pill: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--accent-bg)', color: 'var(--accent)',
    border: '1px solid rgba(77,255,160,0.2)',
    borderRadius: 20, padding: '4px 12px', fontSize: 11,
    fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
    marginBottom: 20, width: 'fit-content',
  },
  headline: {
    fontSize: 44, fontWeight: 800, lineHeight: 1.1,
    color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.03em',
  },
  sub: { color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 12 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10 },
  checkWrap: {
    width: 20, height: 20, borderRadius: 6, background: 'var(--accent-bg)',
    border: '1px solid rgba(77,255,160,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  leftFooter: { display: 'flex', alignItems: 'center', gap: 24, paddingTop: 32, borderTop: '1px solid var(--border)' },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statNum: { fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' },
  statLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statDivider: { width: 1, height: 32, background: 'var(--border)' },
  right: { width: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px' },
  formCard: { width: '100%', maxWidth: 380 },
  formTitle: { fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' },
  errorBox: {
    marginTop: 14, padding: '10px 14px', borderRadius: 8,
    background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.15)',
    color: 'var(--danger)', fontSize: 13,
  },
  toggle: { textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 13 },
  toggleBtn: { background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
}