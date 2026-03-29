import ListEditClient from './ListEditClient';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ListEditClient params={params} />;
}
