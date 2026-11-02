'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SplashContextType {
  isSplashFinished: boolean;
  completeSplash: () => void;
}

const SplashContext = createContext<SplashContextType>({
  isSplashFinished: false,
  completeSplash: () => {},
});

export function SplashProvider({ children }: { children: ReactNode }) {
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  const completeSplash = () => {
    setIsSplashFinished(true);
  };

  return (
    <SplashContext.Provider value={{ isSplashFinished, completeSplash }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  return useContext(SplashContext);
}

