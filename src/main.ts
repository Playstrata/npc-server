import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Better Auth 需要禁用 NestJS 的 body parser
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // 啟用 CORS (支援 Better Auth cookies)
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.WEBSITE_URL || "http://localhost:3000",
    ],
    credentials: true,
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cookie",
      "Set-Cookie",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  // 全域驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API 文檔設定
  const config = new DocumentBuilder()
    .setTitle("Freedom World API")
    .setDescription("2D MMO RPG Game Server API Documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "認證系統")
    .addTag("users", "用戶管理")
    .addTag("characters", "角色系統")
    .addTag("quests", "任務系統")
    .addTag("npcs", "NPC 系統")
    .addTag("items", "物品系統")
    .addTag("game", "遊戲邏輯")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(
    `🚀 Freedom World Server is running on: http://localhost:${port}`,
  );
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

// 啟動應用程式
bootstrap().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
