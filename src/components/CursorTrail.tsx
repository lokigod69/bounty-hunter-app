// src/components/CursorTrail.tsx
// Phase 6 Part B: Laser Cursor Trail component.
// Tracks mouse movement and creates fading cyan energy particles.
// Fix 1 (Phase 6 Round 2): Adjusted particle offset and z-index to appear behind cursor.

import React, { useEffect, useCallback } from 'react';

const CursorTrail: React.FC = () => {
  const createParticle = useCallback((x: number, y: number) => {
    const particle = document.createElement('div');
    particle.className = 'cursor-trail-particle'; // Defined in index.css
    // Offset the initial position to appear behind and slightly above the cursor point
    particle.style.left = `${x - 10}px`; // Offset left
    particle.style.top = `${y - 5}px`;   // Slight offset up
    particle.style.zIndex = '1'; // Set z-index to be behind most interactive elements

    document.body.appendChild(particle);

    // The CSS animation 'fade-out-trail' has 'forwards',
    // so it will stay at opacity: 0. We need to remove it after animation.
    particle.addEventListener('animationend', () => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    });
  }, []);

  useEffect(() => {
    let lastCallTime = 0;
    const throttleDelay = 25; // milliseconds, adjust for more/less dense trail

    const handleMouseMove = (event: MouseEvent) => {
      const now = performance.now();
      if (now - lastCallTime < throttleDelay) {
        return;
      }
      lastCallTime = now;
      // Pass raw clientX, clientY; offset is handled in createParticle
      createParticle(event.clientX, event.clientY); 
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [createParticle]);

  return null; // This component does not render anything itself
};

export default CursorTrail;
