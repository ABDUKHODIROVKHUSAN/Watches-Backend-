import { Field, ObjectType } from '@nestjs/graphql';

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
