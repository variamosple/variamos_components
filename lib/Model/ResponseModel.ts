export class ResponseModel<Type> {
  constructor(
    public transactionId?: string,
    public errorCode?: number,
    public message?: string,
    public totalCount?: number,
    public data?: Type
  ) {}

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
