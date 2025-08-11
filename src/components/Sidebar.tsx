import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { IoMdArrowBack } from "react-icons/io";
import { IoDocumentTextOutline } from "react-icons/io5";
import { IoMdMenu, IoMdClose } from "react-icons/io";
import * as types from '../utils/types';

const Sidebar = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [quizContent, setQuizContent] = useState<types.QuizContent | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  
  // Don't render sidebar on Wikipedia main page
  if (window.location.pathname === '/wiki/Main_Page') {
    return null;
  } 
  // Update page styles when sidebar state changes
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.remove('wiki-ai-sidebar-open');
    } else {
      document.body.classList.add('wiki-ai-sidebar-open');
    }
  }, [isCollapsed]);

  // Function to handle user clicking the toggle button
  const handleToggleClick = async () => {
    const result = await browser.runtime.sendMessage({ type: 'toggleSidebar', payload: 'session' });
    setIsCollapsed(!result.sidebarEnabled);
  };
  type QuizMode = {
    quizGeneration: boolean;
    quizType: "general_knowledge" | "text_specific" | undefined;
    clickedElement: string | undefined; // summary, section-0, section-1, etc.
    section_index: number | undefined;
  }
  const [quizMode, setQuizMode] = useState<QuizMode>({
    quizGeneration: false,
    quizType: undefined,
    clickedElement: undefined,
    section_index: undefined
  });

  // Add/remove body class when quiz is active to allow global styling (e.g., hide toggle)
  useEffect(() => {
    if (quizMode.quizGeneration) {
      document.body.classList.add('wiki-ai-quiz-active');
    } else {
      document.body.classList.remove('wiki-ai-quiz-active');
    }
  }, [quizMode.quizGeneration]);

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
    
    if (window.location.pathname === '/wiki/Main_Page') {
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
      data.summary && setSummary(data.summary);
      if (!data.sections && !data.title && !data.summary) {
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
    setSummary({});
    async function getSidebarEnabled() {
      const enabled = await browser.runtime.sendMessage({ type: 'getSidebarState', payload: 'session' });
      setIsCollapsed(!enabled.sidebarEnabled);
    }
    getSidebarEnabled();

 
  }, []);

  useEffect(() => {
    async function getQuizContent() {
      if (quizMode.quizGeneration) {
        // Reset quiz content to ensure loading state until fresh content arrives
        setQuizContent(null);
        const quizContent: {reply: types.QuizContent} = await browser.runtime.sendMessage({
          type: 'getQuizContent',
          payload: {
            topic: title,
            bucket_a: quizMode.clickedElement === "summary" ? summary : quizMode.section_index,
            quizType: quizMode.quizType,
            url: window.location.href
          }
        })
        console.log("quizContent", quizContent);
        setQuizContent(quizContent.reply);
      }
  }
  getQuizContent();
  }, [quizMode]);

 
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

  const totalQuestions = quizContent?.questions?.length ?? 0;
  const currentQuestion =
    quizContent && totalQuestions > 0
      ? quizContent.questions[currentQuestionIndex]
      : undefined;

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const goNext = () => {
    if (currentQuestionIndex < (totalQuestions - 1)) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const resetQuizView = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
  };

  // separating sections by subsections
  // [{section}, {section}, {section}, {section}] -> [{...main_section, subsections: [{section}, {section}, {section}]}]
    // 0, 1, 2, 1, 0 ,1, 2, 2, 2, 3, 2, 1, 0 -> [{...main_section, subsections: [{...section, subsections: [{section}]}, {section}]}]... etc

  interface WikiSection {
    anchor: string,
    fromtitle: string,
    index: number,
    level: number,
    line: string,
    number: number,
    toclevel: number,
  }
  interface SectionWithSubsections extends WikiSection {
    subsections: SectionWithSubsections[];
    numberedPath: string; 
  }

  const createNestedSections = (sections: WikiSection[]): SectionWithSubsections[] => {
    const mainSections = sections.filter(section => section.toclevel === 1);
    return mainSections.map((mainSection, mainIndex) => {
      const nextMainIndex = sections.findIndex(
        (s, i) => i > sections.indexOf(mainSection) && s.toclevel === 1
      );

      const sectionEnd = nextMainIndex === -1 ? sections.length : nextMainIndex;
      const childSections = sections.slice(sections.indexOf(mainSection) + 1, sectionEnd);
      
      // Main section numbering: "Section 1", "Section 2", etc.
      const numberedPath = `Section ${mainIndex + 1}`;
      
      return {
        ...mainSection,
        numberedPath,
        subsections: buildSubsections(childSections, mainSection.toclevel + 1, `${mainIndex + 1}`)
      };
    });
  };

  const buildSubsections = (sections: WikiSection[], level: number, parentPath: string): SectionWithSubsections[] => {
    const directSubsections = sections.filter(section => section.toclevel === level);

    return directSubsections.map((section, index) => {
      const nextSectionIndex = sections.findIndex(
        (s, i) => i > sections.indexOf(section) && s.toclevel <= level
      );

      const sectionEnd = nextSectionIndex === -1 ? sections.length : nextSectionIndex;
      const childSections = sections.slice(sections.indexOf(section) + 1, sectionEnd);
      
      // Subsection numbering: "2.1", "2.1.1", etc.
      const numberedPath = `${parentPath}.${index + 1}`;

      return {
        ...section,
        numberedPath,
        subsections: buildSubsections(childSections, level + 1, numberedPath)
      };
    });
  };
  const nestedSections = createNestedSections(sections);
  const renderSections = (sections: SectionWithSubsections[]) => {
    return sections.map((section) => (
      <React.Fragment key={section.index}>
        <div 
          className="sidebar-section" 
          id={`section-${section.index}`}
          onMouseEnter={() => {
            setQuizState({
              summary: false,
              section: true,
              section_index: section.index,
              hoveringState: true
            })
          }} 
          onMouseLeave={() => {
            setQuizState(noHoverState)
          }}
          onClick={() => {
            window.location.hash = section.anchor;
          }}
        >
          {quizState.hoveringState && quizState.section && 
            Number(quizState.section_index) === Number(section.index) && (
            <div className="quiz-button-container">
              <button 
                className="quiz-button"
                onClick={() => {
                  setQuizMode({
                    quizGeneration: true,
                    quizType: "general_knowledge",
                    clickedElement: `section-${section.index}`,
                    section_index: Number(section.index)
                  })
                }}
                title="Article Quiz"
              >
                <IoDocumentTextOutline />
              </button>
            </div>
          )}
          <h2 className="section-title">{section.numberedPath.includes("Section") ? section.numberedPath : `Section ${section.numberedPath}`}</h2>
          <p className="section-content">{section.line || ""}</p>
        </div>
        
        {Array.isArray(section.subsections) && section.subsections.length > 0 && (
          <div style={{marginLeft: '15px'}}>
            {renderSections(section.subsections)}
          </div>
        )}
      </React.Fragment>
    ));
  };

  


  // need to add two buttons to the sidebar: one to toggle dark mode and one to toggle sidebar visibility
  // add functionality to toggle dark mode and sidebar visibility
  // later, consider adding feature to shrink and expand sidebar (hard to implement bc/ of shadow dom)
  // work on sidebar styles
    //before production make cleaner especially left hand bar
  return (
    <>
      {/* Floating toggle button */}
      <button 
        className={`sidebar-toggle-button ${isCollapsed ? 'collapsed' : 'expanded'}`}
        onClick={handleToggleClick}
        title={isCollapsed ? "Open Sidebar" : "Close Sidebar"}
      >
        {isCollapsed ? <IoMdMenu /> : <IoMdClose />}
      </button>

      {/* Dim backdrop during quiz */}
      {quizMode.quizGeneration && !isCollapsed && <div className="sidebar-backdrop" />}

      {/* Main sidebar content */}
      <div className={`sidebar-container ${isCollapsed ? 'collapsed' : 'expanded'} ${quizMode.quizGeneration ? 'quiz-active' : ''}`}>
        {quizMode.quizGeneration ? (
          <>
        <header className="sidebar-header">
          {quizMode.clickedElement === "summary" ? (
            <div className="sidebar-section">
            <IoMdArrowBack className="quiz-button back-arrow" onClick={() => {
              setQuizMode({
                quizGeneration: false,
                quizType: undefined,
                clickedElement: undefined,
                section_index: undefined
              })
              resetQuizView();
            }}/>
              <h1 className="section-title">Introduction</h1>
              </div>
          ) : (
            <div className="sidebar-section">
              {(() => {
                const index = quizMode.clickedElement?.split("-")[1];
                if (index === undefined) return null;
                
                const section = sections.find(s => Number(s.index) === Number(index));
                if (!section) return null;
                
                return (
                  <>
                  <IoMdArrowBack className="quiz-button back-arrow" onClick={() => {
              setQuizMode({
                quizGeneration: false,
                quizType: undefined,
                clickedElement: undefined,
                section_index: undefined
              })
              resetQuizView();
            }}/>
                    <h1 className="section-title">{`Section ${section.number}`}</h1>
                    <p className="section-content">{section.line || ""}</p>
                  </>
                );
              })()}
            </div>
          )}
        </header>
        <div className="sidebar-content">
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        </div>
      </>
    ) : (
      <>
      <header className="sidebar-header">
        <h1 className="sidebar-title">{title || "Untitled"}</h1>
      </header>
      
      <div className="sidebar-content">
        {summary && (
          <div className="sidebar-section" id="summary" onMouseEnter={() => {
            setQuizState({
              summary: true,
              section: false,
              section_index: undefined,
              hoveringState: true
            })
          }} onMouseLeave={() => {
            setQuizState(noHoverState)
          }}
          onClick={() => {
            window.location.hash = "";
          }}
          >
            {quizState.hoveringState && quizState.summary && (
              <div className="quiz-button-container">
              <button 
                className="quiz-button"
                onClick={() => {
                  setQuizMode({
                    quizGeneration: true,
                    quizType: undefined,
                    clickedElement: "summary",
                    section_index: undefined
                  })
                }}
              >
                Create Quiz
              </button>
              </div>
            )}
            <h2 className="section-title">Introduction</h2>
          </div>
        )}

        {Array.isArray(nestedSections) && nestedSections.length > 0 ? (
          renderSections(nestedSections)
        ) : (
          <div className="sidebar-section">
            <p className="section-content">No sections available. Please reload page in case of rendering issues.</p>
          </div>
        )}
        
      </div>
      </>
    )}
      </div>
    </>
  );
};

export default Sidebar;
