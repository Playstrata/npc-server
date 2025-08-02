import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";

@ApiTags("users")
@Controller("users")
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 用戶創建已移至 auth/register 端點

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "取得所有用戶列表" })
  @ApiResponse({ status: 200, description: "成功取得用戶列表" })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "根據ID取得用戶" })
  @ApiParam({ name: "id", description: "用戶ID" })
  @ApiResponse({ status: 200, description: "成功取得用戶資訊" })
  @ApiResponse({ status: 404, description: "用戶不存在" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新用戶資訊" })
  @ApiParam({ name: "id", description: "用戶ID" })
  @ApiResponse({ status: 200, description: "用戶資訊更新成功" })
  @ApiResponse({ status: 404, description: "用戶不存在" })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "刪除用戶" })
  @ApiParam({ name: "id", description: "用戶ID" })
  @ApiResponse({ status: 200, description: "用戶刪除成功" })
  @ApiResponse({ status: 404, description: "用戶不存在" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
