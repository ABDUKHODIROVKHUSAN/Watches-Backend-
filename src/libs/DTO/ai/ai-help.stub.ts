import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class WatchFinderInput {
	@Field(() => String)
	budget: string;

	@Field(() => String)
	style: string;

	@Field(() => Float)
	wristSize: number;

	@Field(() => String, { nullable: true })
	preferredBrand?: string;

	@Field(() => String)
	movement: string;
}

@ObjectType()
export class WatchComparisonRow {
	@Field(() => String)
	metric: string;

	@Field(() => String)
	leftValue: string;

	@Field(() => String)
	rightValue: string;
}

@ObjectType()
export class WatchComparison {
	@Field(() => ID)
	leftId: string;

	@Field(() => ID)
	rightId: string;

	@Field(() => [WatchComparisonRow])
	rows: WatchComparisonRow[];
}
