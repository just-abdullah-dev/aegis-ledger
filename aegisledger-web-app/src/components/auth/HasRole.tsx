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

  const roleMatches = roles && roles.length > 0 ? roles.includes(user.role) : true;
  const personaMatches = personas && personas.length > 0 ? personas.includes(user.persona as any) : true;

  if (roles && personas) {
    if (!roleMatches && !personaMatches) {
      return <>{fallback}</>;
    }
  } else if (!roleMatches || !personaMatches) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
