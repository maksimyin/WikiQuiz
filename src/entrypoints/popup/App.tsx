import { useState, useEffect } from 'react';
import './App.css';
import { browser } from 'wxt/browser';
import { PROXY_URL, FEEDBACK_URL } from '../../utils/constants';

// update so changes here affect sidebar states too
// update text and styles

function App() {
  const [health, setHealth] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [checkingHealth, setCheckingHealth] = useState(false);



  const checkHealth = async () => {
    try {
      setCheckingHealth(true);
      const res = await fetch(`${PROXY_URL}/health`, { method: 'GET' });
      setHealth(res.ok ? 'ok' : 'error');
    } catch {
      setHealth('error');
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="popup-container">
      <h2 className="popup-title">WikiQuiz - AI Study Tool</h2>

      <div className="popup-section">
        <div className="label">How to use</div>
        <ul className="steps">
          <li>Open any Wikipedia article (not the Main Page).</li>
          <li>Click the floating icon on the left to open the sidebar.</li>
          <li>Hover a section title to reveal the Generate Quiz button.</li>
        </ul>
        <div className="row">
          <button
            className="btn secondary"
            onClick={() => browser.tabs.create({ url: 'https://en.wikipedia.org/wiki/Special:Random' })}
          >
            Try a Random Article
          </button>
        </div>
      </div>

      <div className="popup-section">
        <div className="row">
          <span className="label">Connection</span>
          <button className="btn" onClick={checkHealth} disabled={checkingHealth}>
            {checkingHealth ? 'Checking...' : 'Check'}
          </button>
        </div>
        {health !== 'unknown' && (
          <p className={`health ${health}`}>Proxy: {health === 'ok' ? 'Reachable' : 'Error'}</p>
        )}
      </div>

      {FEEDBACK_URL ? (
        <div className="popup-section">
          <div className="label">Feedback</div>
          <p className="hint">Tell us what worked and what to improve.</p>
          <div className="row feedback-row">
            <a
              className="btn btn--feedback"
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Feedback Form
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
