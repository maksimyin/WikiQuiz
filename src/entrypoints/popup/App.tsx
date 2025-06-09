import { useState, useEffect } from 'react';
import './App.css';
import { browser } from 'wxt/browser';


function App() {
  // for now until ai quizes are implemented

  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  async function loadDataFromStorage() {
    try {
      const currentTab = await browser.tabs.query({active: true, currentWindow: true})
      const url = currentTab[0].url

      const storage_keys = [`title_${url}`, `description_${url}`, `sections_${url}`, `metadata_${url}`];
      const data = await browser.storage.session.get(storage_keys);

      const metadata = data[`metadata_${url}`];
      if (metadata && (Date.now() - metadata.timestamp < 1000 * 60 * 60 * 24) && data[`title_${url}`] && data[`sections_${url}`]) {
        setSections(data[`sections_${url}`]);
        setTitle(data[`title_${url}`]);
        setDescription(data[`description_${url}`]);
        setIsLoading(false);
      } else {
        console.log("Data is outdated")
        //if problem, we can create a handler in background to fetch the data again
      }

    } catch (error) {
      console.error('Error loading data from storage:', error);
    }
  }


  useEffect(() => {
    loadDataFromStorage();
  }, []);

  if (isLoading) return <div>Loading Data...</div>
  // focus on creating side bar tomorrow for better UI 
  // styling focus tomorrow
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
}

export default App;
