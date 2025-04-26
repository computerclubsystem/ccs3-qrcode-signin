import { ChangeDetectionStrategy, Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AccountItem } from './declarations';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { HashService } from './hash.service';
import { ApiCodeSignInIdentifierType } from './api-declarations';

@Component({
  selector: 'ccs3-qr-app-root',
  templateUrl: './app.component.html',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly accountsForm = this.createAccountsForm();
  readonly signInForm = this.createSignInForm();
  readonly signals = this.createSignals();

  private readonly storageSvc = inject(StorageService);
  private readonly apiSvc = inject(ApiService);
  private readonly hashSvc = inject(HashService);

  ngOnInit(): void {
    const urlSearchParams = this.getUrlSearchParams();
    this.signals.urlSearchParams.set(urlSearchParams);
    if (urlSearchParams) {
      const accounts = this.storageSvc.getStoredAccounts();
      this.signals.accounts.set(accounts);
      if (accounts.length === 1) {
        this.accountsForm.patchValue({
          account: accounts[0],
        });
      }
      const hasStoredAccounts = accounts.length > 0;
      this.signals.showSignInForm.set(!hasStoredAccounts);
      this.signals.showAccountSelection.set(hasStoredAccounts);
    } else {
      this.signals.signInCodeMissing.set(true);
    }
  }

  async onSignInWithToken(): Promise<void> {
    try {
      this.signals.tokenSignInErrorText.set(null);
      this.changeAccountFormEnabledState(false);
      const formValue = this.accountsForm.value;
      const accountItem = formValue.account!;
      const urlSearchParams = this.signals.urlSearchParams()!;
      const res = await this.apiSvc.codeSignInWithToken(accountItem.token, urlSearchParams.signInCode!, urlSearchParams.identifierType! as ApiCodeSignInIdentifierType);
      if (res.success) {
        // TODO: Show success to the user
      } else {
        this.signals.tokenSignInErrorText.set(res.errorMessage || `Can't sign in`);
      }
    } catch (err) {
      this.signals.tokenSignInErrorText.set(`Can't sign in. Verify username and password`);
    } finally {
      this.changeAccountFormEnabledState(true);
    }
  }

  onUseNewAccount(): void {
    this.signals.showSignInForm.set(true);
  }

  async onSignInWithCredentials(): Promise<void> {
    try {
      this.signals.credentialsSignInErrorText.set(null);
      this.changeSignInFormEnabledState(false);
      const formValue = this.signInForm.value;
      const passwordHash = await this.hashSvc.getSha512(formValue.password!);
      const identifier = formValue.identifier?.trim()!;
      const urlSearchParams = this.signals.urlSearchParams()!;
      const res = await this.apiSvc.codeSignInWithCredentials(identifier, passwordHash, urlSearchParams.signInCode!, urlSearchParams.identifierType! as ApiCodeSignInIdentifierType);
      if (res.success) {
        // Add/update account item in the local storage
        const accounts = this.signals.accounts();
        const existingAccount = accounts.find(x => x.identifier === res.identifier && x.identifierType === res.identifierType);
        if (existingAccount) {
          existingAccount.token = res.token!;
        } else {
          accounts.push({
            identifier: identifier,
            identifierType: res.identifierType,
            token: res.token!,
          });
        }
        this.signals.accounts.set(accounts);
        this.storageSvc.setAccountItems(accounts);
      } else {
        this.signals.credentialsSignInErrorText.set(res.errorMessage || `Can't sign in`);
      }
    } catch (err) {
      this.signals.credentialsSignInErrorText.set(`Can't sign in. Verify username and password`);
    } finally {
      this.changeSignInFormEnabledState(true);
    }
  }

  getUrlSearchParams(): CodeSignInUrlSeachParams {
    const url = URL.parse(location.href)!;
    const validTo = url.searchParams.get(UrlSearchParameterName.validTo);
    const result: CodeSignInUrlSeachParams = {
      identifierType: url.searchParams.get(UrlSearchParameterName.identifierType),
      signInCode: url.searchParams.get(UrlSearchParameterName.signInCode),
      validTo: validTo ? +validTo : null,
    };
    return result;
  }

  changeSignInFormEnabledState(enabled: boolean): void {
    this.signals.signInFormDisabled.set(!enabled);
    if (enabled) {
      this.signInForm.enable();
    } else {
      this.signInForm.disable();
    }
  }

  changeAccountFormEnabledState(enabled: boolean): void {
    this.signals.accountsFormDisabled.set(!enabled);
    if (enabled) {
      this.accountsForm.enable();
    } else {
      this.accountsForm.disable();
    }
  }

  createAccountsForm(): FormGroup<AccountsFormControls> {
    const controls: AccountsFormControls = {
      account: new FormControl(null, { validators: [Validators.required] }),
    };
    const form = this.formBuilder.group(controls);
    return form;
  }

  createSignInForm(): FormGroup<SignInFormControls> {
    const controls: SignInFormControls = {
      identifier: new FormControl(null, { validators: [Validators.required] }),
      password: new FormControl(null, { validators: [Validators.required] }),
    };
    const form = this.formBuilder.group(controls);
    return form;
  }

  createSignals(): Signals {
    const signals: Signals = {
      accounts: signal([]),
      showSignInForm: signal(false),
      showAccountSelection: signal(false),
      credentialsSignInErrorText: signal(null),
      tokenSignInErrorText: signal(null),
      urlSearchParams: signal(null),
      signInCodeMissing: signal(false),
      signInFormDisabled: signal(false),
      accountsFormDisabled: signal(false),
    };
    return signals;
  }
}

interface Signals {
  accounts: WritableSignal<AccountItem[]>;
  showSignInForm: WritableSignal<boolean>;
  showAccountSelection: WritableSignal<boolean>;
  credentialsSignInErrorText: WritableSignal<string | null>;
  tokenSignInErrorText: WritableSignal<string | null>;
  urlSearchParams: WritableSignal<CodeSignInUrlSeachParams | null>;
  signInCodeMissing: WritableSignal<boolean>;
  signInFormDisabled: WritableSignal<boolean>;
  accountsFormDisabled: WritableSignal<boolean>;
}

interface SignInFormControls {
  identifier: FormControl<string | null>;
  password: FormControl<string | null>
}

interface AccountsFormControls {
  account: FormControl<AccountItem | null>;
}

const enum UrlSearchParameterName {
  signInCode = 'sign-in-code',
  identifierType = 'identifier-type',
  validTo = 'valid-to',
}

interface CodeSignInUrlSeachParams {
  signInCode: string | null;
  identifierType: string | null;
  validTo: number | null;
}
