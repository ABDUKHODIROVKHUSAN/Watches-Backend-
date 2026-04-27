import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// ✅ 1. PUT UPLOAD MIDDLEWARE FIRST (CRITICAL)
	app.use(graphqlUploadExpress({
		maxFileSize: 5000000,
		maxFiles: 10,
	}));

	// ✅ 2. FIX CORS (EXPLICIT ORIGIN — VERY IMPORTANT)
	app.enableCors({
		origin: 'http://localhost:3300',
		credentials: true,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		allowedHeaders: 'Content-Type, Authorization',
	});

	// ✅ 3. GLOBALS
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());

	// ✅ 4. STATIC FILES
	const uploadsPath = path.resolve(process.cwd(), 'uploads');
	if (!fs.existsSync(uploadsPath)) {
		fs.mkdirSync(uploadsPath, { recursive: true });
	}
	app.use('/uploads', express.static(uploadsPath));

	await app.listen(process.env.PORT_API ?? 3009);
}
bootstrap();