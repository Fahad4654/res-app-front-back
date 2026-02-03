import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, getToken, isTokenExpired, refreshAccessToken } from '../services/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const user = getCurrentUser();
    const token = getToken();

    useEffect(() => {
        const checkAuth = async () => {
            if (!user || !token) {
                setIsAuthenticated(false);
                return;
            }

            if (isTokenExpired(token)) {
                setIsRefreshing(true);
                const newToken = await refreshAccessToken();
                setIsRefreshing(false);
                setIsAuthenticated(!!newToken);
            } else {
                setIsAuthenticated(true);
            }
        };

        checkAuth();
    }, [user, token]);

    if (isAuthenticated === null || isRefreshing) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-accent)'
            }}>
                Verifying session...
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to a dashboard or home based on their actual role if they try to access a forbidden value
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user.role === 'KITCHEN_STAFF') return <Navigate to="/kitchen" replace />;
        if (user.role === 'DELIVERY_STAFF') return <Navigate to="/delivery" replace />;
        if (user.role === 'CUSTOMER_SUPPORT') return <Navigate to="/support" replace />;
        
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
