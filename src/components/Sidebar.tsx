import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [extract, setExtract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  type QuizMode = {
    quizGeneration: boolean;
    clickedElement: string | undefined; // summary, section-0, section-1, etc.
  }
  const [quizMode, setQuizMode] = useState<QuizMode>({
    quizGeneration: false,
    clickedElement: undefined
  });


  type QuizState = {
    summary: boolean;
    section: boolean;
    section_index: number | undefined;
    hoveringState: boolean;
  }

  const [quizState, setQuizState] = useState<QuizState>({
    summary: false,
    section: false,
    section_index: undefined,
    hoveringState: false
  });

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


      data.sections && setSections(data.sections); // need to add logic removing unnecessary sections like referebcesm works cited, further reading, external links (can be configured to be shown in settings)
      data.title && setTitle(data.title);
      data.description && setDescription(data.description);
      data.extract && setExtract(data.extract);
      if (!data.sections && !data.title && !data.description && !data.extract) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    loadDataFromStorage();
    setIsLoading(true);
    setSections([]);
    setTitle("");
    setDescription("");
    setExtract("");

    const handleUrlChange = () => {
      loadDataFromStorage();
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

 

  if (isLoading) {
    return (
      <div className="sidebar-container">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const noHoverState = {
    summary: false,
    section: false,
    section_index: undefined,
    hoveringState: false
  }

  


  // need to add two buttons to the sidebar: one to toggle dark mode and one to toggle sidebar visibility
  // add functionality to toggle dark mode and sidebar visibility
  // on hover on sections of sidebar, need to show a button on the right top corner which on clicked, creates a quiz
    // quiz structure -> Section or General Overview + content on top <hr><hr> and then quiz content with back arrow on top left to bring back to original page
  // later, consider adding feature to shrink and expand sidebar (hard to implement bc/ of shadow dom)
  // work on sidebar styles
    //before production make cleaner especially left hand bar
  return (
    <>
    {quizMode.quizGeneration ? (
      <div className="sidebar-container">
        <header className="sidebar-header">
          {quizMode.clickedElement === "summary" ? (
            <div className="sidebar-section">
              <h1 className="section-title">General Overview</h1>
              <p className="section-content">{extract || "No general overview available."}</p>
              </div>
          ) : (
            <div className="sidebar-section">
              {(() => {
                const index = quizMode.clickedElement?.split("-")[1];
                if (index === undefined) return null;
                return (
                  <>
                    <h1 className="section-title">{sections[Number(index)].title || `Section ${index}`}</h1>
                    <p className="section-content">{sections[Number(index)].line || ""}</p>
                  </>
                );
              })()}
            </div>
          )}
        </header>
        <div className="sidebar-content">
          <button className="quiz-button" onClick={() => {
            setQuizMode({
              quizGeneration: false,
              clickedElement: undefined
            })
          }}>Back</button> {/* TODO: turn into back arrow */}
          {/* TODO: generate quiz here */}
          <div>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam ac sapien eu sapien dictum convallis. Morbi pretium nibh quis turpis mollis efficitur. Proin mattis justo quis mi ullamcorper, at pellentesque libero lobortis. Mauris a orci tempus, iaculis felis quis, lobortis dui. Donec bibendum metus et purus imperdiet, in hendrerit sem euismod. Donec tempor, mi a fermentum tincidunt, ligula ex lacinia augue, ac accumsan ipsum magna ut urna. Nunc at metus vitae tortor ornare dignissim.

Sed faucibus, ex ac fringilla viverra, lectus felis pharetra eros, vel imperdiet enim nibh sed nulla. Donec sit amet posuere lorem, a sagittis justo. Interdum et malesuada fames ac ante ipsum primis in faucibus. Sed ut nisi quis massa volutpat vestibulum eget quis lacus. Phasellus at aliquam lacus. Nam turpis tortor, consectetur non dapibus vitae, feugiat eget leo. Fusce at congue sapien. Nullam sed mi iaculis, pharetra felis vel, finibus orci. Quisque consequat turpis in sapien tincidunt tincidunt. Duis et eros elementum, facilisis velit hendrerit, commodo velit.

Fusce viverra imperdiet convallis. Duis ullamcorper ex sit amet orci varius, eget ullamcorper lectus dignissim. Mauris maximus interdum blandit. Aliquam eu volutpat ex, quis tristique nunc. Suspendisse ultricies nisl nec viverra sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Vivamus consequat tortor sed mi venenatis, nec lacinia diam egestas. Aenean dignissim sem maximus ipsum congue, eu sagittis felis efficitur. Pellentesque pulvinar mollis urna ac placerat. Integer imperdiet nec tellus quis aliquam. Sed id mi tristique, vulputate felis quis, vulputate nisi. Quisque blandit ex a gravida tincidunt. Nam ornare libero quis sollicitudin vestibulum.

Suspendisse massa lectus, pharetra a erat ullamcorper, bibendum varius mauris. Vestibulum dapibus porttitor maximus. Nulla a egestas nisl. Etiam id dictum nisi, porttitor tempor purus. Pellentesque sollicitudin magna consectetur, dapibus tortor vel, placerat velit. Sed ut ipsum commodo, mollis urna eu, tempus ligula. Pellentesque et dui sed nisi dignissim congue vel at ligula. Suspendisse potenti. Proin commodo lobortis nunc, sit amet lobortis ligula convallis ac. Sed in neque sed sapien porta ultricies dictum sit amet urna.

Etiam in lacus non lectus fringilla lobortis non a libero. Duis vel tincidunt velit, eu maximus eros. Etiam luctus, massa sed volutpat mollis, neque augue tincidunt ipsum, vitae interdum lacus sem at tortor. Nunc gravida vel lacus et vehicula. Fusce pretium, sapien a luctus dignissim, nunc massa accumsan augue, et bibendum nulla neque vitae urna. Sed ornare tincidunt diam sit amet ultricies. Proin mattis blandit elit, in dignissim nunc tempor a.
          </div>
        </div>
      </div>
    ) : (
      <div className="sidebar-container">
      <header className="sidebar-header">
        <h1 className="sidebar-title">{title || "Untitled"}</h1>
        {description && <p className="sidebar-description">{description}</p>}
      </header>
      
      <div className="sidebar-content">
        {extract && (
          <div className="sidebar-section" id="summary" onMouseEnter={() => {
            setQuizState({
              summary: true,
              section: false,
              section_index: undefined,
              hoveringState: true
            })
          }} onMouseLeave={() => {
            setQuizState(noHoverState)
          }}>
            {quizState.hoveringState && quizState.summary && (
              <button 
                className="quiz-button"
                onClick={() => {
                  setQuizMode({
                    quizGeneration: true,
                    clickedElement: "summary"
                  })
                }}
              >
                Create Quiz
              </button>
            )}
            <h2 className="section-title">General Overview</h2>
            <p className="section-content">{extract || "No general overview available."}</p>
          </div>
        )}
        
        {Array.isArray(sections) && sections.length > 0 ? (
          sections.map((section, index) => (
            <div key={index} className="sidebar-section" id={`section-${index}`} onMouseEnter={() => {
              setQuizState({
                summary: false,
                section: true,
                section_index: index,
                hoveringState: true
              })
            }} onMouseLeave={() => {
              setQuizState(noHoverState)
            }}>
              {quizState.hoveringState && quizState.section && quizState.section_index === index && (
                <button 
                  className="quiz-button"
                  onClick={() => {
                    setQuizMode({
                      quizGeneration: true,
                      clickedElement: `section-${index}`
                    })
                  }}
                >
                  Create Quiz
                </button>
              )}
              <h2 className="section-title">{section.title || `Section ${index + 1}`}</h2>
              <p className="section-content">{section.line || ""}</p>
            </div>
          ))
        ) : (
          <div className="sidebar-section">
            <p className="section-content">No sections available. Please reload page in case of rendering issues.</p>
          </div>
        )}
      </div>
    </div>
    )}
    </>

  );
};

export default Sidebar;
