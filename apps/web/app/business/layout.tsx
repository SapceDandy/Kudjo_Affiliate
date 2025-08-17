import { RoleGuard } from '@/lib/role-guard';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="business">{children}</RoleGuard>;
} 