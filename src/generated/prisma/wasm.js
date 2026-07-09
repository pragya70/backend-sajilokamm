
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  passwordHash: 'passwordHash',
  role: 'role',
  bio: 'bio',
  coverImage: 'coverImage',
  rating: 'rating',
  reviewCount: 'reviewCount',
  phoneNumber: 'phoneNumber',
  isPhoneVerified: 'isPhoneVerified',
  verificationStatus: 'verificationStatus',
  kycDocumentUrl: 'kycDocumentUrl',
  kycFullName: 'kycFullName',
  kycDocumentType: 'kycDocumentType',
  kycDocumentNumber: 'kycDocumentNumber',
  kycDob: 'kycDob',
  selectedCategories: 'selectedCategories',
  badges: 'badges',
  lastPostDate: 'lastPostDate',
  postsTodayCount: 'postsTodayCount',
  khaltiPhone: 'khaltiPhone',
  khaltiAccountName: 'khaltiAccountName',
  bankName: 'bankName',
  bankAccountNumber: 'bankAccountNumber',
  bankAccountName: 'bankAccountName',
  stripeCustomerId: 'stripeCustomerId',
  stripeAccountId: 'stripeAccountId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  requirements: 'requirements',
  budget: 'budget',
  location: 'location',
  latitude: 'latitude',
  longitude: 'longitude',
  dueDate: 'dueDate',
  status: 'status',
  category: 'category',
  subCategory: 'subCategory',
  images: 'images',
  completionProofImages: 'completionProofImages',
  validityPeriod: 'validityPeriod',
  disputeStatus: 'disputeStatus',
  categoryId: 'categoryId',
  subCategoryId: 'subCategoryId',
  validityPeriod_new: 'validityPeriod_new',
  disputeStatus_new: 'disputeStatus_new',
  completionApprovedByPoster: 'completionApprovedByPoster',
  completionApprovedByTasker: 'completionApprovedByTasker',
  expiresAt: 'expiresAt',
  expiryReminderSent: 'expiryReminderSent',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  cancelledBy: 'cancelledBy',
  cancelReason: 'cancelReason',
  cancelledAt: 'cancelledAt',
  disputeOpenedBy: 'disputeOpenedBy',
  disputeReason: 'disputeReason',
  disputeOpenedAt: 'disputeOpenedAt',
  userId: 'userId',
  stripePaymentIntentId: 'stripePaymentIntentId',
  esewaRefId: 'esewaRefId',
  khaltiPidx: 'khaltiPidx',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaskImageScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  url: 'url',
  type: 'type',
  order: 'order',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  image: 'image',
  icon: 'icon',
  featuredBackground: 'featuredBackground',
  status: 'status',
  promoted: 'promoted',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BadgeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  icon: 'icon',
  createdAt: 'createdAt'
};

exports.Prisma.UserBadgeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  badgeId: 'badgeId',
  earnedAt: 'earnedAt'
};

exports.Prisma.UserCategoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  categoryId: 'categoryId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.OfferScalarFieldEnum = {
  id: 'id',
  price: 'price',
  message: 'message',
  status: 'status',
  taskId: 'taskId',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  posterId: 'posterId',
  taskerId: 'taskerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  content: 'content',
  imageUrl: 'imageUrl',
  conversationId: 'conversationId',
  senderId: 'senderId',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  rating: 'rating',
  comment: 'comment',
  taskId: 'taskId',
  giverId: 'giverId',
  receiverId: 'receiverId',
  createdAt: 'createdAt'
};

