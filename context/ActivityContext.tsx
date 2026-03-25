import React, { createContext, useContext, ReactNode } from 'react';
import { useActivityTracker } from '../hooks/useActivityTracker';

type ActivityContextType = ReturnType<typeof useActivityTracker>;

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const activity = useActivityTracker();
  
  return (
    <ActivityContext.Provider value={activity}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
