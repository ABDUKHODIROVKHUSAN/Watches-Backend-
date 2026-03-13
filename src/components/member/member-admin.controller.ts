import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Member } from '../../libs/DTO/member/member';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberService } from './member.service';

@Controller('admin')
@Roles(MemberType.ADMIN)
@UseGuards(RolesGuard)
export class MemberAdminController {
	constructor(private readonly memberService: MemberService) {}

	@Get('seller-requests')
	public async getSellerRequests(): Promise<Member[]> {
		return await this.memberService.getPendingSellerRequests();
	}

	@Post('approve-seller/:userId')
	public async approveSeller(@Param('userId') userId: string): Promise<Member> {
		const targetId = shapeIntoMongoObjectId(userId);
		return await this.memberService.approveSeller(targetId);
	}

	@Post('reject-seller/:userId')
	public async rejectSeller(@Param('userId') userId: string): Promise<Member> {
		const targetId = shapeIntoMongoObjectId(userId);
		return await this.memberService.rejectSeller(targetId);
	}
}
