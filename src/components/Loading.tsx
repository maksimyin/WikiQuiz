import { BsFileEarmarkText } from 'react-icons/bs';

type LoadingProps = {
  message?: string;
};

export default function Loading({ message }: LoadingProps) {
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
      </div>
    </div>
  );
}