import { useState, useEffect } from 'react';

export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isDesktop;
}
