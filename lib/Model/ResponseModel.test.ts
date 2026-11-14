import { describe, expect, it } from "vitest";
import { ResponseModel } from "./ResponseModel";

describe("ResponseModel", () => {
  it("starts without data", () => {
    const response = new ResponseModel<string>("t-1");
    expect(response.transactionId).toBe("t-1");
    expect(response.errorCode).toBeUndefined();
    expect(response.data).toBeUndefined();
  });

  it("takes an error code and a message", () => {
    const response = new ResponseModel(undefined, 400, "Invalid");
    expect(response).toMatchObject({ errorCode: 400, message: "Invalid" });
  });

  it("keeps the chained setters", () => {
    const response = new ResponseModel<number[]>("t-1")
      .withData([1])
      .withError(500, "Failed");
    expect(response).toMatchObject({
      transactionId: "t-1",
      data: [1],
      errorCode: 500,
      message: "Failed",
    });
  });
});
