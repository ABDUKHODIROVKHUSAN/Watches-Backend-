import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { SellerStatus, UserRole } from '../../../libs/enums/member.enum';

@Injectable()
export class ApprovedSellerGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	public async canActivate(context: ExecutionContext | any): Promise<boolean> {
		const isGraphql = context.contextType === 'graphql';
		const request = isGraphql ? context.getArgByIndex(2).req : context.switchToHttp().getRequest();
		const bearerToken = request.headers.authorization;
		if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

		const token = bearerToken.split(' ')[1];
		const authMember = await this.authService.verifyToken(token);
		if (!authMember) throw new ForbiddenException(Message.NOT_AUTHENTICATED);

		const isApprovedSeller =
			authMember.role === UserRole.SELLER &&
			authMember.sellerStatus === SellerStatus.APPROVED;
		if (!isApprovedSeller) {
			throw new ForbiddenException('Only approved sellers can manage products.');
		}

		request.body = request.body || {};
		request.body.authMember = authMember;
		return true;
	}
}
