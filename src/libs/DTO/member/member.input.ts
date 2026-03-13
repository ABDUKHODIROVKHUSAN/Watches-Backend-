import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { MemberAuthType, MemberStatus, MemberType, SellerStatus } from '../../enums/member.enum';
import { availableSellerSorts, availableMemberSorts } from '../../config';
import { Direction } from '../../enums/common.enum';

@InputType()
export class MemberInput {
	@IsNotEmpty()
	@Length(3, 12)
	@Field(() => String)
	memberNick: string;

	@IsNotEmpty()
	@Length(5, 12)
	@Field(() => String)
	memberPassword: string;

	@IsNotEmpty()
	@Field(() => String)
	memberPhone: string;

	@IsOptional()
	@IsEmail()
	@Field(() => String, { nullable: true })
	memberEmail?: string;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => MemberAuthType, { nullable: true })
	memberAuthType?: MemberAuthType;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	requestSellerAccess?: boolean;
}

@InputType()
export class LoginInput {
	@IsNotEmpty()
	@Length(3, 12)
	@Field(() => String)
	memberNick: string;

	@IsNotEmpty()
	@Length(5, 12)
	@Field(() => String)
	memberPassword: string;
}

@InputType()
class SISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;

	@IsOptional()
	@Field(() => SellerStatus, { nullable: true })
	sellerStatus?: SellerStatus;
}

@InputType()
export class SellersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableSellerSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => SISearch)
	search: SISearch;
}

@InputType()
class MISearch {
	@IsOptional()
	@Field(() => MemberStatus, { nullable: true })
	memberStatus?: MemberStatus;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;

	@IsOptional()
	@Field(() => SellerStatus, { nullable: true })
	sellerStatus?: SellerStatus;
}

@InputType()
export class MembersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableMemberSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => MISearch)
	search: MISearch;
}
