import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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
import * as moment from 'moment';
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
	constructor(
		@InjectModel('Watch')
		private readonly watchModel: Model<Watch>,
		@InjectModel('BestSellerSnapshot')
		private readonly bestSellerSnapshotModel: Model<BestSellerSnapshotDoc>,
		@InjectModel('BestSellerDisplayState')
		private readonly bestSellerDisplayStateModel: Model<BestSellerDisplayStateDoc>,
		private memberService: MemberService,
		private viewService: ViewService,
		private likeService: LikeService,
	) {}

	public async createWatch(input: WatchInput): Promise<Watch> {
		try {
			const result = await this.watchModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberWatches',
				modifier: 1,
			});
			return result;
		} catch (err) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getWatch(memberId: ObjectId, watchId: ObjectId): Promise<Watch> {
		const search: T = {
			_id: watchId,
			watchStatus: WatchStatus.ACTIVE,
		};

		const targetWatch: Watch = await this.watchModel.findOne(search).lean().exec();

		if (!targetWatch) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId: memberId, viewRefId: watchId, viewGroup: ViewGroup.WATCH };
			const newView = await this.viewService.recordView(viewInput);

			if (newView) {
				await this.watchStatsEditor({
					_id: watchId,
					targetKey: 'watchViews',
					modifier: 1,
				});
				targetWatch.watchViews++;
			}

			const likeInput = { memberId: memberId, likeRefId: watchId, likeGroup: LikeGroup.WATCH };
			targetWatch.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		targetWatch.memberData = await this.memberService.getMember(null, targetWatch.memberId);

		return targetWatch;
	}

	public async getFeaturedWatchByBrand(brand: string): Promise<Watch | null> {
		const normalized = (brand || '').trim().toUpperCase().replace(/\s+/g, '_');
		const brandRegex = new RegExp((brand || '').trim(), 'i');

		return await this.watchModel
			.findOne({
				watchStatus: WatchStatus.ACTIVE,
				$or: [{ watchBrand: normalized }, { watchBrand: { $regex: brandRegex } }, { watchTitle: { $regex: brandRegex } }],
			})
			.sort({ watchLikes: -1, watchViews: -1, createdAt: -1 })
			.lean()
			.exec();
	}

	public async watchStatsEditor(input: StatisticModifier): Promise<Watch> {
		const { _id, targetKey, modifier } = input;

		return await this.watchModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
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

		if (currentWatch.watchStatus !== WatchStatus.SOLD && nextStatus === WatchStatus.SOLD) {
			updatePayload.soldAt = moment().toDate();
		} else if (currentWatch.watchStatus === WatchStatus.SOLD && nextStatus !== WatchStatus.SOLD) {
			updatePayload.soldAt = null;
		}

		const result = await this.watchModel.findOneAndUpdate(search, updatePayload, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (currentWatch.watchStatus !== WatchStatus.SOLD && nextStatus === WatchStatus.SOLD) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberWatches',
				modifier: -1,
			});
		} else if (currentWatch.watchStatus === WatchStatus.SOLD && nextStatus !== WatchStatus.SOLD) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberWatches',
				modifier: 1,
			});
		}

		return result;
	}

	public async getWatches(memberId: ObjectId, input: WatchesInquiry): Promise<Watches> {
		const match: T = { watchStatus: WatchStatus.ACTIVE };
		const sort: T = {
			[input.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
		};

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.watchModel
			.aggregate([
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
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

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

		if (text) match.watchTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
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

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.WATCH,
		};
		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.watchStatsEditor({
			_id: likeRefId,
			targetKey: 'watchLikes',
			modifier: modifier,
		});

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
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

		return result;
	}

	public async removeWatchByAdmin(watchId: ObjectId): Promise<Watch> {
		const search: T = { _id: watchId, watchStatus: WatchStatus.DELETE };
		const result = await this.watchModel.findOneAndDelete(search).exec();

		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}
}
