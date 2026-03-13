import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import { AppThemeProvider } from './context/ThemeContext';
import AccessibilityPanel from './components/AccessibilityPanel';

import LoginPage from './pages/loginPage';
import UserPage from './pages/usersPage';
import SupportPage from './pages/supportsPage';
import EngineerPage from './pages/engineersPage';
import AdminPage from './pages/adminsPage';

import api from './api/axios';

interface User {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'support' | 'engineer' | 'admin';
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentUser = async () => {
        try {
            const res = await api.get('/auth/me');
            const userData = res.data?.data?.user || res.data?.user || res.data;
            setUser(userData);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCurrentUser(); }, []);

    const logout = async () => {
        try {
            await Promise.race([
                api.post('/auth/logout'),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 1000))
            ]);
        } catch {}
        setUser(null);
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress sx={{ color: '#2b4d7e' }} />
        </Box>
    );

    const isAdmin = user?.role === 'admin';

    return (
        <AppThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={
                        user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage onLoginSuccess={fetchCurrentUser} />
                    } />

                    <Route path="/user" element={
                        user ? <UserPage logout={logout} /> : <Navigate to="/login" replace />
                    } />

                    <Route path="/support" element={
                        user?.role === 'support' || isAdmin
                            ? <SupportPage logout={logout} />
                            : <Navigate to="/login" replace />
                    } />

                    <Route path="/engineer" element={
                        user?.role === 'engineer' || isAdmin
                            ? <EngineerPage logout={logout} />
                            : <Navigate to="/login" replace />
                    } />

                    <Route path="/admin" element={
                        isAdmin ? <AdminPage logout={logout} /> : <Navigate to="/login" replace />
                    } />

                    <Route path="*" element={
                        <Navigate to={user ? `/${user.role}` : '/login'} replace />
                    } />
                </Routes>

                {/* Floating accessibility panel — visible on all pages */}
                <AccessibilityPanel />
            </BrowserRouter>
        </AppThemeProvider>
    );
};

export default App;
