import type {
  PublicUser,
  LoginBody,
  SignupBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from '@filedrop/shared';
import { api } from './client';

type UserEnvelope = { user: PublicUser };

export const authApi = {
  me: () => api.get<UserEnvelope>('/auth/me').then((r) => r.user),
  login: (body: LoginBody) =>
    api.post<UserEnvelope>('/auth/login', body).then((r) => r.user),
  signup: (body: SignupBody) =>
    api.post<UserEnvelope>('/auth/signup', body).then((r) => r.user),
  logout: () => api.post<void>('/auth/logout'),
  logoutAll: () => api.post<void>('/auth/logout-all'),
  forgotPassword: (body: ForgotPasswordBody) =>
    api.post<void>('/auth/forgot-password', body),
  resetPassword: (body: ResetPasswordBody) =>
    api.post<void>('/auth/reset-password', body),
};
