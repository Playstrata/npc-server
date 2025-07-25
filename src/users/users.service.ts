import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Better Auth 會處理用戶創建，這個方法保留作為內部使用
  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        id: randomUUID(),
        name: createUserDto.username,
        username: createUserDto.username,
        email: createUserDto.email,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Better Auth 會處理密碼，這裡不需要 passwordHash
      },
      include: {
        gameCharacter: true,
        sessions: false, // 不需要返回敏感的 session 資訊
        accounts: false,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        gameCharacter: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        gameCharacter: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        gameCharacter: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        gameCharacter: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // 確保用戶存在

    const updateData: any = {};
    
    if (updateUserDto.username) {
      updateData.username = updateUserDto.username;
    }
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }
    // Better Auth 處理密碼，這裡不處理密碼更新

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        gameCharacter: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 確保用戶存在
    await this.prisma.user.delete({
      where: { id },
    });
  }

  // Better Auth 沒有 lastLoginAt, userRole, isActive 等欄位
  // 這些功能已通過 Better Auth 的 session 和其他機制處理
  
  // async updateLastLogin(id: string): Promise<void> {
  //   // Better Auth 自動處理登入時間
  // }

  // async updateUserRole(id: string, role: string): Promise<void> {
  //   // Better Auth 不使用角色系統，角色通過遊戲角色管理
  // }

  // async setActiveStatus(id: string, isActive: boolean): Promise<void> {
  //   // Better Auth 沒有 isActive 欄位，用戶存在即為啟用
  // }
}