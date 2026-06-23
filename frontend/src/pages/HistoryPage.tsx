import { useEffect, useState } from 'react'
import { Clock, Zap, ChevronDown, ChevronRight, AlertCircle, Search } from 'lucide-react'
import { queryApi } from '../lib/api'
import { useStore } from '../store/useStore'
import type { HistoryItem } from '../store/useStore'

export default function HistoryPage() {
  const { history, setHistory } = useStore()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    queryApi.history(50).then(r => setHistory(r.data)).finally(() => setLoading(false))
  }, [])

  function toggle(id: number) {
    setExpanded(prev => prev === id ? null : id)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const filtered = history.filter(h =>
    h.natural_language.toLowerCase().includes(search.toLowerCase()) ||
    h.connection_name.toLowerCase().includes(search.toLowerCase())
  )

  const errorCount = history.filter(h => h.error).length
  const cacheCount = history.filter(h => h.was_cached).length

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Activity log</p>
          <h1 style={styles.title}>Query history</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {history.length > 0 && (
            <>
              <span className="tag tag-green">{history.length} total</span>
              {cacheCount > 0 && <span className="tag tag-purple">{cacheCount} cached</span>}
              {errorCount > 0 && <span className="tag tag-red">{errorCount} errors</span>}
            </>
          )}
        </div>
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div style={styles.searchWrap}>
          <Search size={13} color="var(--text3)" style={{ flexShrink: 0 }} />
          <input
            placeholder="Search queries or connections…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'var(--text)', padding: 0 }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 64, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && history.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}><Clock size={24} color="var(--text3)" /></div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No queries yet</h3>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Head to "Ask a question" to get started.</p>
        </div>
      )}

      {/* No results */}
      {!loading && history.length > 0 && filtered.length === 0 && (
        <div style={styles.empty}>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No queries match your search.</p>
        </div>
      )}

      {/* List */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((h: HistoryItem) => {
            const isExpanded = expanded === h.id
            return (
              <div key={h.id} style={{
                background: 'var(--surface)', border: `1px solid ${isExpanded ? 'var(--border2)' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s',
                animation: 'fadeIn 0.15s ease',
              }}>
                <div style={styles.row} onClick={() => toggle(h.id)}>
                  {/* Status dot */}
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: h.error ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }} />

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                      {h.natural_language}
                    </p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {h.query_type !== 'SELECT' && (
                        <span className="tag" style={{
                          background: h.query_type === 'DELETE' ? 'rgba(255,90,90,0.1)' : h.query_type === 'UPDATE' ? 'rgba(255,184,77,0.1)' : 'var(--accent-bg)',
                          color: h.query_type === 'DELETE' ? 'var(--danger)' : h.query_type === 'UPDATE' ? 'var(--warn)' : 'var(--accent)',
                        }}>{h.query_type}</span>
                      )}
                      <span className="tag tag-gray">{h.connection_name}</span>
                      {h.was_cached && <span className="tag tag-purple"><Zap size={8} style={{ marginRight: 2 }} />cached</span>}
                      {h.error && <span className="tag tag-red"><AlertCircle size={8} style={{ marginRight: 2 }} />error</span>}
                      {!h.error && <span className="tag tag-green">{h.row_count} rows</span>}
                      {h.execution_ms && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{h.execution_ms}ms</span>}
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{formatTime(h.created_at)}</span>
                    </div>
                  </div>

                  <div style={{ color: 'var(--text3)', marginLeft: 10, flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {h.error ? (
                      <div style={{ color: 'var(--danger)', fontSize: 13, padding: '12px 18px', background: 'rgba(255,90,90,0.04)' }}>
                        <strong>Error:</strong> {h.error}
                      </div>
                    ) : (
                      <pre style={styles.sql}>{h.generated_sql}</pre>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { flex: 1, padding: '32px 36px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 9, padding: '9px 14px',
  },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 8 },
  emptyIcon: { width: 52, height: 52, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' },
  sql: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', padding: '14px 18px', overflowX: 'auto', lineHeight: 1.7, background: 'var(--surface2)' },
}
