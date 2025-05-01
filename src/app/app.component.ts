import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { AccountItem } from './declarations';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { HashService } from './hash.service';
import { ApiChangePasswordWithTokenRequestBody, ApiCodeSignInIdentifierType, ApiGetSignInCodeInfoRequestBody } from './api-declarations';
import { RemainingSecondsComponent } from './remaining-seconds/remaining-seconds.component';

@Component({
  selector: 'ccs3-qr-app-root',
  templateUrl: './app.component.html',
  imports: [ReactiveFormsModule, RemainingSecondsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly accountsForm = this.createAccountsForm();
  readonly signInForm = this.createSignInForm();
  readonly signals = this.createSignals();

  @ViewChild('accountDeletionConfirmationDialog') accountDeletionConfirmationDialog!: ElementRef<HTMLDialogElement>;

  private readonly storageSvc = inject(StorageService);
  private readonly apiSvc = inject(ApiService);
  private readonly hashSvc = inject(HashService);
  private readonly destroyRef = inject(DestroyRef);
  private codeExpiresAt?: number;

  ngOnInit(): void {
    const urlSearchParams = this.getUrlSearchParams();
    this.signals.urlSearchParams.set(urlSearchParams);
    if (urlSearchParams && urlSearchParams.code && urlSearchParams.identifierType) {
      this.processCodeInfo(urlSearchParams);
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
    this.subscribeToAccountsForm();
  }

  subscribeToAccountsForm(): void {
    this.accountsForm.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(formValue => this.signals.changePasswordEnabled.set(this.isChangePasswordEnabled(formValue)));
  }

  isChangePasswordEnabled(formValue: typeof this.accountsForm.value): boolean {
    const newPassword = formValue.newPassword;
    const repeatNewPassword = formValue.repeatNewPassword;
    if (newPassword && newPassword.length >= 10 && repeatNewPassword === newPassword) {
      return true;
    }
    return false;
  }

  async onChangePassword(): Promise<void> {
    const requestBody: ApiChangePasswordWithTokenRequestBody = {
      token: this.accountsForm.controls.account.value?.token!,
      passwordHash: await this.hashSvc.getSha512(this.accountsForm.controls.newPassword.value!),
    };
    try {
      this.signals.changePasswordResponseMessage.set(null);
      this.signals.changePasswordSuccess.set(null);
      const res = await this.apiSvc.changePasswordWithToken(requestBody);
      this.signals.changePasswordSuccess.set(res.success);
      if (res.success) {
        this.signals.changePasswordResponseMessage.set('Password has been changed');
      } else {
        this.signals.changePasswordResponseMessage.set(res.errorMessage || `Can't change the password`);
      }
    } catch (err) {
      this.signals.changePasswordSuccess.set(false);
      this.signals.changePasswordResponseMessage.set(`Can't change the password`);
    }
  }

  onShowDeleteAccountDialog(): void {
    this.accountDeletionConfirmationDialog.nativeElement.showModal();
  }

  onRemoveSelectedAccount(): void {
    const account = this.accountsForm.controls.account.value;
    if (!account) {
      return;
    }
    const currentAccounts = this.storageSvc.getStoredAccounts();
    const filteredAccounts = currentAccounts.filter(x => x.token !== account.token);
    this.storageSvc.setAccountItems(filteredAccounts);
    this.signals.accounts.set(filteredAccounts);
    this.accountsForm.controls.account.patchValue(null);
  }

  async processCodeInfo(urlSearchParams: CodeSignInUrlSeachParams): Promise<void> {
    const req: ApiGetSignInCodeInfoRequestBody = {
      code: urlSearchParams.code!,
      identifierType: urlSearchParams.identifierType as ApiCodeSignInIdentifierType,
    };
    const res = await this.apiSvc.getSignInCodeInfo(req);
    if (res.isValid) {
      this.signals.codeDurationSeconds.set(res.codeDurationSeconds);
      this.codeExpiresAt = Date.now() + (res.remainingSeconds || 0) * 1000;
      this.showCodeRemainingTime();
      interval(1000).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => this.showCodeRemainingTime());
    } else {
      this.signals.codeIsNotValid.set(true);
    }
  }

  showCodeRemainingTime(): void {
    if (this.signals.signedIn() || this.signals.codeUsed()) {
      this.signals.codeRemainingSeconds.set(null);
      return;
    }
    const remainingSeconds = Math.floor((this.codeExpiresAt! - Date.now()) / 1000);
    if (remainingSeconds <= 0) {
      this.signals.codeIsNotValid.set(true);
      this.signals.codeRemainingSeconds.set(null);
    } else {
      this.signals.codeRemainingSeconds.set(remainingSeconds);
    }
  }

  async onSignInWithToken(): Promise<void> {
    try {
      this.signals.tokenSignInErrorText.set(null);
      this.signals.signedIn.set(false);
      this.signals.signedInIdentifier.set(null);
      this.signals.codeRemainingSeconds.set(null);
      this.signals.signingIn.set(true);
      this.changeAccountFormEnabledState(false);
      const formValue = this.accountsForm.value;
      const accountItem = formValue.account!;
      const urlSearchParams = this.signals.urlSearchParams()!;
      const res = await this.apiSvc.codeSignInWithToken(accountItem.token, urlSearchParams.code!, urlSearchParams.identifierType! as ApiCodeSignInIdentifierType);
      if (res.success) {
        this.signals.signedInIdentifier.set(res.identifier);
        this.signals.signedIn.set(true);
        this.signals.codeUsed.set(true);
      } else {
        this.signals.tokenSignInErrorText.set(res.errorMessage || `Can't sign in`);
      }
    } catch (err) {
      this.signals.tokenSignInErrorText.set(`Can't sign in. Verify username and password`);
    } finally {
      this.changeAccountFormEnabledState(true);
      this.signals.signingIn.set(false);
    }
  }

  onUseNewAccount(): void {
    this.signals.showSignInForm.set(true);
  }

  async onSignInWithCredentials(): Promise<void> {
    try {
      this.signals.credentialsSignInErrorText.set(null);
      this.signals.signedIn.set(false);
      this.signals.signedInIdentifier.set(null);
      this.signals.codeRemainingSeconds.set(null);
      this.signals.signingIn.set(false);
      this.changeSignInFormEnabledState(false);
      const formValue = this.signInForm.value;
      const passwordHash = await this.hashSvc.getSha512(formValue.password!);
      const identifier = formValue.identifier?.trim()!;
      const urlSearchParams = this.signals.urlSearchParams()!;
      const res = await this.apiSvc.codeSignInWithCredentials(identifier, passwordHash, urlSearchParams.code!, urlSearchParams.identifierType! as ApiCodeSignInIdentifierType);
      if (res.success) {
        // Add/update account item in the local storage
        this.signals.codeUsed.set(true);
        this.signals.signedIn.set(true);
        this.signals.signedInIdentifier.set(res.identifier);
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
        const signedInAccount = accounts.find(x => x.token === res.token);
        this.accountsForm.controls.account.patchValue(signedInAccount || null)
        this.signals.showAccountSelection.set(true);
        this.signals.showSignInForm.set(false);
      } else {
        this.signals.credentialsSignInErrorText.set(res.errorMessage || `Can't sign in`);
      }
    } catch (err) {
      this.signals.credentialsSignInErrorText.set(`Can't sign in. Verify username and password`);
    } finally {
      this.changeSignInFormEnabledState(true);
      this.signals.signingIn.set(false);
    }
  }

  getUrlSearchParams(): CodeSignInUrlSeachParams {
    const url = URL.parse(location.href)!;
    const result: CodeSignInUrlSeachParams = {
      identifierType: url.searchParams.get(UrlSearchParameterName.identifierType),
      code: url.searchParams.get(UrlSearchParameterName.signInCode),
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
      changePassword: new FormControl(null),
      newPassword: new FormControl(null),
      repeatNewPassword: new FormControl(null),
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
      codeIsNotValid: signal(false),
      codeRemainingSeconds: signal(null),
      codeDurationSeconds: signal(0),
      signedIn: signal(false),
      signedInIdentifier: signal(null),
      changePasswordResponseMessage: signal(null),
      changePasswordSuccess: signal(null),
      changePasswordEnabled: signal(null),
      signingIn: signal(false),
      codeUsed: signal(false),
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
  codeIsNotValid: WritableSignal<boolean>;
  codeRemainingSeconds: WritableSignal<number | null>;
  codeDurationSeconds: WritableSignal<number>;
  signedIn: WritableSignal<boolean>;
  signedInIdentifier: WritableSignal<string | undefined | null>;
  changePasswordResponseMessage: WritableSignal<string | null>;
  changePasswordSuccess: WritableSignal<boolean | null>;
  changePasswordEnabled: WritableSignal<boolean | null>;
  signingIn: WritableSignal<boolean>;
  codeUsed: WritableSignal<boolean>;
}

interface SignInFormControls {
  identifier: FormControl<string | null>;
  password: FormControl<string | null>
}

interface AccountsFormControls {
  account: FormControl<AccountItem | null>;
  changePassword: FormControl<boolean | null>;
  newPassword: FormControl<string | null>;
  repeatNewPassword: FormControl<string | null>;
}

const enum UrlSearchParameterName {
  signInCode = 'sign-in-code',
  identifierType = 'identifier-type',
}

interface CodeSignInUrlSeachParams {
  code: string | null;
  identifierType: string | null;
}
