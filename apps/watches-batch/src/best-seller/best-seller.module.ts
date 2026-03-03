import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import BestSellerSnapshotSchema from '../../../../src/schemas/BestSellerSnapshot.model';
import BestSellerDisplayStateSchema from '../../../../src/schemas/BestSellerDisplayState.model';
import BatchLockSchema from '../../../../src/schemas/BatchLock.model';
import WatchSchema from '../../../../src/schemas/Watch.model';
import LikeSchema from '../../../../src/schemas/Like.model';
import ViewSchema from '../../../../src/schemas/View.model';
import OrderSchema from '../../../../src/schemas/Order.model';
import { BestSellerScheduler } from './best-seller.scheduler';
import { BestSellerService } from './best-seller.service';
import { BatchLockRepository } from './repositories/batch-lock.repository';
import { BestSellerRepository } from './repositories/best-seller.repository';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Watch', schema: WatchSchema },
			{ name: 'Like', schema: LikeSchema },
			{ name: 'View', schema: ViewSchema },
			{ name: 'Order', schema: OrderSchema },
			{ name: 'BestSellerSnapshot', schema: BestSellerSnapshotSchema },
			{ name: 'BestSellerDisplayState', schema: BestSellerDisplayStateSchema },
			{ name: 'BatchLock', schema: BatchLockSchema },
		]),
	],
	providers: [
		BestSellerScheduler,
		BestSellerService,
		BatchLockRepository,
		BestSellerRepository,
	],
})
export class BestSellerModule {}
