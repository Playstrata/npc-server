import { SetMetadata } from '@nestjs/common';

// UserRole enum (since Prisma isn't exporting it properly)
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN', 
  MODERATOR = 'MODERATOR'
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);