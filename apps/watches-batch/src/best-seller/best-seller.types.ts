import { Types } from 'mongoose';

export interface WatchSignalAggregate {
	watchId: string;
	views: number;
	likes: number;
	orders: number;
}

export interface WatchIdentity {
	_id: Types.ObjectId;
	watchTitle: string;
	watchBrand: string;
}

export interface BestSellerRow {
	watchId: Types.ObjectId;
	watchTitle: string;
	watchBrand: string;
	score: number;
	rank: number;
	signals: {
		views: number;
		likes: number;
		orders: number;
	};
}
