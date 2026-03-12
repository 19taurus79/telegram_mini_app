"use client";

import React, { createContext, useContext } from "react";
import { OrderComment } from "@/types/types";

interface CommentsContextType {
  commentsMap: Record<string, OrderComment[]>;
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
