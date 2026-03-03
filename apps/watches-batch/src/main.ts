import { NestFactory } from '@nestjs/core';
import { WatchesBatchModule } from './watches-batch.module';

async function bootstrap() {
	const app = await NestFactory.create(WatchesBatchModule);
	await app.listen(process.env.PORT_BATCH ?? 3001);
}
bootstrap();
