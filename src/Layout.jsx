import React from 'react';

export default function Layout({ children, currentPageName }) {
    return (
        <div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
                
                h1, h2, h3, h4, h5, h6 {
                    font-family: 'Raleway', sans-serif;
                }
            `}</style>
            {children}
        </div>
    );
}