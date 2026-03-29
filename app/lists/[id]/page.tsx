import ListDetailClient from './ListDetailClient';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ListDetailClient params={params} />;
}