exports.Prisma.FriendshipScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  content: 'content',
  taskId: 'taskId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  data: 'data',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  posterId: 'posterId',
  taskerId: 'taskerId',
  amount: 'amount',
  platformFee: 'platformFee',
  taskerPayout: 'taskerPayout',
  status: 'status',
  type: 'type',
  method: 'method',
  esewaRefId: 'esewaRefId',
  khaltiPidx: 'khaltiPidx',
  stripePaymentIntentId: 'stripePaymentIntentId',
  proofImages: 'proofImages',
  completionNotes: 'completionNotes',
  timeSpentHours: 'timeSpentHours',
  timeSpentMinutes: 'timeSpentMinutes',
  completionDate: 'completionDate',
  submittedAt: 'submittedAt',
  releasedAt: 'releasedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayoutScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  taskerId: 'taskerId',
  amount: 'amount',
  method: 'method',
  status: 'status',
  khaltiPhone: 'khaltiPhone',
  khaltiTxnId: 'khaltiTxnId',
  esewaRefId: 'esewaRefId',
  stripeTransferId: 'stripeTransferId',
  initiatedAt: 'initiatedAt',
  processedAt: 'processedAt',
  completedAt: 'completedAt',
  failureReason: 'failureReason',
  notes: 'notes',
  processedBy: 'processedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  POSTER: 'POSTER',
  TASKER: 'TASKER',
  ADMIN: 'ADMIN'
};

exports.VerificationStatus = exports.$Enums.VerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

exports.ValidityPeriod = exports.$Enums.ValidityPeriod = {
  ONE_WEEK: 'ONE_WEEK',
  TWO_WEEKS: 'TWO_WEEKS',
  ONE_MONTH: 'ONE_MONTH',
  TWO_MONTHS: 'TWO_MONTHS',
  THREE_MONTHS: 'THREE_MONTHS'
};

exports.DisputeStatus = exports.$Enums.DisputeStatus = {
  OPEN: 'OPEN',
  RESOLVED_POSTER: 'RESOLVED_POSTER',
  RESOLVED_TASKER: 'RESOLVED_TASKER',
  CANCELLED: 'CANCELLED'
};

exports.ImageType = exports.$Enums.ImageType = {
  GALLERY: 'GALLERY',
  COMPLETION_PROOF: 'COMPLETION_PROOF'
};

exports.OfferStatus = exports.$Enums.OfferStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

exports.FriendshipStatus = exports.$Enums.FriendshipStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  BLOCKED: 'BLOCKED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  FRIEND_REQUEST: 'FRIEND_REQUEST',
  FRIEND_ACCEPT: 'FRIEND_ACCEPT',
  NEW_COMMENT: 'NEW_COMMENT',
  NEW_OFFER: 'NEW_OFFER',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  TASK_ALERT: 'TASK_ALERT',
  TASK_CANCELLED: 'TASK_CANCELLED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  DISPUTE_RESOLVED: 'DISPUTE_RESOLVED',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  TASK_FLAGGED: 'TASK_FLAGGED',
  TASK_POSTED: 'TASK_POSTED',
  USER_REPORTED: 'USER_REPORTED',
  PAYMENT_ISSUE: 'PAYMENT_ISSUE',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  OFFER_RECEIVED: 'OFFER_RECEIVED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_STARTED: 'TASK_STARTED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  PAYMENT_RELEASED: 'PAYMENT_RELEASED',
  TASK_DEADLINE: 'TASK_DEADLINE',
  PROFILE_VIEWED: 'PROFILE_VIEWED'
};

exports.TransactionStatus = exports.$Enums.TransactionStatus = {
  PENDING: 'PENDING',
  ESCROW_HELD: 'ESCROW_HELD',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  ESEWA: 'ESEWA',
  KHALTI: 'KHALTI',
  STRIPE: 'STRIPE',
  CASH: 'CASH'
};

