import UserPageClient from './UserPageClient';

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
  return <UserPageClient params={params} />;
}
