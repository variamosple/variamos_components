export class ResponseModel<Type> {
  // The data is set with withData: a fifth parameter was never passed
  constructor(
    public transactionId?: string,
    public errorCode?: number,
    public message?: string,
    public totalCount?: number,
  ) {}

  data?: Type;

  withData(data: Type): this {
    this.data = data;
    return this;
  }

  withError(errorCode: number, errorMessage: string): this {
    this.errorCode = errorCode;
    this.message = errorMessage;
    return this;
  }
}
