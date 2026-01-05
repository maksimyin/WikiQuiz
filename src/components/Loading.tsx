import { BsFileEarmarkText } from 'react-icons/bs';
import { useState, useEffect, useRef } from 'react';

type LoadingProps = {
  message?: string;
  isComplete?: boolean;
};

export default function Loading({ message, isComplete = false }: LoadingProps) {
  const [percentage, setPercentage] = useState(0);
  const [showColdStartHint, setShowColdStartHint] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Studying the Wikipedia article and creating quiz...');

  const maxProgressRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isComplete) return;

    const RAMP_DURATION = 250;
    const RAMP_INTERVAL = 16;
    const startProgress = maxProgressRef.current;
    const targetProgress = 99;
    const startTime = Date.now();

    if (startProgress >= 98) {
      maxProgressRef.current = 100;
      setPercentage(100);
      return;
    }

    const rampInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / RAMP_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startProgress + (targetProgress - startProgress) * eased;

      maxProgressRef.current = current;
      setPercentage(current);

      if (t >= 1) {
        clearInterval(rampInterval);
        setTimeout(() => {
          maxProgressRef.current = 100;
          setPercentage(100);
        }, 500);
      }
    }, RAMP_INTERVAL);

    return () => clearInterval(rampInterval);
  }, [isComplete]);


  useEffect(() => {
    if (isComplete) return;

    const TARGET = 99;
    const TAU = 5000; 

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;

      const rawProgress = TARGET * (1 - Math.exp(-elapsed / TAU));

      if (rawProgress > maxProgressRef.current) {
        maxProgressRef.current = rawProgress;
        setPercentage(rawProgress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isComplete]);

  useEffect(() => {
    const hintTimer = setTimeout(() => {
      setShowColdStartHint(true);
      setLoadingMessage('Waking up server... This may take 20-30 seconds on first use.');
    }, 20000);

    return () => clearTimeout(hintTimer);
  }, []);

  return (
    <div className="loading-container">
      <div className="loading-card">
        <div className="loading-header">
          <div className="loading-logo">
            <BsFileEarmarkText />
          </div>
          <div className="loading-text">
            <div className="loading-title">Generating quiz</div>
            <div className="loading-subtitle">
              {message ?? loadingMessage}
            </div>
          </div>
        </div>

        <div className="loading-ellipsis" aria-hidden>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="loading-skeleton">
          <div className="skeleton-line w-85"></div>
          <div className="skeleton-line w-70"></div>
          <div className="skeleton-line w-60"></div>

          <div className="skeleton-pill-row">
            <div className="skeleton-pill"></div>
            <div className="skeleton-pill"></div>
            <div className="skeleton-pill"></div>
            <div className="skeleton-pill"></div>
          </div>
        </div>

        {showColdStartHint && (
          <div className="loading-hint" style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary, #666)',
            textAlign: 'center'
          }}>
            The server is waking up. Following quizzes will generate much faster!
          </div>
        )}

        <div className="loading-timer">
          <svg className="loading-timer-circle" viewBox="0 0 36 36">
            <path
              className="loading-timer-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="loading-timer-progress"
              strokeDasharray={`${percentage}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="loading-timer-text">{Math.floor(percentage)}%</span>
        </div>
      </div>
    </div>
  );
}