import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, Length } from 'class-validator';

@ObjectType()
export class WatchI18n {
	@Field(() => String, { nullable: true })
	en?: string;

	@Field(() => String, { nullable: true })
	ko?: string;

	@Field(() => String, { nullable: true })
	uz?: string;
}

@InputType()
export class WatchI18nInput {
	@IsOptional()
	@Length(1, 300)
	@Field(() => String, { nullable: true })
	en?: string;

	@IsOptional()
	@Length(1, 300)
	@Field(() => String, { nullable: true })
	ko?: string;

	@IsOptional()
	@Length(1, 300)
	@Field(() => String, { nullable: true })
	uz?: string;
}
