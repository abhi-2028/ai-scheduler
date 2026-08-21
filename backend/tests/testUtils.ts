import { vi } from "vitest";

export interface MockResponse {
  statusCode?: number;
  body?: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
}

/**
 * Builds a minimal Express-like Response stub sufficient for exercising
 * controllers that only call `res.status(...)` and/or `res.json(...)`.
 */
export function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: undefined,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

export function createMockNext() {
  return vi.fn();
}