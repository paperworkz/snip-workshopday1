import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { LinksService, ShortLink } from './links.service';

const httpUrl: ValidatorFn = (control) => {
  try {
    const url = new URL(String(control.value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
};

function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach Snip. Check your connection and try again.';
    }
    const body: unknown = error.error;
    if (typeof body === 'object' && body !== null && 'error' in body &&
        typeof body.error === 'string') {
      return body.error;
    }
  }
  return 'The request failed. Please try again.';
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly api = inject(LinksService);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;

  readonly form = new FormGroup({
    url: new FormControl('', { nonNullable: true, validators: [Validators.required, httpUrl] })
  });
  readonly links = signal<ShortLink[]>([]);
  readonly result = signal<ShortLink | null>(null);
  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly submitError = signal('');
  readonly listError = signal('');

  ngOnInit(): void {
    this.refresh();
  }

  submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.submitError.set('');
    this.result.set(null);
    this.api.create(this.form.controls.url.value.trim()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: (link) => {
        this.result.set(link);
        this.form.reset();
        this.refresh();
      },
      error: (error: unknown) => this.submitError.set(errorMessage(error))
    });
  }

  refresh(): void {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.listError.set('');
    this.listRequest = this.api.list().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (links) => this.links.set(links),
      error: (error: unknown) => this.listError.set(errorMessage(error))
    });
  }
}
