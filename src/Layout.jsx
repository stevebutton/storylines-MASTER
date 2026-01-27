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

                h1, h2, h3, h4, h5, h6 {
                    font-family: 'Raleway', sans-serif;
                }

                .text-2xl {
                    font-size: 2rem;
                }
            `}</style>
            
            {/* Global Auth Bar */}
            <div className="fixed top-0 right-0 z-50 p-4">
                {!isLoading && (
                    user ? (
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-600" />
                                <span className="text-sm text-slate-700">{user.email}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleLogin}
                            className="bg-amber-600 hover:bg-amber-700 gap-2 shadow-lg"
                        >
                            <LogIn className="w-4 h-4" />
                            Login
                        </Button>
                    )
                )}
            </div>

            {children}
        </div>
    );
}