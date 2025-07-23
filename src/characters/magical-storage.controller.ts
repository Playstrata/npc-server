import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MagicalStorageService } from './magical-storage.service';
import { ItemQuality } from '../items/items.types';

// DTO 類型
interface StoreItemDto {
  itemId: string;
  quantity: number;
  quality?: ItemQuality;
}

interface RetrieveItemDto {
  quantity?: number;
}

@Controller('magical-storage')
@UseGuards(AuthGuard('jwt'))
export class MagicalStorageController {
  constructor(private readonly magicalStorageService: MagicalStorageService) {}

  /**
   * 獲取魔法收納狀態資訊
   */
  @Get(':characterId/info')
  async getStorageInfo(@Param('characterId') characterId: string) {
    try {
      const info = await this.magicalStorageService.getMagicalStorageInfo(characterId);
      return {
        success: true,
        data: info
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 獲取魔法收納中的所有物品
   */
  @Get(':characterId/items')
  async getStorageItems(@Param('characterId') characterId: string) {
    try {
      const items = await this.magicalStorageService.getMagicalStorageItems(characterId);
      return {
        success: true,
        data: items
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  }

  /**
   * 將物品儲存到魔法收納空間
   */
  @Post(':characterId/store')
  async storeItem(
    @Param('characterId') characterId: string,
    @Body() storeItemDto: StoreItemDto
  ) {
    try {
      const result = await this.magicalStorageService.storeItem(
        characterId,
        storeItemDto.itemId,
        storeItemDto.quantity,
        storeItemDto.quality
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 從魔法收納空間取出物品
   */
  @Post(':characterId/retrieve/:storageId')
  async retrieveItem(
    @Param('characterId') characterId: string,
    @Param('storageId') storageId: string,
    @Body() retrieveItemDto: RetrieveItemDto
  ) {
    try {
      const result = await this.magicalStorageService.retrieveItem(
        characterId,
        storageId,
        retrieveItemDto.quantity
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 完全取出指定物品
   */
  @Delete(':characterId/items/:storageId')
  async removeItem(
    @Param('characterId') characterId: string,
    @Param('storageId') storageId: string
  ) {
    try {
      const result = await this.magicalStorageService.retrieveItem(
        characterId,
        storageId
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}