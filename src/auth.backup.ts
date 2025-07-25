import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.WEBSITE_URL || "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // 基本認證設定
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // 遊戲環境暫時關閉
  },
  
  // Session 設定
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 天
    },
  },
  
  // 安全設定
  rateLimit: {
    window: 60, // 60 秒
    max: 100,   // 最大 100 次請求
  },
  
  // 遊戲專用欄位擴展
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
        validate: {
          minLength: 3,
          maxLength: 50,
        },
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
      userRole: {
        type: "string",
        defaultValue: "PLAYER",
        validate: {
          in: ["ADMIN", "MODERATOR", "PLAYER", "GUEST"],
        },
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
    },
  },
  
  // Callbacks for game integration
  callbacks: {
    async signIn({ user }) {
      console.log(`🎮 用戶登入遊戲服務器: ${user.email}`);
      // 可以在這裡加入遊戲登入邏輯
      return { user };
    },
    
    async signUp({ user }) {
      console.log(`🎮 新用戶註冊遊戲服務器: ${user.email}`);
      // 可以在這裡加入遊戲註冊邏輯
      return { user };
    },
  },
});