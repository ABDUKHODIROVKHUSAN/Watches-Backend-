import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LikeGroup } from '../../../../../src/libs/enums/like.enum';
import { OrderStatus, PaymentStatus } from '../../../../../src/libs/enums/order.enum';
import { ViewGroup } from '../../../../../src/libs/enums/view.enum';
import { WatchStatus } from '../../../../../src/libs/enums/watch.enum';
import { BEST_SELLER_JOB_NAME, BEST_SELLER_WEIGHTS } from '../best-seller.constants';
import { BestSellerRow, WatchIdentity, WatchSignalAggregate } from '../best-seller.types';

interface CounterAggregate {
	_id: Types.ObjectId;
	count: number;
}

interface BestSellerSnapshotDocument {
	jobName: string;
	windowStart: Date;
	windowEnd: Date;
	generatedAt: Date;
	watchId: Types.ObjectId;
	watchTitle: string;
	watchBrand: string;
	rank: number;
	score: number;
	signals: {
		views: number;
		likes: number;
		orders: number;
	};
	weights: {
		views: number;
		likes: number;
		orders: number;
	};
}

interface BestSellerDisplayStateDocument {
	jobName: string;
	snapshotWindowStart: Date;
	snapshotWindowEnd: Date;
	rotationSlot: number;
	poolSize: number;
	displayWatchIds: Types.ObjectId[];
	generatedAt: Date;
}

@Injectable()
export class BestSellerRepository {
	constructor(
		@InjectModel('Watch') private readonly watchModel: Model<WatchIdentity>,
		@InjectModel('Like') private readonly likeModel: Model<any>,
		@InjectModel('View') private readonly viewModel: Model<any>,
		@InjectModel('Order') private readonly orderModel: Model<any>,
		@InjectModel('BestSellerSnapshot')
		private readonly bestSellerSnapshotModel: Model<BestSellerSnapshotDocument>,
		@InjectModel('BestSellerDisplayState')
		private readonly bestSellerDisplayStateModel: Model<BestSellerDisplayStateDocument>,
	) {}

	public async aggregateSignals(
		windowStart: Date,
		windowEnd: Date,
	): Promise<WatchSignalAggregate[]> {
		const [viewRows, likeRows, orderRows] = await Promise.all([
			this.viewModel
				.aggregate<CounterAggregate>([
					{
						$match: {
							viewGroup: ViewGroup.WATCH,
							createdAt: { $gte: windowStart, $lt: windowEnd },
						},
					},
					{ $group: { _id: '$viewRefId', count: { $sum: 1 } } },
				])
				.exec(),
			this.likeModel
				.aggregate<CounterAggregate>([
					{
						$match: {
							likeGroup: LikeGroup.WATCH,
							createdAt: { $gte: windowStart, $lt: windowEnd },
						},
					},
					{ $group: { _id: '$likeRefId', count: { $sum: 1 } } },
				])
				.exec(),
			this.orderModel
				.aggregate<CounterAggregate>([
					{
						$match: {
							orderStatus: OrderStatus.PAID,
							paymentStatus: PaymentStatus.SUCCEEDED,
							createdAt: { $gte: windowStart, $lt: windowEnd },
						},
					},
					{ $group: { _id: '$watchId', count: { $sum: 1 } } },
				])
				.exec(),
		]);

		const signalsMap = new Map<string, WatchSignalAggregate>();

		const upsertSignal = (
			watchId: Types.ObjectId,
			field: 'views' | 'likes' | 'orders',
			count: number,
		): void => {
			const key = watchId.toString();
			const current = signalsMap.get(key) ?? {
				watchId: key,
				views: 0,
				likes: 0,
				orders: 0,
			};
			current[field] = count;
			signalsMap.set(key, current);
		};

		viewRows.forEach((row) => upsertSignal(row._id, 'views', row.count));
		likeRows.forEach((row) => upsertSignal(row._id, 'likes', row.count));
		orderRows.forEach((row) => upsertSignal(row._id, 'orders', row.count));

		return [...signalsMap.values()];
	}

	public async findEligibleWatches(watchIds: string[]): Promise<WatchIdentity[]> {
		if (!watchIds.length) return [];

		return await this.watchModel
			.find({
				_id: { $in: watchIds.map((id) => new Types.ObjectId(id)) },
				watchStatus: WatchStatus.ACTIVE,
			})
			.select('_id watchTitle watchBrand')
			.lean()
			.exec();
	}

	public async persistWindowSnapshot(
		windowStart: Date,
		windowEnd: Date,
		rows: BestSellerRow[],
	): Promise<void> {
		const generatedAt = new Date();

		if (!rows.length) {
			await this.bestSellerSnapshotModel
				.deleteMany({
					jobName: BEST_SELLER_JOB_NAME,
					windowStart,
					windowEnd,
				})
				.exec();
			return;
		}

		await this.bestSellerSnapshotModel
			.bulkWrite(
				rows.map((row) => ({
					updateOne: {
						filter: {
							jobName: BEST_SELLER_JOB_NAME,
							windowStart,
							windowEnd,
							watchId: row.watchId,
						},
						update: {
							$set: {
								jobName: BEST_SELLER_JOB_NAME,
								windowStart,
								windowEnd,
								generatedAt,
								watchId: row.watchId,
								watchTitle: row.watchTitle,
								watchBrand: row.watchBrand,
								score: row.score,
								rank: row.rank,
								signals: row.signals,
								weights: BEST_SELLER_WEIGHTS,
							},
						},
						upsert: true,
					},
				})),
				{ ordered: false },
			)
			.catch(() => {
				// Let caller capture failure context; this keeps bulk operation compact.
				throw new Error('Failed to persist best seller snapshot');
			});

		await this.bestSellerSnapshotModel
			.deleteMany({
				jobName: BEST_SELLER_JOB_NAME,
				windowStart,
				windowEnd,
				watchId: { $nin: rows.map((row) => row.watchId) },
			})
			.exec();
	}

	public async persistDisplayState(input: {
		jobName: string;
		windowStart: Date;
		windowEnd: Date;
		rotationSlot: number;
		poolSize: number;
		displayWatchIds: Types.ObjectId[];
	}): Promise<void> {
		const {
			jobName,
			windowStart,
			windowEnd,
			rotationSlot,
			poolSize,
			displayWatchIds,
		} = input;

		await this.bestSellerDisplayStateModel
			.findOneAndUpdate(
				{ jobName },
				{
					$set: {
						jobName,
						snapshotWindowStart: windowStart,
						snapshotWindowEnd: windowEnd,
						rotationSlot,
						poolSize,
						displayWatchIds,
						generatedAt: new Date(),
					},
				},
				{ upsert: true, new: true },
			)
			.exec();
	}
}
