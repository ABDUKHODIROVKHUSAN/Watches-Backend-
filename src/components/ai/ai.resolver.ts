import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AIService } from './ai.service';
import { AIChatResponse, WatchAIInsights } from '../../libs/DTO/ai/ai';
import { WatchesService } from '../watches/watches.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Watch } from '../../libs/DTO/watch/watch';
import { WatchComparison, WatchFinderInput } from '../../libs/DTO/ai/ai-help.stub';
import { FileUpload, GraphQLUpload } from 'graphql-upload';

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

	@UseGuards(WithoutGuard)
	@Query(() => WatchAIInsights)
	public async getWatchBrandAIInsights(
		@Args('brand') brand: string,
	): Promise<WatchAIInsights> {
		console.log('Query: getWatchBrandAIInsights');
		const cleanBrand = (brand || '').trim();
		const featuredWatch = await this.watchesService.getFeaturedWatchByBrand(cleanBrand);

		if (featuredWatch) {
			return await this.aiService.getWatchInsights(featuredWatch);
		}

		return await this.aiService.getBrandInsights(cleanBrand);
	}

	@UseGuards(WithoutGuard)
	@Query(() => [Watch])
	public async watchRecommendations(
		@Args('input') _input: WatchFinderInput,
	): Promise<Watch[]> {
		console.log('Query: watchRecommendations');
		// TODO: connect to real recommendation engine and retrieval logic.
		return [];
	}

	@UseGuards(WithoutGuard)
	@Query(() => WatchComparison)
	public async compareWatches(
		@Args({ name: 'ids', type: () => [ID] }) ids: string[],
	): Promise<WatchComparison> {
		console.log('Query: compareWatches');
		const [leftId = '', rightId = ''] = ids;
		// TODO: fetch actual watch specs and build real comparison matrix.
		return {
			leftId,
			rightId,
			rows: [
				{ metric: 'Movement', leftValue: 'Automatic', rightValue: 'Automatic' },
				{ metric: 'Case Size', leftValue: '40 mm', rightValue: '42 mm' },
				{ metric: 'Water Resistance', leftValue: '100m', rightValue: '300m' },
				{ metric: 'Power Reserve', leftValue: '70h', rightValue: '55h' },
				{ metric: 'Price', leftValue: '$10,000', rightValue: '$7,200' },
			],
		};
	}

	@UseGuards(WithoutGuard)
	@Mutation(() => AIChatResponse)
	public async aiChat(
		@Args('message') message: string,
		@Args('locale', { type: () => String, nullable: true }) locale?: string,
	): Promise<AIChatResponse> {
		console.log('Mutation: aiChat');
		return await this.aiService.aiChat(message, locale || 'en');
	}

	@UseGuards(WithoutGuard)
	@Mutation(() => [Watch])
	public async visualSearchWatches(
		@Args({ name: 'file', type: () => GraphQLUpload })
		file: FileUpload,
		@Args('locale', { type: () => String, nullable: true }) locale?: string,
	): Promise<Watch[]> {
		console.log('Mutation: visualSearchWatches');
		return await this.aiService.visualSearchWatches(file, locale || 'en');
	}
}
