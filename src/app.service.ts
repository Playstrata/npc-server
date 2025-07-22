import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServerStatus() {
    return {
      name: 'Freedom World Server',
      version: '0.1.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      message: 'Welcome to Freedom World - 2D MMO RPG Server!',
    };
  }

  getHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}