import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { MemberType } from '../../libs/enums/member.enum';
import { WatchesService } from './watches.service';
import {
	AllWatchesInquiry,
	OrdinaryInquiry,
	SellerWatchesInquiry,
	WatchesInquiry,
	WatchInput,
} from '../../libs/DTO/watch/watch.input';
import { Watch, Watches } from '../../libs/DTO/watch/watch';
import { Roles } from '../auth/decorators/roles.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WatchUpdate } from '../../libs/DTO/watch/watch.update';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ApprovedSellerGuard } from '../auth/guards/approved-seller.guard';

@Resolver()
export class WatchesResolver {
	constructor(private readonly watchesService: WatchesService) {}

	@UseGuards(ApprovedSellerGuard)
	@Mutation(() => Watch)
	public async createWatch(
		@Args('input') input: WatchInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watch> {
		console.log('Mutation: createWatch');
		input.memberId = memberId;
		return await this.watchesService.createWatch(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Watch)
	public async getWatch(
		@Args('watchId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watch> {
		console.log('Query: getWatch');
		const watchId = shapeIntoMongoObjectId(input);
		return await this.watchesService.getWatch(memberId, watchId);
	}

	@UseGuards(ApprovedSellerGuard)
	@Mutation(() => Watch)
	public async updateWatch(
		@Args('input') input: WatchUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watch> {
		console.log('Mutation: updateWatch');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.watchesService.updateWatch(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Watches)
	public async getWatches(
		@Args('input') input: WatchesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watches> {
		console.log('Query: getWatches');
		return await this.watchesService.getWatches(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Watches)
	public async getBestSellerWatchesRow(): Promise<Watches> {
		console.log('Query: getBestSellerWatchesRow');
		return await this.watchesService.getBestSellerWatchesRow();
	}

	@UseGuards(AuthGuard)
	@Query((returns) => Watches)
	public async getFavoriteWatches(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watches> {
		console.log('Query: getFavoriteWatches');
		return await this.watchesService.getFavoriteWatches(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query((returns) => Watches)
	public async getVisitedWatches(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watches> {
		console.log('Query: getVisitedWatches');
		return await this.watchesService.getVisitedWatches(memberId, input);
	}

	@UseGuards(ApprovedSellerGuard)
	@Query((returns) => Watches)
	public async getSellerWatches(
		@Args('input') input: SellerWatchesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watches> {
		console.log('Query: getSellerWatches');
		return await this.watchesService.getSellerWatches(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Watch)
	public async likeTargetWatch(
		@Args('watchId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watch> {
		console.log('Mutation: likeTargetWatch');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.watchesService.likeTargetWatch(memberId, likeRefId);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query((returns) => Watches)
	public async getAllWatchesByAdmin(
		@Args('input') input: AllWatchesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Watches> {
		console.log('Query: getAllWatchesByAdmin');
		return await this.watchesService.getAllWatchesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation((returns) => Watch)
	public async updateWatchByAdmin(@Args('input') input: WatchUpdate): Promise<Watch> {
		console.log('Mutation: updateWatchByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.watchesService.updateWatchByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation((returns) => Watch)
	public async removeWatchByAdmin(@Args('watchId') input: string): Promise<Watch> {
		console.log('Mutation: removeWatchByAdmin');
		const watchId = shapeIntoMongoObjectId(input);
		return await this.watchesService.removeWatchByAdmin(watchId);
	}
}
