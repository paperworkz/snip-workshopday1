import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ShortLink } from './links.service';

describe('Snip frontend', () => {
  const link: ShortLink = {
    code: 'Ab12Cd', url: 'https://example.com/path',
    shortUrl: 'http://localhost:3000/Ab12Cd', hits: 0, createdAt: '2026-11-16T00:00:00.000Z'
  };
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function start() {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/links').flush([]);
    fixture.detectChanges();
    return fixture;
  }

  it('rejects empty, malformed and non-HTTP URLs without posting', () => {
    const fixture = start();
    for (const url of ['', 'not a url', 'ftp://example.com', 'javascript:alert(1)']) {
      fixture.componentInstance.form.controls.url.setValue(url);
      fixture.componentInstance.submit();
      expect(fixture.componentInstance.form.invalid).toBeTrue();
    }
    http.expectNone((req) => req.method === 'POST');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#url-error').textContent).toContain('valid HTTP');
    for (const url of ['http://example.com', 'https://example.com/path?q=1']) {
      fixture.componentInstance.form.controls.url.setValue(url);
      expect(fixture.componentInstance.form.valid).toBeTrue();
    }
  });

  it('posts once while pending, shows success and refreshes the links table', () => {
    const fixture = start();
    const app = fixture.componentInstance;
    app.form.controls.url.setValue(`  ${link.url}  `);
    app.submit();
    app.submit();
    const request = http.expectOne('/api/links');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: link.url });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBeTrue();
    request.flush(link, { status: 201, statusText: 'Created' });
    const refresh = http.expectOne('/api/links');
    expect(refresh.request.method).toBe('GET');
    refresh.flush([link]);
    fixture.detectChanges();
    expect(app.submitting()).toBeFalse();
    expect(app.form.controls.url.value).toBe('');
    expect(fixture.nativeElement.querySelector('.result a').getAttribute('href')).toBe(link.shortUrl);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(link.url);
  });

  it('keeps input on API failure, displays the server error and allows retry', () => {
    const fixture = start();
    const app = fixture.componentInstance;
    app.form.controls.url.setValue(link.url);
    app.submit();
    http.expectOne('/api/links').flush({ error: 'Invalid URL supplied.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(app.submitting()).toBeFalse();
    expect(app.form.controls.url.value).toBe(link.url);
    expect(fixture.nativeElement.querySelector('#url-error').textContent).toContain('Invalid URL supplied.');
    app.submit();
    http.expectOne('/api/links').error(new ProgressEvent('error'));
    expect(app.submitError()).toContain('Cannot reach Snip');
  });

  it('shows loading, failure, retry and empty collection states', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading links...');
    http.expectOne('/api/links').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('request failed');
    fixture.nativeElement.querySelector('button.secondary').click();
    http.expectOne('/api/links').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No links yet');
  });
});
