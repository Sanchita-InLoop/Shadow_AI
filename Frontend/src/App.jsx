import React, { useState } from 'react';

function App() {
  const [deadlines, setDeadlines] = useState(() => {
    const saved = localStorage.getItem('shadow_deadlines');
    return saved ? JSON.parse(saved) : []; 
  });

  React.useEffect(() => {
    localStorage.setItem('shadow_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);
  
  const [newTask, setNewTask] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newImportance, setNewImportance] = useState('High');
  const [newDescription, setNewDescription] = useState('');

  const [expandedTasks, setExpandedTasks] = useState({});
  const [expandedSteps, setExpandedSteps] = useState({});

  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  const toggleExpand = (id) => {
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepExpand = (stepNumber) => {
    setExpandedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const addDeadline = (e) => {
    e.preventDefault();
    if (!newTask || !newDate) return;
    setDeadlines([...deadlines, { 
      id: Date.now(), 
      task: newTask, 
      deadline: newDate, 
      importance: newImportance,
      description: newDescription
    }]);
    setNewTask('');
    setNewDate('');
    setNewDescription('');
  };

  const removeDeadline = (id) => {
    setDeadlines(deadlines.filter(d => d.id !== id));
  };

  const triggerGlobalAIPlan = async () => {
    if (deadlines.length === 0) {
      alert('Please add at least one milestone to optimize!');
      return;
    }

    setLoading(true);
    setActivePlan(null);
    setExpandedSteps({}); 

    const sortedTasks = [...deadlines].sort((a, b) => {
      const importanceWeight = { High: 3, Medium: 2, Low: 1 };
      if (importanceWeight[b.importance] !== importanceWeight[a.importance]) {
        return importanceWeight[b.importance] - importanceWeight[a.importance];
      }
      return new Date(a.deadline) - new Date(b.deadline);
    });

    const focusTask = sortedTasks[0];

    try {
      const response = await fetch('http://localhost:5050/api/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFocusTask: focusTask,
          allDeadlines: deadlines.filter(d => d.id !== focusTask.id)
        }),
      });

      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      
      if (data && data.suggestedMicroTasks) {
        setActivePlan(data);
      } else {
        alert('AI returned unexpected format.');
      }
    } catch (error) {
      console.error(error);
      alert('AI Engine offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#e0e0e0', minHeight: '100vh', backgroundColor: '#121212', boxSizing: 'border-box' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#ff4757', margin: 0, fontSize: '24px', letterSpacing: '0.5px' }}>🚨 SHADOW AI</h1>
          <p style={{ color: '#777', margin: '5px 0 0 0', fontSize: '13px' }}>Proactive Context-Aware Execution Matrix</p>
        </div>
        <span style={{ fontSize: '12px', color: '#5352ed', border: '1px solid #5352ed', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Agentic Mode: Active</span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Trackers */}
        <section style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #252525' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>📅 Upcoming Milestones Matrix</h3>
          
          <form onSubmit={addDeadline} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <input type="text" placeholder="Task name..." value={newTask} onChange={e => setNewTask(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff', fontSize: '13px' }} required />
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff', fontSize: '13px' }} required />
            
            <textarea 
              placeholder="Optional context: Yap away my friend, let's do it together!" 
              value={newDescription} 
              onChange={e => setNewDescription(e.target.value)} 
              rows="2"
              style={{ gridColumn: 'span 2', padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff', fontSize: '13px', resize: 'none' }} 
            />
            
            <select value={newImportance} onChange={e => setNewImportance(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#252525', color: '#fff', fontSize: '13px' }}>
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
            <button type="submit" style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>+ Track Task</button>
          </form>

          <button 
            type="button" 
            onClick={triggerGlobalAIPlan}
            disabled={deadlines.length === 0}
            style={{ width: '100%', padding: '12px', background: deadlines.length === 0 ? '#222' : '#2ed573', color: deadlines.length === 0 ? '#555' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: deadlines.length === 0 ? 'not-allowed' : 'pointer', fontSize: '13px', marginBottom: '25px', transition: 'background 0.2s ease' }}
          >
            ⚡ Run AI Panic Optimization ({deadlines.length} Nodes Loaded)
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deadlines.map(d => (
              <div key={d.id} style={{ display: 'flex', flexDirection: 'column', background: '#222', borderRadius: '6px', borderLeft: `4px solid ${d.importance === 'High' ? '#ff4757' : d.importance === 'Medium' ? '#ffa500' : '#2ed573'}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px', wordBreak: 'break-word' }}>{d.task}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⏰ {new Date(d.deadline).toLocaleString()}</span>
                      {d.description && (
                        <button type="button" onClick={() => toggleExpand(d.id)} style={{ background: 'none', border: 'none', color: '#5352ed', cursor: 'pointer', padding: 0, fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold' }}>
                          {expandedTasks[d.id] ? 'Hide Details ▲' : 'View Details ▼'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <button onClick={() => removeDeadline(d.id)} style={{ background: 'transparent', color: '#ff4757', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>✕</button>
                  </div>
                </div>

                {d.description && expandedTasks[d.id] && (
                  <div style={{ background: '#1c1c1c', borderTop: '1px solid #2d2d2d', padding: '12px 16px', fontSize: '12px', color: '#b0b0b0', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: '600', color: '#777', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px', letterSpacing: '0.5px' }}>Workspace Context Notes</div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.description}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN: Action Dashboard */}
        <section style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #252525', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>⚡ Live Action Dashboard</h3>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5352ed', fontWeight: 'bold', fontSize: '14px' }}>
              🧠 Computing optimal workflow balancing timeline nodes...
            </div>
          )}

          {!loading && !activePlan && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontSize: '13px', border: '1px dashed #333', borderRadius: '6px' }}>
              Fire the global optimization layout matrix to populate action fields.
            </div>
          )}

          {!loading && activePlan && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', background: activePlan.panicModeActivated ? '#ff4757' : '#2ed573', color: '#fff', padding: '3px 8px', borderRadius: '3px' }}>
                  PANIC PROTOCOL: {activePlan.panicModeActivated ? 'ON' : 'OFF'}
                </span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>Threat Matrix: {activePlan.urgencyRating}</span>
              </div>

              <div style={{ background: '#222', borderLeft: '3px solid #2ed573', padding: '10px 12px', borderRadius: '4px', marginBottom: '20px', fontSize: '13px' }}>
                <span style={{ color: '#2ed573', fontWeight: 'bold' }}>LAUNCH NOW: </span>{activePlan.proactiveAction}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activePlan.suggestedMicroTasks.map(step => (
                  <div key={step.stepNumber} style={{ display: 'flex', flexDirection: 'column', background: '#222', borderRadius: '6px', overflow: 'hidden' }}>
                    
                    <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {/* TASK CONTEXT LABEL INDICATOR */}
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#888', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.3px', marginBottom: '6px' }}>
                          🎯 Context: {step.parentTaskName || 'Global Rescue Task'}
                        </div>
                        
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                          {step.stepNumber}. {step.taskName}
                        </div>
                        {step.focusTip && (
                          <button type="button" onClick={() => toggleStepExpand(step.stepNumber)} style={{ background: 'none', border: 'none', color: '#5352ed', cursor: 'pointer', padding: 0, fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold', marginTop: '6px', display: 'block' }}>
                            {expandedSteps[step.stepNumber] ? 'Hide Strategy ▲' : 'View Strategy ▼'}
                          </button>
                        )}
                      </div>
                      
                      <span style={{ fontSize: '12px', color: '#5352ed', background: 'rgba(83, 82, 237, 0.1)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0 }}>
                        ⏱️ {step.durationMinutes}m
                      </span>
                    </div>

                    {step.focusTip && expandedSteps[step.stepNumber] && (
                      <div style={{ background: '#1c1c1c', borderTop: '1px solid #2d2d2d', padding: '12px 16px', fontSize: '12px', color: '#b0b0b0', lineHeight: '1.6' }}>
                        <div style={{ fontWeight: '600', color: '#777', textTransform: 'uppercase', fontSize: '10px', marginBottom: '6px', letterSpacing: '0.5px' }}>Tactical Strategy Roadmap</div>
                        <div style={{ color: '#d0d0d0' }}>{step.focusTip}</div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default App;