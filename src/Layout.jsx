import React from 'react';

export default function Layout({ children, currentPageName }) {

    return (
        <div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap');

                * {
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