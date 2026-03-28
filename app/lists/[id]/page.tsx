import ListDetailClient from './ListDetailClient';

export function generateStaticParams() { return [{ id: '_' }]; }

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ListDetailClient params={params} />;
}
