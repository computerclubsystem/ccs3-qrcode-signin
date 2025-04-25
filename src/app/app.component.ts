import { ChangeDetectionStrategy, Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AccountItem } from './declarations';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { HashService } from './hash.service';

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
    const codeFromUrl = this.getCodeFromUrl();
    this.signals.signInCode.set(codeFromUrl);
    if (codeFromUrl) {
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

  }

  onSignInWithNewAccount(): void {
    this.signals.showSignInForm.set(true);
  }

  async onSignInWithCredentials(): Promise<void> {
    try {
      this.signals.signInErrorText.set(null);
      this.changeSignInFormEnabledState(false);
      const formValue = this.signInForm.value;
      const passwordHash = await this.hashSvc.getSha512(formValue.password!);
      const identifier = formValue.identifier?.trim()!;
      const res = await this.apiSvc.signInWithCredentials(identifier, passwordHash, this.signals.signInCode()!);
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
        this.signals.signInErrorText.set(res.errorMessage || `Can't sign in`);
      }
    } catch (err) {
      this.signals.signInErrorText.set(`Can't sign in. Verify username and password`);
    } finally {
      this.changeSignInFormEnabledState(true);
    }
  }

  getCodeFromUrl(): string | null {
    const url = URL.parse(location.href)!;
    return url.searchParams.get(UrlSearchParameterName.signInCode);
  }

  changeSignInFormEnabledState(enabled: boolean): void {
    this.signals.signInFormDisabled.set(!enabled);
    if (enabled) {
      this.signInForm.enable();
    } else {
      this.signInForm.disable();
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
      signInErrorText: signal(null),
      signInCode: signal(null),
      signInCodeMissing: signal(false),
      signInFormDisabled: signal(false),
    };
    return signals;
  }
}

interface Signals {
  accounts: WritableSignal<AccountItem[]>;
  showSignInForm: WritableSignal<boolean>;
  showAccountSelection: WritableSignal<boolean>;
  signInErrorText: WritableSignal<string | null>;
  signInCode: WritableSignal<string | null>;
  signInCodeMissing: WritableSignal<boolean>;
  signInFormDisabled: WritableSignal<boolean>;
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
}
