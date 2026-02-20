import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Request, Notice, Document } from '../types';
import { INITIAL_REQUESTS, INITIAL_NOTICES, INITIAL_DOCUMENTS } from '../mockData';

interface DataContextType {
  requests: Request[];
  notices: Notice[];
  documents: Document[];
  addRequest: (request: Request) => void;
  updateRequestStatus: (id: string, status: Request['status']) => void;
  addNotice: (notice: Notice) => void;
  markNoticeRead: (noticeId: string, userId: string) => void;
  addDocument: (doc: Document) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from LocalStorage if available, else Mock Data
  const [requests, setRequests] = useState<Request[]>(() => {
    const saved = localStorage.getItem('osprey_requests');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
  });

  const [notices, setNotices] = useState<Notice[]>(() => {
    const saved = localStorage.getItem('osprey_notices');
    return saved ? JSON.parse(saved) : INITIAL_NOTICES;
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('osprey_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  // Sync to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('osprey_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('osprey_notices', JSON.stringify(notices));
  }, [notices]);

  useEffect(() => {
    localStorage.setItem('osprey_documents', JSON.stringify(documents));
  }, [documents]);


  const addRequest = (request: Request) => {
    setRequests(prev => [request, ...prev]);
  };

  const updateRequestStatus = (id: string, status: Request['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const addNotice = (notice: Notice) => {
    setNotices(prev => [notice, ...prev]);
  };

  const markNoticeRead = (noticeId: string, userId: string) => {
    setNotices(prev => prev.map(n => {
      if (n.id === noticeId && !n.readBy.includes(userId)) {
        return { ...n, readBy: [...n.readBy, userId] };
      }
      return n;
    }));
  };

  const addDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
  };

  return (
    <DataContext.Provider value={{
      requests,
      notices,
      documents,
      addRequest,
      updateRequestStatus,
      addNotice,
      markNoticeRead,
      addDocument
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
