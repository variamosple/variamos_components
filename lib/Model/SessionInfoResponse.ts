import { SessionUser } from "./SessionUser";

export interface SessionInfoResponse {
  user: SessionUser;
  authToken?: string;
  redirect?: string;
}
