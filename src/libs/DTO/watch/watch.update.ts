import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { WatchBrand, WatchStatus, WatchType } from '../../enums/watch.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class WatchUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => WatchType, { nullable: true })
	watchType?: WatchType;

	@IsOptional()
	@Field(() => WatchStatus, { nullable: true })
	watchStatus?: WatchStatus;

	@IsOptional()
	@Field(() => WatchBrand, { nullable: true })
	watchBrand?: WatchBrand;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	watchTitle?: string;

	@IsOptional()
	@Field(() => Number, { nullable: true })
	watchPrice?: number;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	watchImages?: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	watchDesc?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchBarter?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchRent?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchBestSeller?: boolean;

	soldAt?: Date;

	deletedAt?: Date;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	manufacturedAt?: Date;
}
