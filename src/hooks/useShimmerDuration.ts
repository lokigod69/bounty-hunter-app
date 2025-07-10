// src/hooks/useShimmerDuration.ts
// Smart shimmer duration calculation hook for proportional animations
// Calculates optimal animation duration based on content length and visual width

import { useEffect, useState, useRef } from 'react';

interface ShimmerConfig {
  minDuration?: number;
  maxDuration?: number;
  baseSpeed?: number; // pixels per second
  contentPadding?: number;
}

const DEFAULT_CONFIG: Required<ShimmerConfig> = {
  minDuration: 4,    // Minimum 4 seconds for very short content
  maxDuration: 12,   // Maximum 12 seconds for very long content
  baseSpeed: 150,    // Base shimmer speed in pixels per second
  contentPadding: 20 // Extra padding for shimmer sweep
};

export function useShimmerDuration(
  content: string | number,
  config: ShimmerConfig = {}
): {
  duration: number;
  setElementRef: (element: HTMLElement | null) => void;
  shimmerStyle: React.CSSProperties;
} {
  const [duration, setDuration] = useState(DEFAULT_CONFIG.minDuration);
  const [elementWidth, setElementWidth] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const setElementRef = (element: HTMLElement | null) => {
    elementRef.current = element;
  };

  useEffect(() => {
    const calculateDuration = () => {
      const contentString = String(content);
      const contentLength = contentString.length;
      
      // Get actual element width if available
      let actualWidth = elementWidth;
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        actualWidth = rect.width;
        setElementWidth(actualWidth);
      }

      // Calculate duration based on content characteristics
      let calculatedDuration: number;

      if (actualWidth > 0) {
        // Use actual measured width for precise calculation
        const totalSweepDistance = actualWidth + finalConfig.contentPadding;
        calculatedDuration = totalSweepDistance / finalConfig.baseSpeed;
      } else {
        // Fallback to content-length-based calculation
        if (contentLength <= 2) {
          // Very short content (1-2 chars): slowest animation
          calculatedDuration = finalConfig.maxDuration;
        } else if (contentLength <= 4) {
          // Short content (3-4 chars): slower animation
          calculatedDuration = finalConfig.maxDuration * 0.8;
        } else if (contentLength <= 8) {
          // Medium content (5-8 chars): medium animation
          calculatedDuration = finalConfig.maxDuration * 0.6;
        } else {
          // Long content (9+ chars): faster animation
          calculatedDuration = finalConfig.maxDuration * 0.4;
        }
      }

      // Apply min/max constraints
      calculatedDuration = Math.max(
        finalConfig.minDuration,
        Math.min(finalConfig.maxDuration, calculatedDuration)
      );

      setDuration(calculatedDuration);
    };

    calculateDuration();

    // Recalculate if element size changes
    const resizeObserver = new ResizeObserver(() => {
      calculateDuration();
    });

    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [content, elementWidth, finalConfig.minDuration, finalConfig.maxDuration, finalConfig.baseSpeed, finalConfig.contentPadding]);

  // Create shimmer style with dynamic duration
  const shimmerStyle: React.CSSProperties = {
    '--shimmer-duration': `${duration}s`,
    animationDuration: `${duration}s`,
  } as React.CSSProperties;

  return {
    duration,
    setElementRef,
    shimmerStyle,
  };
}

// Specialized hook for credit displays
export function useCreditShimmerDuration(amount: number) {
  return useShimmerDuration(amount, {
    minDuration: 6,    // Slower for credits to feel more premium
    maxDuration: 14,   // Even slower for single digits
    baseSpeed: 120,    // Slower base speed for credits
    contentPadding: 30 // More padding for credit displays
  });
}

// Specialized hook for reward text
export function useRewardShimmerDuration(rewardText: string) {
  return useShimmerDuration(rewardText, {
    minDuration: 5,    // Moderate speed for rewards
    maxDuration: 10,   // Reasonable max for text
    baseSpeed: 140,    // Standard speed for text
    contentPadding: 25 // Standard padding
  });
} 