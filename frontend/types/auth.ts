export type UserRole = 'admin' | 'kasir';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

