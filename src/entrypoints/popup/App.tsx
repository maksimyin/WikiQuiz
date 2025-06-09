import { useState, useEffect } from 'react';
import './App.css';


function App() {
  // for now until ai quizes are implemented

  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [extract, setExtract] = useState<string>("");
  async function fetchPageData(){
   const response = await browser.runtime.sendMessage({
    type: 'fetchPageData',
    payload: {
      sections: true,
      title: true,
      description: true,
      extract: true
    }
   });
   if (response.success) {
    setSections(response.sections);
    setTitle(response.title);
    setDescription(response.description);
    setExtract(response.extract);
   }
  }
  useEffect(() => {
    fetchPageData();
  }, []);

  return (
    <>
      <h1>{title}</h1>
      <p>{description}</p>
      <p>{extract}</p>
      {sections.map((section, index) => (
        <p key={index}>{section.line}</p>
      ))}
    </>
  );
}

export default App;
