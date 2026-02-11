import React from 'react';

const SafeApp = () => {
    return (
        <div style={{ padding: 50, background: '#333', color: '#fff', height: '100vh' }}>
            <h1>Safe Mode Active</h1>
            <p>The application is running in safe mode because the backend is unreachable.</p>
        </div>
    );
};

export default SafeApp;
