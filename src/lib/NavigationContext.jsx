import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [stacks, setStacks] = useState({
    app: ['/home'],
    producer: ['/produttore'],
    staff: ['/staff'],
  });

  const pushRoute = useCallback((section, path) => {
    setStacks(prev => ({
      ...prev,
      [section]: [...prev[section], path],
    }));
  }, []);

  const popRoute = useCallback((section) => {
    setStacks(prev => ({
      ...prev,
      [section]: prev[section].length > 1 ? prev[section].slice(0, -1) : prev[section],
    }));
  }, []);

  const resetStack = useCallback((section) => {
    const roots = { app: '/home', producer: '/produttore', staff: '/staff' };
    setStacks(prev => ({
      ...prev,
      [section]: [roots[section]],
    }));
  }, []);

  return (
    <NavigationContext.Provider value={{ stacks, pushRoute, popRoute, resetStack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}