import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import { AppModule } from '../../../src/app.module';
import { LoggingInterceptor } from '../../../src/libs/interceptor/Logging.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());
	app.enableCors({ origin: true, credentials: true });

	// Keep API runtime behavior identical to the legacy entrypoint.
	app.use(graphqlUploadExpress({ maxFileSize: 5000000, maxFiles: 10 }));
	app.use('/uploads', express.static('./uploads'));

	await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
