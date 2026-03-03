import { Injectable } from '@nestjs/common';

@Injectable()
export class BatchService {
	public getHello(): string {
		return 'Welcome to Watches BATCH Server!';
	}
}
