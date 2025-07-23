# Freedom World Server

先進的 2D MMO RPG 遊戲伺服器，基於 NestJS + TypeScript 開發 - **完整功能實現** ✅

## 🌟 核心特色

### 🤖 AI 驅動的動態遊戲世界
- **純 AI 對話系統**：基於 OpenAI GPT 的自然語言對話
- **社會階層模擬**：NPC 具備不同的社會背景和文化水平
- **動態內容分析**：智能分析玩家輸入並產生相應反應
- **友好度容忍機制**：基於關係和 NPC 性格的互動系統

### 🎭 複雜的 NPC 生態系統
- **8種專業化 NPC**：村長、學者、商人、鐵匠、礦工等
- **供應鏈網絡**：NPC 間的自動化交易和物資流通
- **技能教學系統**：NPC 提供專業技能培訓
- **代工服務**：委託 NPC 執行專業任務

### 🎒 先進的物品與負重系統
- **品質等級系統**：POOR 到 LEGENDARY 五個品質等級
- **動態負重機制**：基於力量屬性的負重能力
- **背包裝備系統**：不同容量和體積限制的背包
- **雙手持貨模式**：無背包時的物品運輸方式
- **耐力系統**：負重影響移動和操作

### 🚚 完整的物流運輸系統
- **送貨 NPC 職業**：專門負責物品運輸的 NPC
- **玩家送貨任務**：可接受的配送任務系統
- **實體運輸追蹤**：完整的物流狀態監控
- **自動化供應鏈**：NPC 間的自動物資調配

### ⚔️ 職業與技能系統
- **5大職業**：初心者、劍士、法師、弓箭手、盜賊
- **轉職系統**：完整的職業轉換機制和條件
- **職業技能樹**：每個職業的專屬技能發展路徑
- **魔法收納技能**：法師專屬的物品魔法儲存能力
- **轉職歷史追蹤**：記錄玩家的職業發展歷程

## 🚀 完整功能列表

### ✅ 基礎系統 (100% 完成)
- ✅ **Better Auth 整合**：現代化統一認證系統
- ✅ **JWT 安全機制**：完整的 Token 管理和安全驗證
- ✅ **用戶權限管理**：角色權限和資料保護
- ✅ **PostgreSQL + Prisma**：企業級資料庫架構

### ✅ 角色與屬性系統 (100% 完成)
- ✅ **角色創建與管理**：一帳號一角色的限制機制
- ✅ **五維屬性系統**：STR/DEX/INT/VIT/LUK 完整屬性
- ✅ **經驗值與升級**：動態升級和屬性點分配
- ✅ **HP/MP 管理**：生命值和魔力值系統

### ✅ 物品與經濟系統 (100% 完成)
- ✅ **物品品質等級**：5個品質等級的物品系統
- ✅ **動態商店系統**：庫存管理和隱藏商品機制
- ✅ **原材料系統**：複雜的製作材料管理
- ✅ **價格波動機制**：基於供需的動態定價

### ✅ NPC 智能系統 (100% 完成)
- ✅ **AI 驅動對話**：基於 GPT 的自然對話生成
- ✅ **社會階層模擬**：貴族、學者、商人、工匠、平民等
- ✅ **專業化行為**：每個 NPC 具備專業技能和知識
- ✅ **友好度容忍機制**：基於關係的互動反應
- ✅ **供應鏈網絡**：NPC 間自動化交易系統

### ✅ 任務與遊戲性 (100% 完成)
- ✅ **5種任務類型**：收集、擊殺、對話、探索、護送
- ✅ **AI 任務生成**：基於 NPC 職業的動態任務
- ✅ **送貨任務系統**：完整的配送任務機制
- ✅ **技能教學任務**：NPC 提供的技能培訓

### ✅ 職業與技能 (100% 完成)
- ✅ **5大職業系統**：初心者到專業職業的完整路徑
- ✅ **轉職機制**：條件檢查和轉職流程
- ✅ **職業技能樹**：每個職業的專屬技能發展
- ✅ **魔法收納技能**：法師的特殊能力系統

### ✅ 物流與運輸 (100% 完成)
- ✅ **負重系統**：基於力量屬性的動態負重
- ✅ **背包裝備**：不同容量和體積的背包系統
- ✅ **雙手持貨**：無背包時的物品運輸方式
- ✅ **送貨 NPC**：專業運輸服務提供者
- ✅ **物流追蹤**：完整的運輸狀態監控

### ✅ 即時通訊 (100% 完成)
- ✅ **WebSocket 架構**：穩定的即時通訊基礎
- ✅ **多人位置同步**：即時位置更新系統
- ✅ **聊天系統**：全域和私人訊息功能
- ✅ **事件廣播**：遊戲事件的即時通知

## 🏗️ 技術架構

### 後端技術棧
- **框架**: NestJS (企業級 Node.js 框架)
- **語言**: TypeScript (類型安全)
- **資料庫**: PostgreSQL + Prisma ORM
- **認證**: JWT + Better Auth 整合
- **即時通訊**: WebSocket
- **AI 整合**: OpenAI GPT API
- **文檔**: Swagger/OpenAPI

### 核心模組
```
src/
├── auth/                 # 認證與授權系統
├── users/               # 用戶管理
├── characters/          # 角色系統與屬性管理
├── items/               # 物品與品質系統
├── jobs/                # 職業與轉職系統
├── skills/              # 技能系統
├── npcs/                # NPC 智能系統
│   ├── npcs.service.ts          # 基礎 NPC 服務
│   ├── profession.service.ts    # 專業化行為
│   ├── shop.service.ts          # 商店系統
│   ├── dialogue.service.ts      # 傳統對話
│   └── enhanced-dialogue.service.ts  # AI 對話
├── quests/              # 任務系統
├── delivery/            # 物流與送貨系統
├── inventory/           # 背包與負重系統
├── ai/                  # AI 服務整合
├── game/                # 遊戲邏輯
├── chat/                # 聊天系統
└── prisma/              # 資料庫層
```

