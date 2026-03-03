import { Controller, Get, Logger } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import { BatchService } from './batch.service';

@Controller()
export class BatchController {
	private logger: Logger = new Logger('BatchController');

	constructor(private readonly batchService: BatchService) {}

	@Timeout(1000)
	public handleTimeout() {
		this.logger.debug('BATCH SERVER READY!');
	}

	@Get()
	public getHello(): string {
		return this.batchService.getHello();
	}
}
