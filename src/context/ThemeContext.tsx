import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  setIsDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('oddFeedDarkMode').then(val => {
      if (val === 'true') setIsDarkState(true);
    }).catch(() => {});
  }, []);

  const setIsDark = (v: boolean) => {
    setIsDarkState(v);
    AsyncStorage.setItem('oddFeedDarkMode', String(v)).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
