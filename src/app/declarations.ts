import { ApiCodeSignInIdentifierType } from './api-declarations';

export const enum LocalStorageKey {
  ccs3QrCodeSignInAccounts = 'ccs3-qrcode-signin-accounts',
}

export interface AccountItem {
  identifier: string;
  identifierType?: ApiCodeSignInIdentifierType;
  token: string;
}
