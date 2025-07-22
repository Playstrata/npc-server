import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '取得伺服器狀態' })
  @ApiResponse({ status: 200, description: '伺服器正常運行' })
  getServerStatus() {
    return this.appService.getServerStatus();
  }

  @Get('health')
  @ApiOperation({ summary: '健康檢查' })
  @ApiResponse({ status: 200, description: '服務健康狀態' })
  getHealthCheck() {
    return this.appService.getHealthCheck();
  }
}