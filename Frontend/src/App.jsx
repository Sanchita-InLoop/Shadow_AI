import React, { useState } from 'react';

function App() {
  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Sending to AI: "${task}" due by ${deadline}`);
    // We will connect this to our AI backend soon!
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '30px' }}>
        <h1 style={{ color: '#ff4757' }}>🚨 The Last-Minute Life Saver</h1>
        <p style={{ color: '#666' }}>Stop panicking. Let AI take the wheel and execute.</p>
      </header>

      <main>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>What's stressing you out? (Task)</label>
            <input 
              type="text" 
              placeholder="e.g., Marketing presentation, study for finals, pay electricity bill..." 
              value={task}
              onChange={(e) => setTask(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>When is it absolutely due?</label>
            <input 
              type="datetime-local" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              required
            />
          </div>

          <button 
            type="submit" 
            style={{ padding: '12px', background: '#2ed573', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
          >
            ⚡ Rescue Me (Generate AI Plan)
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;