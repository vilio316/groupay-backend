import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const docsConfig = new DocumentBuilder()
    .setTitle('Groupay Docs')
    .setVersion('0.1.0')
    .setDescription('The Groupay API Spec.')
    .addTag('groupay')
    .build();
  const docFact = () => SwaggerModule.createDocument(app, docsConfig);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: ['http://localhost:9909', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  SwaggerModule.setup('docs', app, docFact);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
