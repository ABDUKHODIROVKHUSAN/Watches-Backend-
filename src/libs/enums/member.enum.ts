import { registerEnumType } from '@nestjs/graphql';

export enum MemberType {
	USER = 'USER',
	AGENT = 'AGENT',
	ADMIN = 'ADMIN',
}
registerEnumType(MemberType, {
	name: 'MemberType',
});

export enum MemberStatus {
	ACTIVE = 'ACTIVE',
	BLOCK = 'BLOCK',
	DELETE = 'DELETE',
}
registerEnumType(MemberStatus, {
	name: 'MemberStatus',
});

export enum MemberAuthType {
	PHONE = 'PHONE',
	EMAIL = 'EMAIL',
	TELEGRAM = 'TELEGRAM',
}
registerEnumType(MemberAuthType, {
	name: 'MemberAuthType',
});

export enum UserRole {
	USER = 'user',
	SELLER = 'seller',
	ADMIN = 'admin',
}
registerEnumType(UserRole, {
	name: 'UserRole',
});

export enum SellerStatus {
	NONE = 'none',
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected',
}
registerEnumType(SellerStatus, {
	name: 'SellerStatus',
});
