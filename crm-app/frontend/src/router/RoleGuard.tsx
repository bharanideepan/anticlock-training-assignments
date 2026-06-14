import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import type { RoleName } from '../shared/types/api.types';

interface RoleGuardProps {
  allowedRoles: RoleName[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role.name)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
