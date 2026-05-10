"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, login: () => {}, logout: () => {}, refreshUser: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem("velora_token");
    if (!token) return;
    try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.error) setUser(data);
    } catch (e) {}
  };

  const login = (token: string, userData: any) => {
    localStorage.setItem("velora_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("velora_token");
    setUser(null);
    window.location.href = '/';
  };

  useEffect(() => {
    const token = localStorage.getItem("velora_token");
    if (token) {
        refreshUser().finally(() => setLoading(false));
    } else {
        setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
