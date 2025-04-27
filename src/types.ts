export interface User {
  id: string;
  username: string;
  password: string;
  permissions: string[];
  email: string;
}

export interface AuthResponse {
  token: string;
  permissions: string[];
}

export interface StateResponse {
  authenticated: boolean;
  username: string;
  permissions: string[];
}
