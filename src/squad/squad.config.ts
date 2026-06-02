export interface SquadModuleOptions {
  /**
   * Your Squad secret key (sandbox or production).
   * Sandbox keys start with `sandbox_sk_`.
   */
  secretKey: string;
  /**
   * Set to `true` to use the production API.
   * Defaults to `false` (sandbox).
   */
  isProduction?: boolean;
}

export const SQUAD_MODULE_OPTIONS = 'SQUAD_MODULE_OPTIONS';

export const SQUAD_SANDBOX_BASE_URL = 'https://sandbox-api-d.squadco.com';
export const SQUAD_PRODUCTION_BASE_URL = 'https://api-d.squadco.com';
