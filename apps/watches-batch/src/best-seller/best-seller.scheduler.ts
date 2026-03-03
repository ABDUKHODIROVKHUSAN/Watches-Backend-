import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { BestSellerService } from './best-seller.service';

@Injectable()
export class BestSellerScheduler {
	private readonly logger = new Logger(BestSellerScheduler.name);

	constructor(private readonly bestSellerService: BestSellerService) {}

	@Timeout(5000)
	public async warmupBestSellersOnBoot(): Promise<void> {
		try {
			await this.bestSellerService.runHourlyBestSellerJob();
		} catch (error) {
			this.logger.error('Startup best seller warmup failed', error?.stack);
		}
	}

	@Cron(CronExpression.EVERY_HOUR, { name: 'hourly-best-sellers' })
	public async handleHourlyBestSellers(): Promise<void> {
		try {
			await this.bestSellerService.runHourlyBestSellerJob();
		} catch (error) {
			this.logger.error('Hourly best seller job failed', error?.stack);
		}
	}
}
