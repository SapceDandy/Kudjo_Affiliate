import { RoleGuard } from '@/lib/role-guard';

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["influencer"]}>{children}</RoleGuard>;
} 