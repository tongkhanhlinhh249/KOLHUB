import type { AccountType } from '../../services';

/** `?loai=` values shared by Đăng ký, Đăng nhập and Quên mật khẩu (default: KOL). */
const TYPE_BY_QUERY: Record<string, AccountType> = { kol: 'KOL', mcn: 'MCN', biz: 'BIZ' };
export const QUERY_BY_TYPE: Record<AccountType, string> = { KOL: 'kol', MCN: 'mcn', BIZ: 'biz' };

export function accountTypeFromQuery(value: string | null): AccountType {
  return TYPE_BY_QUERY[value ?? ''] ?? 'KOL';
}

/** Path with the account type kept in the query, e.g. `/dang-nhap?loai=mcn`. */
export function withAccountType(path: string, type: AccountType): string {
  return `${path}?loai=${QUERY_BY_TYPE[type]}`;
}
