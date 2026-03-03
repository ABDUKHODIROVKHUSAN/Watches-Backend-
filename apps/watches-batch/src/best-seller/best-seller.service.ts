import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import {
	BEST_SELLER_JOB_NAME,
	BEST_SELLER_LOCK_KEY,
	BEST_SELLER_WEIGHTS,
	LOCK_TTL_MS,
	ROLLING_WINDOW_DAYS,
	ROTATION_POOL_LIMIT,
	ROTATION_ROW_SIZE,
} from './best-seller.constants';
import { BestSellerRow, WatchSignalAggregate } from './best-seller.types';
import { BatchLockRepository } from './repositories/batch-lock.repository';
import { BestSellerRepository } from './repositories/best-seller.repository';

@Injectable()
export class BestSellerService {
	private readonly logger = new Logger(BestSellerService.name);
	private readonly instanceId = `${os.hostname()}:${process.pid}`;

	constructor(
		private readonly batchLockRepository: BatchLockRepository,
		private readonly bestSellerRepository: BestSellerRepository,
	) {}

	public async runHourlyBestSellerJob(reference: Date = new Date()): Promise<void> {
		// DB-backed lock keeps this cron safe across horizontally scaled instances.
		const lockAcquired = await this.batchLockRepository.tryAcquireLock(
			BEST_SELLER_LOCK_KEY,
			this.instanceId,
			LOCK_TTL_MS,
		);

		if (!lockAcquired) {
			this.logger.warn(
				`Skipped execution because lock is held by another instance: ${BEST_SELLER_LOCK_KEY}`,
			);
			return;
		}

		try {
			const { windowStart, windowEnd } = this.resolveWindow(reference);
			const signals = await this.bestSellerRepository.aggregateSignals(windowStart, windowEnd);
			const rows = await this.buildBestSellerRows(signals);
			const rotation = this.resolveRotationRows(rows, windowEnd);

			await this.bestSellerRepository.persistWindowSnapshot(windowStart, windowEnd, rows);
			await this.bestSellerRepository.persistDisplayState({
				jobName: BEST_SELLER_JOB_NAME,
				windowStart,
				windowEnd,
				rotationSlot: rotation.slot,
				poolSize: rotation.poolSize,
				displayWatchIds: rotation.displayWatchIds,
			});

			this.logger.log(
				JSON.stringify({
					message: 'Best seller snapshot and display state generated',
					windowStart,
					windowEnd,
					rowCount: rows.length,
					rotationSlot: rotation.slot,
					displaySize: rotation.displayWatchIds.length,
					instanceId: this.instanceId,
				}),
			);
		} catch (error) {
			this.logger.error(
				`Best seller job failed on ${this.instanceId}`,
				error?.stack,
			);
			throw error;
		} finally {
			await this.batchLockRepository.releaseLock(BEST_SELLER_LOCK_KEY, this.instanceId);
		}
	}

	private resolveWindow(reference: Date): { windowStart: Date; windowEnd: Date } {
		const windowEnd = new Date(reference);
		windowEnd.setMinutes(0, 0, 0);

		const windowStart = new Date(windowEnd);
		windowStart.setDate(windowStart.getDate() - ROLLING_WINDOW_DAYS);

		return { windowStart, windowEnd };
	}

	private async buildBestSellerRows(signals: WatchSignalAggregate[]): Promise<BestSellerRow[]> {
		if (!signals.length) return [];

		const watches = await this.bestSellerRepository.findEligibleWatches(
			signals.map((signal) => signal.watchId),
		);
		const watchById = new Map(watches.map((watch) => [watch._id.toString(), watch]));

		const ranked = signals
			.filter((signal) => watchById.has(signal.watchId))
			.map((signal) => {
				const watch = watchById.get(signal.watchId)!;
				const score =
					signal.views * BEST_SELLER_WEIGHTS.views +
					signal.likes * BEST_SELLER_WEIGHTS.likes +
					signal.orders * BEST_SELLER_WEIGHTS.orders;

				return {
					watchId: watch._id,
					watchTitle: watch.watchTitle,
					watchBrand: watch.watchBrand,
					signals: {
						views: signal.views,
						likes: signal.likes,
						orders: signal.orders,
					},
					score,
				};
			})
			.sort((a, b) => b.score - a.score || b.signals.orders - a.signals.orders);

		return ranked.map((row, index) => ({
			...row,
			rank: index + 1,
		}));
	}

	private resolveRotationRows(
		rows: BestSellerRow[],
		windowEnd: Date,
	): { slot: number; poolSize: number; displayWatchIds: BestSellerRow['watchId'][] } {
		// Rotation is derived deterministically from the current hour bucket, so reruns remain idempotent.
		const pool = rows.slice(0, ROTATION_POOL_LIMIT);
		const poolSize = pool.length;

		if (!poolSize) {
			return { slot: 0, poolSize: 0, displayWatchIds: [] };
		}

		const slots = Math.ceil(poolSize / ROTATION_ROW_SIZE);
		const hourBucket = Math.floor(windowEnd.getTime() / (60 * 60 * 1000));
		const slot = hourBucket % slots;
		const start = slot * ROTATION_ROW_SIZE;
		const displayRows = [...pool.slice(start, start + ROTATION_ROW_SIZE)];
		if (displayRows.length < ROTATION_ROW_SIZE) {
			for (const candidate of pool) {
				if (displayRows.length >= ROTATION_ROW_SIZE) break;
				const alreadyIncluded = displayRows.some(
					(row) => row.watchId.toString() === candidate.watchId.toString(),
				);
				if (!alreadyIncluded) displayRows.push(candidate);
			}
		}

		return {
			slot,
			poolSize,
			displayWatchIds: displayRows.map((row) => row.watchId),
		};
	}
}
