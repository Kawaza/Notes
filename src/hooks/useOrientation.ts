import { useEffect, useState } from 'react';

export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(orientation: landscape)').matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape)');
    const onChange = () => setIsLandscape(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isLandscape;
}

/** Phones / tablets (touch-first), not desktop with mouse. */
export function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const onChange = () => setIsCoarse(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isCoarse;
}
