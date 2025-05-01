import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ccs3-qr-remaining-seconds',
  templateUrl: 'remaining-seconds.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class RemainingSecondsComponent {
  remainingSeconds = input<number | null>(null);
  maxValue = input<number>(0);
}
