import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { DatabaseModule } from './database/database.module';
import { BestSellerModule } from './best-seller/best-seller.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		ScheduleModule.forRoot(),
		BestSellerModule,
	],
	controllers: [BatchController],
	providers: [BatchService],
})
export class WatchesBatchModule {}
