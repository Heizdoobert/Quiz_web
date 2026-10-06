import { useState, useEffect, RefObject } from 'react';

export function useIntersectionObserver(
  elementRef: RefObject<Element | null>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  
  const root = options.root ?? null;
  const rootMargin = options.rootMargin ?? '0px';
  const threshold = options.threshold ?? 0.1;

  useEffect(() => {
    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { root, rootMargin, threshold });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, root, rootMargin, threshold]);

  return isVisible;
}
