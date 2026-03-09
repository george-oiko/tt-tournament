// src/app/core/auth/guards.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};

export const eventManagerGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  if (auth.isAdmin() || auth.isEventManager()) return true;
  return router.createUrlTree(['/events']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree(['/dashboard']);
};
