import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        roles: string[];
      };
    }
  }
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verifier.verify(token);
    
    // Extract user info from token
    req.user = {
      sub: payload.sub,
      email: payload.email as string || '',
      roles: (payload['cognito:groups'] as string[]) || [],
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    
    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
