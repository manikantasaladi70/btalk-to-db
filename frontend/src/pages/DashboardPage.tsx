import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MessageSquare, Zap, Clock, Database, ArrowRight, TrendingUp } from 'lucide-react'
import { queryApi, connectionsApi } from '../lib/api'
import { useStore } from '../store/useStore'

export default function DashboardPage() {
  const { stats, setStats, history, setHistory, connections, setConnections, setActiveConnection, activeConnection } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    connectionsApi.list().then(r => {
      setConnections(r.data)
      if (!activeConnection && r.data.length > 0) setActiveConnection(r.data[0])
    }).catch(() => {})
    queryApi.stats().then(r => setStats(r.data)).catch(() => {})
    queryApi.history(10).then(r => setHistory(r.data)).catch(() => {})
  }, [])

  const statCards = [
    { label: 'Total queries', value: stats?.total_queries ?? '—', icon: MessageSquare, color: 'var(--accent)', bg: 'var(--accent-bg)' },
    { label: 'Cache hits', value: stats?.cached_queries ?? '—', icon: Zap, color: 'var(--purple)', bg: 'var(--purple-bg)' },
    { label: 'Avg response', value: stats ? `${stats.avg_execution_ms}ms` : '—', icon: Clock, color: 'var(--warn)', bg: 'rgba(255,184,77,0.1)' },
    { label: 'Connections', value: connections.length, icon: Database, color: 'var(--blue)', bg: 'var(--blue-bg)' },
  ]

  const chartData = history.slice(0, 10).reverse().map((h, i) => ({
    name: `Q${i + 1}`,
    ms: h.execution_ms ?? 0,
    cached: h.was_cached,
  }))

  const cacheRate = stats && stats.total_queries > 0
    ? Math.round((stats.cached_queries / stats.total_queries) * 100)
    : 0

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Overview</p>
          <h1 style={styles.title}>Dashboard</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/query')}>
          <MessageSquare size={14} /> Ask a question <ArrowRight size={13} />
        </button>
      </div>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        {statCards.map(card => (
          <div key={card.label} className="card" style={styles.statCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={styles.statLabel}>{card.label}</p>
                <p style={styles.statValue}>{card.value}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon size={16} color={card.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={styles.bottom}>
        {/* Chart */}
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={styles.cardEyebrow}>Performance</p>
              <h3 style={styles.cardTitle}>Query execution times</h3>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Legend color="var(--accent)" label="Live" />
              <Legend color="var(--purple)" label="Cached" />
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={18} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" width={40} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.cached ? 'var(--purple)' : 'var(--accent)'} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<TrendingUp size={28} />} text="Run queries to see execution times here" />
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 280, flexShrink: 0 }}>
          {/* Cache rate */}
          <div className="card" style={{ padding: 18 }}>
            <p style={styles.cardEyebrow}>Efficiency</p>
            <p style={styles.cardTitle}>Cache hit rate</p>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Hit rate</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', fontFamily: 'var(--mono)' }}>{cacheRate}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${cacheRate}%`, background: 'var(--purple)', borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>

          {/* Recent questions */}
          <div className="card" style={{ flex: 1, padding: 18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={styles.cardTitle}>Recent queries</p>
              <button onClick={() => navigate('/history')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                View all
              </button>
            </div>
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 4).map(h => (
                  <div key={h.id} style={styles.histItem} onClick={() => navigate('/history')}>
                    <p style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {h.natural_language}
                    </p>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {h.was_cached && <span className="tag tag-purple" style={{ fontSize: 9 }}>cached</span>}
                      {h.error && <span className="tag tag-red" style={{ fontSize: 9 }}>error</span>}
                      {!h.error && <span className="tag tag-green" style={{ fontSize: 9 }}>{h.row_count} rows</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<MessageSquare size={22} />} text="No queries yet" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {label}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', color: 'var(--text3)', gap: 8 }}>
      {icon}
      <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>{text}</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { flex: 1, padding: '32px 36px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  statCard: { padding: 18 },
  statLabel: { fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--display)' },
  bottom: { display: 'flex', gap: 14, flex: 1 },
  cardEyebrow: { fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  histItem: { padding: '9px 10px', background: 'var(--surface2)', borderRadius: 7, cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.1s' },
}