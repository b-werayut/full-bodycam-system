/// <reference types="../../vite-env.d.ts" />
import { useCallback, useEffect, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

interface AnimatedMarkerProps {
  position: [number, number];
  icon: L.DivIcon;
  children?: React.ReactNode;
  isSelected?: boolean;
  animationDuration?: number;
  eventHandlers?: L.LeafletEventHandlerFnMap;
}

/**
 * AnimatedMarker - A Leaflet marker that smoothly animates to new positions
 * using requestAnimationFrame for smooth GPS-like movement.
 */
export function AnimatedMarker({ 
  position, 
  icon, 
  children, 
  isSelected = false,
  animationDuration = 1000,
  eventHandlers
}: AnimatedMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();
  const latitude = position[0];
  const longitude = position[1];
  
  // Current animated position (what's actually displayed)
  const [animatedPosition, setAnimatedPosition] = useState<[number, number]>(position);
  const animatedPositionRef = useRef<[number, number]>(position);
  
  // Animation state refs
  const animationRef = useRef<number | null>(null);
  const startPositionRef = useRef<[number, number]>(position);
  const targetPositionRef = useRef<[number, number]>(position);
  const startTimeRef = useRef<number>(0);
  const isFirstRenderRef = useRef(true);

  const updateAnimatedPosition = useCallback((nextPosition: [number, number]) => {
    animatedPositionRef.current = nextPosition;
    setAnimatedPosition(nextPosition);
  }, []);

  // Easing function for smooth animation (ease-out cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Linear interpolation
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t;
  };

  useEffect(() => {
    const nextPosition: [number, number] = [latitude, longitude];

    // Skip animation on first render
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      startPositionRef.current = nextPosition;
      targetPositionRef.current = nextPosition;
      return;
    }

    // Check if target position changed
    if (
      targetPositionRef.current[0] === latitude &&
      targetPositionRef.current[1] === longitude
    ) {
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Set up new animation
    startPositionRef.current = animatedPositionRef.current;
    targetPositionRef.current = nextPosition;
    startTimeRef.current = performance.now();

    // Calculate distance for adaptive duration
    const prevLatLng = L.latLng(startPositionRef.current);
    const newLatLng = L.latLng(nextPosition);
    const distance = prevLatLng.distanceTo(newLatLng);
    
    // Adaptive duration: 500ms minimum, scales with distance, max 2000ms
    const duration = Math.min(animationDuration * 2, Math.max(500, distance * 1.5));

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const newLat = lerp(
        startPositionRef.current[0],
        targetPositionRef.current[0],
        easedProgress
      );
      const newLng = lerp(
        startPositionRef.current[1],
        targetPositionRef.current[1],
        easedProgress
      );

      updateAnimatedPosition([newLat, newLng]);

      // Update marker position directly for smoother animation
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure final position is exact
        updateAnimatedPosition(targetPositionRef.current);
        if (markerRef.current) {
          markerRef.current.setLatLng(targetPositionRef.current);
        }
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // If selected, pan map to follow (smoothly)
    if (isSelected && distance > 50) {
      map.panTo(nextPosition, { animate: true, duration: duration / 1000 });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [latitude, longitude, isSelected, map, animationDuration, updateAnimatedPosition]);

  // Update icon when selection state changes
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setIcon(icon);
    }
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={animatedPosition}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
}

export default AnimatedMarker;
