import { Suspense } from 'react';
import PostDetailClient from './PostDetailClient';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <PostDetailClient params={params} />
    </Suspense>
  );
}
