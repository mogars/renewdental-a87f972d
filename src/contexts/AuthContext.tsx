import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiPost } from '@/services/api';
import type { AppRole } from '@/types/database';

interface User {
    id: string;
    email: string;
    displayName: string | null;
    role: AppRole;
    token: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
    isStaff: boolean;
    isDentist: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const data = await apiPost<User>('/users/login', { email, password });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff' || user?.role === 'admin';
    const isDentist = user?.role === 'dentist' || user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, isStaff, isDentist }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
