import { Injectable } from '@angular/core';
import { AccountItem, LocalStorageKey } from './declarations';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly storage = window.localStorage;

  getStoredAccounts(): AccountItem[] {
    let result: AccountItem[];

    const storageValue = this.storage.getItem(LocalStorageKey.ccs3QrCodeSignInAccounts);
    if (!storageValue?.trim()) {
      return [];
    }

    try {
      const accountItems: AccountItem[] = JSON.parse(storageValue);
      if (this.isValidAccountItemsArray(accountItems)) {
        return accountItems;
      } else {
        result = [];
        this.setAccountItems([]);
      }
    } catch {
      result = [];
      this.setAccountItems([]);
    }

    return result;
  }

  setAccountItems(accountItems: AccountItem[]): void {
    this.storage.setItem(LocalStorageKey.ccs3QrCodeSignInAccounts, JSON.stringify(accountItems));
  }

  isValidAccountItemsArray(items: unknown): boolean {
    if (!Array.isArray(items)) {
      return false;
    }
    const arr = items as unknown[];
    if (arr.length === 0) {
      return true;
    }

    const accountItemsArr = arr as AccountItem[];
    for (const item of accountItemsArr) {
      if (!item.identifier || !item.token) {
        return false;
      }
    }

    return true;
  }
}
