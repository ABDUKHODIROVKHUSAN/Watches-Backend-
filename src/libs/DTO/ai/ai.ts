import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class CelebrityWearer {
	@Field(() => String)
	name: string;

	@Field(() => String, { nullable: true })
	description?: string;
}

@ObjectType()
export class FashionTip {
	@Field(() => String)
	outfit: string;

	@Field(() => String)
	occasion: string;
}

@ObjectType()
export class WatchAIInsights {
	@Field(() => String)
	watchTitle: string;

	@Field(() => String)
	watchBrand: string;

	@Field(() => String)
	salesInfo: string;

	@Field(() => [CelebrityWearer])
	celebrityWearers: CelebrityWearer[];

	@Field(() => [FashionTip])
	fashionTips: FashionTip[];

	@Field(() => String)
	priceRange: string;

	@Field(() => [String])
	funFacts: string[];

	@Field(() => String)
	summary: string;
}

export enum AIActionType {
	NONE = 'NONE',
	OPEN_PAGE = 'OPEN_PAGE',
}

registerEnumType(AIActionType, { name: 'AIActionType' });

@ObjectType()
export class AIChatResponse {
	@Field(() => String)
	reply: string;

	@Field(() => AIActionType, { nullable: true })
	actionType?: AIActionType;

	@Field(() => String, { nullable: true })
	actionTarget?: string;

	@Field(() => [String], { nullable: true })
	recommendedWatchIds?: string[];
}
