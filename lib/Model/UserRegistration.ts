import { Credentials } from "./Credentials";

export class UserRegistration extends Credentials {
  constructor(
    public name: string,
    email: string,
    password: string,
    public passwordConfirmation: string
  ) {
    super(email, password);
  }
}
