import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [extract, setExtract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadDataFromStorage() {
    if (!window.location.hostname.endsWith('wikipedia.org')) {
      return;
    }
    
    const response = await browser.runtime.sendMessage({
      type: 'initialization'
    });
    if (!response.success) {
      console.error("Failed to initialize connection with background script");
      return;
    }

    const data = await browser.runtime.sendMessage({
      type: 'getData',
      payload: {
        url: window.location.href
      }
    });

    if (data.metadata && data.sections && data.title && data.description) {
      setSections(data.sections);
      setTitle(data.title);
      setDescription(data.description);
      setExtract(data.extract);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDataFromStorage();

    const handleUrlChange = () => {
      loadDataFromStorage();
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  if (isLoading) return <div>Loading Data...</div>

  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>
      <hr></hr>
      {sections.map((section, index) => (
        <p key={index}>{section.line}</p>
      ))}
    </>
  );
};

export default Sidebar;
