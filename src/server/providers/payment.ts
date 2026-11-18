import { DomainError } from '@/modules/shared/types';
export const paymentProviderConfigured=false;
export function requirePaymentProvider():never {
  throw new DomainError('PROVIDER_UNAVAILABLE','Thanh toán trực tuyến chưa được cấu hình. Không có khoản tiền nào được thu.');
}
