# Tasker — Backend

Express.js + Socket.IO API server. All business logic, Prisma ORM, and real-time features live here.

## Setup

```bash
cd backend
cp .env.example .env
# Fill in your values in .env

npm install
npm run db:migrate   # run Prisma migrations
npm run db:seed      # seed categories
npm run dev          # start dev server on port 4000
```

## Structure

```
backend/
├── server.js          # HTTP + Socket.IO server entry point
├── src/
│   ├── app.js         # Express app, middleware, route mounting
│   ├── lib/
│   │   ├── auth.js        # JWT sign/verify, requireAuth middleware
│   │   ├── prisma.js      # Prisma client singleton
│   │   ├── mail.js        # Email helpers (nodemailer)
│   │   ├── notifications.js # In-app + Socket.IO notifications
│   │   ├── esewa.js       # eSewa payment helpers
│   │   ├── khalti.js      # Khalti payment helpers
│   │   ├── stripe.js      # Stripe client
│   │   ├── sms.js         # SMS (Sparrow SMS)
│   │   ├── platform.js    # Fee calculation
│   │   └── badges.js      # Badge definitions
│   └── routes/
│       ├── auth.js        # /api/auth/*
│       ├── register.js    # /api/register
│       ├── categories.js  # /api/categories
│       ├── tasks.js       # /api/tasks/*
│       ├── offers.js      # /api/offers/*
│       ├── notifications.js
│       ├── messages.js
│       ├── conversations.js
│       ├── friends.js
│       ├── reviews.js
│       ├── upload.js
│       ├── transactions.js
│       ├── user.js        # /api/user/*
│       ├── kyc.js
│       ├── tasker.js
│       ├── payments.js    # /api/payments/* (Stripe, eSewa, Khalti)
│       ├── admin.js       # /api/admin/*
│       ├── ai.js          # /api/ai/*
│       ├── mobile.js      # /api/mobile/*
│       ├── cron.js        # /api/cron/*
│       ├── setup-admin.js
│       └── test.js
└── prisma/
    └── schema.prisma
```

## Authentication

All protected routes require a `Bearer <token>` header.
Get a token by calling `POST /api/auth/login` or `POST /api/mobile/auth/login`.

## Environment Variables

See `.env.example` for all required variables.
