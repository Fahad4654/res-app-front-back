import { PrismaClient, Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

// Cache for permissions to avoid database hits on every request
const permissionCache = new Map<string, boolean>();
const CACHE_TTL = 60000; // 1 minute

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
}

/**
 * Check if a role has permission for a specific resource and action
 */
export async function hasPermission(
  role: Role,
  resource: string,
  action: string
): Promise<boolean> {
  const cacheKey = `${role}:${resource}:${action}`;
  
  // Check cache first
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }

  try {
    const permission = await prisma.permission.findUnique({
      where: {
        role_resource_action: {
          role,
          resource,
          action,
        },
      },
    });

    const allowed = permission?.allowed ?? false;
    
    // Cache the result
    permissionCache.set(cacheKey, allowed);
    setTimeout(() => permissionCache.delete(cacheKey), CACHE_TTL);

    return allowed;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Middleware to check if user has permission for a resource and action
 */
export function checkPermission(resource: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allowed = await hasPermission(req.user.role, resource, action);

    if (!allowed) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `You don't have permission to ${action} ${resource}` 
      });
    }

    next();
  };
}

/**
 * Clear the permission cache (useful after updating permissions)
 */
export function clearPermissionCache() {
  permissionCache.clear();
}
