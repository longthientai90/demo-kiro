export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    userName: string;
    userId: string;
  };
}

export interface JwtPayload {
  sub: string;  // user id
  userName: string;
  userId: string;
  iat: number;
  exp: number;
}