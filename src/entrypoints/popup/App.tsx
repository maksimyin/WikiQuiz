import { useState, useEffect } from 'react';
import './App.css';
import { browser } from 'wxt/browser';


function App() {

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarEnabled, setSidebarEnabled] = useState(true);

  // https://www.youtube.com/watch?v=kZiS1QStIWc -> video for light and dark mode toggle
 
  return (
    <>
      <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => {
              setDarkMode(!darkMode);
            }}
          />
          Dark Mode
        </label>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={sidebarEnabled}
            onChange={() => {
              setSidebarEnabled(!sidebarEnabled);
              browser.runtime.sendMessage({ type: 'toggleSidebar', payload: 'local' });
            }}
          />
          Enable Sidebar
        </label>
      </div>
    </div>
    </>
  );
}

export default App;
