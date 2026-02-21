import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AIService } from './ai.service';
import { WatchAIInsights } from '../../libs/DTO/ai/ai';
import { WatchesService } from '../watches/watches.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';

@Resolver()
export class AIResolver {
	constructor(
		private readonly aiService: AIService,
		private readonly watchesService: WatchesService,
	) {}

	@UseGuards(WithoutGuard)
	@Query(() => WatchAIInsights)
	public async getWatchAIInsights(
		@Args('watchId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<WatchAIInsights> {
		console.log('Query: getWatchAIInsights');
		const watchId = shapeIntoMongoObjectId(input);
		const watch = await this.watchesService.getWatch(memberId, watchId);
		return await this.aiService.getWatchInsights(watch);
	}
}
