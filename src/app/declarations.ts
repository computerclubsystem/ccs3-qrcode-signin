import { ApiCredentialsSignInResponseBodyIdentifierType } from './api-declarations';

export const enum LocalStorageKey {
  ccs3QrCodeSignInAccounts = 'ccs3-qrcode-signin-accounts',
}

export interface AccountItem {
  identifier: string;
  identifierType?: ApiCredentialsSignInResponseBodyIdentifierType;
  token: string;
}
