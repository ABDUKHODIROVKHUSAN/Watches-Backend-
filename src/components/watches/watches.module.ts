import { Module } from '@nestjs/common';
import { WatchesResolver } from './watches.resolver';
import { WatchesService } from './watches.service';
import { MongooseModule } from '@nestjs/mongoose';
import WatchSchema from '../../schemas/Watch.model';
import BestSellerSnapshotSchema from '../../schemas/BestSellerSnapshot.model';
import BestSellerDisplayStateSchema from '../../schemas/BestSellerDisplayState.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'Watch',
				schema: WatchSchema,
			},
			{
				name: 'BestSellerSnapshot',
				schema: BestSellerSnapshotSchema,
			},
			{
				name: 'BestSellerDisplayState',
				schema: BestSellerDisplayStateSchema,
			},
		]),
		AuthModule,
		ViewModule,
		MemberModule,
		LikeModule,
		RedisModule,
	],
	providers: [WatchesResolver, WatchesService],
	exports: [WatchesService],
})
export class WatchesModule {}
