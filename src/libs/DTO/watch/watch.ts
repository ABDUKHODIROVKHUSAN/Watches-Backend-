import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { WatchBrand, WatchStatus, WatchType } from '../../enums/watch.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';
import { WatchI18n } from './watch.i18n';

@ObjectType()
export class Watch {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => WatchType)
	watchType: WatchType;

	@Field(() => WatchStatus)
	watchStatus: WatchStatus;

	@Field(() => WatchBrand)
	watchBrand: WatchBrand;

	@Field(() => String)
	watchTitle: string;

	@Field(() => WatchI18n, { nullable: true })
	watchTitleI18n?: WatchI18n;

	@Field(() => Number)
	watchPrice: number;

	@Field(() => [String])
	watchImages: string[];

	@Field(() => String, { nullable: true })
	watchDesc?: string;

	@Field(() => WatchI18n, { nullable: true })
	watchDescI18n?: WatchI18n;

	@Field(() => String, { nullable: true })
	strapMaterial?: string;

	@Field(() => String, { nullable: true })
	caseMaterial?: string;

	@Field(() => String, { nullable: true })
	dialColor?: string;

	@Field(() => String, { nullable: true })
	strapColor?: string;

	@Field(() => Boolean)
	watchBarter: boolean;

	@Field(() => Boolean)
	watchRent: boolean;

	@Field(() => Boolean, { nullable: true })
	watchBestSeller?: boolean;

	@Field(() => String)
	watchViews: number;

	@Field(() => String)
	watchLikes: number;

	@Field(() => String)
	watchComments: number;

	@Field(() => String)
	watchRank: number;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date, { nullable: true })
	soldAt?: Date;

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;

	@Field(() => Date, { nullable: true })
	manufacturedAt?: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => Member, { nullable: true })
	memberData?: Member;

	/** from Aggregation */

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Watches {
	@Field(() => [Watch])
	list: Watch[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
