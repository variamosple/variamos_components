import type { SessionUser } from "./SessionUser";

export interface SessionInfoResponse {
  user: SessionUser;
  redirect?: string;
}
