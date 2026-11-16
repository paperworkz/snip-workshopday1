import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ShortLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly http = inject(HttpClient);

  list(): Observable<ShortLink[]> {
    return this.http.get<ShortLink[]>('/api/links');
  }

  create(url: string): Observable<ShortLink> {
    return this.http.post<ShortLink>('/api/links', { url });
  }
}