exports.PayoutStatus = exports.$Enums.PayoutStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Task: 'Task',
  TaskImage: 'TaskImage',
  Category: 'Category',
  SubCategory: 'SubCategory',
  Badge: 'Badge',
  UserBadge: 'UserBadge',
  UserCategory: 'UserCategory',
  AuditLog: 'AuditLog',
  VerificationToken: 'VerificationToken',
  Offer: 'Offer',
  Conversation: 'Conversation',
  Message: 'Message',
  Review: 'Review',
  Friendship: 'Friendship',
  Comment: 'Comment',
  Notification: 'Notification',
  Transaction: 'Transaction',
  Payout: 'Payout'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "e:\\production\\backend\\src\\generated\\prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "e:\\production\\backend\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": true,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// Step 1: Add new tables and columns WITHOUT removing old ones\n// This allows us to migrate data safely\n\ngenerator client {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n  output          = \"../src/generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// ─── Existing Enums ──────────────────────────────────────\n\nenum Role {\n  POSTER\n  TASKER\n  ADMIN\n}\n\nenum TaskStatus {\n  PENDING_APPROVAL\n  OPEN\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n  REJECTED\n}\n\nenum OfferStatus {\n  PENDING\n  ACCEPTED\n  REJECTED\n}\n\nenum VerificationStatus {\n  UNVERIFIED\n  PENDING\n  VERIFIED\n  REJECTED\n}\n\nenum FriendshipStatus {\n  PENDING\n  ACCEPTED\n  BLOCKED\n}\n\nenum NotificationType {\n  FRIEND_REQUEST\n  FRIEND_ACCEPT\n  NEW_COMMENT\n  NEW_OFFER\n  OFFER_ACCEPTED\n  NEW_MESSAGE\n  TASK_ALERT\n  TASK_CANCELLED\n  DISPUTE_OPENED\n  DISPUTE_RESOLVED\n  // Admin notifications\n  KYC_SUBMITTED\n  KYC_APPROVED\n  KYC_REJECTED\n  TASK_FLAGGED\n  TASK_POSTED\n  USER_REPORTED\n  PAYMENT_ISSUE\n  SYSTEM_ALERT\n  // Poster notifications\n  OFFER_RECEIVED\n  TASK_COMPLETED\n  TASK_STARTED\n  PAYMENT_RECEIVED\n  REVIEW_RECEIVED\n  // Tasker notifications\n  TASK_ASSIGNED\n  PAYMENT_RELEASED\n  TASK_DEADLINE\n  PROFILE_VIEWED\n}\n\n// ─── New Enums ───────────────────────────────────────────\n\nenum DisputeStatus {\n  OPEN\n  RESOLVED_POSTER\n  RESOLVED_TASKER\n  CANCELLED\n}\n\nenum PaymentMethod {\n  ESEWA\n  KHALTI\n  STRIPE\n  CASH\n}\n\nenum TransactionStatus {\n  PENDING\n  ESCROW_HELD\n  RELEASED\n  REFUNDED\n  CANCELLED\n}\n\nenum ValidityPeriod {\n  ONE_WEEK\n  TWO_WEEKS\n  ONE_MONTH\n  TWO_MONTHS\n  THREE_MONTHS\n}\n\nenum ImageType {\n  GALLERY\n  COMPLETION_PROOF\n}\n\n// ─── Models ──────────────────────────────────────────────\n\nmodel User {\n  id            String    @id @default(uuid())\n  name          String\n  email         String    @unique\n  emailVerified DateTime?\n  image         String?\n  passwordHash  String?\n  role          Role      @default(POSTER)\n  bio           String?\n  coverImage    String?\n  rating        Float     @default(0)\n  reviewCount   Int       @default(0)\n\n  // Verification & KYC\n  phoneNumber        String?            @unique\n  isPhoneVerified    Boolean            @default(false)\n  verificationStatus VerificationStatus @default(UNVERIFIED)\n  kycDocumentUrl     String?\n  kycFullName        String?\n  kycDocumentType    String?\n  kycDocumentNumber  String?\n  kycDob             DateTime?\n\n  // OLD - Keep for now\n  selectedCategories String[]\n  badges             String[]\n\n  // Limits\n  lastPostDate    DateTime?\n  postsTodayCount Int       @default(0)\n\n  // Relations\n  tasks                  Task[]\n  offers                 Offer[]\n  sentMessages           Message[]\n  reviewsGiven           Review[]       @relation(\"ReviewGiver\")\n  reviewsGot             Review[]       @relation(\"ReviewReceiver\")\n  sentFriendRequests     Friendship[]   @relation(\"FriendSender\")\n  receivedFriendRequests Friendship[]   @relation(\"FriendReceiver\")\n  conversationsAsPoster  Conversation[] @relation(\"ConversationPoster\")\n  conversationsAsTasker  Conversation[] @relation(\"ConversationTasker\")\n  comments               Comment[]\n  notifications          Notification[]\n  transactionsAsPoster   Transaction[]  @relation(\"TransactionPoster\")\n  transactionsAsTasker   Transaction[]  @relation(\"TransactionTasker\")\n\n  // NEW - Normalized relations\n  userBadges     UserBadge[]\n  userCategories UserCategory[]\n  auditLogs      AuditLog[]\n\n  // Payment Details (for receiving payouts)\n  khaltiPhone       String?\n  khaltiAccountName String?\n  bankName          String?\n  bankAccountNumber String?\n  bankAccountName   String?\n\n  // Stripe\n  stripeCustomerId String? @unique\n  stripeAccountId  String? @unique\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([email])\n  @@index([role])\n  @@index([verificationStatus])\n  @@index([createdAt])\n}\n\nmodel Task {\n  id           String     @id @default(uuid())\n  title        String\n  description  String\n  requirements String?    @db.Text\n  budget       Float\n  location     String?\n  latitude     Float?\n  longitude    Float?\n  dueDate      DateTime?\n  status       TaskStatus @default(PENDING_APPROVAL)\n\n  // OLD - Keep for now\n  category              String?\n  subCategory           String?\n  images                String[]\n  completionProofImages String[]\n  validityPeriod        String?\n  disputeStatus         String?\n\n  // NEW - Normalized references\n  categoryId         String?\n  category_new       Category?       @relation(fields: [categoryId], references: [id])\n  subCategoryId      String?\n  subCategory_new    SubCategory?    @relation(fields: [subCategoryId], references: [id])\n  validityPeriod_new ValidityPeriod?\n  disputeStatus_new  DisputeStatus?\n\n  // Dual Approval Flow\n  completionApprovedByPoster Boolean @default(false)\n  completionApprovedByTasker Boolean @default(false)\n\n  // Validity\n  expiresAt          DateTime?\n  expiryReminderSent Boolean   @default(false)\n\n  // Soft Delete\n  isDeleted Boolean   @default(false)\n  deletedAt DateTime?\n\n  // Cancellation\n  cancelledBy  String?\n  cancelReason String?\n  cancelledAt  DateTime?\n\n  // Dispute\n  disputeOpenedBy String?\n  disputeReason   String?\n  disputeOpenedAt DateTime?\n\n  // Relations\n  userId        String\n  user          User           @relation(fields: [userId], references: [id])\n  offers        Offer[]\n  conversations Conversation[]\n  reviews       Review[]\n  comments      Comment[]\n  transactions  Transaction[]\n  images_new    TaskImage[]\n\n  // Payment\n  stripePaymentIntentId String?\n  esewaRefId            String?\n  khaltiPidx            String?\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([userId])\n  @@index([status])\n  @@index([categoryId])\n  @@index([subCategoryId])\n  @@index([createdAt])\n  @@index([isDeleted])\n  @@index([expiresAt])\n}\n\n// ─── New Tables ──────────────────────────────────────────\n\nmodel TaskImage {\n  id        String    @id @default(uuid())\n  taskId    String\n  task      Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)\n  url       String\n  type      ImageType @default(GALLERY)\n  order     Int       @default(0)\n  isPrimary Boolean   @default(false)\n  createdAt DateTime  @default(now())\n\n  @@index([taskId])\n  @@index([taskId, type])\n}\n\nmodel Category {\n  id                 String         @id @default(uuid())\n  name               String         @unique\n  slug               String?        @unique\n  description        String?\n  image              String?\n  icon               String?\n  featuredBackground String?\n  status             Boolean        @default(true)\n  promoted           Boolean        @default(false)\n  metaTitle          String?\n  metaDescription    String?\n  subCategories      SubCategory[]\n  tasks              Task[]\n  userCategories     UserCategory[]\n  createdAt          DateTime       @default(now())\n  updatedAt          DateTime       @default(now()) @updatedAt\n\n  @@index([name])\n  @@index([slug])\n  @@index([status])\n  @@index([promoted])\n}\n\nmodel SubCategory {\n  id          String   @id @default(uuid())\n  name        String\n  description String?\n  status      Boolean  @default(true)\n  categoryId  String\n  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)\n  tasks       Task[]\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @default(now()) @updatedAt\n\n  @@unique([name, categoryId])\n  @@index([categoryId])\n  @@index([status])\n}\n\nmodel Badge {\n  id          String      @id @default(uuid())\n  code        String      @unique\n  name        String\n  description String?\n  icon        String?\n  createdAt   DateTime    @default(now())\n  userBadges  UserBadge[]\n\n  @@index([code])\n}\n\nmodel UserBadge {\n  id       String   @id @default(uuid())\n  userId   String\n  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  badgeId  String\n  badge    Badge    @relation(fields: [badgeId], references: [id])\n  earnedAt DateTime @default(now())\n\n  @@unique([userId, badgeId])\n  @@index([userId])\n  @@index([badgeId])\n}\n\nmodel UserCategory {\n  id         String   @id @default(uuid())\n  userId     String\n  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  categoryId String\n  category   Category @relation(fields: [categoryId], references: [id])\n  createdAt  DateTime @default(now())\n\n  @@unique([userId, categoryId])\n  @@index([userId])\n  @@index([categoryId])\n}\n\nmodel AuditLog {\n  id         String   @id @default(uuid())\n  userId     String?\n  user       User?    @relation(fields: [userId], references: [id])\n  action     String\n  entityType String?\n  entityId   String?\n  details    Json?\n  ipAddress  String?\n  userAgent  String?\n  createdAt  DateTime @default(now())\n\n  @@index([userId])\n  @@index([action])\n  @@index([createdAt])\n  @@index([entityType, entityId])\n}\n\n// ─── Existing Tables (unchanged) ─────────────────────────\n\nmodel VerificationToken {\n  id      String   @id @default(uuid())\n  email   String?  @unique\n  phone   String?  @unique\n  token   String   @unique\n  expires DateTime\n\n  @@index([token])\n  @@index([expires])\n}\n\nmodel Offer {\n  id        String      @id @default(uuid())\n  price     Float\n  message   String\n  status    OfferStatus @default(PENDING)\n  taskId    String\n  task      Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)\n  userId    String\n  user      User        @relation(fields: [userId], references: [id])\n  createdAt DateTime    @default(now())\n  updatedAt DateTime    @updatedAt\n\n  @@unique([taskId, userId])\n  @@index([taskId])\n  @@index([userId])\n  @@index([status])\n  @@index([createdAt])\n}\n\nmodel Conversation {\n  id        String    @id @default(uuid())\n  taskId    String?\n  task      Task?     @relation(fields: [taskId], references: [id])\n  posterId  String\n  poster    User      @relation(\"ConversationPoster\", fields: [posterId], references: [id])\n  taskerId  String\n  tasker    User      @relation(\"ConversationTasker\", fields: [taskerId], references: [id])\n  messages  Message[]\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n\n  @@index([taskId])\n  @@index([posterId])\n  @@index([taskerId])\n}\n\nmodel Message {\n  id             String       @id @default(uuid())\n  content        String\n  imageUrl       String?\n  conversationId String\n  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n  senderId       String\n  sender         User         @relation(fields: [senderId], references: [id])\n  isRead         Boolean      @default(false)\n  createdAt      DateTime     @default(now())\n\n  @@index([conversationId])\n  @@index([senderId])\n  @@index([isRead])\n  @@index([createdAt])\n}\n\nmodel Review {\n  id         String   @id @default(uuid())\n  rating     Int\n  comment    String?\n  taskId     String\n  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)\n  giverId    String\n  giver      User     @relation(\"ReviewGiver\", fields: [giverId], references: [id])\n  receiverId String\n  receiver   User     @relation(\"ReviewReceiver\", fields: [receiverId], references: [id])\n  createdAt  DateTime @default(now())\n\n  @@unique([taskId, giverId])\n  @@index([taskId])\n  @@index([giverId])\n  @@index([receiverId])\n}\n\nmodel Friendship {\n  id         String           @id @default(uuid())\n  senderId   String\n  sender     User             @relation(\"FriendSender\", fields: [senderId], references: [id])\n  receiverId String\n  receiver   User             @relation(\"FriendReceiver\", fields: [receiverId], references: [id])\n  status     FriendshipStatus @default(PENDING)\n  createdAt  DateTime         @default(now())\n  updatedAt  DateTime         @updatedAt\n\n  @@unique([senderId, receiverId])\n  @@index([senderId])\n  @@index([receiverId])\n  @@index([status])\n}\n\nmodel Comment {\n  id        String   @id @default(uuid())\n  content   String\n  taskId    String\n  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)\n  userId    String\n  user      User     @relation(fields: [userId], references: [id])\n  createdAt DateTime @default(now())\n\n  @@index([taskId])\n  @@index([userId])\n  @@index([createdAt])\n}\n\nmodel Notification {\n  id        String           @id @default(uuid())\n  userId    String\n  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)\n  type      NotificationType\n  title     String\n  message   String\n  data      Json?\n  read      Boolean          @default(false)\n  createdAt DateTime         @default(now())\n\n  @@index([userId])\n  @@index([read])\n  @@index([createdAt])\n}\n\nmodel Transaction {\n  id                    String            @id @default(uuid())\n  taskId                String\n  task                  Task              @relation(fields: [taskId], references: [id])\n  posterId              String\n  poster                User              @relation(\"TransactionPoster\", fields: [posterId], references: [id])\n  taskerId              String\n  tasker                User              @relation(\"TransactionTasker\", fields: [taskerId], references: [id])\n  amount                Float\n  platformFee           Float             @default(0)\n  taskerPayout          Float             @default(0)\n  status                TransactionStatus @default(PENDING)\n  type                  String            @default(\"TASK_PAYMENT\")\n  method                String?\n  esewaRefId            String?\n  khaltiPidx            String?\n  stripePaymentIntentId String?\n\n  // Completion tracking\n  proofImages      String[]\n  completionNotes  String?   @db.Text\n  timeSpentHours   Int?\n  timeSpentMinutes Int?\n  completionDate   DateTime?\n  submittedAt      DateTime?\n  releasedAt       DateTime?\n\n  // Payout tracking\n  payouts Payout[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @default(now()) @updatedAt\n\n  @@index([taskId])\n  @@index([posterId])\n  @@index([taskerId])\n  @@index([status])\n  @@index([createdAt])\n}\n\nenum PayoutStatus {\n  PENDING\n  PROCESSING\n  COMPLETED\n  FAILED\n  CANCELLED\n}\n\nmodel Payout {\n  id            String        @id @default(uuid())\n  transactionId String\n  transaction   Transaction   @relation(fields: [transactionId], references: [id])\n  taskerId      String\n  amount        Float\n  method        PaymentMethod @default(KHALTI)\n  status        PayoutStatus  @default(PENDING)\n\n  // Payment gateway details\n  khaltiPhone      String?\n  khaltiTxnId      String?\n  esewaRefId       String?\n  stripeTransferId String?\n\n  // Tracking\n  initiatedAt   DateTime  @default(now())\n  processedAt   DateTime?\n  completedAt   DateTime?\n  failureReason String?\n\n  // Admin notes\n  notes       String? @db.Text\n  processedBy String?\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([transactionId])\n  @@index([taskerId])\n  @@index([status])\n  @@index([createdAt])\n}\n",
  "inlineSchemaHash": "6d3e43360d6ebde6c5004927a6839e623429be44838317d4556c4b91f041812e",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"emailVerified\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"image\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"Role\"},{\"name\":\"bio\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"coverImage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"reviewCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"phoneNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isPhoneVerified\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"verificationStatus\",\"kind\":\"enum\",\"type\":\"VerificationStatus\"},{\"name\":\"kycDocumentUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kycFullName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kycDocumentType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kycDocumentNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"kycDob\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"selectedCategories\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"badges\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastPostDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"postsTodayCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"tasks\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"TaskToUser\"},{\"name\":\"offers\",\"kind\":\"object\",\"type\":\"Offer\",\"relationName\":\"OfferToUser\"},{\"name\":\"sentMessages\",\"kind\":\"object\",\"type\":\"Message\",\"relationName\":\"MessageToUser\"},{\"name\":\"reviewsGiven\",\"kind\":\"object\",\"type\":\"Review\",\"relationName\":\"ReviewGiver\"},{\"name\":\"reviewsGot\",\"kind\":\"object\",\"type\":\"Review\",\"relationName\":\"ReviewReceiver\"},{\"name\":\"sentFriendRequests\",\"kind\":\"object\",\"type\":\"Friendship\",\"relationName\":\"FriendSender\"},{\"name\":\"receivedFriendRequests\",\"kind\":\"object\",\"type\":\"Friendship\",\"relationName\":\"FriendReceiver\"},{\"name\":\"conversationsAsPoster\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationPoster\"},{\"name\":\"conversationsAsTasker\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationTasker\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"Comment\",\"relationName\":\"CommentToUser\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"Notification\",\"relationName\":\"NotificationToUser\"},{\"name\":\"transactionsAsPoster\",\"kind\":\"object\",\"type\":\"Transaction\",\"relationName\":\"TransactionPoster\"},{\"name\":\"transactionsAsTasker\",\"kind\":\"object\",\"type\":\"Transaction\",\"relationName\":\"TransactionTasker\"},{\"name\":\"userBadges\",\"kind\":\"object\",\"type\":\"UserBadge\",\"relationName\":\"UserToUserBadge\"},{\"name\":\"userCategories\",\"kind\":\"object\",\"type\":\"UserCategory\",\"relationName\":\"UserToUserCategory\"},{\"name\":\"auditLogs\",\"kind\":\"object\",\"type\":\"AuditLog\",\"relationName\":\"AuditLogToUser\"},{\"name\":\"khaltiPhone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"khaltiAccountName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankAccountNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankAccountName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeAccountId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Task\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requirements\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"budget\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"latitude\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"longitude\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"dueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"TaskStatus\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subCategory\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"images\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"completionProofImages\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"validityPeriod\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"disputeStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category_new\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"CategoryToTask\"},{\"name\":\"subCategoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subCategory_new\",\"kind\":\"object\",\"type\":\"SubCategory\",\"relationName\":\"SubCategoryToTask\"},{\"name\":\"validityPeriod_new\",\"kind\":\"enum\",\"type\":\"ValidityPeriod\"},{\"name\":\"disputeStatus_new\",\"kind\":\"enum\",\"type\":\"DisputeStatus\"},{\"name\":\"completionApprovedByPoster\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"completionApprovedByTasker\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expiryReminderSent\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isDeleted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"cancelledBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cancelReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cancelledAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"disputeOpenedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"disputeReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"disputeOpenedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TaskToUser\"},{\"name\":\"offers\",\"kind\":\"object\",\"type\":\"Offer\",\"relationName\":\"OfferToTask\"},{\"name\":\"conversations\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationToTask\"},{\"name\":\"reviews\",\"kind\":\"object\",\"type\":\"Review\",\"relationName\":\"ReviewToTask\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"Comment\",\"relationName\":\"CommentToTask\"},{\"name\":\"transactions\",\"kind\":\"object\",\"type\":\"Transaction\",\"relationName\":\"TaskToTransaction\"},{\"name\":\"images_new\",\"kind\":\"object\",\"type\":\"TaskImage\",\"relationName\":\"TaskToTaskImage\"},{\"name\":\"stripePaymentIntentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"esewaRefId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"khaltiPidx\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"TaskImage\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"TaskToTaskImage\"},{\"name\":\"url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"enum\",\"type\":\"ImageType\"},{\"name\":\"order\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isPrimary\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Category\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"image\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"featuredBackground\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"promoted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"metaTitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metaDescription\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subCategories\",\"kind\":\"object\",\"type\":\"SubCategory\",\"relationName\":\"CategoryToSubCategory\"},{\"name\":\"tasks\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"CategoryToTask\"},{\"name\":\"userCategories\",\"kind\":\"object\",\"type\":\"UserCategory\",\"relationName\":\"CategoryToUserCategory\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"SubCategory\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"CategoryToSubCategory\"},{\"name\":\"tasks\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"SubCategoryToTask\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Badge\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"userBadges\",\"kind\":\"object\",\"type\":\"UserBadge\",\"relationName\":\"BadgeToUserBadge\"}],\"dbName\":null},\"UserBadge\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserBadge\"},{\"name\":\"badgeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"badge\",\"kind\":\"object\",\"type\":\"Badge\",\"relationName\":\"BadgeToUserBadge\"},{\"name\":\"earnedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"UserCategory\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserCategory\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"CategoryToUserCategory\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AuditLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"AuditLogToUser\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"details\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"VerificationToken\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expires\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Offer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"OfferStatus\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"OfferToTask\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"OfferToUser\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Conversation\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"ConversationToTask\"},{\"name\":\"posterId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"poster\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ConversationPoster\"},{\"name\":\"taskerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tasker\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ConversationTasker\"},{\"name\":\"messages\",\"kind\":\"object\",\"type\":\"Message\",\"relationName\":\"ConversationToMessage\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Message\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conversationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conversation\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationToMessage\"},{\"name\":\"senderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sender\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"MessageToUser\"},{\"name\":\"isRead\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Review\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"comment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"ReviewToTask\"},{\"name\":\"giverId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"giver\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ReviewGiver\"},{\"name\":\"receiverId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receiver\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ReviewReceiver\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Friendship\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"senderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sender\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"FriendSender\"},{\"name\":\"receiverId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receiver\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"FriendReceiver\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"FriendshipStatus\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Comment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"CommentToTask\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"CommentToUser\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Notification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"NotificationToUser\"},{\"name\":\"type\",\"kind\":\"enum\",\"type\":\"NotificationType\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"read\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Transaction\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"TaskToTransaction\"},{\"name\":\"posterId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"poster\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TransactionPoster\"},{\"name\":\"taskerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tasker\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"TransactionTasker\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"platformFee\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"taskerPayout\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"TransactionStatus\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"esewaRefId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"khaltiPidx\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripePaymentIntentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proofImages\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"completionNotes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"timeSpentHours\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"timeSpentMinutes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"completionDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"submittedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"releasedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"payouts\",\"kind\":\"object\",\"type\":\"Payout\",\"relationName\":\"PayoutToTransaction\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Payout\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"transactionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"transaction\",\"kind\":\"object\",\"type\":\"Transaction\",\"relationName\":\"PayoutToTransaction\"},{\"name\":\"taskerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"method\",\"kind\":\"enum\",\"type\":\"PaymentMethod\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"PayoutStatus\"},{\"name\":\"khaltiPhone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"khaltiTxnId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"esewaRefId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeTransferId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"initiatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"processedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"failureReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"processedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

