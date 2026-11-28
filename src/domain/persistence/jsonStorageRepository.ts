export interface IKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IJsonRepository<T> {
  load(): T;
  save(value: T): T;
}

export function resolveBrowserStorage(storage?: IKeyValueStorage | null): IKeyValueStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class JsonStorageRepository<T> implements IJsonRepository<T> {
  private readonly storage: IKeyValueStorage | null;
  private readonly storageKey: string;
  private readonly fallbackFactory: () => T;
  private readonly sanitize: (raw: unknown) => T;

  public constructor(
    storageKey: string,
    fallbackFactory: () => T,
    sanitize: (raw: unknown) => T,
    storage?: IKeyValueStorage | null,
  ) {
    this.storageKey = storageKey;
    this.fallbackFactory = fallbackFactory;
    this.sanitize = sanitize;
    this.storage = resolveBrowserStorage(storage);
  }

  public load(): T {
    if (!this.storage) {
      return this.fallbackFactory();
    }
    try {
      const raw = this.storage.getItem(this.storageKey);
      return raw ? this.sanitize(JSON.parse(raw)) : this.fallbackFactory();
    } catch {
      return this.fallbackFactory();
    }
  }

  public save(value: T): T {
    const clean = this.sanitize(value);
    if (this.storage) {
      try {
        this.storage.setItem(this.storageKey, JSON.stringify(clean));
      } catch {
        // Ignore storage quota or private-mode failures
      }
    }
    return clean;
  }
}
