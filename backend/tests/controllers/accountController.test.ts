import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRes, createMockNext } from "../testUtils.js";

const { AccountMock, zernioMock } = vi.hoisted(() => ({
  AccountMock: {
    find: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
  },
  zernioMock: {
    accounts: {
      deleteAccount: vi.fn(),
    },
  },
}));

vi.mock("../../models/account.model.js", () => ({ Account: AccountMock }));
vi.mock("../../config/zernio.js", () => ({ default: zernioMock }));

import { getAccounts, addAccount, disconnectAccount } from "../../controllers/accountController.js";

describe("accountController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAccounts", () => {
    it("returns accounts scoped to the authenticated user", async () => {
      const accounts = [{ _id: "1", platform: "twitter" }];
      AccountMock.find.mockResolvedValue(accounts);
      const req: any = { user: { _id: "user1" } };
      const res = createMockRes();
      const next = createMockNext();

      getAccounts(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(AccountMock.find).toHaveBeenCalledWith({ user: "user1" });
      expect(res.body).toMatchObject({
        statusCode: 200,
        data: accounts,
        message: "Accounts fetched successfully",
        success: true,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards database errors to next", async () => {
      const error = new Error("db down");
      AccountMock.find.mockRejectedValue(error);
      const req: any = { user: { _id: "user1" } };
      const res = createMockRes();
      const next = createMockNext();

      getAccounts(req, res as any, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next).toHaveBeenCalledWith(error);
      expect(res.body).toBeUndefined();
    });
  });

  describe("addAccount", () => {
    it("creates an account scoped to the authenticated user", async () => {
      const created = { _id: "a1", platform: "twitter", handle: "@me" };
      AccountMock.create.mockResolvedValue(created);
      const req: any = {
        user: { _id: "user1" },
        body: { platform: "twitter", handle: "@me", avatarUrl: "http://img" },
      };
      const res = createMockRes();
      const next = createMockNext();

      addAccount(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(AccountMock.create).toHaveBeenCalledWith({
        user: "user1",
        platform: "twitter",
        handle: "@me",
        avatarUrl: "http://img",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        statusCode: 201,
        data: created,
        message: "Account added successfully",
      });
    });

    it("forwards creation errors to next", async () => {
      const error = new Error("validation failed");
      AccountMock.create.mockRejectedValue(error);
      const req: any = { user: { _id: "user1" }, body: { platform: "twitter", handle: "@me" } };
      const res = createMockRes();
      const next = createMockNext();

      addAccount(req, res as any, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalled());

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("disconnectAccount", () => {
    it("returns 404 when the account does not belong to the user", async () => {
      AccountMock.findOne.mockResolvedValue(null);
      const req: any = { user: { _id: "user1" }, params: { id: "missing" } };
      const res = createMockRes();
      const next = createMockNext();

      disconnectAccount(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(AccountMock.findOne).toHaveBeenCalledWith({ _id: "missing", user: "user1" });
      expect(res.statusCode).toBe(404);
      expect(res.body).toMatchObject({ statusCode: 404, data: null, message: "Account not found" });
      expect(zernioMock.accounts.deleteAccount).not.toHaveBeenCalled();
    });

    it("deletes the account locally when it has no zernioAccountId", async () => {
      const deleteOne = vi.fn().mockResolvedValue(undefined);
      AccountMock.findOne.mockResolvedValue({ _id: "a1", zernioAccountId: undefined, deleteOne });
      const req: any = { user: { _id: "user1" }, params: { id: "a1" } };
      const res = createMockRes();
      const next = createMockNext();

      disconnectAccount(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(zernioMock.accounts.deleteAccount).not.toHaveBeenCalled();
      expect(deleteOne).toHaveBeenCalledTimes(1);
      expect(res.body).toMatchObject({
        statusCode: 200,
        data: null,
        message: "Account disconnected successfully",
      });
    });

    it("deletes the account from zernio and then locally when zernioAccountId is present", async () => {
      const deleteOne = vi.fn().mockResolvedValue(undefined);
      zernioMock.accounts.deleteAccount.mockResolvedValue({});
      AccountMock.findOne.mockResolvedValue({ _id: "a1", zernioAccountId: "z1", deleteOne });
      const req: any = { user: { _id: "user1" }, params: { id: "a1" } };
      const res = createMockRes();
      const next = createMockNext();

      disconnectAccount(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(zernioMock.accounts.deleteAccount).toHaveBeenCalledWith({ path: { accountId: "z1" } });
      expect(deleteOne).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 and skips local deletion when the zernio deletion fails", async () => {
      const deleteOne = vi.fn();
      const zernioError = new Error("zernio unavailable");
      zernioMock.accounts.deleteAccount.mockRejectedValue(zernioError);
      AccountMock.findOne.mockResolvedValue({ _id: "a1", zernioAccountId: "z1", deleteOne });
      const req: any = { user: { _id: "user1" }, params: { id: "a1" } };
      const res = createMockRes();
      const next = createMockNext();

      disconnectAccount(req, res as any, next);
      await vi.waitFor(() => expect(res.body).toBeDefined());

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to disconnect account from Zernio: zernio unavailable");
      expect(deleteOne).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});