## 🚀 快速開始

### 環境要求
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (選用)

### 安裝步驟

1. **安裝依賴**
```bash
npm install
```

2. **環境設定**
```bash
cp .env.example .env
# 編輯 .env 設定資料庫連接和 OpenAI API Key
```

3. **資料庫設定**
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # 載入初始 NPC 和物品資料
```

4. **啟動開發伺服器**
```bash
npm run start:dev
```

### 服務端點
- 伺服器: `http://localhost:3001`
- API 文檔: `http://localhost:3001/api`
- WebSocket: `ws://localhost:3001`

## 📡 主要 API 端點

### 認證系統
- `POST /auth/register` - 用戶註冊
- `POST /auth/login` - 用戶登入
- `GET /auth/profile` - 取得用戶資料
- `POST /auth/refresh` - 刷新 Token

### 角色管理
- `POST /characters` - 創建角色
- `GET /characters` - 取得角色資訊
- `POST /characters/:id/allocate-stats` - 分配屬性點
- `POST /characters/:id/gain-exp` - 獲得經驗值

### 職業系統
- `GET /jobs/available` - 可轉職的職業列表
- `POST /jobs/change` - 執行轉職
- `GET /jobs/requirements/:jobType` - 轉職條件查詢
- `GET /jobs/history` - 轉職歷史

### 物品與商店
- `GET /items` - 物品列表
- `GET /items/:id` - 物品詳細資訊
- `GET /npcs/:id/shop` - NPC 商店
- `POST /npcs/:id/shop/buy` - 購買物品
- `POST /npcs/:id/shop/sell` - 出售物品

### AI 對話系統
- `POST /dialogue/chat` - 與 NPC 自由對話
- `GET /dialogue/npc/:id/profile` - 取得 NPC 詳細資料
- `GET /dialogue/available-npcs` - 可對話的 NPC 列表
- `GET /dialogue/history/:npcId` - 對話歷史

### 任務系統
- `GET /quests/available` - 可接受的任務
- `POST /quests/:id/accept` - 接受任務
- `POST /quests/:id/complete` - 完成任務
- `GET /quests/active` - 進行中的任務

### 送貨系統
- `GET /delivery/available-jobs` - 可接受的送貨任務
- `POST /delivery/accept/:jobId` - 接受送貨任務
- `POST /delivery/complete/:jobId` - 完成送貨
- `GET /delivery/tracking/:jobId` - 追蹤送貨狀態

### 背包系統
- `GET /inventory` - 取得背包內容
- `POST /inventory/equip-backpack` - 裝備背包
- `POST /inventory/add-item` - 添加物品
- `GET /inventory/carrying-capacity` - 查詢負重能力

## 🎯 資料庫設計

### 核心資料表
- **Users**: 用戶帳號管理
- **Characters**: 角色基本資訊與屬性
- **Items**: 物品主檔與品質等級
- **CharacterInventory**: 角色背包系統
- **NPCs**: NPC 基本資訊與狀態
- **NPCShops**: 商店庫存與價格
- **Quests**: 任務系統
- **CharacterQuests**: 角色任務進度
- **JobChanges**: 轉職歷史記錄
- **DeliveryJobs**: 送貨任務管理
- **NPCTrades**: NPC 間交易記錄

### 關鍵特色
- **複合索引優化**: 針對高頻查詢的性能優化
- **JSONB 欄位**: 彈性的屬性和設定儲存
- **外鍵約束**: 確保資料一致性
- **觸發器機制**: 自動化業務邏輯處理

## 🧪 開發指令

```bash
# 開發環境
npm run start:dev        # 啟動開發伺服器
npm run start:debug      # 啟動除錯模式

# 建置與部署
npm run build           # 建置生產版本
npm run start:prod      # 啟動生產伺服器

# 資料庫管理
npm run prisma:generate # 生成 Prisma Client
npm run prisma:migrate  # 執行資料庫遷移
npm run prisma:seed     # 載入種子資料
npm run prisma:studio   # 開啟資料庫管理介面

# 程式碼品質
npm run test           # 執行單元測試
npm run test:e2e       # 執行端對端測試
npm run lint           # ESLint 檢查
npm run format         # Prettier 格式化
```

## 🏆 專案成就

**Freedom World Server** 是一個功能完整、技術先進的 MMO RPG 後端系統：

### 技術成就
- **80+ API 端點** - 完整的遊戲功能覆蓋
- **AI 驅動架構** - 創新的 NPC 智能系統
- **企業級設計** - 模組化、可擴展的系統架構
- **完整測試覆蓋** - 單元測試和整合測試

### 遊戲性創新
- **真實 AI 對話** - 突破傳統選項式對話
- **複雜經濟系統** - 多層次的物品和交易機制
- **智能 NPC 網絡** - NPC 間的自主互動和協作
- **沉浸式角色扮演** - 深度的職業和技能系統

### 系統整合
- **前後端統一認證** - 與 Unity 客戶端無縫整合
- **即時多人體驗** - 穩定的 WebSocket 通訊
- **AI 服務整合** - OpenAI GPT 的深度整合應用
- **資料庫最佳化** - 高效的查詢和儲存機制

這個伺服器系統展示了現代遊戲開發中 AI 技術應用的最佳實踐，創造了一個真正智能和動態的遊戲世界。