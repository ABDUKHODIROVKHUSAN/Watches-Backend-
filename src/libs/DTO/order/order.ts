import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { PaymentStatus, OrderStatus } from '../../enums/order.enum';
import { WatchBrand } from '../../enums/watch.enum';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Order {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	watchId: ObjectId;

	@Field(() => String)
	watchTitle: string;

	@Field(() => WatchBrand)
	watchBrand: WatchBrand;

	@Field(() => Int)
	watchPrice: number;

	@Field(() => String, { nullable: true })
	watchImage?: string;

	@Field(() => Int)
	orderTotal: number;

	@Field(() => OrderStatus)
	orderStatus: OrderStatus;

	@Field(() => PaymentStatus)
	paymentStatus: PaymentStatus;

	@Field(() => String, { nullable: true })
	paymentMethod?: string;

	@Field(() => String, { nullable: true })
	shippingAddress?: string;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Orders {
	@Field(() => [Order])
	list: Order[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
