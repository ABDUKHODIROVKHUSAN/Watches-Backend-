import { BadRequestException, Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { RedisCacheService } from '../../redis/redis-cache.service';
import { CacheKeys, TTL } from '../../redis/redis-cache.keys';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
	AllWatchesInquiry,
	OrdinaryInquiry,
	SellerWatchesInquiry,
	WatchesInquiry,
	WatchInput,
} from '../../libs/DTO/watch/watch.input';
import { Watch, Watches } from '../../libs/DTO/watch/watch';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { WatchStatus } from '../../libs/enums/watch.enum';
import { ViewService } from '../view/view.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import moment from 'moment';
import { WatchUpdate } from '../../libs/DTO/watch/watch.update';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/DTO/like/like.input';

const BEST_SELLER_JOB_NAME = 'hourly-best-sellers';

interface BestSellerSnapshotDoc {
	jobName: string;
	windowEnd: Date;
	rank: number;
	watchId: ObjectId;
}

interface BestSellerDisplayStateDoc {
	jobName: string;
	displayWatchIds: ObjectId[];
}

@Injectable()
export class WatchesService {
	// Updated constructor:
	constructor(
	@InjectModel('Watch') private readonly watchModel: Model<Watch>,
	@InjectModel('BestSellerSnapshot') private readonly bestSellerSnapshotModel: Model<BestSellerSnapshotDoc>,
	@InjectModel('BestSellerDisplayState') private readonly bestSellerDisplayStateModel: Model<BestSellerDisplayStateDoc>,
	private readonly cache: RedisCacheService,   // ← replaces raw Redis
	private memberService: MemberService,
	private viewService: ViewService,
	private likeService: LikeService,
	) {}

