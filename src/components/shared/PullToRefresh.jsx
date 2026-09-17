import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef(null);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (scrollRef.current?.scrollTop !== 0) return;
    const pullDist = e.touches[0].clientY - touchStartY.current;
    if (pullDist > 0) {
      setPullDistance(Math.min(pullDist, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, false);
    element.addEventListener('touchmove', handleTouchMove, false);
    element.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-auto overscroll-y-none h-full"
      style={{
        overscrollBehavior: 'none',
        WebkitOverscrollBehavior: 'none',
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center transition-all duration-300"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance / 120,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: `rotate(${Math.min((pullDistance / 120) * 360, 360)}deg)`,
          }}
        />
      </div>

      {/* Main content */}
      {children}

      {/* Loading indicator at top */}
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
}