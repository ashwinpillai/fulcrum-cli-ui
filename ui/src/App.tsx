import React, { useState } from 'react';
import fulcrumLogo from './fulcrum-logo.png';

interface CommandField {
  name: string;
  label: string;
  type: string;
  default?: string;
}

const commandConfigs: Record<string, CommandField[]> = {
  'records show': [
    { name: 'record', label: 'Record ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'records delete': [
    { name: 'record', label: 'Record ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'records update': [
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'records duplicate': [
    { name: 'source', label: 'Source Form ID', type: 'text' },
    { name: 'destination', label: 'Destination Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'records restore': [
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'forms delete': [
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'forms duplicate': [
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'records', label: 'Duplicate Records (true/false)', type: 'text', default: 'true' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'forms restore': [
    { name: 'form', label: 'Deleted Form ID', type: 'text' },
    { name: 'date', label: 'Date (ISO 8601)', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'forms upload-reference-file': [
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'file', label: 'File Path', type: 'text' },
    { name: 'name', label: 'File Name', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'query run': [
    { name: 'sql', label: 'SQL Query', type: 'text' },
    { name: 'format', label: 'Format (json/csv)', type: 'text', default: 'json' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'changesets show': [
    { name: 'changeset', label: 'Changeset ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'changesets revert': [
    { name: 'changeset', label: 'Changeset ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
  'reports run': [
    { name: 'token', label: 'API Token', type: 'password' },
    { name: 'logDir', label: 'Log Directory', type: 'text', default: './logs' },
  ],
};

const commands = Object.keys(commandConfigs);

type FieldsState = Record<string, string>;

function App() {
  const [command, setCommand] = useState<string>(commands[0]);
  const [fields, setFields] = useState<FieldsState>(() => {
    const initial: FieldsState = {};
    commandConfigs[commands[0]].forEach((f) => {
      initial[f.name] = f.default || '';
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'error'; message: string } | null>(null);
  const [output, setOutput] = useState<string>('');

  const handleFieldChange = (name: string, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleCommandChange = (cmd: string) => {
    setCommand(cmd);
    const newFields: FieldsState = {};
    commandConfigs[cmd].forEach((f) => {
      newFields[f.name] = f.default || '';
    });
    setFields(newFields);
    setOutput('');
  };

  const handleRun = async () => {
    setLoading(true);
    setModal(null);
    setOutput('');
    try {
      const args = Object.entries(fields).map(([k, v]) => `--${k} ${v}`);
      const res = await fetch('http://localhost:5001/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
        }),
      });
      const data = await res.json();
      if (res.ok && data.output) {
        setOutput(data.output);
      } else {
        setModal({ type: 'error', message: data.error || 'Unknown error occurred.' });
      }
    } catch (err) {
      setModal({ type: 'error', message: 'Error connecting to server.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff 60%, #e11d48 100%)', padding: 0, margin: 0, position: 'relative' }}>
      {/* Fulcrum logo in the top left corner */}
      <img src={fulcrumLogo} alt="Fulcrum Logo" style={{ position: 'absolute', top: 24, left: 24, width: 90, height: 'auto', zIndex: 10 }} />
      <div style={{ maxWidth: 520, margin: '48px auto', fontFamily: 'Inter, sans-serif', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32 }}>
        <h2 style={{ color: '#1a202c', fontWeight: 700, marginBottom: 32, letterSpacing: 1 }}>Fulcrum CLI UI</h2>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 500, color: '#2d3748' }}>Command:&nbsp;
            <select value={command} onChange={e => handleCommandChange(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16 }}>
              {commands.map(cmd => (
                <option key={cmd} value={cmd}>{cmd}</option>
              ))}
            </select>
          </label>
        </div>
        {commandConfigs[command].map((f) => (
          <div style={{ marginBottom: 20 }} key={f.name}>
            <label style={{ fontWeight: 500, color: '#2d3748' }}>{f.label}:&nbsp;
              <input
                type={f.type}
                value={fields[f.name]}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                placeholder={f.label}
                style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16 }}
              />
            </label>
          </div>
        ))}
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            background: loading ? '#cbd5e1' : '#e11d48',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 18,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(225,29,72,0.08)',
            transition: 'background 0.2s',
            marginTop: 8,
          }}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="spinner" style={{
                width: 18, height: 18, border: '3px solid #fff', borderTop: '3px solid #e11d48', borderRadius: '50%', display: 'inline-block', marginRight: 10, animation: 'spin 1s linear infinite'
              }} />
              Running...
            </span>
          ) : 'Run Command'}
        </button>
        {output && (
          <div style={{ marginTop: 32 }}>
            <h4 style={{ color: '#1a202c', fontWeight: 600, marginBottom: 8 }}>Output:</h4>
            <pre style={{ background: '#f4f4f4', padding: 16, minHeight: 100, borderRadius: 8, fontSize: 15, color: '#222', overflowX: 'auto' }}>{output}</pre>
          </div>
        )}
      </div>
      {modal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            padding: 36,
            minWidth: 320,
            maxWidth: 420,
            textAlign: 'center',
            border: '2px solid #e11d48',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              ❌
            </div>
            <div style={{ fontSize: 18, color: '#e11d48', marginBottom: 18, whiteSpace: 'pre-line' }}>
              {modal.message}
            </div>
            <button
              onClick={() => setModal(null)}
              style={{
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
