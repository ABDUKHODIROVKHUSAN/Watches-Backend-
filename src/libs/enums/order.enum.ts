import { registerEnumType } from '@nestjs/graphql';

export enum OrderStatus {
	PENDING = 'PENDING',
	PAID = 'PAID',
	CANCELLED = 'CANCELLED',
}
registerEnumType(OrderStatus, {
	name: 'OrderStatus',
});

export enum PaymentStatus {
	INITIATED = 'INITIATED',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}
registerEnumType(PaymentStatus, {
	name: 'PaymentStatus',
});
