'use client';

import { RoleGuard } from '@/lib/role-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="admin">{children}</RoleGuard>;
} 