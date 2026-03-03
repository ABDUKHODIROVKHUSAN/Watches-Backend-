import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface BatchLockDocument {
	key: string;
	ownerId: string;
	expiresAt: Date;
}

@Injectable()
export class BatchLockRepository {
	private readonly logger = new Logger(BatchLockRepository.name);

	constructor(
		@InjectModel('BatchLock')
		private readonly batchLockModel: Model<BatchLockDocument>,
	) {}

	public async tryAcquireLock(
		key: string,
		ownerId: string,
		ttlMs: number,
	): Promise<boolean> {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + ttlMs);

		try {
			const result = await this.batchLockModel
				.findOneAndUpdate(
					{
						key,
						$or: [{ expiresAt: { $lte: now } }, { ownerId }],
					},
					{
						$set: {
							ownerId,
							expiresAt,
						},
						$setOnInsert: { key },
					},
					{ upsert: true, new: true },
				)
				.lean()
				.exec();

			return !!result && result.ownerId === ownerId;
		} catch (error) {
			const isDuplicateInsert = error?.code === 11000;
			if (!isDuplicateInsert) {
				this.logger.error(`Lock acquisition failed for ${key}`, error?.stack);
			}
			return false;
		}
	}

	public async releaseLock(key: string, ownerId: string): Promise<void> {
		await this.batchLockModel
			.updateOne(
				{ key, ownerId },
				{ $set: { expiresAt: new Date() } },
			)
			.exec();
	}
}
