import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Order, Orders } from '../../libs/DTO/order/order';
import { CreateOrderInput, OrdersInquiry } from '../../libs/DTO/order/order.input';
import { WatchStatus } from '../../libs/enums/watch.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { T } from '../../libs/types/common';

@Injectable()
export class OrderService {
	constructor(
		@InjectModel('Order') private readonly orderModel: Model<Order>,
		@InjectModel('Watch') private readonly watchModel: Model<any>,
	) {}

	public async createOrder(memberId: ObjectId, input: CreateOrderInput): Promise<Order> {
		const watchId = shapeIntoMongoObjectId(input.watchId);

		const watch: any = await this.watchModel
			.findOne({
				_id: watchId,
				watchStatus: WatchStatus.ACTIVE,
			})
			.lean()
			.exec();

		if (!watch) throw new BadRequestException('Selected watch is not available for purchase');

		const alreadyOrdered = await this.orderModel
			.findOne({
				memberId: memberId,
				watchId: watchId,
				orderStatus: { $in: ['PAID', 'PENDING'] },
			})
			.exec();

		if (alreadyOrdered) throw new BadRequestException('payment options are coming soon');

		const created = await this.orderModel.create({
			memberId: memberId,
			watchId: watchId,
			watchTitle: watch.watchTitle,
			watchBrand: watch.watchBrand,
			watchPrice: watch.watchPrice,
			watchImage: watch.watchImages?.[0] || '',
			orderTotal: watch.watchPrice,
			paymentMethod: input.paymentMethod || 'CARD',
			shippingAddress: input.shippingAddress || '',
		});

		return created;
	}

	public async getMyOrders(memberId: ObjectId, input: OrdersInquiry): Promise<Orders> {
		const { page, limit } = input;
		const result: T = await this.orderModel
			.aggregate([
				{ $match: { memberId: memberId } },
				{ $sort: { createdAt: -1 } },
				{
					$facet: {
						list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) return { list: [], metaCounter: [] };
		return result[0];
	}
}
