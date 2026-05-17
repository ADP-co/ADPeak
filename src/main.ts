import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  await app.listen(3000);
  console.log(`🚀 API lista en: http://localhost:3000/api/v1/health`);
}
bootstrap();