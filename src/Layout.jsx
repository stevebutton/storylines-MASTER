import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogin = () => {
        base44.auth.redirectToLogin();
    };

    const handleLogout = () => {
        base44.auth.logout();
    };

    return (
        <div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

                h1, h2, h3, h4, h5, h6 {
                    font-family: 'Raleway', sans-serif;
                }

                .text-2xl {
                    font-size: 2rem;
                }
            `}</style>
            
            {children}
        </div>
    );
}