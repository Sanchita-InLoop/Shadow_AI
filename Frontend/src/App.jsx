import React, { useState, useEffect } from 'react';

const IMPORTANCE_WEIGHT = { High: 3, Medium: 2, Low: 1 };
const IMPORTANCE_COLOR  = { High: '#ff4757', Medium: '#ffa500', Low: '#2ed573' };
const IMPORTANCE_LABEL  = { High: '🔴 High', Medium: '🟡 Medium', Low: '🟢 Low' };

// ── Example task set for evaluators / quick testing ───────────────────────────
// Deadlines are computed relative to "now" so they stay meaningful no matter
// when this is loaded, rather than hardcoding stale dates.
function buildExampleDeadlines() {
  const now = Date.now();
  const HOUR = 3600000;
  const toLocalInput = (ms) => {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return [
    {
      id: now + 1, task: 'Buy groceries',
      deadline: toLocalInput(now + 48 * HOUR),
      importance: 'Medium', description: '',
    },
    {
      id: now + 2, task: 'Pay electricity bill',
      deadline: toLocalInput(now + 24 * HOUR),
      importance: 'High', description: '',
    },
    {
      id: now + 3, task: 'Reply to internship offer email',
      deadline: toLocalInput(now + 6 * HOUR),
      importance: 'High', description: 'Need to confirm start date and ask about remote work policy.',
    },
    {
      id: now + 4, task: 'Prepare for client meeting',
      deadline: toLocalInput(now + 32 * HOUR),
      importance: 'High', description: 'First meeting with a new client — need to review their company background.',
    },
    {
      id: now + 5, task: 'Study for chemistry final',
      deadline: toLocalInput(now + 72 * HOUR),
      importance: 'High', description: 'Covers chapters 4-9, weakest on organic reactions.',
    },
    {
      id: now + 6, task: 'Finish history essay draft',
      deadline: toLocalInput(now - 2 * HOUR), // intentionally overdue
      importance: 'High', description: '1500 words required, currently at 600 words.',
    },
  ];
}

// ── Local urgency preview shown before running AI ─────────────────────────────
function getLocalUrgency(deadlines) {
  if (!deadlines.length) return null;
  const now = Date.now();
  const gaps = deadlines.map(d => new Date(d.deadline).getTime() - now);
  const minGap = Math.min(...gaps);
  const h = Math.round(minGap / 3600000);
  if (minGap < 0)          return { label: '🔴 OVERDUE',     color: '#ff4757', panic: true };
  if (minGap < 6*3600000)  return { label: '🔴 CRITICAL',    color: '#ff4757', panic: true };
  if (minGap < 12*3600000) return { label: '🟠 SEVERE',      color: '#ff6b35', panic: true };
  if (minGap < 24*3600000) return { label: '🟠 HIGH',        color: '#ffa500', panic: true };
  if (minGap < 48*3600000) return { label: '🟡 ELEVATED',    color: '#ffd32a', panic: false };
  return                          { label: '🟢 MANAGEABLE',  color: '#2ed573', panic: false };
}

function App() {
  const [deadlines, setDeadlines] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shadow_deadlines')) ?? []; }
    catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('shadow_deadlines', JSON.stringify(deadlines)); } catch {}
  }, [deadlines]);

  const [newTask,        setNewTask]        = useState('');
  const [newDate,        setNewDate]        = useState('');
  const [newImportance,  setNewImportance]  = useState('High');
  const [newDescription, setNewDescription] = useState('');
  const [expandedTasks,  setExpandedTasks]  = useState({});
  const [expandedSteps,  setExpandedSteps]  = useState({});
  const [loading,        setLoading]        = useState(false);
  const [activePlan,     setActivePlan]     = useState(null);
  const [errorMsg,       setErrorMsg]       = useState('');
  const [editingId,      setEditingId]      = useState(null);
  const [editForm,       setEditForm]       = useState({ task: '', deadline: '', importance: 'High', description: '' });

  const toggleTask = (id) => setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleStep = (n)  => setExpandedSteps(prev => ({ ...prev, [n]:  !prev[n]  }));

  const startEdit = (d) => {
    setEditingId(d.id);
    setEditForm({ task: d.task, deadline: d.deadline, importance: d.importance, description: d.description || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ task: '', deadline: '', importance: 'High', description: '' });
  };

  const saveEdit = (id) => {
    if (!editForm.task.trim() || !editForm.deadline) return;
    setDeadlines(prev => prev.map(d => d.id === id
      ? { ...d, task: editForm.task.trim(), deadline: editForm.deadline, importance: editForm.importance, description: editForm.description.trim() }
      : d
    ));
    // Task name or deadline may have changed — any prior AI plan referencing
    // the old values is now stale, so clear it to avoid confusing mismatches.
    setActivePlan(null);
    cancelEdit();
  };

  const addDeadline = (e) => {
    e.preventDefault();
    if (!newTask.trim() || !newDate) return;
    setDeadlines(prev => [...prev, {
      id: Date.now(), task: newTask.trim(), deadline: newDate,
      importance: newImportance, description: newDescription.trim(),
    }]);
    setNewTask(''); setNewDate(''); setNewDescription('');
  };

  const removeDeadline = (id) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    setExpandedTasks(prev => { const n = { ...prev }; delete n[id]; return n; });
    setActivePlan(null);
    if (editingId === id) cancelEdit();
  };

  const loadExampleTasks = () => {
    setDeadlines(buildExampleDeadlines());
    setActivePlan(null);
    setErrorMsg('');
    setExpandedTasks({});
    setExpandedSteps({});
  };

  const triggerGlobalAIPlan = async () => {
    if (!deadlines.length) return;
    setLoading(true); setActivePlan(null); setErrorMsg(''); setExpandedSteps({});

    // Send ALL deadlines — backend will sort by true urgency
    const [focusTask, ...others] = deadlines;

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/rescue`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentFocusTask: focusTask, allDeadlines: others }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }
      const data = await response.json();
      if (!data?.suggestedMicroTasks?.length) throw new Error('AI returned empty task list.');
      setActivePlan(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const resolveParent = (rawName) => {
    if (!rawName) return null;
    const norm = rawName.toLowerCase().trim();
    const map  = new Map(deadlines.map(d => [d.task.toLowerCase().trim(), d.task]));
    if (map.has(norm)) return map.get(norm);
    for (const [k, v] of map) if (k.includes(norm) || norm.includes(k)) return v;
    return rawName;
  };

  const inp  = { padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff', fontSize: '13px' };
  const card = { background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #252525' };

  const localUrgency = getLocalUrgency(deadlines);
  const isPanic      = activePlan?.panicModeActivated ?? localUrgency?.panic ?? false;

  // Countdown timer display
  const getTimeLabel = (deadline) => {
    const gap = new Date(deadline).getTime() - Date.now();
    if (gap < 0) return { text: 'OVERDUE', color: '#ff4757' };
    const h = Math.floor(gap / 3600000);
    const m = Math.floor((gap % 3600000) / 60000);
    if (h < 1)  return { text: `${m}m left`,      color: '#ff4757' };
    if (h < 6)  return { text: `${h}h ${m}m left`, color: '#ff4757' };
    if (h < 24) return { text: `${h}h left`,       color: '#ffa500' };
    const d = Math.floor(h / 24);
    return { text: `${d}d ${h % 24}h left`, color: '#2ed573' };
  };

  return (
    <div className="shadow-ai-app" style={{ padding: '30px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#e0e0e0', minHeight: '100vh', backgroundColor: '#121212', boxSizing: 'border-box' }}>

      {/* ── Panic banner ── */}
      {isPanic && (
        <div style={{ background: 'linear-gradient(90deg, #ff4757, #c0392b)', padding: '10px 20px', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'pulse 1.5s infinite' }}>
          <span style={{ fontSize: '20px' }}>🚨</span>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', letterSpacing: '0.5px' }}>
            PANIC MODE ACTIVE — {localUrgency?.label?.includes('OVERDUE')
              ? 'You have an overdue deadline. Execute immediately.'
              : 'You have a deadline closing in fast. Execute immediately.'}
          </span>
        </div>
      )}

      <header className="shadow-ai-header" style={{ borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: isPanic ? '#ff4757' : '#ff6b81', margin: 0, fontSize: '24px', letterSpacing: '0.5px' }}>🚨 SHADOW AI</h1>
          <p style={{ color: '#777', margin: '5px 0 0 0', fontSize: '13px' }}>Proactive Context-Aware Execution Matrix</p>
        </div>
        <div className="shadow-ai-header-badges" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {localUrgency && deadlines.length > 0 && (
            <span style={{ fontSize: '12px', color: localUrgency.color, border: `1px solid ${localUrgency.color}`, padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
              {localUrgency.label}
            </span>
          )}
          <span style={{ fontSize: '12px', color: '#5352ed', border: '1px solid #5352ed', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Agentic Mode: Active</span>
        </div>
      </header>

      <div className="shadow-ai-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>

        {/* ── LEFT: Deadline Tracker ── */}
        <section style={card}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>📅 Upcoming Milestones Matrix</h3>

          {deadlines.length === 0 && (
            <button type="button" onClick={loadExampleTasks}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', background: 'transparent', color: '#5352ed', border: '1px dashed #5352ed', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
              ✨ Load Example Tasks (for testing / evaluators)
            </button>
          )}

          <form onSubmit={addDeadline} className="shadow-ai-form" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <input type="text" placeholder="Task name..." value={newTask} onChange={e => setNewTask(e.target.value)} style={inp} required />
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} style={inp} required />
            <textarea placeholder="Optional context: What's left to do? Yap away..." value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={2} style={{ ...inp, gridColumn: 'span 2', resize: 'none' }} />
            <select value={newImportance} onChange={e => setNewImportance(e.target.value)} style={inp}>
              {Object.entries(IMPORTANCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button type="submit" style={{ ...inp, background: '#333', border: '1px solid #444', fontWeight: 'bold', cursor: 'pointer' }}>+ Track Task</button>
          </form>

          <button type="button" onClick={triggerGlobalAIPlan} disabled={!deadlines.length || loading}
            style={{ width: '100%', padding: '12px', background: (!deadlines.length || loading) ? '#222' : isPanic ? '#ff4757' : '#2ed573', color: (!deadlines.length || loading) ? '#555' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (!deadlines.length || loading) ? 'not-allowed' : 'pointer', fontSize: '13px', marginBottom: '20px', letterSpacing: '0.3px' }}>
            {isPanic ? '🚨' : '⚡'} Run AI Panic Optimization {deadlines.length > 0 ? `(${deadlines.length} task${deadlines.length > 1 ? 's' : ''} tracked)` : ''}
          </button>

          {/* Task list — sorted visually by urgency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deadlines.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#444', fontSize: '13px', border: '1px dashed #2a2a2a', borderRadius: '6px' }}>No milestones tracked yet.</div>
            )}
            {[...deadlines].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map(d => {
              const timeLabel = getTimeLabel(d.deadline);
              const isEditing = editingId === d.id;

              if (isEditing) {
                return (
                  <div key={d.id} style={{ display: 'flex', flexDirection: 'column', background: '#222', borderRadius: '6px', borderLeft: '4px solid #5352ed', overflow: 'hidden', padding: '14px 16px', gap: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#5352ed', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✏️ Editing Task</div>
                    <input type="text" placeholder="Task name..." value={editForm.task} onChange={e => setEditForm(f => ({ ...f, task: e.target.value }))} style={inp} />
                    <div className="shadow-ai-edit-row" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '10px' }}>
                      <input type="datetime-local" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} style={inp} />
                      <select value={editForm.importance} onChange={e => setEditForm(f => ({ ...f, importance: e.target.value }))} style={inp}>
                        {Object.entries(IMPORTANCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <textarea placeholder="Optional context..." value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => saveEdit(d.id)} disabled={!editForm.task.trim() || !editForm.deadline}
                        style={{ flex: 1, padding: '8px', background: (!editForm.task.trim() || !editForm.deadline) ? '#222' : '#2ed573', color: (!editForm.task.trim() || !editForm.deadline) ? '#555' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (!editForm.task.trim() || !editForm.deadline) ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                        ✓ Save Changes
                      </button>
                      <button type="button" onClick={cancelEdit}
                        style={{ flex: 1, padding: '8px', background: '#333', color: '#ccc', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={d.id} style={{ display: 'flex', flexDirection: 'column', background: '#222', borderRadius: '6px', borderLeft: `4px solid ${IMPORTANCE_COLOR[d.importance]}`, overflow: 'hidden' }}>
                  <div className="shadow-ai-task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                    <div className="shadow-ai-task-info" style={{ maxWidth: '76%' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px', wordBreak: 'break-word' }}>{d.task}</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>⏰ {new Date(d.deadline).toLocaleString()}</span>
                        <span style={{ color: timeLabel.color, fontWeight: 'bold' }}>{timeLabel.text}</span>
                        <span style={{ color: IMPORTANCE_COLOR[d.importance] }}>{IMPORTANCE_LABEL[d.importance]}</span>
                        {d.description && (
                          <button type="button" onClick={() => toggleTask(d.id)} style={{ background: 'none', border: 'none', color: '#5352ed', cursor: 'pointer', padding: 0, fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold' }}>
                            {expandedTasks[d.id] ? 'Hide ▲' : 'Details ▼'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => startEdit(d)} title="Edit / extend deadline" style={{ background: 'transparent', color: '#5352ed', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '0 4px' }}>✎</button>
                      <button onClick={() => removeDeadline(d.id)} title="Delete" style={{ background: 'transparent', color: '#ff4757', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>✕</button>
                    </div>
                  </div>
                  {d.description && expandedTasks[d.id] && (
                    <div style={{ background: '#1c1c1c', borderTop: '1px solid #2d2d2d', padding: '12px 16px', fontSize: '12px', color: '#b0b0b0', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: '600', color: '#777', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px', letterSpacing: '0.5px' }}>Context Notes</div>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.description}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RIGHT: Live Action Dashboard ── */}
        <section style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>⚡ Live Action Dashboard</h3>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5352ed', fontWeight: 'bold', fontSize: '14px' }}>
              🧠 Generating your action plan across {deadlines.length} task{deadlines.length > 1 ? 's' : ''}...
              <div style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontWeight: 'normal' }}>Processing sequentially to preserve API quota</div>
            </div>
          )}

          {!loading && errorMsg && (
            <div style={{ background: errorMsg.includes('Wait') || errorMsg.includes('Rate') ? '#1a1500' : '#2a1010', border: `1px solid ${errorMsg.includes('Wait') || errorMsg.includes('Rate') ? '#ffa500' : '#ff4757'}`, borderRadius: '6px', padding: '16px', fontSize: '13px' }}>
              <div style={{ color: errorMsg.includes('Wait') || errorMsg.includes('Rate') ? '#ffa500' : '#ff4757', fontWeight: 'bold', marginBottom: '6px' }}>
                {errorMsg.includes('Wait') || errorMsg.includes('Rate') ? '⏳ Rate Limit' : '⚠️ Error'}
              </div>
              <div style={{ color: '#ccc' }}>{errorMsg}</div>
              {!errorMsg.includes('Wait') && !errorMsg.includes('Rate') && (
                <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>Make sure <code>node .\server.js</code> is running in your Backend terminal.</div>
              )}
            </div>
          )}

          {!loading && !activePlan && !errorMsg && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontSize: '13px', border: '1px dashed #333', borderRadius: '6px' }}>
              Fire the global optimization matrix to populate action fields.
            </div>
          )}

          {!loading && activePlan && (() => {
            const panic = activePlan.panicModeActivated;
            return (
              <div>
                {/* Status bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', background: panic ? '#ff4757' : '#2ed573', color: '#fff', padding: '5px 12px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                    {panic ? '🚨 PANIC PROTOCOL: ON' : '✅ PANIC PROTOCOL: OFF'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>{activePlan.urgencyRating}</span>
                  <span style={{ fontSize: '11px', color: '#555' }}>{activePlan.suggestedMicroTasks.length} steps</span>
                </div>

                {/* Proactive action */}
                <div style={{ background: panic ? 'rgba(255,71,87,0.1)' : '#222', borderLeft: `3px solid ${panic ? '#ff4757' : '#2ed573'}`, padding: '12px 14px', borderRadius: '4px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
                  <span style={{ color: panic ? '#ff4757' : '#2ed573', fontWeight: 'bold' }}>LAUNCH NOW: </span>
                  {activePlan.proactiveAction}
                </div>

                {/* Micro-task list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activePlan.suggestedMicroTasks.map(step => {
                    const displayName = resolveParent(step.parentTaskName);
                    // Color-code steps by parent task urgency
                    const parentDeadline = deadlines.find(d => d.task.toLowerCase().trim() === (step.parentTaskName ?? '').toLowerCase().trim());
                    const timeInfo = parentDeadline ? getTimeLabel(parentDeadline.deadline) : null;
                    const accentColor = timeInfo?.color ?? '#5352ed';

                    return (
                      <div key={step.stepNumber} style={{ display: 'flex', flexDirection: 'column', background: '#222', borderRadius: '6px', overflow: 'hidden', borderLeft: `2px solid ${accentColor}` }}>
                        <div className="shadow-ai-step-row" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#888', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                                🎯 {displayName || 'Global Task'}
                              </span>
                              {timeInfo && (
                                <span style={{ fontSize: '10px', color: accentColor, fontWeight: 'bold' }}>{timeInfo.text}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{step.stepNumber}. {step.taskName}</div>
                            {step.focusTip && (
                              <button type="button" onClick={() => toggleStep(step.stepNumber)} style={{ background: 'none', border: 'none', color: '#5352ed', cursor: 'pointer', padding: 0, fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold', marginTop: '6px', display: 'block' }}>
                                {expandedSteps[step.stepNumber] ? 'Hide Strategy ▲' : 'View Strategy ▼'}
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#5352ed', background: 'rgba(83,82,237,0.1)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0 }}>⏱️ {step.durationMinutes}m</span>
                        </div>
                        {step.focusTip && expandedSteps[step.stepNumber] && (
                          <div style={{ background: '#1c1c1c', borderTop: '1px solid #2d2d2d', padding: '12px 16px', fontSize: '12px', color: '#b0b0b0', lineHeight: '1.6' }}>
                            <div style={{ fontWeight: '600', color: '#777', textTransform: 'uppercase', fontSize: '10px', marginBottom: '6px', letterSpacing: '0.5px' }}>Tactical Strategy</div>
                            <div style={{ color: '#d0d0d0' }}>{step.focusTip}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.85; }
        }

        /* ── Responsive overrides ──────────────────────────────────────── */
        @media (max-width: 768px) {
          .shadow-ai-app {
            padding: 16px !important;
          }
          .shadow-ai-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px;
          }
          .shadow-ai-header-badges {
            flex-wrap: wrap;
          }
          .shadow-ai-grid {
            grid-template-columns: 1fr !important;
          }
          .shadow-ai-form {
            grid-template-columns: 1fr !important;
          }
          .shadow-ai-form textarea {
            grid-column: span 1 !important;
          }
          .shadow-ai-edit-row {
            grid-template-columns: 1fr !important;
          }
          .shadow-ai-task-row {
            flex-wrap: wrap;
          }
          .shadow-ai-task-info {
            max-width: 100% !important;
          }
          .shadow-ai-step-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}

export default App;