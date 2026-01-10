/**
 * Guards components for FantaCTV
 *
 * Permission-based UI guards for controlling access to content
 * and displaying read-only indicators.
 */

export {
  PermissionGuard,
  EditGuard,
  ViewGuard,
  AdminOnlyGuard,
} from './PermissionGuard';
export type { PermissionGuardProps } from './PermissionGuard';

export { ReadOnlyBanner, ReadOnlyIndicator } from './ReadOnlyBanner';
export type { ReadOnlyBannerProps } from './ReadOnlyBanner';
