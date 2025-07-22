# Freedom World Server

2D MMO RPG 遊戲伺服器，使用 NestJS + TypeScript 開發。

## 功能特色

### 已實作功能
- ✅ JWT 認證系統 (註冊、登入、Token 管理)
- ✅ 用戶管理系統 (權限控制、資料管理)
- ✅ 角色系統 (創建、屬性、升級)
- ✅ 角色數值系統 (HP/MP/EXP/五維屬性)
- ✅ 一個帳號一個角色限制
- ✅ 經驗值與升級機制
- ✅ 屬性點分配系統
- ✅ Prisma ORM 資料庫管理
- ✅ RESTful API 設計
- ✅ Swagger API 文檔

### 待開發功能
- ⏳ WebSocket 即時通訊
- ⏳ 任務系統
- ⏳ NPC 系統
- ⏳ 物品與裝備系統
- ⏳ 聊天系統

## 快速開始

### 環境要求
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (可選)

### 安裝依賴
```bash
npm install
```

### 環境設定
1. 複製環境變數檔案：
```bash
cp .env.example .env
```

2. 修改 `.env` 檔案中的資料庫連接字串：
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/freedom_world?schema=public"
```

3. 生成 Prisma Client 和建立資料庫：
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 啟動開發伺服器
```bash
npm run start:dev
```

伺服器將在 `http://localhost:3001` 啟動
API 文檔可在 `http://localhost:3001/api` 查看

## API 端點

### 基本端點
- `GET /` - 伺服器狀態
- `GET /health` - 健康檢查
- `GET /api` - Swagger API 文檔

### 認證系統
- `POST /auth/register` - 用戶註冊
- `POST /auth/login` - 用戶登入
- `GET /auth/profile` - 取得用戶資料
- `POST /auth/refresh` - 刷新 Token
- `POST /auth/logout` - 用戶登出

### 用戶管理
- `GET /users` - 取得用戶列表 (需認證)
- `GET /users/:id` - 取得單一用戶 (需認證)

### 角色管理
- `POST /characters` - 創建角色（每個帳號限一個）
- `GET /characters` - 取得用戶的角色
- `GET /characters/can-create` - 檢查是否可創建角色
- `GET /characters/:id` - 取得角色詳細資訊
- `GET /characters/:id/stats` - 取得角色屬性統計
- `POST /characters/:id/allocate-stats` - 分配屬性點
- `POST /characters/:id/gain-exp` - 獲得經驗值
- `POST /characters/:id/heal` - 回復血量/魔力

## 資料庫結構

### Users 表
- id (UUID, Primary Key)
- username (Unique)
- email (Unique)
- password (加密)
- isActive
- lastLoginAt
- role
- createdAt, updatedAt

### Characters 表
- id (UUID, Primary Key)
- name (Unique)
- level, experience, experienceToNextLevel
- hp, maxHp, mp, maxMp
- strength, dexterity, intelligence, vitality, luck
- availableStatPoints
- gold
- currentMap, positionX, positionY
- userId (Foreign Key)

## 開發指令

```bash
# 開發模式啟動
npm run start:dev

# 建置專案
npm run build

# 生產模式啟動
npm run start:prod

# 執行測試
npm run test

# 程式碼格式化
npm run format

# ESLint 檢查
npm run lint
```

## 專案結構

```
src/
├── auth/           # 認證系統
├── users/          # 用戶管理
├── characters/     # 角色系統
├── items/          # 物品系統
├── quests/         # 任務系統
├── npcs/           # NPC 系統
├── game/           # 遊戲邏輯
├── chat/           # 聊天系統
├── database/       # 資料庫配置
├── common/         # 共用組件
└── main.ts         # 應用入口
```

## 下一步開發計劃

1. **完成認證系統** - 實作 JWT 登入機制
2. **設定資料庫** - 建立 PostgreSQL 連接
3. **實作 WebSocket** - 即時通訊基礎
4. **開發任務系統** - 基礎任務 CRUD
5. **建立 NPC 系統** - AI NPC 與對話機制