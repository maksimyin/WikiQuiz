import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import { IoMdArrowBack } from "react-icons/io";
import { BsFileEarmarkText } from "react-icons/bs";
import { IoMdMenu, IoMdClose, IoMdSettings } from "react-icons/io";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import * as types from '../utils/types';
import Loading from './Loading';
import { browser } from 'wxt/browser';

const Sidebar = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [quizContent, setQuizContent] = useState<types.QuizContent | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [animatingFinish, setAnimatingFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [questionDifficulty, setQuestionDifficulty] = useState<'recall' | 'stimulating' | 'synthesis'>('stimulating');
  const [numQuestions, setNumQuestions] = useState<4 | 7>(4);
  const [isViewingArticle, setIsViewingArticle] = useState(false);
  const [sidebarContentElement, setSidebarContentElement] = useState<HTMLDivElement | null>(null);
  
  
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
    async function getSettings() {
      const settings = await browser.runtime.sendMessage({ type: 'getSettings', payload: 'session' });
      setQuestionDifficulty(settings.questionDifficulty);
      setNumQuestions(settings.numQuestions);
    }
    getSettings();
 
  }, []);

  useEffect(() => {
    async function getQuizContent() {
      if (quizMode.quizGeneration) {
        setQuizContent(null);
        setError(null);
        
        // Reset scroll to top when quiz generation starts
        // For shadow DOM, we need to use state to track the content element
        const scrollToTop = () => {
          console.log('Attempting scroll reset...');
          console.log('sidebarContentElement:', sidebarContentElement);
          
          if (sidebarContentElement) {
            console.log('Current scrollTop:', sidebarContentElement.scrollTop);
            sidebarContentElement.scrollTop = 0;
            console.log('After reset scrollTop:', sidebarContentElement.scrollTop);
          } else {
            console.log('Could not find sidebar content element - element is null');
          }
        };
        
        // Immediate scroll reset
        scrollToTop();
        
        // Also try after a short delay in case the DOM hasn't updated yet
        setTimeout(scrollToTop, 50);
        
        const quizContent: {reply: types.QuizContent | string} = await browser.runtime.sendMessage({
          type: 'getQuizContent',
          payload: {
            topic: title,
            bucket_a: quizMode.clickedElement === "summary" ? summary : quizMode.section_index,
            quizType: quizMode.quizType,
            url: window.location.href
          }
        })
        if (typeof quizContent.reply === "string") {
          console.log(quizContent.reply)
           setQuizContent(null);
           setError(quizContent.reply);
         } else {
           setQuizContent(quizContent.reply);
           setError(null); 
         }
      }
  }
  getQuizContent();
  }, [quizMode]);

 
  if (isLoading) {
    return (
      <button 
        className={`sidebar-toggle-button ${isCollapsed ? 'collapsed' : 'expanded'} ${quizMode.quizGeneration ? 'quiz-active' : ''}`}
        onClick={handleToggleClick}
        title={isCollapsed ? "Open Sidebar" : "Close Sidebar"}
      >
        {isCollapsed ? <IoMdMenu /> : <IoMdClose />}
      </button>
    )
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
      setIsViewingArticle(false); // Re-blur article when moving to next question
    }
  };

  const goPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setIsViewingArticle(false); // Re-blur article when moving to previous question
    }
  };

  const resetQuizView = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setAnimatingFinish(false);
  };

  const handleFinishQuiz = () => {
    setAnimatingFinish(true);
    setTimeout(() => {
      setShowResults(true);
      setAnimatingFinish(false);
    }, 800); 
  };

  const calculateScore = () => {
    if (!quizContent || !quizContent.questions) return { correct: 0, total: 0, percentage: 0 };
    
    const correct = quizContent.questions.reduce((count, question, index) => {
      return selectedAnswers[index] === question.answer ? count + 1 : count;
    }, 0);
    
    const total = quizContent.questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    return { correct, total, percentage };
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
                title="Generate Quiz"
              >
                <BsFileEarmarkText />
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

  // Tomorrow: save quizContent to local storage and load it from local storage
  return (
    <>
      {/* Floating toggle button */}
      <button 
        className={`sidebar-toggle-button ${isCollapsed ? 'collapsed' : 'expanded'} ${quizMode.quizGeneration ? 'quiz-active' : ''}`}
        onClick={handleToggleClick}
        title={isCollapsed ? "Open Sidebar" : "Close Sidebar"}
      >
        {isCollapsed ? <IoMdMenu /> : <IoMdClose />}
      </button>

      {/* Dim backdrop during quiz; consider adding unblur animation*/}
      {quizMode.quizGeneration && !isCollapsed && !showResults && !isViewingArticle && <div className="sidebar-backdrop" />}

      {/* Main sidebar content */}
      <div className={`sidebar-container ${isCollapsed ? 'collapsed' : 'expanded'} ${quizMode.quizGeneration ? 'quiz-active' : ''}`}>
        {quizMode.quizGeneration ? (
          <>
        <header className="sidebar-header quiz-header">
          <div className="quiz-header-content">
            {quizMode.clickedElement === "summary" ? (
              <>
                <h1 className="sidebar-title">Introduction</h1>
              </>
            ) : (
              (() => {
                const index = quizMode.clickedElement?.split("-")[1];
                if (index === undefined) return null;
                
                const section = sections.find(s => Number(s.index) === Number(index));
                if (!section) return null;
                
                return (
                  <>
                    <h1 className="sidebar-title">{`Section ${section.number}`}</h1>
                    <p className="quiz-header-subtitle">{section.line || ""}</p>
                  </>
                );
              })()
            )}
          </div>
          <IoMdArrowBack className="quiz-back-button" title="Return to Sidebar" onClick={() => {
            setQuizMode({
              quizGeneration: false,
              quizType: undefined,
              clickedElement: undefined,
              section_index: undefined
            })
            resetQuizView();
            setError(null); 
          }}/>
        </header>
        {/* Quiz content body */}
        <div className="sidebar-content">
          {error ? (
            <div className="quiz-error">
              <div className="sidebar-section">
                <h3 className="section-title">Error</h3>
                <p className="section-content error-message">{error}</p>
                <button 
                  className="quiz-nav-button" 
                  onClick={() => {
                    setError(null);
                    setQuizMode({
                      quizGeneration: false,
                      quizType: undefined,
                      clickedElement: undefined,
                      section_index: undefined
                    });
                  }}
                  style={{marginTop: '10px'}}
                >
                  Back to Sidebar
                </button>
              </div>
            </div>
          ) : quizContent ? (
            <div className={`quiz-container ${animatingFinish ? 'finishing' : ''}`}>
               {showResults ? (
                    <div className="quiz-results">
                  <div className="quiz-score-card">
                    <h2 className="quiz-score-title">Quiz Results</h2>
                    <div className="quiz-score-circle">
                      <span className="quiz-score-number">{calculateScore().percentage}%</span>
                    </div>
                    <p className="quiz-score-text">
                      You got {calculateScore().correct} out of {calculateScore().total} questions correct
                    </p>
                  </div>

                  <div className="quiz-answers-review">
                    <h3 className="quiz-review-title">Review Answers</h3>
                    {quizContent.questions.map((question, index) => {
                      const userAnswer = selectedAnswers[index];
                      const isCorrect = userAnswer === question.answer;
                      
                      return (
                        <div key={index} className={`quiz-answer-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                          <div className="quiz-answer-header">
                            <span className="quiz-answer-number">Q{index + 1}</span>
                            <span className={`quiz-answer-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                              {isCorrect ? '✓' : '✗'}
                            </span>
                          </div>
                          
                          <p className="quiz-answer-question">{question.question}</p>
                          
                          <div className="quiz-answer-options">
                            {question.options.map((option, optionIndex) => {
                              const isUserChoice = userAnswer === optionIndex;
                              const isCorrectAnswer = question.answer === optionIndex;
                              
                              let className = 'quiz-answer-option';
                              if (isCorrectAnswer) className += ' correct-answer';
                              if (isUserChoice && !isCorrectAnswer) className += ' user-wrong';
                              if (isUserChoice && isCorrectAnswer) className += ' user-correct';
                              
                              return (
                                <div key={optionIndex} className={className}>
                                  <span className="quiz-option-letter">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                  <span className="quiz-option-text">{option}</span>
                                  {isCorrectAnswer && <span className="correct-indicator">✓</span>}
                                  {isUserChoice && !isCorrectAnswer && <span className="wrong-indicator">✗</span>}
                                </div>
                              );
                            })}
                          </div>
                          
                          {question.explanation && (
                            <div className="quiz-answer-explanation">
                              <strong>Explanation:</strong> {question.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="quiz-action-buttons">
                    <button 
                      className="end-quiz-button restart" 
                      onClick={resetQuizView}
                    >
                      Take Quiz Again
                    </button>
                    <button 
                      className="end-quiz-button exit"
                      onClick={() => {
                        //save quiz content to local storage
                        setQuizMode({
                          quizGeneration: false,
                          quizType: undefined,
                          clickedElement: undefined,
                          section_index: undefined
                        })
                        resetQuizView();
                        setError(null); 
                      }}
                    >
                      Return to Sidebar
                    </button>
                  </div>
                </div> 
                ) : (
                /* Quiz */
                <>
                  <div className="quiz-progress">
                    <div className="quiz-progress-bar">
                      <div 
                        className="quiz-progress-fill" 
                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                      />
                    </div>
                    <div className="quiz-progress-header">
                      <span className="quiz-progress-text">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </span>
                      <button 
                        className="quiz-view-article-icon"
                        onClick={() => setIsViewingArticle(!isViewingArticle)}
                        title={isViewingArticle ? 'Hide Article' : 'View Article'}
                      >
                        {isViewingArticle ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                      </button>
                    </div>
                  </div>

                  {currentQuestion && (
                    <div className="quiz-question-container">
                      <div className="quiz-question">
                        <h3 className="quiz-question-text">{currentQuestion.question}</h3>
                        {currentQuestion.difficulty && (
                          <p className="quiz-difficulty">Difficulty: {currentQuestion.difficulty}</p>
                        )}
                      </div>

                      <div className="quiz-options">
                        {currentQuestion.options.map((option, index) => {
                          const isSelected = selectedAnswers[currentQuestionIndex] === index;
                          return (
                            <button
                              key={index}
                              className={`quiz-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectOption(index)}
                            >
                              <span className="quiz-option-letter">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="quiz-option-text">{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="quiz-navigation">
                        <button 
                          className="quiz-nav-button quiz-nav-prev" 
                          onClick={goPrev}
                          disabled={currentQuestionIndex === 0}
                        >
                          Previous
                        </button>
                        <button 
                          className="quiz-nav-button quiz-nav-next" 
                          onClick={goNext}
                          disabled={currentQuestionIndex === totalQuestions - 1}
                        >
                          Next
                        </button>
                      </div>

                      {currentQuestionIndex === totalQuestions - 1 && (
                        <button className="quiz-finish-button" onClick={handleFinishQuiz}>
                          Check Answers
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <Loading />
          )}
        </div>
      </>
    ) : (
      <>
            <header className="sidebar-header">
        <h1 className="sidebar-title">{title || "Untitled"}</h1>
        {/* Settings; TODO = save setting to local storage; edit prompts and code to utilize settings */}
        <div className="settings-container" ref={settingsRef}>
          <IoMdSettings 
            className="sidebar-settings-icon" 
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          />
          {showSettings && (
            <div className="settings-dropdown">

              <div className="settings-section">
                <div className="settings-label">Question Difficulty</div>
                <div className="settings-options">
                  {(['recall', 'stimulating', 'synthesis'] as const).map(difficulty => (
                    <div 
                      key={difficulty}
                      className={`settings-option ${questionDifficulty === difficulty ? 'selected' : ''}`}
                      onClick={(e) => {
                        setQuestionDifficulty(difficulty);
                        browser.runtime.sendMessage({ type: 'toggleSettings', payload: { questionDifficulty: difficulty, numQuestions: numQuestions } });
                      }}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="settings-section">
                <div className="settings-label">Number of Questions</div>
                <div className="settings-options">
                  {([4, 7] as const).map(num => (
                    <div 
                      key={num}
                      className={`settings-option ${numQuestions === num ? 'selected' : ''}`}
                      onClick={(e) => {
                        setNumQuestions(num);
                        browser.runtime.sendMessage({ type: 'toggleSettings', payload: { questionDifficulty: questionDifficulty, numQuestions: num } });
                      }}
                    >
                      {num} Questions
                    </div>
                  ))}
                </div>
              </div>
              
              
              <div className="settings-item" onClick={() => {
                setShowSettings(false);
                handleToggleClick();
              }}>
                Close Sidebar
              </div>
            </div>
          )}
        </div>
      </header>
      
      <div className="sidebar-content" ref={(el) => setSidebarContentElement(el)}>
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
                <BsFileEarmarkText />
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
