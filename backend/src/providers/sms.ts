import { env } from "../config/env.js";

export type SmsPayload = {
  to: string;
  message: string;
};

export interface SmsProvider {
  send(payload: SmsPayload): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  async send(payload: SmsPayload) {
    console.info("[mock-sms]", payload);
  }
}

class HubtelSmsProvider implements SmsProvider {
  async send(payload: SmsPayload) {
    if (!env.HUBTEL_CLIENT_ID || !env.HUBTEL_CLIENT_SECRET) {
      throw new Error("Hubtel credentials are missing.");
    }

    console.info("[hubtel-sms]", payload);
  }
}

export const smsProvider: SmsProvider =
  env.SMS_PROVIDER_MODE === "hubtel" ? new HubtelSmsProvider() : new MockSmsProvider();
