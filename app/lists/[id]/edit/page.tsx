import ListEditClient from './ListEditClient';

export function generateStaticParams() { return [{ id: '_' }]; }

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ListEditClient params={params} />;
}
