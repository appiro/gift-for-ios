import UserPageClient from './UserPageClient';

export function generateStaticParams() { return [{ userId: '_' }]; }

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
  return <UserPageClient params={params} />;
}
