import { BsFileEarmarkText } from 'react-icons/bs';
import { useState, useEffect } from 'react';

type LoadingProps = {
  message?: string;
};

export default function Loading({ message }: LoadingProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };
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
              {message ?? 'Studying the Wikipedia article and creating quiz...'}
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

        <div className="loading-timer">
          {formatTime(seconds)}
        </div>
      </div>
    </div>
  );
}