import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Database, MessageSquare, History, LayoutDashboard,
  Plus, LogOut, RefreshCw, Trash2, Lock, Unlock,
  Pencil, ChevronDown, ChevronUp, Table2, Columns3,
  CheckCircle2, Loader2, X
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { connectionsApi } from '../lib/api'

export default function Sidebar() {
  const { connections, setConnections, activeConnection, setActiveConnection, setToken } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', db_type: 'postgresql', connection_string: '', allow_writes: false })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [successConn, setSuccessConn] = useState<number | null>(null)
  const [hoveredConn, setHoveredConn] = useState<number | null>(null)
  const [expandedSchema, setExpandedSchema] = useState<number | null>(null)
  const [schemas, setSchemas] = useState<Record<number, Record<string, { columns: { name: string; type: string }[] }>>>({})
  const navigate = useNavigate()

  async function addConnection() {
    setAdding(true); setAddError('')
    try {
      const res = await connectionsApi.create(form.name, form.db_type, form.connection_string, form.allow_writes)
      setConnections([...connections, res.data])
      setActiveConnection(res.data)
      setShowAdd(false)
      setForm({ name: '', db_type: 'postgresql', connection_string: '', allow_writes: false })
      // Trigger success animation
      setSuccessConn(res.data.id)
      setTimeout(() => setSuccessConn(null), 3000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAddError(err.response?.data?.detail || 'Connection failed')
    } finally { setAdding(false) }
  }

  async function deleteConn(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    await connectionsApi.delete(id)
    const updated = connections.filter(c => c.id !== id)
    setConnections(updated)
    if (activeConnection?.id === id) setActiveConnection(updated[0] || null)
  }

  async function refreshSchema(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    await connectionsApi.refreshSchema(id)
    if (expandedSchema === id) {
      const res = await connectionsApi.getSchema(id)
      setSchemas(s => ({ ...s, [id]: res.data.tables }))
    }
  }

  async function toggleWrites(c: typeof connections[number], e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const res = await connectionsApi.setAllowWrites(c.id, !c.allow_writes)
    const updated = connections.map(conn => conn.id === c.id ? res.data : conn)
    setConnections(updated)
    if (activeConnection?.id === c.id) setActiveConnection(res.data)
  }

  async function toggleSchema(id: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (expandedSchema === id) { setExpandedSchema(null); return }
    setExpandedSchema(id)
    if (!schemas[id]) {
      const res = await connectionsApi.getSchema(id)
      setSchemas(s => ({ ...s, [id]: res.data?.tables || {} }))
    }
  }

  function logout() { setToken(null); navigate('/login') }

  const navLink = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    borderRadius: '10px', fontSize: 13, fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--text)' : 'var(--text2)',
    background: isActive ? 'var(--surface3)' : 'transparent',
    textDecoration: 'none', transition: 'all 0.15s',
    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
    marginLeft: -14, paddingLeft: 12,
  })

  const dbDot: Record<string, string> = { postgresql: '#60A5FA', mysql: '#FB923C', sqlite: '#34D399' }

  return (
    <>
      {/* Success overlay animation */}
      {successConn !== null && (
        <div style={S.successOverlay}>
          <div style={S.successCard}>
            <div style={S.successIconWrap}>
              <CheckCircle2 size={40} color="#4ade80" strokeWidth={1.5} />
            </div>
            <div style={S.successTitle}>Connected!</div>
            <div style={S.successSub}>Database connection established</div>
          </div>
        </div>
      )}

      <aside style={S.sidebar}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logo}><Database size={15} color="#000" strokeWidth={2.5} /></div>
          <div>
            <div style={S.logoName}>BtalkToDB</div>
            <div style={S.logoSub}>AI Database Interface</div>
          </div>
        </div>

        <div style={S.divider} />

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0', paddingLeft: 14 }}>
          <NavLink to="/" end style={navLink}><LayoutDashboard size={14} />Dashboard</NavLink>
          <NavLink to="/query" style={navLink}><MessageSquare size={14} />Ask a question</NavLink>
          <NavLink to="/history" style={navLink}><History size={14} />Query history</NavLink>
        </nav>

        <div style={S.divider} />

        {/* Connections */}
        <div style={S.section}>
          <div style={S.sectionHead}>
            <span style={S.sectionLabel}>Connections</span>
            <button style={S.iconBtn} onClick={() => setShowAdd(!showAdd)} title="Add connection">
              <Plus size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {connections.map(c => {
              const isActive = activeConnection?.id === c.id
              const isHov = hoveredConn === c.id
              const isSuccess = successConn === c.id
              const schemaOpen = expandedSchema === c.id
              const tableList = schemas[c.id] ? Object.entries(schemas[c.id]) : []

              return (
                <div key={c.id}>
                  <div
                    onClick={() => setActiveConnection(c)}
                    onMouseEnter={() => setHoveredConn(c.id)}
                    onMouseLeave={() => setHoveredConn(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: isSuccess
                        ? 'rgba(74, 222, 128, 0.12)'
                        : isActive ? 'var(--surface3)' : isHov ? 'var(--surface2)' : 'transparent',
                      border: `1px solid ${isSuccess ? 'rgba(74,222,128,0.35)' : isActive ? 'var(--border2)' : 'transparent'}`,
                      boxShadow: isSuccess ? '0 0 16px rgba(74,222,128,0.15)' : isActive ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                      transform: isSuccess ? 'scale(1.01)' : 'scale(1)',
                    }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isSuccess ? '#4ade80' : dbDot[c.db_type] || 'var(--text3)',
                      flexShrink: 0,
                      boxShadow: isSuccess ? '0 0 6px #4ade80' : isActive ? `0 0 6px ${dbDot[c.db_type]}` : 'none',
                      transition: 'all 0.3s',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isSuccess ? '#4ade80' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </span>
                        {c.allow_writes && <Pencil size={9} color="var(--warn)" />}
                        {isSuccess && <CheckCircle2 size={11} color="#4ade80" />}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={c.masked_connection_string}>
                        {c.masked_connection_string || c.db_type}
                      </span>
                    </div>
                    {isHov && !isSuccess && (
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button style={S.iconBtn} onClick={e => toggleSchema(c.id, e)} title="Browse schema">
                          <Table2 size={11} />
                        </button>
                        <button style={{ ...S.iconBtn, color: c.allow_writes ? 'var(--warn)' : undefined }}
                          onClick={e => toggleWrites(c, e)}
                          title={c.allow_writes ? 'Writes on — click to disable' : 'Read-only — click to enable writes'}>
                          {c.allow_writes ? <Unlock size={11} /> : <Lock size={11} />}
                        </button>
                        <button style={S.iconBtn} onClick={e => refreshSchema(c.id, e)} title="Refresh schema">
                          <RefreshCw size={11} />
                        </button>
                        <button style={{ ...S.iconBtn, color: 'var(--danger)' }} onClick={e => deleteConn(c.id, e)} title="Remove">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Schema browser */}
                  {schemaOpen && (
                    <div style={S.schemaBrowser}>
                      {tableList.length === 0
                        ? <p style={{ fontSize: 10, color: 'var(--text3)', padding: '6px 10px' }}>Loading…</p>
                        : tableList.map(([tbl, info]) => (
                          <TableNode key={tbl} name={tbl} columns={info.columns} />
                        ))
                      }
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {connections.length === 0 && !showAdd && (
            <button onClick={() => setShowAdd(true)} style={S.addPrompt}>
              <Plus size={12} /> Add your first connection
            </button>
          )}

          {showAdd && (
            <div style={S.addForm}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>New connection</p>
                <button style={S.iconBtn} onClick={() => { setShowAdd(false); setAddError('') }}><X size={12} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={S.label}>Name</label>
                  <input placeholder="prod-db" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Database type</label>
                  <select value={form.db_type} onChange={e => setForm({ ...form, db_type: e.target.value })} style={{ ...S.input, cursor: 'pointer' }}>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Connection string</label>
                  <textarea
                    placeholder="postgresql://user:pass@host:5432/db"
                    value={form.connection_string}
                    onChange={e => setForm({ ...form, connection_string: e.target.value })}
                    rows={3}
                    style={{ ...S.input, resize: 'none', fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.5 }}
                  />
                </div>
                <button type="button" onClick={() => setForm({ ...form, allow_writes: !form.allow_writes })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    background: form.allow_writes ? 'rgba(251,191,36,0.08)' : 'var(--surface3)',
                    border: `1px solid ${form.allow_writes ? 'rgba(251,191,36,0.3)' : 'var(--border2)'}`,
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}>
                  {form.allow_writes ? <Unlock size={13} color="var(--warn)" /> : <Lock size={13} color="var(--text3)" />}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: form.allow_writes ? 'var(--warn)' : 'var(--text2)' }}>
                      {form.allow_writes ? 'Writes enabled' : 'Read-only'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                      {form.allow_writes ? 'INSERT/UPDATE/DELETE with confirm' : 'SELECT queries only'}
                    </div>
                  </div>
                </button>
              </div>

              {addError && (
                <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 10, padding: '8px 10px', background: 'var(--danger-bg)', borderRadius: 8, lineHeight: 1.4 }}>
                  {addError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={addConnection}
                  disabled={adding}
                >
                  {adding ? (
                    <>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      Connecting…
                    </>
                  ) : 'Connect'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setAddError('') }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <div style={S.divider} />
          <button style={S.logout} onClick={logout}>
            <LogOut size={13} />
            <span style={{ flex: 1 }}>Sign out</span>
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulse-green { 0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); } 50% { box-shadow: 0 0 0 8px rgba(74,222,128,0); } }
      `}</style>
    </>
  )
}

function TableNode({ name, columns }: { name: string; columns: { name: string; type: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        background: 'none', border: 'none', padding: '5px 10px', cursor: 'pointer',
        borderRadius: 6, color: 'var(--text2)', fontSize: 11, textAlign: 'left',
        transition: 'background 0.1s',
      }}>
        <Table2 size={11} color="var(--blue)" />
        <span style={{ flex: 1, fontFamily: 'var(--mono)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4 }}>{columns.length}</span>
        {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
      </button>
      {open && (
        <div style={{ paddingLeft: 22, paddingBottom: 4 }}>
          {columns.map(col => (
            <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px' }}>
              <Columns3 size={8} color="var(--text3)" />
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{col.name}</span>
              <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>{col.type.split('(')[0].toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 280,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px 16px 14px',
    flexShrink: 0,
    overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', marginBottom: 18 },
  logo: {
    width: 32, height: 32, borderRadius: 9, background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 0 14px var(--accent-glow)',
  },
  logoName: { fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--display)', lineHeight: 1.2 },
  logoSub: { fontSize: 10, color: 'var(--text3)', letterSpacing: '0.02em', marginTop: 2 },
  divider: { height: 1, background: 'var(--border)', margin: '10px -16px' },
  section: { flex: 1, overflow: 'auto', paddingTop: 12 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--text3)', padding: 4, borderRadius: 5, display: 'flex', cursor: 'pointer', transition: 'color 0.1s' },
  schemaBrowser: {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
    margin: '4px 0 4px 16px', padding: '4px 0', maxHeight: 220, overflow: 'auto',
  },
  addPrompt: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    background: 'transparent', border: '1px dashed var(--border2)',
    color: 'var(--text3)', fontSize: 11, padding: '10px 12px', borderRadius: 10,
    cursor: 'pointer', marginTop: 8, transition: 'all 0.15s',
  },
  addForm: {
    background: 'var(--surface2)', border: '1px solid var(--border2)',
    borderRadius: 12, padding: 14, marginTop: 10,
  },
  label: { display: 'block', marginBottom: 5, fontSize: 11, color: 'var(--text3)', fontWeight: 500 },
  input: {
    width: '100%', fontSize: 12, padding: '8px 10px',
    background: 'var(--surface)', border: '1px solid var(--border2)',
    borderRadius: 8, color: 'var(--text)', boxSizing: 'border-box' as const,
    outline: 'none',
  },
  logout: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', width: '100%',
    borderRadius: 10, background: 'none', border: 'none', color: 'var(--text2)',
    fontSize: 12, marginTop: 4, transition: 'all 0.12s', cursor: 'pointer',
  },
  successOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, backdropFilter: 'blur(4px)',
    animation: 'fadeOut 0.5s ease 2.5s forwards',
  },
  successCard: {
    background: 'var(--surface)', border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: 20, padding: '40px 48px', textAlign: 'center',
    animation: 'fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: '0 0 60px rgba(74,222,128,0.15), 0 20px 40px rgba(0,0,0,0.3)',
  },
  successIconWrap: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    animation: 'pulse-green 1s ease 0.3s 2',
  },
  successTitle: { fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 6 },
  successSub: { fontSize: 13, color: 'var(--text3)' },
}