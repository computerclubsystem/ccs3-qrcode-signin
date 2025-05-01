export const enum ApiCodeSignInIdentifierType {
  user = 'user',
  customerCard = 'customer-card',
}

export const enum ApiCodeSignInErrorCode {
  codeNotFound = 'code-not-found',
  codeHasExpired = 'code-has-expired',
  connectionExpired = 'connection-expired',
  invalidToken = 'invalid-token',
  serverError = 'server-error',
}

export const enum ApiChangePasswordWithTokenErrorCode {
  invalidToken = 'invalid-token',
  serverError = 'server-error',
}


// Change account password
export interface ApiChangePasswordWithTokenRequestBody {
  token: string;
  passwordHash: string;
}

export interface ApiChangePasswordWithTokenResponseBody {
  success: boolean;
  errorMessage?: string | null;
  errorCode?: ApiChangePasswordWithTokenErrorCode | null;
}


// Code info
export interface ApiGetSignInCodeInfoRequestBody {
  code: string;
  identifierType: ApiCodeSignInIdentifierType;
}

export interface ApiGetSignInCodeInfoResponseBody {
  code: string;
  identifierType: ApiCodeSignInIdentifierType;
  isValid: boolean;
  codeDurationSeconds: number;
  remainingSeconds?: number | null;
}


// Token sign in
export interface ApiTokenSignInRequestBody {
  token: string;
  code: string;
  identifierType: ApiCodeSignInIdentifierType;
}

export interface ApiTokenSignInResponseBody {
  success: boolean;
  errorMessage?: string | null;
  errorCode?: ApiCodeSignInErrorCode | null;
  identifier?: string | null;
  identifierType?: ApiCodeSignInIdentifierType;
  remainingSeconds?: number | null;
}


// Credentials sign in
export interface ApiCredentialsSignInRequestBody {
  identifier: string;
  passwordHash: string;
  code: string;
  identifierType: ApiCodeSignInIdentifierType;
}

export interface ApiCredentialsSignInResponseBody {
  success: boolean;
  errorMessage?: string | null;
  errorCode?: ApiCodeSignInErrorCode | null;
  token?: string | null;
  identifier?: string | null;
  identifierType?: ApiCodeSignInIdentifierType;
  remainingSeconds?: number | null;
}
