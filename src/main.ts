import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const address = process.env.PUBLIC_ADDR || '127.0.0.1';
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '127.0.0.1';

  app.enableCors({
    origin: [`http://${address}:4000`],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,X-Requested-With',
  });

  await app.listen(port, host);
  console.log(`Server running at http://${host}:${port}`);
}
bootstrap();
