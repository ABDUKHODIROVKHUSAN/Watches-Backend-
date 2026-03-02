import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min } from 'class-validator';

@InputType()
export class CreateOrderInput {
	@IsNotEmpty()
	@Field(() => String)
	watchId: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	paymentMethod?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	shippingAddress?: string;
}

@InputType()
export class OrdersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}
