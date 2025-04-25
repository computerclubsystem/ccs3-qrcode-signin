export interface ApiCredentialsSignInRequestBody {
  identifier: string;
  passwordHash: string;
  code: string;
}

export const enum ApiCredentialsSignInResponseBodyIdentifierType {
  user = 'user',
  customerCard = 'customer-card',
}


export interface ApiCredentialsSignInResponseBody {
  success: boolean;
  errorMessage?: string | null;
  token?: string | null;
  identifier?: string | null;
  identifierType?: ApiCredentialsSignInResponseBodyIdentifierType;
  remainingSeconds?: number | null;
}
