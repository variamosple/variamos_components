export interface singInResponse {
  id?: string;
  redirect: string;
  /**
   * The password is right and the account has a second factor: no session
   * yet, the code is expected (useSession().verifySecondFactor).
   */
  mfaRequired?: boolean;
  /** How many days a browser can be trusted, when the admin offers it. */
  trustedDeviceDays?: number;
}
