import PusherServer from "pusher";
import Pusher from "pusher-js";

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Avoid "not a constructor" errors by using a more robust import check
const getPusherClient = () => {
    const P = (Pusher as any).default || Pusher;
    return new P(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
};

export const pusherClient = typeof window !== 'undefined' ? getPusherClient() : null;
