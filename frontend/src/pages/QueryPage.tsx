import { useState, useRef, useEffect } from 'react'
import {
  Send, Zap, Clock, Download, ChevronDown, ChevronUp,
  Database, Sparkles, AlertTriangle, Pencil, X, Copy, Check
} from 'lucide-react'
import { queryApi } from '../lib/api'
import { useStore } from '../store/useStore'

const SUGGESTIONS = [
  'Show all products',
  'Count records in each table',
  'Show the 5 most expensive products',
  'Show all users',
  'Find all electronics products',
]

const WRITE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  INSERT: { color: 'var(--accent)',  bg: 'var(--accent-bg)',  border: 'rgba(0,255,163,0.25)' },
  UPDATE: { color: 'var(--warn)',    bg: 'var(--warn-bg)',    border: 'rgba(251,191,36,0.25)' },
  DELETE: { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'rgba(248,113,113,0.25)' },
}

export default function QueryPage() {
  const {
    activeConnection, connections, setActiveConnection,
    queryResult, setQueryResult, queryLoading, setQueryLoading,
    queryError, setQueryError, pendingWrite, setPendingWrite,
  } = useStore()
  const [question, setQuestion] = useState('')
  const [showSql, setShowSql] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  async function runQuery() {
    if (!question.trim() || !activeConnection) return
    setQueryLoading(true); setQueryError(null); setQueryResult(null)
    setShowSql(false); setPendingWrite(null)
    const q = question.trim()
    try {
      if (activeConnection.allow_writes) {
        const preview = await queryApi.preview(activeConnection.id, q)
        if (preview.data.requires_confirmation) {
          setPendingWrite({ sql: preview.data.sql, query_type: preview.data.query_type, question: q, estimated_affected_rows: preview.data.estimated_affected_rows ?? -1 })
          setQueryLoading(false)
          return
        }
      }
      const res = await queryApi.run(activeConnection.id, q)
      setQueryResult(res.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setQueryError(err.response?.data?.detail || 'Query failed')
    } finally { setQueryLoading(false) }
  }

  async function confirmWrite() {
    if (!pendingWrite || !activeConnection) return
    setConfirming(true); setQueryError(null)
    try {
      const res = await queryApi.confirm(activeConnection.id, pendingWrite.question, pendingWrite.sql)
      setQueryResult(res.data); setPendingWrite(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setQueryError(err.response?.data?.detail || 'Execution failed')
    } finally { setConfirming(false) }
  }

  function copySQL(sql: string) {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadCSV() {
    if (!queryResult || !queryResult.columns.length) return
    const header = queryResult.columns.join(',')
    const rows = queryResult.rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `query_${Date.now()}.csv`; a.click()
  }

  const noConn = connections.length === 0

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.eyebrow}>Natural language SQL</p>
          <h1 style={S.title}>Ask a question</h1>
        </div>
        {connections.length > 1 && (
          <select value={activeConnection?.id || ''} onChange={e => setActiveConnection(connections.find(c => c.id === Number(e.target.value)) || null)}>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {noConn ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}><Database size={28} color="var(--text3)" /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No database connected</h3>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Add a connection from the sidebar to get started.</p>
        </div>
      ) : (
        <>
          {/* Write banner */}
          {activeConnection?.allow_writes && (
            <div style={S.writeBanner}>
              <Pencil size={12} color="var(--warn)" />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                Write mode enabled on <strong style={{ color: 'var(--warn)' }}>{activeConnection.name}</strong> — INSERT/UPDATE/DELETE will require confirmation
              </span>
            </div>
          )}

          {/* Input card */}
          <div style={S.inputCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={S.aiIcon}><Sparkles size={14} color="var(--accent)" /></div>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runQuery() } }}
                placeholder={activeConnection?.allow_writes
                  ? 'Try: "Update the price of Laptop to 1299" or "Delete product with id 3"'
                  : 'Try: "Show all products" or "Count records in each table"'}
                rows={2}
                style={S.textarea}
              />
              <button className="btn btn-primary"
                onClick={runQuery}
                disabled={!question.trim() || queryLoading}
                style={{ padding: '10px 20px', flexShrink: 0 }}>
                {queryLoading ? <span style={S.spinner} /> : <Send size={14} />}
                {queryLoading ? 'Thinking…' : 'Run'}
              </button>
            </div>

            {/* Suggestions */}
            <div style={{ marginTop: 14, paddingLeft: 42, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} style={S.chip} onClick={() => { setQuestion(s); textareaRef.current?.focus() }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm write card */}
          {pendingWrite && (() => {
            const wc = WRITE_COLORS[pendingWrite.query_type] || WRITE_COLORS.UPDATE
            return (
              <div style={{ ...S.confirmCard, borderColor: wc.border, background: wc.bg }} className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${wc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={16} color={wc.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                      Review this {pendingWrite.query_type} before running
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                      This will modify data in <strong>{activeConnection?.name}</strong>. Verify the SQL below carefully.
                    </p>
                    {pendingWrite.estimated_affected_rows >= 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', borderRadius: 6, background: `${wc.color}18`, border: `1px solid ${wc.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: wc.color, fontFamily: 'var(--mono)' }}>
                          ~{pendingWrite.estimated_affected_rows} row{pendingWrite.estimated_affected_rows !== 1 ? 's' : ''} will be affected
                        </span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setPendingWrite(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <X size={15} />
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <pre style={{ ...S.codeBlock, borderColor: wc.border, color: wc.color }}>{pendingWrite.sql}</pre>
                  <button onClick={() => copySQL(pendingWrite.sql)} style={S.copyBtn}>
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {queryError && <div style={S.errorBox}>{queryError}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={confirmWrite} disabled={confirming}
                    style={{ background: wc.color, color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: confirming ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    {confirming ? 'Running…' : `✓ Confirm & run ${pendingWrite.query_type}`}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setPendingWrite(null)}>Cancel</button>
                </div>
              </div>
            )
          })()}

          {/* Error */}
          {queryError && !pendingWrite && (
            <div style={S.errorBox} className="animate-fade-in">
              <strong>Error:</strong> {queryError}
            </div>
          )}

          {/* Loading skeleton */}
          {queryLoading && (
            <div style={S.skeletonWrap}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div className="skeleton" style={{ height: 22, width: 80 }} />
                <div className="skeleton" style={{ height: 22, width: 60 }} />
              </div>
              {[100, 75, 90, 65].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 13, width: `${w}%`, marginBottom: 8, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {/* Results */}
          {queryResult && !queryLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-fade-in">
              {/* Write success */}
              {queryResult.query_type !== 'SELECT' && (() => {
                const wc = WRITE_COLORS[queryResult.query_type] || WRITE_COLORS.UPDATE
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: wc.bg, border: `1px solid ${wc.border}`, borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: wc.color, boxShadow: `0 0 8px ${wc.color}` }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: wc.color }}>{queryResult.query_type}</span>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}> completed — </span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{queryResult.row_count} row{queryResult.row_count !== 1 ? 's' : ''} affected</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{queryResult.execution_ms}ms</span>
                  </div>
                )
              })()}

              {/* Meta row (SELECT) */}
              {queryResult.query_type === 'SELECT' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="tag tag-green"><Zap size={9} />{queryResult.row_count} rows</span>
                    <span className="tag tag-gray"><Clock size={9} />{queryResult.execution_ms}ms</span>
                    {queryResult.was_cached && <span className="tag tag-purple">⚡ cached</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => copySQL(queryResult.sql)}>
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy SQL'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={downloadCSV}>
                      <Download size={12} /> Export CSV
                    </button>
                  </div>
                </div>
              )}

              {/* SQL toggle */}
              <div>
                <button style={S.sqlToggle} onClick={() => setShowSql(!showSql)}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(0,255,163,0.15)' }}>SQL</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>Generated query</span>
                  {showSql ? <ChevronUp size={13} color="var(--text3)" /> : <ChevronDown size={13} color="var(--text3)" />}
                </button>
                {showSql && (
                  <div style={{ position: 'relative' }}>
                    <pre style={S.codeBlock}>{queryResult.sql}</pre>
                    <button onClick={() => copySQL(queryResult.sql)} style={S.copyBtn}>
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              {/* Table */}
              {queryResult.columns.length > 0 && (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} style={S.th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          {row.map((cell, j) => (
                            <td key={j} style={S.td}>
                              {cell === null
                                ? <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: 11 }}>null</span>
                                : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  root: { flex: 1, padding: '32px 40px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--display)' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  writeBanner: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warn-bg)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 9, padding: '9px 14px' },
  inputCard: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' },
  aiIcon: { width: 30, height: 30, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(0,255,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  textarea: { resize: 'none', fontSize: 15, lineHeight: 1.6, background: 'transparent', border: 'none', outline: 'none', padding: 0, color: 'var(--text)', flex: 1 },
  chip: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 20, color: 'var(--text2)', fontSize: 11, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' },
  confirmCard: { border: '1px solid', borderRadius: 14, padding: '18px 20px' },
  errorBox: { background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '12px 16px', color: 'var(--danger)', fontSize: 13 },
  skeletonWrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
  sqlToggle: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', width: '100%', transition: 'background 0.1s' },
  codeBlock: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 18px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent-text)', overflowX: 'auto', lineHeight: 1.8, marginTop: 4 },
  copyBtn: { position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text2)', fontSize: 10, padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--mono)' },
  tableWrap: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto', maxHeight: 460, boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 16px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, whiteSpace: 'nowrap', fontFamily: 'var(--mono)' },
  td: { padding: '9px 16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  spinner: { width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' },
}
