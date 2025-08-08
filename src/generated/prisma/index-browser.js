
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  accountId: 'accountId',
  providerId: 'providerId',
  userId: 'userId',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  idToken: 'idToken',
  accessTokenExpiresAt: 'accessTokenExpiresAt',
  refreshTokenExpiresAt: 'refreshTokenExpiresAt',
  scope: 'scope',
  password: 'password',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BankAccountScalarFieldEnum = {
  id: 'id',
  characterId: 'characterId',
  accountType: 'accountType',
  balance: 'balance',
  creditScore: 'creditScore',
  creditLimit: 'creditLimit',
  interestRate: 'interestRate',
  accountStatus: 'accountStatus',
  openedAt: 'openedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BankTransactionScalarFieldEnum = {
  id: 'id',
  bankAccountId: 'bankAccountId',
  transactionType: 'transactionType',
  amount: 'amount',
  balanceAfter: 'balanceAfter',
  description: 'description',
  timestamp: 'timestamp',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CharacterKnowledgeScalarFieldEnum = {
  id: 'id',
  characterId: 'characterId',
  skillType: 'skillType',
  knowledgeType: 'knowledgeType',
  knowledgeName: 'knowledgeName',
  description: 'description',
  proficiency: 'proficiency',
  learnedAt: 'learnedAt',
  teacherNpcId: 'teacherNpcId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CharacterSkillScalarFieldEnum = {
  id: 'id',
  characterId: 'characterId',
  skillType: 'skillType',
  experience: 'experience',
  level: 'level',
  unlockedAt: 'unlockedAt',
  lastPracticed: 'lastPracticed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeliveryQuestScalarFieldEnum = {
  id: 'id',
  questId: 'questId',
  deliveryType: 'deliveryType',
  fromNpcId: 'fromNpcId',
  toNpcId: 'toNpcId',
  fromLocation: 'fromLocation',
  toLocation: 'toLocation',
  itemId: 'itemId',
  itemQuality: 'itemQuality',
  quantity: 'quantity',
  totalWeight: 'totalWeight',
  requiredCapacity: 'requiredCapacity',
  timeLimit: 'timeLimit',
  distance: 'distance',
  difficulty: 'difficulty',
  goldReward: 'goldReward',
  experienceReward: 'experienceReward',
  reputationReward: 'reputationReward',
  status: 'status',
  assignedTo: 'assignedTo',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  pickupConfirmed: 'pickupConfirmed',
  deliveryConfirmed: 'deliveryConfirmed',
  currentLocation: 'currentLocation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GameCharacterScalarFieldEnum = {
  id: 'id',
  characterName: 'characterName',
  level: 'level',
  experience: 'experience',
  health: 'health',
  maxHealth: 'maxHealth',
  mana: 'mana',
  maxMana: 'maxMana',
  strength: 'strength',
  dexterity: 'dexterity',
  intelligence: 'intelligence',
  vitality: 'vitality',
  luck: 'luck',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId',
  availableStatPoints: 'availableStatPoints',
  baseCarryingCapacity: 'baseCarryingCapacity',
  carryingCapacity: 'carryingCapacity',
  characterClass: 'characterClass',
  currentMapLocation: 'currentMapLocation',
  currentVolume: 'currentVolume',
  currentWeight: 'currentWeight',
  equippedArmor: 'equippedArmor',
  equippedBackpack: 'equippedBackpack',
  equippedWeapon: 'equippedWeapon',
  goldAmount: 'goldAmount',
  isResting: 'isResting',
  lastSaveTimestamp: 'lastSaveTimestamp',
  lastStaminaUpdate: 'lastStaminaUpdate',
  magicalStorageCapacity: 'magicalStorageCapacity',
  magicalStorageUsed: 'magicalStorageUsed',
  maxStamina: 'maxStamina',
  maxVolume: 'maxVolume',
  movementPenalty: 'movementPenalty',
  positionX: 'positionX',
  positionY: 'positionY',
  restStartTime: 'restStartTime',
  stamina: 'stamina',
  staminaRegenRate: 'staminaRegenRate',
  baseStamina: 'baseStamina',
  equippedGloves: 'equippedGloves',
  equippedPants: 'equippedPants',
  equippedShield: 'equippedShield',
  equippedShirt: 'equippedShirt',
  equippedShoes: 'equippedShoes',
  luckPercentage: 'luckPercentage'
};

exports.Prisma.JobChangeHistoryScalarFieldEnum = {
  id: 'id',
  characterId: 'characterId',
  fromClass: 'fromClass',
  toClass: 'toClass',
  changedAt: 'changedAt',
  npcTrainerId: 'npcTrainerId',
  costPaid: 'costPaid',
  levelAtChange: 'levelAtChange',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoanPaymentScalarFieldEnum = {
  id: 'id',
  loanId: 'loanId',
  amount: 'amount',
  paymentDate: 'paymentDate',
  principalPaid: 'principalPaid',
  interestPaid: 'interestPaid',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoanScalarFieldEnum = {
  id: 'id',
  bankAccountId: 'bankAccountId',
  principalAmount: 'principalAmount',
  interestRate: 'interestRate',
  termMonths: 'termMonths',
  monthlyPayment: 'monthlyPayment',
  remainingBalance: 'remainingBalance',
  status: 'status',
  loanPurpose: 'loanPurpose',
  nextPaymentDue: 'nextPaymentDue',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LogisticsTrackingScalarFieldEnum = {
  id: 'id',
  trackingNumber: 'trackingNumber',
  deliveryQuestId: 'deliveryQuestId',
  routeId: 'routeId',
  itemId: 'itemId',
  quantity: 'quantity',
  weight: 'weight',
  status: 'status',
  currentLocation: 'currentLocation',
  scheduledPickup: 'scheduledPickup',
  actualPickup: 'actualPickup',
  scheduledDelivery: 'scheduledDelivery',
  actualDelivery: 'actualDelivery',
  handlerType: 'handlerType',
  handlerId: 'handlerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MagicalStorageScalarFieldEnum = {
  id: 'id',
  characterId: 'characterId',
  itemId: 'itemId',
  quantity: 'quantity',
  quality: 'quality',
  manaUsed: 'manaUsed',
  storedAt: 'storedAt',
  lastAccessedAt: 'lastAccessedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NpcDeliveryRouteScalarFieldEnum = {
  id: 'id',
  deliveryNpcId: 'deliveryNpcId',
  routeName: 'routeName',
  startLocation: 'startLocation',
  endLocation: 'endLocation',
  waypoints: 'waypoints',
  totalDistance: 'totalDistance',
  estimatedTime: 'estimatedTime',
  isActive: 'isActive',
  priority: 'priority',
  frequency: 'frequency',
  lastRun: 'lastRun',
  nextScheduledRun: 'nextScheduledRun',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OAuthProvidersScalarFieldEnum = {
  id: 'id',
  providerId: 'providerId',
  name: 'name',
  description: 'description',
  iconName: 'iconName',
  enabled: 'enabled',
  displayOrder: 'displayOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlayerInventoryScalarFieldEnum = {
  id: 'id',
  character_id: 'character_id',
  item_id: 'item_id',
  quantity: 'quantity',
  quality: 'quality',
  weight: 'weight',
  totalWeight: 'totalWeight',
  volume: 'volume',
  totalVolume: 'totalVolume',
  slot: 'slot',
  is_equipped: 'is_equipped',
  equipment_slot: 'equipment_slot',
  condition: 'condition',
  is_stackable: 'is_stackable',
  max_stack: 'max_stack',
  acquired_at: 'acquired_at',
  last_used_at: 'last_used_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  expiresAt: 'expiresAt',
  token: 'token',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  userId: 'userId'
};

exports.Prisma.SkillDecayLogScalarFieldEnum = {
  id: 'id',
  character_id: 'character_id',
  skill_type: 'skill_type',
  knowledge_name: 'knowledge_name',
  event_type: 'event_type',
  original_value: 'original_value',
  new_value: 'new_value',
  decay_amount: 'decay_amount',
  days_since_last_practice: 'days_since_last_practice',
  action: 'action',
  timestamp: 'timestamp',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SkillPracticeHistoryScalarFieldEnum = {
  id: 'id',
  skill_id: 'skill_id',
  practice_type: 'practice_type',
  practice_intensity: 'practice_intensity',
  experience_gained: 'experience_gained',
  proficiency_gained: 'proficiency_gained',
  knowledge_used: 'knowledge_used',
  timestamp: 'timestamp',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  username: 'username'
};

exports.Prisma.UserEmailScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  email: 'email',
  label: 'label',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  displayName: 'displayName',
  bio: 'bio',
  location: 'location',
  motto: 'motto',
  title: 'title',
  phone: 'phone',
  website: 'website',
  discordTag: 'discordTag',
  githubUrl: 'githubUrl',
  facebookUrl: 'facebookUrl',
  instagramUrl: 'instagramUrl',
  xUrl: 'xUrl',
  linkedinUrl: 'linkedinUrl',
  snapchatUrl: 'snapchatUrl',
  favoriteClass: 'favoriteClass',
  playStyle: 'playStyle',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSettingsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  cardColor: 'cardColor',
  cardTheme: 'cardTheme',
  publicEmailChoice: 'publicEmailChoice',
  theme: 'theme',
  language: 'language',
  pinnedForums: 'pinnedForums',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isProfilePublic: 'isProfilePublic'
};

exports.Prisma.UserPresenceScalarFieldEnum = {
  userId: 'userId',
  isOnline: 'isOnline',
  lastSeen: 'lastSeen',
  updatedAt: 'updatedAt'
};

exports.Prisma.VerificationScalarFieldEnum = {
  id: 'id',
  identifier: 'identifier',
  value: 'value',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JwksScalarFieldEnum = {
  id: 'id',
  publicKey: 'publicKey',
  privateKey: 'privateKey',
  createdAt: 'createdAt'
};

exports.Prisma.FriendRequestScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  status: 'status',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FriendshipScalarFieldEnum = {
  id: 'id',
  user1Id: 'user1Id',
  user2Id: 'user2Id',
  createdAt: 'createdAt'
};

exports.Prisma.BlockedUserScalarFieldEnum = {
  id: 'id',
  blockedById: 'blockedById',
  blockedUserId: 'blockedUserId',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  content: 'content',
  type: 'type',
  isRead: 'isRead',
  isDelivered: 'isDelivered',
  readAt: 'readAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PostScalarFieldEnum = {
  id: 'id',
  authorId: 'authorId',
  title: 'title',
  content: 'content',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  authorId: 'authorId',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LikeScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.ForumTopicScalarFieldEnum = {
  id: 'id',
  forumId: 'forumId',
  title: 'title',
  content: 'content',
  type: 'type',
  tags: 'tags',
  authorId: 'authorId',
  views: 'views',
  isPinned: 'isPinned',
  isClosed: 'isClosed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ForumReplyScalarFieldEnum = {
  id: 'id',
  topicId: 'topicId',
  content: 'content',
  authorId: 'authorId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ForumTopicLikeScalarFieldEnum = {
  id: 'id',
  topicId: 'topicId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.ForumReplyLikeScalarFieldEnum = {
  id: 'id',
  replyId: 'replyId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.FriendRequestStatus = exports.$Enums.FriendRequestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

exports.MessageType = exports.$Enums.MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  FILE: 'FILE'
};

exports.ForumCategory = exports.$Enums.ForumCategory = {
  GENERAL_DISCUSSION: 'GENERAL_DISCUSSION',
  GAME_GUIDES: 'GAME_GUIDES',
  BUG_REPORTS: 'BUG_REPORTS',
  FEATURE_REQUESTS: 'FEATURE_REQUESTS',
  TRADING_POST: 'TRADING_POST',
  GUILD_RECRUITMENT: 'GUILD_RECRUITMENT'
};

exports.TopicType = exports.$Enums.TopicType = {
  DISCUSSION: 'DISCUSSION',
  QUESTION: 'QUESTION',
  GUIDE: 'GUIDE',
  ANNOUNCEMENT: 'ANNOUNCEMENT'
};

exports.Prisma.ModelName = {
  Account: 'Account',
  BankAccount: 'BankAccount',
  BankTransaction: 'BankTransaction',
  CharacterKnowledge: 'CharacterKnowledge',
  CharacterSkill: 'CharacterSkill',
  DeliveryQuest: 'DeliveryQuest',
  GameCharacter: 'GameCharacter',
  JobChangeHistory: 'JobChangeHistory',
  LoanPayment: 'LoanPayment',
  Loan: 'Loan',
  LogisticsTracking: 'LogisticsTracking',
  MagicalStorage: 'MagicalStorage',
  NpcDeliveryRoute: 'NpcDeliveryRoute',
  OAuthProviders: 'OAuthProviders',
  PlayerInventory: 'PlayerInventory',
  Session: 'Session',
  SkillDecayLog: 'SkillDecayLog',
  SkillPracticeHistory: 'SkillPracticeHistory',
  User: 'User',
  UserEmail: 'UserEmail',
  UserProfile: 'UserProfile',
  UserSettings: 'UserSettings',
  UserPresence: 'UserPresence',
  Verification: 'Verification',
  Jwks: 'Jwks',
  FriendRequest: 'FriendRequest',
  Friendship: 'Friendship',
  BlockedUser: 'BlockedUser',
  Message: 'Message',
  Post: 'Post',
  Comment: 'Comment',
  Like: 'Like',
  ForumTopic: 'ForumTopic',
  ForumReply: 'ForumReply',
  ForumTopicLike: 'ForumTopicLike',
  ForumReplyLike: 'ForumReplyLike'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
