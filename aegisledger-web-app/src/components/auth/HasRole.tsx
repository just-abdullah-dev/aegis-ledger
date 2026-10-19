import React, { ReactNode } from 'react';
import { useAuthStore, UserRole } from '../../store/useAuthStore';
import { UserPersona } from '../../types/ledger';

interface HasRoleProps {
  roles?: UserRole[];
  personas?: UserPersona[];
  fallback?: ReactNode;
  children: ReactNode;
}

export const HasRole: React.FC<HasRoleProps> = ({
  roles,
  personas,
  fallback = null,
  children,
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role match
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return <>{fallback}</>;
    }
  }

  // Check persona match
  if (personas && personas.length > 0) {
    if (!personas.includes(user.persona)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
