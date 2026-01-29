import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const user = getCurrentUser();

    if (!user) {
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
