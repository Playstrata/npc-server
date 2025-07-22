# JWT 認證系統

## 概述

完整的 JWT (JSON Web Token) 認證系統，支援用戶註冊、登入、權限控制等功能。

## 功能特色

### 已實作功能
- ✅ 用戶註冊 (username/email 重複檢查)
- ✅ 用戶登入 (支援 username 或 email 登入)
- ✅ JWT Token 生成與驗證
- ✅ Token 刷新機制
- ✅ 用戶資料取得
- ✅ 角色權限控制 (ADMIN, MODERATOR, PLAYER, GUEST)
- ✅ 認證守衛與裝飾器
- ✅ 密碼加密存儲
- ✅ 最後登入時間追蹤

## API 端點

### 認證相關
- `POST /auth/register` - 用戶註冊
- `POST /auth/login` - 用戶登入
- `GET /auth/profile` - 取得用戶資料
- `POST /auth/refresh` - 刷新 Token
- `POST /auth/logout` - 用戶登出

### 請求範例

#### 註冊
```json
POST /auth/register
{
  "username": "player123",
  "email": "player@example.com", 
  "password": "password123"
}
```

#### 登入
```json
POST /auth/login
{
  "username": "player123",  // 可以是 username 或 email
  "password": "password123"
}
```

### 回應範例

#### 登入成功
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "1d",
  "user": {
    "id": "uuid-string",
    "username": "player123",
    "email": "player@example.com",
    "role": "PLAYER",
    "hasCharacter": false
  }
}
```

## 守衛與裝飾器

### 守衛 (Guards)
- `JwtAuthGuard` - JWT Token 驗證
- `LocalAuthGuard` - 本地登入驗證
- `RolesGuard` - 角色權限控制

### 裝飾器 (Decorators)
- `@CurrentUser()` - 取得當前用戶資訊
- `@CurrentUser('userId')` - 取得當前用戶 ID
- `@Roles(UserRole.ADMIN)` - 限制特定角色訪問

## 使用範例

### 保護路由
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('users')
  getAllUsers(@CurrentUser() user: any) {
    // 只有管理員可以訪問
  }
}
```

### 取得當前用戶
```typescript
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  @Post()
  createCharacter(
    @CurrentUser('userId') userId: string,
    @Body() createCharacterDto: CreateCharacterDto
  ) {
    return this.charactersService.create(userId, createCharacterDto);
  }
}
```

## 安全特性

### 密碼安全
- 使用 bcrypt 加密，rounds = 12
- 密碼不會在 API 回應中返回
- 支援強密碼規則驗證

### Token 安全
- JWT Token 包含用戶基本資訊
- Token 過期時間可配置 (預設 1 天)
- 自動驗證 Token 有效性
- 支援 Token 刷新機制

### 驗證安全
- 用戶名與電子郵件唯一性檢查
- 帳號停用狀態檢查
- 最後登入時間更新
- 詳細的錯誤訊息處理

## 環境變數配置

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1d

# Security
BCRYPT_SALT_ROUNDS=12
```

## 錯誤處理

### 常見錯誤碼
- `400` - 輸入資料格式錯誤
- `401` - 認證失敗 (密碼錯誤、Token 無效/過期)
- `409` - 資源衝突 (用戶名/電子郵件已存在)

### 錯誤訊息範例
```json
{
  "statusCode": 401,
  "message": "Token 已過期，請重新登入"
}
```

## 開發指南

### 新增保護路由
1. 在 Controller 上加上 `@UseGuards(JwtAuthGuard)`
2. 使用 `@CurrentUser()` 裝飾器取得用戶資訊
3. 如需角色控制，加上 `@Roles()` 和 `RolesGuard`

### 前端整合
1. 登入後儲存 `access_token`
2. 請求時在 Header 加上：`Authorization: Bearer {token}`
3. Token 過期時呼叫 refresh 端點更新
4. 登出時清除本地儲存的 Token

## 未來擴展

### 可能的改進
- Token 黑名單機制 (真正的登出)
- 多裝置登入管理
- OAuth2 第三方登入整合
- 二步驟驗證 (2FA)
- 密碼重置功能
- 帳號鎖定機制 (防暴力破解)

### Redis Session 管理 (可選)
- 將 Session 資訊存儲在 Redis
- 支援真正的伺服器端登出
- 更好的多伺服器擴展性