	public async createWatch(input: WatchInput): Promise<Watch> {
		try {
			this.normalizeLocalizedWatchPayload(input);
			const result = await this.watchModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberWatches',
				modifier: 1,
			});
			await this.clearWatchesCache();
			return result;
		} catch (err: any) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getWatch(memberId: ObjectId, watchId: ObjectId): Promise<Watch> {
	const cacheKey = CacheKeys.watch(watchId);

	// 1. Try cache first
	let targetWatch = await this.cache.get<Watch>(cacheKey);

	if (targetWatch) {
		console.log('🔥 Cache HIT — single watch');
		targetWatch = this.restoreSingleWatch(targetWatch);
	} else {
		console.log('💾 Cache MISS — fetching from DB');

		const search: T = { _id: watchId, watchStatus: WatchStatus.ACTIVE };
		const fromDb = await this.watchModel.findOne(search).lean().exec();

		if (!fromDb) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		await this.cache.set(cacheKey, fromDb, TTL.LONG);
		targetWatch = this.restoreSingleWatch(fromDb);
	}

	// 2. Dynamic logic — never cached
	if (memberId) {
		const viewInput = { memberId, viewRefId: watchId, viewGroup: ViewGroup.WATCH };
		const newView = await this.viewService.recordView(viewInput);

		if (newView) {
		await this.watchStatsEditor({ _id: watchId, targetKey: 'watchViews', modifier: 1 });
		targetWatch.watchViews++;
		}

		const likeInput = { memberId, likeRefId: watchId, likeGroup: LikeGroup.WATCH };
		targetWatch.meLiked = await this.likeService.checkLikeExistence(likeInput);
	}

	// 3. Always fresh member data
	targetWatch.memberData = await this.memberService.getMember(null, targetWatch.memberId);

	return targetWatch;
}
	private restoreSingleWatch(raw: any): Watch {
    return {
        ...raw,
        // ✅ Original dates
        createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
        // ✅ The 3 missing ones from your schema
        soldAt: raw.soldAt ? new Date(raw.soldAt) : null,
        deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : null,
        manufacturedAt: raw.manufacturedAt ? new Date(raw.manufacturedAt) : null,
        // ✅ memberData dates
        memberData: raw.memberData
            ? {
                ...raw.memberData,
                createdAt: raw.memberData.createdAt ? new Date(raw.memberData.createdAt) : null,
                updatedAt: raw.memberData.updatedAt ? new Date(raw.memberData.updatedAt) : null,
              }
            : null,
    };
}

	public async getFeaturedWatchByBrand(brand: string): Promise<Watch | null> {
		const normalized = (brand || '').trim().toUpperCase().replace(/\s+/g, '_');
		const brandRegex = new RegExp((brand || '').trim(), 'i');

		return await this.watchModel
			.findOne({
				watchStatus: WatchStatus.ACTIVE,
				$or: [
					{ watchBrand: normalized },
					{ watchBrand: { $regex: brandRegex } },
					{ watchTitle: { $regex: brandRegex } },
					{ 'watchTitleI18n.en': { $regex: brandRegex } },
					{ 'watchTitleI18n.ko': { $regex: brandRegex } },
					{ 'watchTitleI18n.uz': { $regex: brandRegex } },
				],
			})
			.sort({ watchLikes: -1, watchViews: -1, createdAt: -1 })
			.lean()
			.exec();
	}

	public async getCatalogForAI(searchText: string = '', limit: number = 15): Promise<Watch[]> {
		const cleanText = (searchText || '').trim();
		const match: T = {
			watchStatus: WatchStatus.ACTIVE,
		};

		if (cleanText) {
			const searchRegex = new RegExp(cleanText, 'i');
			match.$or = [
				{ watchBrand: { $regex: searchRegex } },
				{ watchTitle: { $regex: searchRegex } },
				{ 'watchTitleI18n.en': { $regex: searchRegex } },
				{ 'watchTitleI18n.ko': { $regex: searchRegex } },
				{ 'watchTitleI18n.uz': { $regex: searchRegex } },
			];
		}

		return await this.watchModel
			.find(match)
			.sort({ watchLikes: -1, watchViews: -1, createdAt: -1 })
			.limit(Math.max(1, Math.min(limit, 200)))
			.select(
				'_id watchBrand watchTitle watchTitleI18n watchType watchPrice watchImages watchDesc watchLikes watchViews strapMaterial caseMaterial dialColor strapColor',
			)
			.lean()
			.exec();
	}

	public async watchStatsEditor(input: StatisticModifier): Promise<Watch> {
		const { _id, targetKey, modifier } = input;

		const result = await this.watchModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();

		// ✅ Counter changed — single watch cache is now stale
		await this.cache.del(CacheKeys.watch(_id));

		return result;
	}
	public async updateWatch(memberId: ObjectId, input: WatchUpdate): Promise<Watch> {
	if (input.watchStatus === WatchStatus.DELETE) {
		throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
	}

	const search: T = {
		_id: input._id,
		memberId: memberId,
		watchStatus: { $ne: WatchStatus.DELETE },
	};

	const currentWatch = await this.watchModel.findOne(search).lean().exec();
	if (!currentWatch) throw new InternalServerErrorException(Message.UPDATE_FAILED);

	const nextStatus = input.watchStatus ?? currentWatch.watchStatus;
	const updatePayload: T = { ...input };
	this.normalizeLocalizedWatchPayload(updatePayload);

	if (currentWatch.watchStatus !== WatchStatus.SOLD && nextStatus === WatchStatus.SOLD) {
		updatePayload.soldAt = moment().toDate();
	} else if (currentWatch.watchStatus === WatchStatus.SOLD && nextStatus !== WatchStatus.SOLD) {
		updatePayload.soldAt = null;
	}

	const result = await this.watchModel.findOneAndUpdate(search, updatePayload, { new: true }).exec();
	if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

	if (currentWatch.watchStatus !== WatchStatus.SOLD && nextStatus === WatchStatus.SOLD) {
		await this.memberService.memberStatsEditor({ _id: memberId, targetKey: 'memberWatches', modifier: -1 });
	} else if (currentWatch.watchStatus === WatchStatus.SOLD && nextStatus !== WatchStatus.SOLD) {
		await this.memberService.memberStatsEditor({ _id: memberId, targetKey: 'memberWatches', modifier: 1 });
	}

	// ✅ Invalidate both the specific watch and all list caches
	await this.cache.del(CacheKeys.watch(input._id));
	await this.clearWatchesCache();

	return result;
	}

	public async getWatches(memberId: ObjectId, input: WatchesInquiry): Promise<Watches> {
	const cacheKey = CacheKeys.watchList(input);

	// 1. Try cache
	const cached = await this.cache.get<Watches>(cacheKey);
	if (cached) {
		console.log('🔥 Cache HIT — watch list');
		cached.list = cached.list.map((w: any) => this.restoreSingleWatch(w));
		return cached;
	}

	console.log('💾 Cache MISS — fetching watch list from DB');

	// 2. Build query
	const match: T = { watchStatus: WatchStatus.ACTIVE };
	const sort: T = { [input.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
	this.shapeMatchQuery(match, input);

	const result = await this.watchModel.aggregate([
		{ $match: match },
		{ $sort: sort },
		{
		$facet: {
			list: [
			{ $skip: (input.page - 1) * input.limit },
			{ $limit: input.limit },
			lookupAuthMemberLiked(memberId),
			lookupMember,
			{ $unwind: '$memberData' },
			],
			metaCounter: [{ $count: 'total' }],
		},
		},
	]).exec();

	if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

	// 3. Cache the result
	await this.cache.set(cacheKey, result[0], TTL.SHORT);

	return result[0];
	}

	public async getBestSellerWatchesRow(): Promise<Watches> {
		const displayState = await this.bestSellerDisplayStateModel
			.findOne({ jobName: BEST_SELLER_JOB_NAME })
			.lean()
			.exec();

		let orderedWatchIds: ObjectId[] = displayState?.displayWatchIds ?? [];

		if (!orderedWatchIds.length) {
			const latestSnapshot = await this.bestSellerSnapshotModel
				.findOne({ jobName: BEST_SELLER_JOB_NAME })
				.sort({ windowEnd: -1, rank: 1 })
				.lean()
				.exec();

			if (latestSnapshot) {
				const topRows = await this.bestSellerSnapshotModel
					.find({
						jobName: BEST_SELLER_JOB_NAME,
						windowEnd: latestSnapshot.windowEnd,
					})
					.sort({ rank: 1 })
					.limit(3)
					.lean()
					.exec();

				orderedWatchIds = topRows.map((row) => row.watchId);
			}
		}

		if (!orderedWatchIds.length) {
			const legacyBestSellers = await this.watchModel
				.find({
					watchStatus: WatchStatus.ACTIVE,
					watchBestSeller: true,
				})
				.sort({ updatedAt: -1 })
				.limit(3)
				.lean()
				.exec();

			return {
				list: legacyBestSellers as Watch[],
				metaCounter: [{ total: legacyBestSellers.length }],
			};
		}

		const watches = await this.watchModel
			.find({
				_id: { $in: orderedWatchIds },
				watchStatus: WatchStatus.ACTIVE,
			})
			.lean()
			.exec();

		const watchMap = new Map(watches.map((watch) => [watch._id.toString(), watch]));
		const list = orderedWatchIds
			.map((watchId) => watchMap.get(watchId.toString()))
			.filter((watch) => !!watch);

		if (list.length < 3) {
			const existingIds = new Set(list.map((watch) => watch._id.toString()));
			const fillers = await this.watchModel
				.find({
					watchStatus: WatchStatus.ACTIVE,
					_id: { $nin: Array.from(existingIds) },
				})
				.sort({ watchLikes: -1, watchViews: -1, createdAt: -1 })
				.limit(3 - list.length)
				.lean()
				.exec();
			list.push(...fillers);
		}

		return {
			list: list as Watch[],
			metaCounter: [{ total: list.length }],
		};
	}

	private shapeMatchQuery(match: T, input: WatchesInquiry): void {
		const { memberId, brandList, typeList, periodsRange, pricesRange, options, text } = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (brandList && brandList.length) match.watchBrand = { $in: brandList };
		if (typeList && typeList.length) match.watchType = { $in: typeList };

		if (pricesRange) match.watchPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };

		if (text) {
			const searchRegex = new RegExp(text, 'i');
			match['$or'] = [
				{ watchTitle: { $regex: searchRegex } },
				{ 'watchTitleI18n.en': { $regex: searchRegex } },
				{ 'watchTitleI18n.ko': { $regex: searchRegex } },
				{ 'watchTitleI18n.uz': { $regex: searchRegex } },
			];
		}
		if (options) {
			const optionsQuery = options.map((ele) => {
				return { [ele]: true };
			});
			if (match['$or']) {
				match['$and'] = [{ $or: match['$or'] }, { $or: optionsQuery }];
				delete match['$or'];
			} else {
				match['$or'] = optionsQuery;
			}
		}
	}

	private normalizeLocalizedWatchPayload(payload: T): void {
		if (!payload) return;

		const titleI18n = payload.watchTitleI18n ?? {};
		const descI18n = payload.watchDescI18n ?? {};

		if (payload.watchTitle && !titleI18n.en) titleI18n.en = payload.watchTitle;
		if (!payload.watchTitle && titleI18n.en) payload.watchTitle = titleI18n.en;

		if (payload.watchDesc && !descI18n.en) descI18n.en = payload.watchDesc;
		if (!payload.watchDesc && descI18n.en) payload.watchDesc = descI18n.en;

		if (Object.keys(titleI18n).length) payload.watchTitleI18n = titleI18n;
		if (Object.keys(descI18n).length) payload.watchDescI18n = descI18n;
	}

	public async getFavoriteWatches(memberId: ObjectId, input: OrdinaryInquiry): Promise<Watches> {
		return await this.likeService.getFavoriteWatches(memberId, input);
	}

	public async getVisitedWatches(memberId: ObjectId, input: OrdinaryInquiry): Promise<Watches> {
		return await this.viewService.getVisitedWatches(memberId, input);
	}

	public async getSellerWatches(memberId: ObjectId, input: SellerWatchesInquiry): Promise<Watches> {
		const { watchStatus } = input.search;
		if (watchStatus === WatchStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			watchStatus: watchStatus ?? { $ne: WatchStatus.DELETE },
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.watchModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async likeTargetWatch(memberId: ObjectId, likeRefId: ObjectId): Promise<Watch> {
		const target: Watch = await this.watchModel
			.findOne({ _id: likeRefId, watchStatus: WatchStatus.ACTIVE })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.WATCH };
		const modifier: number = await this.likeService.toggleLike(input);

		const result = await this.watchStatsEditor({
			_id: likeRefId,
			targetKey: 'watchLikes',
			modifier,
		});

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		// ✅ Only bust the single watch — like count changed
		await this.cache.del(CacheKeys.watch(likeRefId));

		return result;
	}
	/** ADMIN **/

	public async getAllWatchesByAdmin(input: AllWatchesInquiry): Promise<Watches> {
		const { watchStatus, watchBrandList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (watchStatus) match.watchStatus = watchStatus;
		if (watchBrandList) match.watchBrand = { $in: watchBrandList };

		const result = await this.watchModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateWatchByAdmin(input: WatchUpdate): Promise<Watch> {
		let { watchStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			watchStatus: WatchStatus.ACTIVE,
		};

		if (watchStatus === WatchStatus.SOLD) soldAt = moment().toDate();
		else if (watchStatus === WatchStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.watchModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
			_id: result.memberId,
			targetKey: 'memberWatches',
			modifier: -1,
			});
		}

		// ✅ Invalidate both the specific watch and all list caches
		await this.cache.del(CacheKeys.watch(input._id));
		await this.clearWatchesCache();

		return result;
	}

	public async removeWatchByAdmin(watchId: ObjectId): Promise<Watch> {
		const search: T = { _id: watchId, watchStatus: WatchStatus.DELETE };
		const result = await this.watchModel.findOneAndDelete(search).exec();

		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		// ✅ Invalidate the specific watch AND all list caches
		await this.cache.del(CacheKeys.watch(watchId));
		await this.clearWatchesCache();

		return result;
	}

	private async clearWatchesCache(): Promise<void> {
		await this.cache.clearByPattern(CacheKeys.watchPattern());
	}
	
}
