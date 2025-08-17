import React, { useState, useRef, useEffect } from 'react';
import fulcrumLogo from './fulcrum-logo.png';
import {
  sanitizeInput,
  validateEmail,
  validateCommand,
  validateInstance,
  validateRecordId,
  validateApiToken,
  loginRateLimiter,
  sessionManager,
  logSecurityEvent
} from './utils/security';

interface CommandField {
  name: string;
  label: string;
  type: string;
  default?: string;
}

const commandConfigs: Record<string, CommandField[]> = {
  'records show': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'record', label: 'Record ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'records delete': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'record', label: 'Record ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'records update': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'records duplicate': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'source', label: 'Source Form ID', type: 'text' },
    { name: 'destination', label: 'Destination Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'records restore': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'forms delete': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'forms duplicate': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'records', label: 'Duplicate Records (true/false)', type: 'text', default: 'true' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'forms restore': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Deleted Form ID', type: 'text' },
    { name: 'date', label: 'Date (ISO 8601)', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'forms upload-reference-file': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'form', label: 'Form ID', type: 'text' },
    { name: 'file', label: 'File Path', type: 'text' },
    { name: 'name', label: 'File Name', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'query run': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'sql', label: 'SQL Query', type: 'text' },
    { name: 'format', label: 'Format (json/csv)', type: 'text', default: 'json' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'changesets show': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'changeset', label: 'Changeset ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
  'changesets revert': [
    { name: 'instance', label: 'Instance', type: 'select', default: 'US' },
    { name: 'changeset', label: 'Changeset ID', type: 'text' },
    { name: 'token', label: 'API Token', type: 'password' },
  ],
};

// Instance endpoint mapping
const instanceEndpoints: Record<string, string> = {
  'US': 'https://api.fulcrumapp.com',
  'EU': 'https://api.fulcrumapp-eu.com',
  'AU': 'https://api.fulcrumapp-au.com',
  'CA': 'https://api.fulcrumapp-ca.com',
};

// User credentials
const userCredentials: Record<string, string> = {
  'ashwin.pillai@fulcrumapp.com': 'Ashwin@1234',
  'sandeep.yadav@fulcrumapp.com': 'Sandeep@1234',
  'christian.lavado@fulcrumapp.com': 'Christian@1234',
  'rohit.khatavkar@fulcrumapp.com': 'Rohit@1234',
};

// Temporary access list (email -> expiry timestamp)
const temporaryAccess: Record<string, number> = {};

// Admin users who can grant temporary access
const adminUsers = [
  'ashwin.pillai@fulcrumapp.com',
  'sandeep.yadav@fulcrumapp.com',
  'christian.lavado@fulcrumapp.com',
  'rohit.khatavkar@fulcrumapp.com'
];

// Activity log interface
interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  email: string;
  accessType: 'admin' | 'temporary';
  action: string;
  command?: string;
  ipAddress: string;
  location: string;
  status: 'success' | 'failed';
}



// Function to get IP address and location
const getIPAndLocation = async (): Promise<{ ip: string; location: string }> => {
  try {
    // Check if IP geolocation is enabled
    if (process.env.REACT_APP_ENABLE_IP_GEOLOCATION === 'false') {
      return { ip: 'Disabled', location: 'Disabled' };
    }

    // For now, skip IP geolocation to avoid CSP issues
    // This will be re-enabled once vercel.json is deployed
    return { ip: 'Local', location: 'Local' };

    // Uncomment this section once vercel.json is deployed with proper CSP
    /*
    // Get IP address
    const ipResponse = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });

    if (!ipResponse.ok) {
      throw new Error(`IP API responded with status: ${ipResponse.status}`);
    }

    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    // Get location from IP
    const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });

    if (!locationResponse.ok) {
      throw new Error(`Location API responded with status: ${locationResponse.status}`);
    }

    const locationData = await locationResponse.json();

    if (locationData.city && locationData.region) {
      return {
        ip,
        location: `${locationData.city}, ${locationData.region}`
      };
    } else if (locationData.country) {
      return {
        ip,
        location: locationData.country
      };
    } else {
      return {
        ip,
        location: 'Unknown'
      };
    }
    */
  } catch (error) {
    console.warn('IP geolocation failed, using fallback:', error);
    return {
      ip: 'Local',
      location: 'Local'
    };
  }
};



