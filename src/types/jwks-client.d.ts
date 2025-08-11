declare module 'jwks-client' {
  export interface SigningKey {
    kid: string;
    nbf?: number;
    publicKey?: string;
    rsaPublicKey?: string;
    getPublicKey(): string;
  }

  export interface ClientOptions {
    jwksUri: string;
    cache?: boolean;
    cacheMaxEntries?: number;
    cacheMaxAge?: number;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
    requestHeaders?: Record<string, string>;
    timeout?: number;
  }

  export interface JwksClient {
    getSigningKey(kid: string, callback: (err: Error | null, key?: SigningKey) => void): void;
  }

  const JwksClientConstructor: {
    new (options: ClientOptions): JwksClient;
  };

  export default JwksClientConstructor;
}
