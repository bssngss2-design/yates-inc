'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Load employee from localStorage on mount
  useEffect(() => {
    const savedEmployee = localStorage.getItem('yates-employee');
    if (savedEmployee) {
      setEmployee(JSON.parse(savedEmployee));
    }
  }, []);

  const login = async (id: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call server-side API route — password is compared on the server, never returned
      const res = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Employee data from server has NO password field
      const employeeData: Employee = {
        id: data.employee.id,
        name: data.employee.name,
        role: data.employee.role,
        bio: data.employee.bio,
        mail_handle: data.employee.mail_handle,
      };

      setEmployee(employeeData);
      localStorage.setItem('yates-employee', JSON.stringify(employeeData));

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'server' };
    }
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem('yates-employee');
  };

  const isLoggedIn = employee !== null;

  return (
    <AuthContext.Provider
      value={{
        employee,
        login,
        logout,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