const commands = Object.keys(commandConfigs);

type FieldsState = Record<string, string>;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showTemporaryAccessModal, setShowTemporaryAccessModal] = useState(false);
  const [command, setCommand] = useState<string>(commands[0]);

  // Activity log data with localStorage persistence
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(() => {
    const saved = localStorage.getItem('fulcrum_activity_log');
    return saved ? JSON.parse(saved) : [];
  });

    // Check for existing session on app initialization
  useEffect(() => {
    const session = sessionManager.getSession();
    if (session && session.user) {
      setIsAuthenticated(true);
      setCurrentUser(session.user.email);

      // Log successful session restoration
      logSecurityEvent('SESSION_RESTORED', {
        user: session.user.email,
        sessionId: session.id,
        restoredAt: new Date().toISOString()
      });
    }
  }, []);

  // Save to localStorage whenever activityLog changes
  useEffect(() => {
    localStorage.setItem('fulcrum_activity_log', JSON.stringify(activityLog));
  }, [activityLog]);

  // Extend session on user activity
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const session = sessionManager.getSession();
      if (session) {
        // Extend session by 30 minutes on user activity
        sessionManager.extendSession(30);
      }
    }
  }, [isAuthenticated, currentUser]);

  // Periodic session validation check
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        const session = sessionManager.getSession();
        if (!session) {
          // Session expired, log out user
          setIsAuthenticated(false);
          setCurrentUser('');
          logSecurityEvent('SESSION_EXPIRED', { user: currentUser });
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUser]);

  // Function to add activity log entry
  const addActivityLog = async (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'ipAddress' | 'location'>) => {
    try {
      const { ip, location } = await getIPAndLocation();
      const newEntry: ActivityLogEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date(),
        ipAddress: ip,
        location: location,
      };
      setActivityLog(prev => [newEntry, ...prev]); // Add to beginning of array
    } catch (error) {
      // Fallback if IP geolocation fails
      const newEntry: ActivityLogEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date(),
        ipAddress: 'Unknown',
        location: 'Unknown',
      };
      setActivityLog(prev => [newEntry, ...prev]);
      console.warn('IP geolocation failed, using fallback:', error);
    }
  };

  const [fields, setFields] = useState<FieldsState>(() => {
    const initial: FieldsState = {};
    commandConfigs[commands[0]].forEach((f) => {
      initial[f.name] = f.default || '';
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [output, setOutput] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

    const handleLogin = (username: string, password: string) => {
    // Input validation and sanitization
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = sanitizeInput(password);

    if (!validateEmail(sanitizedUsername)) {
      setModal({
        type: 'error',
        message: 'Invalid email format. Please enter a valid email address.'
      });
      logSecurityEvent('INVALID_EMAIL_FORMAT', { username: sanitizedUsername });
      return;
    }

    // Rate limiting check
    if (!loginRateLimiter.isAllowed(sanitizedUsername)) {
      const remainingTime = Math.ceil(loginRateLimiter.getTimeUntilReset(sanitizedUsername) / (60 * 1000));
      setModal({
        type: 'error',
        message: `Too many login attempts. Please try again in ${remainingTime} minutes.`
      });
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { username: sanitizedUsername });
      return;
    }

    // Check if user has temporary access (no password required)
    if (temporaryAccess[sanitizedUsername] && Date.now() < temporaryAccess[sanitizedUsername]) {
      setIsAuthenticated(true);
      setCurrentUser(sanitizedUsername);

      // Create secure session
      sessionManager.createSession({ email: sanitizedUsername, accessType: 'temporary' });

      setModal(null);

      // Reset rate limiter on successful login
      loginRateLimiter.reset(sanitizedUsername);

      // Log successful temporary access
      addActivityLog({
        email: sanitizedUsername,
        accessType: 'temporary',
        action: 'Login',
        status: 'success'
      });

      logSecurityEvent('SUCCESSFUL_TEMPORARY_LOGIN', { username: sanitizedUsername });
      return;
    }

    // Check regular credentials
    if (userCredentials[sanitizedUsername] && userCredentials[sanitizedUsername] === sanitizedPassword) {
      setIsAuthenticated(true);
      setCurrentUser(sanitizedUsername);

      // Create secure session
      sessionManager.createSession({ email: sanitizedUsername, accessType: 'admin' });

      setModal(null);

      // Reset rate limiter on successful login
      loginRateLimiter.reset(sanitizedUsername);

      // Log successful admin login
      addActivityLog({
        email: sanitizedUsername,
        accessType: 'admin',
        action: 'Login',
        status: 'success'
      });

      logSecurityEvent('SUCCESSFUL_ADMIN_LOGIN', { username: sanitizedUsername });
    } else {
      const availableUsers = Object.keys(userCredentials).join(', ');
      setModal({
        type: 'error',
        message: `You are not able to access. Contact admin.\n\nAvailable users: ${availableUsers}`
      });

      // Log failed login attempt
      addActivityLog({
        email: sanitizedUsername,
        accessType: 'admin',
        action: 'Login Failed',
        status: 'failed'
      });

      logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
        username: sanitizedUsername,
        remainingAttempts: loginRateLimiter.getRemainingAttempts(sanitizedUsername)
      });
    }
  };

            const handleGrantTemporaryAccess = (email: string) => {
        // Input validation
        const sanitizedEmail = sanitizeInput(email);

        if (!validateEmail(sanitizedEmail)) {
          setModal({
            type: 'error',
            message: 'Please enter a valid email address.'
          });
          logSecurityEvent('INVALID_TEMPORARY_ACCESS_EMAIL', { email: sanitizedEmail });
          return;
        }

        const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
        temporaryAccess[sanitizedEmail] = expiryTime;
        setShowTemporaryAccessModal(false);
        setModal({
          type: 'success',
          message: `Temporary access granted to ${sanitizedEmail} for 24 hours.`
        });

        // Log temporary access grant
        addActivityLog({
          email: currentUser,
          accessType: 'admin',
          action: 'Grant Temporary Access',
          command: `Granted to: ${sanitizedEmail}`,
          status: 'success'
        });

        logSecurityEvent('TEMPORARY_ACCESS_GRANTED', {
          grantedBy: currentUser,
          grantedTo: sanitizedEmail
        });
      };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');

    // Destroy secure session
    sessionManager.destroySession();

    setFields({});
    setOutput('');
    setProgress(0);

    logSecurityEvent('USER_LOGOUT', { user: currentUser });
  };

  const handleFieldChange = (name: string, value: string) => {
    // Input validation and sanitization
    const sanitizedValue = sanitizeInput(value);

    // Validate specific field types
    let isValid = true;
    let errorMessage = '';

    switch (name) {
      case 'instance':
        if (!validateInstance(sanitizedValue)) {
          isValid = false;
          errorMessage = 'Invalid instance selected';
        }
        break;
      case 'recordId':
        if (sanitizedValue && !validateRecordId(sanitizedValue)) {
          isValid = false;
          errorMessage = 'Invalid record ID format (must be UUID)';
        }
        break;
      case 'apiToken':
        if (sanitizedValue && !validateApiToken(sanitizedValue)) {
          isValid = false;
          errorMessage = 'Invalid API token format';
        }
        break;
    }

    if (!isValid) {
      logSecurityEvent('INVALID_INPUT', { field: name, value: sanitizedValue, error: errorMessage });
      setModal({
        type: 'error',
        message: `Validation Error: ${errorMessage}`
      });
      return;
    }

    setFields((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleCommandChange = (cmd: string) => {
    // Validate command
    if (!validateCommand(cmd)) {
      logSecurityEvent('INVALID_COMMAND', { command: cmd });
      setModal({
        type: 'error',
        message: 'Invalid command selected'
      });
      return;
    }

    setCommand(cmd);
    const newFields: FieldsState = {};
    commandConfigs[cmd].forEach((f) => {
      newFields[f.name] = f.default || '';
    });
    setFields(newFields);
    setOutput('');
    setProgress(0);
  };

  const handleRunClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmRun = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setProgress(0);
    setModal(null);
    setOutput('');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

        // Log command execution
    addActivityLog({
      email: currentUser,
      accessType: adminUsers.includes(currentUser) ? 'admin' : 'temporary',
      action: 'Execute Command',
      command: command,
      status: 'success'
    });

    // Save output to localStorage for persistence (but don't open tab automatically)
    localStorage.setItem('fulcrum_command_output', JSON.stringify({
      output: output,
      timestamp: Date.now()
    }));

    // Start progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Don't go beyond 90% until completion
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      // Build args array with endpoint based on selected instance
      const args = Object.entries(fields).map(([k, v]) => {
        if (k === 'instance') {
          return `--endpoint ${instanceEndpoints[v]}`;
        }
        return `--${k} ${v}`;
      });

      // Use environment variable for backend URL, fallback to Render backend for production
      const backendUrl = process.env.REACT_APP_API_BASE_URL || 'https://fulcrum-cli-ui.onrender.com';
      const response = await fetch(`${backendUrl}/run-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args }),
      });
      if (!response.ok) {
        if (response.status === 404) {
          setModal({ type: 'error', message: 'Backend server not found. Please ensure your backend is running on Render.' });
        } else if (response.status === 500) {
          setModal({ type: 'error', message: 'Backend server error. Please check your backend logs.' });
        } else {
          setModal({ type: 'error', message: `Backend error: ${response.status} ${response.statusText}` });
        }
        setLoading(false);
        clearInterval(progressInterval);
        return;
      }

      if (!response.body) {
        setModal({ type: 'error', message: 'Streaming not supported in this browser.' });
        setLoading(false);
        clearInterval(progressInterval);
        return;
      }
      const reader = response.body.getReader();
      let decoder = new TextDecoder();
      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            setProgress(100);
            setTimeout(() => {
              setLoading(false);
              clearInterval(progressInterval);
            }, 500);
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          setOutput(prev => prev + chunk);
          read();
        });
      };
      read();
    } catch (err) {
      console.error('Error running command:', err);
      let errorMessage = 'Error connecting to server.';

      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to backend server. Please ensure your backend is deployed and running on Render.';
        } else {
          errorMessage = err.message;
        }
      }

      setModal({ type: 'error', message: errorMessage });
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  const handleCancelRun = () => {
    setShowConfirmation(false);
    setProgress(0);
    setModal({ type: 'error', message: 'You aborted the process.' });
  };

  // Login component
  const LoginForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // If user has temporary access, login without password
      if (temporaryAccess[username] && Date.now() < temporaryAccess[username]) {
        handleLogin(username, '');
      } else {
        handleLogin(username, password);
      }
    };

    const hasTemporaryAccess = username && temporaryAccess[username] && Date.now() < temporaryAccess[username];

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff 60%, #e11d48 100%)', padding: 0, margin: 0, position: 'relative' }}>
        {/* Fulcrum logo in the top left corner */}
        <img src={fulcrumLogo} alt="Fulcrum Logo" style={{ position: 'absolute', top: 24, left: 24, width: 90, height: 'auto', zIndex: 10 }} />
        <div style={{ maxWidth: 400, margin: '48px auto', fontFamily: 'Inter, sans-serif', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32 }}>
          <h2 style={{ color: '#1a202c', fontWeight: 700, marginBottom: 32, letterSpacing: 1, textAlign: 'center' }}>Sign In</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 500, color: '#2d3748', display: 'block', marginBottom: 8 }}>Username:</label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 16,
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#e11d48';
                  e.target.style.boxShadow = '0 0 0 3px rgba(225,29,72,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>
                        {!hasTemporaryAccess && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 500, color: '#2d3748', display: 'block', marginBottom: 8 }}>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 16,
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#e11d48';
                    e.target.style.boxShadow = '0 0 0 3px rgba(225,29,72,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>
            )}
            {hasTemporaryAccess && (
              <div style={{
                marginBottom: 24,
                padding: 12,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <span style={{ color: '#166534', fontSize: 14, fontWeight: 500 }}>
                  ✅ Temporary access granted - No password required
                </span>
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                background: hasTemporaryAccess
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #e11d48, #be185d)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: hasTemporaryAccess
                  ? '0 2px 8px rgba(16,185,129,0.2)'
                  : '0 2px 8px rgba(225,29,72,0.2)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = hasTemporaryAccess
                  ? '0 4px 12px rgba(16,185,129,0.3)'
                  : '0 4px 12px rgba(225,29,72,0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = hasTemporaryAccess
                  ? '0 2px 8px rgba(16,185,129,0.2)'
                  : '0 2px 8px rgba(225,29,72,0.2)';
              }}
            >
              {hasTemporaryAccess ? 'Sign In (Temporary)' : 'Sign In'}
            </button>
          </form>
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
      </div>
    );
  };

  // Temporary Access Form Component
  const TemporaryAccessForm = ({ onGrant, onCancel }: { onGrant: (email: string) => void; onCancel: () => void }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (email.trim()) {
        onGrant(email.trim());
      }
    };

        return (
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 16,
            marginBottom: 20
          }}
          required
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            type="submit"
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Grant Access
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: '#cbd5e1',
              color: '#2d3748',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };



  // Main CLI interface
  const CLIInterface = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: 0,
      margin: 0,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: 200,
        height: 200,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        top: '60%',
        right: '15%',
        width: 150,
        height: 150,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '20%',
        width: 100,
        height: 100,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '50%',
        filter: 'blur(25px)',
        animation: 'float 10s ease-in-out infinite'
      }} />
      {/* Fulcrum logo in the top left corner */}
      <img src={fulcrumLogo} alt="Fulcrum Logo" style={{ position: 'absolute', top: 24, left: 24, width: 90, height: 'auto', zIndex: 10 }} />
      <div style={{ maxWidth: 580, margin: '20px auto', fontFamily: 'Inter, sans-serif', background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: 20 }}>
        {/* Cool Header with better organization */}
                <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          padding: 18,
          marginBottom: 24,
          boxShadow: '0 6px 24px rgba(102, 126, 234, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            filter: 'blur(20px)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%',
            filter: 'blur(15px)'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {/* Left side - Welcome and Brand */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.95)',
                padding: '8px 12px',
                borderRadius: 16,
                color: '#1a202c',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{ fontSize: 14 }}>👋</span>
                Welcome, {currentUser.split('@')[0].split('.')[0].split('.')[0].charAt(0).toUpperCase() + currentUser.split('@')[0].split('.')[0].slice(1)}
              </div>

              <h2 style={{
                color: 'white',
                fontWeight: 800,
                letterSpacing: 1,
                fontSize: 18,
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>

              </h2>
            </div>

                        {/* Right side - Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => {
                  const newTab = window.open('./activity-log.html', '_blank');
                  setTimeout(() => {
                    if (newTab) {
                      newTab.postMessage({
                        type: 'ACTIVITY_LOG_DATA',
                        activities: activityLog
                      }, '*');
                    }
                  }, 100);
                }}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  color: '#1a202c',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 3px 15px rgba(0,0,0,0.1)';
                }}
              >
                <span style={{ fontSize: 16 }}>📊</span>
                Activity Log
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 3px 15px rgba(239, 68, 68, 0.3)';
                }}
              >
                <span style={{ fontSize: 16 }}>🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
                {adminUsers.includes(currentUser) && (
          <div style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: 12,
            padding: 18,
            border: '1px solid #e0f2fe'
          }}>
            <button
              onClick={() => setShowTemporaryAccessModal(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 3px 12px rgba(16, 185, 129, 0.3)',
                width: '100%',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
              }}
            >
              <span style={{ fontSize: 18 }}>🔑</span>
              Grant Temporary Access
            </button>
          </div>
        )}
                <div style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: 8,
          padding: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <label style={{
            fontWeight: 600,
            color: '#1e293b',
            fontSize: 12,
            marginBottom: 8,
            display: 'block'
          }}>
            Command:
          </label>
          <select
            value={command}
            onChange={e => handleCommandChange(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 5,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              width: '100%',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              maxWidth: '100%'
            }}
          >
            {commands.map(cmd => (
              <option key={cmd} value={cmd}>{cmd}</option>
            ))}
          </select>
        </div>
                        {commandConfigs[command].map((f) => (
                    <div style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: 8,
            padding: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }} key={f.name}>
            <label style={{
              fontWeight: 600,
              color: '#1e293b',
              fontSize: 12,
              marginBottom: 8,
              display: 'block'
            }}>
              {f.label}:
            </label>
                        {f.type === 'select' ? (
              <select
                value={fields[f.name]}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  boxSizing: 'border-box',
                  maxWidth: '100%'
                }}
              >
                <option value="US">US</option>
                <option value="EU">EU</option>
                <option value="AU">AU</option>
                <option value="CA">CA</option>
              </select>
            ) : (
              <input
                type={f.type}
                value={fields[f.name]}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                placeholder={f.label}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              />
            )}
            {f.name === 'instance' && fields[f.name] && (
              <div style={{
                marginTop: 10,
                fontSize: 12,
                color: '#475569',
                fontWeight: 500,
                padding: '6px 10px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 5,
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                🌐 Endpoint: {instanceEndpoints[fields[f.name]]}
              </div>
            )}
          </div>
        ))}
        <div style={{
          marginTop: 18,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center'
        }}>
          <button
            onClick={handleRunClick}
            disabled={loading}
            style={{
              background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #e11d48, #be185d)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(225,29,72,0.3)',
              transition: 'all 0.3s ease',
              position: 'relative',
              minWidth: 140,
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(225,29,72,0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(225,29,72,0.3)';
              }
            }}
          >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <div style={{
                position: 'relative',
                width: 20,
                height: 20,
                marginRight: 10,
              }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke="#e11d48"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 8}`}
                    strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#e11d48',
                }}>
                  {Math.round(progress)}%
                </div>
              </div>
              Processing...
            </span>
          ) : 'Run Command'}
        </button>

        {output && (
          <button
            onClick={() => {
              const outputTab = window.open('./command-output.html', '_blank');
              setTimeout(() => {
                if (outputTab) {
                  outputTab.postMessage({
                    type: 'COMMAND_OUTPUT',
                    output: output
                  }, '*');
                }
              }, 100);
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: 120,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }}
          >
            📋 View Output
          </button>
        )}
        </div>
        {loading && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              width: '100%',
              height: 4,
              backgroundColor: '#e5e7eb',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#e11d48',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{
              textAlign: 'center',
              marginTop: 6,
              fontSize: 12,
              color: '#6b7280',
              fontWeight: 500
            }}>
              {Math.round(progress)}% Complete
            </div>
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
            border: `2px solid ${modal.type === 'success' ? '#10b981' : '#e11d48'}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {modal.type === 'success' ? '✅' : '❌'}
            </div>
            <div style={{
              fontSize: 18,
              color: modal.type === 'success' ? '#10b981' : '#e11d48',
              marginBottom: 18,
              whiteSpace: 'pre-line'
            }}>
              {modal.message}
            </div>
            <button
              onClick={() => setModal(null)}
              style={{
                background: modal.type === 'success' ? '#10b981' : '#e11d48',
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
      {showConfirmation && (
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
          zIndex: 1001,
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
              ⚠️
            </div>
            <div style={{ fontSize: 18, color: '#e11d48', marginBottom: 18, whiteSpace: 'pre-line' }}>
              Are you sure you want to proceed with running the command "{command}"? Once started, this process cannot be cancelled.
            </div>
            <button
              onClick={handleConfirmRun}
              style={{
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: 10,
              }}
            >
              Proceed
            </button>
            <button
              onClick={handleCancelRun}
              style={{
                background: '#cbd5e1',
                color: '#2d3748',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showTemporaryAccessModal && (
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
          zIndex: 1002,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            padding: 36,
            minWidth: 400,
            maxWidth: 500,
            textAlign: 'center',
            border: '2px solid #10b981',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              🔑
            </div>
            <h3 style={{ fontSize: 20, color: '#1a202c', marginBottom: 16 }}>Grant Temporary Access</h3>
            <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
              Enter the email address to grant 24-hour temporary access (no password required):
            </p>
            <TemporaryAccessForm onGrant={handleGrantTemporaryAccess} onCancel={() => setShowTemporaryAccessModal(false)} />
          </div>
        </div>
      )}

      {/* Progress styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }
      `}</style>
    </div>
  );

  // Main return statement
  return isAuthenticated ? <CLIInterface /> : <LoginForm />;
}

export default App;
