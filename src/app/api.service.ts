import { Injectable } from '@angular/core';

import { ApiCodeSignInIdentifierType, ApiCredentialsSignInRequestBody, ApiCredentialsSignInResponseBody, ApiTokenSignInRequestBody, ApiTokenSignInResponseBody } from './api-declarations';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrlPrefix = '/api/';

  async codeSignInWithToken(token: string, code: string, identifierType: ApiCodeSignInIdentifierType): Promise<ApiTokenSignInResponseBody> {
    const path = this.getApiPath('token-sign-in');
    const body: ApiTokenSignInRequestBody = {
      token: token,
      code: code,
      identifierType: identifierType,
    };
    const res = await this.apiPost<ApiTokenSignInResponseBody>(path, body);
    return res;
  }

  async codeSignInWithCredentials(identifier: string, passwordHash: string, code: string, identifierType: ApiCodeSignInIdentifierType): Promise<ApiCredentialsSignInResponseBody> {
    const path = this.getApiPath('credentials-sign-in');
    const body: ApiCredentialsSignInRequestBody = {
      identifier: identifier,
      passwordHash: passwordHash,
      code: code,
      identifierType: identifierType,
    };
    const res = await this.apiPost<ApiCredentialsSignInResponseBody>(path, body);
    return res;
  }

  private async apiPost<TResponse>(url: string, body: unknown): Promise<TResponse> {
    return this.fetchData(FetchMethod.post, url, body);
  }

  // private async apiGet<TResponse>(url: string): Promise<TResponse> {
  //   return this.fetchData(FetchMethod.get, url);
  // }

  private async fetchData<TResponse>(method: FetchMethod, url: string, body?: unknown): Promise<TResponse> {
    const headers = new Headers();
    headers.set('Content-type', 'application/json');
    const res = await fetch(url, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: headers,
    });
    return await res.json();
  }

  private getApiPath(path: string): string {
    return `${this.apiUrlPrefix}${path}`;
  }
}

const enum FetchMethod {
  get = 'GET',
  post = 'POST',
}
