import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { View } from '../../libs/DTO/view/view';
import { ViewInput } from '../../libs/DTO/view/view.input';
import { T } from '../../libs/types/common';
import { Watches } from '../../libs/DTO/watch/watch';
import { ViewGroup } from '../../libs/enums/view.enum';
import { OrdinaryInquiry } from '../../libs/DTO/watch/watch.input';
import { lookupMember } from '../../libs/config';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistence(input);

		if (!viewExist) {
			console.log('-- New View Insert --');
			return await this.viewModel.create(input);
		} else {
			return null;
		}
	}

	private async checkViewExistence(input: ViewInput): Promise<View | null> {
		const { memberId, viewRefId } = input;
		const search: T = { memberId, viewRefId };

		return await this.viewModel.findOne(search).exec();
	}

	public async getVisitedWatches(memberId: ObjectId, input: OrdinaryInquiry): Promise<Watches> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.WATCH, memberId: memberId };

		const data: T = await this.viewModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'watches',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedWatch',
					},
				},
				{ $unwind: '$visitedWatch' },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							{
								$lookup: {
									from: 'members',
									localField: 'visitedWatch.memberId',
									foreignField: '_id',
									as: 'visitedWatch.memberData',
								},
							},
							{ $unwind: '$visitedWatch.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Watches = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.visitedWatch);

		return result;
	}
}
