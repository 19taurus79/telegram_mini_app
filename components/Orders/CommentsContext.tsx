"use client";

import React, { createContext, useContext } from "react";

interface CommentsContextType {
  commentsMap: Record<string, any[]>;
  isLoading: boolean;
  isFetched: boolean;
}

const CommentsContext = createContext<CommentsContextType>({
  commentsMap: {},
  isLoading: false,
  isFetched: false,
});

export const CommentsProvider = ({ 
  children, 
  value 
}: { 
  children: React.ReactNode; 
  value: CommentsContextType 
}) => {
  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
};

export const useCommentsContext = () => useContext(CommentsContext);
