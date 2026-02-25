"use client";

import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  institution: string | null;
  role: string;
  avatar?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          data.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || data.email)}&background=random`;
          setUser(data);
        } else {
          setError('Not authenticated');
          setUser(null);
        }
      } catch (err) {
        setError('Failed to fetch user');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading, error };
}
