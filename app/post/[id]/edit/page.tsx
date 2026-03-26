import { use } from 'react';
import ReviewForm from '@/components/ReviewForm';

export default function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReviewForm mode="edit" reviewId={id} />;
}
