export interface ApiTokenClaims {
  sub: string;
  role: 'USER' | 'ADMIN';
  scope: string[];
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  cnf?: {
    jkt: string;
  };
}

export interface ApiTokenMintInput {
  subjectUserId: string;
  role: 'USER' | 'ADMIN';
  scope: string[];
  audience: string;
  expiresInSeconds: number;
  dpopJkt?: string;
}

export interface ApiTokenMintResult {
  token: string;
  expiresAt: Date;
}

export abstract class ApiTokenService {
  abstract mintToken(input: ApiTokenMintInput): Promise<ApiTokenMintResult>;
}
