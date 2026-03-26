export interface Review {
  id: string;
  title: string;
  productName: string;
  price: string;
  imageUrl: string;
  images: string[];
  episode: string;
  likes: number;
  wantCount: number;
  giftCount: number;
  gender: string;
  ageGroup: string;
  relationship: string[];
  scene: string[];
  category: string[];
  authorId?: string;
  authorName: string;
  authorIcon: string;
  createdAt: string;
  productUrl?: string;
  amazonUrl?: string;
  rakutenUrl?: string;
  rakutenImageUrl?: string;
  rakutenItemName?: string;
  rakutenItemPrice?: number;
  referencePrice?: string;
}

export type CreateReviewInput = Omit<
  Review,
  'id' | 'createdAt' | 'likes' | 'wantCount' | 'giftCount'
>;

export interface LikeRequest {
  type: 'want' | 'gift';
}
