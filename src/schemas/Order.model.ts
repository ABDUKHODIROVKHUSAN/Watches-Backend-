import { Schema } from 'mongoose';
import { OrderStatus, PaymentStatus } from '../libs/enums/order.enum';
import { WatchBrand } from '../libs/enums/watch.enum';

const OrderSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		watchId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Watch',
		},

		watchTitle: {
			type: String,
			required: true,
		},

		watchBrand: {
			type: String,
			enum: WatchBrand,
			required: true,
		},

		watchPrice: {
			type: Number,
			required: true,
		},

		watchImage: {
			type: String,
		},

		orderTotal: {
			type: Number,
			required: true,
		},

		orderStatus: {
			type: String,
			enum: OrderStatus,
			default: OrderStatus.PAID,
		},

		paymentStatus: {
			type: String,
			enum: PaymentStatus,
			default: PaymentStatus.SUCCEEDED,
		},

		paymentMethod: {
			type: String,
			default: 'CARD',
		},

		shippingAddress: {
			type: String,
		},
	},
	{ timestamps: true, collection: 'orders' },
);

OrderSchema.index({ memberId: 1, createdAt: -1 });

export default OrderSchema;
