// Shared TypeScript types

export interface TaskWithUser {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: string | null;
  location: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    rating: number;
  };
  _count: {
    offers: number;
  };
}

export interface OfferWithUser {
  id: string;
  price: number;
  message: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    rating: number;
  };
}

export interface MessageWithSender {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
}
