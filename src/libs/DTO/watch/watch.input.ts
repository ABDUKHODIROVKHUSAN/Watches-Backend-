import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { WatchBrand, WatchLocale, WatchStatus, WatchType } from '../../enums/watch.enum';
import { ObjectId } from 'mongoose';
import { availableWatchOptions, availableWatchSorts } from '../../config';
import { Direction } from '../../enums/common.enum';
import { WatchI18nInput } from './watch.i18n';

@InputType()
export class WatchInput {
	@IsNotEmpty()
	@Field(() => WatchType)
	watchType: WatchType;

	@IsNotEmpty()
	@Field(() => WatchBrand)
	watchBrand: WatchBrand;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	watchTitle: string;

	@IsOptional()
	@Field(() => WatchI18nInput, { nullable: true })
	watchTitleI18n?: WatchI18nInput;

	@IsNotEmpty()
	@Field(() => Number)
	watchPrice: number;

	@IsNotEmpty()
	@Field(() => [String])
	watchImages: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	watchDesc?: string;

	@IsOptional()
	@Field(() => WatchI18nInput, { nullable: true })
	watchDescI18n?: WatchI18nInput;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchBarter?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchRent?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	watchBestSeller?: boolean;

	memberId?: ObjectId;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	manufacturedAt?: Date;
}

@InputType()
export class PricesRange {
	@Field(() => Int)
	start: number;

	@Field(() => Int)
	end: number;
}

@InputType()
export class PeriodsRange {
	@Field(() => Date)
	start: Date;

	@Field(() => Date)
	end: Date;
}

@InputType()
class WISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	memberId?: ObjectId;

	@IsOptional()
	@Field(() => [WatchBrand], { nullable: true })
	brandList?: WatchBrand[];

	@IsOptional()
	@Field(() => [WatchType], { nullable: true })
	typeList?: WatchType[];

	@IsOptional()
	@IsIn(availableWatchOptions, { each: true })
	@Field(() => [String], { nullable: true })
	options?: string[];

	@IsOptional()
	@Field(() => PricesRange, { nullable: true })
	pricesRange?: PricesRange;

	@IsOptional()
	@Field(() => PeriodsRange, { nullable: true })
	periodsRange?: PeriodsRange;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;

	@IsOptional()
	@Field(() => WatchLocale, { nullable: true })
	locale?: WatchLocale;
}

@InputType()
export class WatchesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableWatchSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => WISearch)
	search: WISearch;
}

@InputType()
class SWISearch {
	@IsOptional()
	@Field(() => WatchStatus, { nullable: true })
	watchStatus?: WatchStatus;
}

@InputType()
export class SellerWatchesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableWatchSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => SWISearch)
	search: SWISearch;
}

@InputType()
class ALWISearch {
	@IsOptional()
	@Field(() => WatchStatus, { nullable: true })
	watchStatus?: WatchStatus;

	@IsOptional()
	@Field(() => [WatchBrand], { nullable: true })
	watchBrandList?: WatchBrand[];
}

@InputType()
export class AllWatchesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableWatchSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => ALWISearch)
	search: ALWISearch;
}

@InputType()
export class OrdinaryInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}
