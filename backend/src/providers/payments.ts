export interface PaymentsProvider {
  initiate(): Promise<never>;
}

class PlaceholderPaymentsProvider implements PaymentsProvider {
  async initiate(): Promise<never> {
    throw new Error("Paystack is deferred for this MVP release.");
  }
}

export const paymentsProvider: PaymentsProvider = new PlaceholderPaymentsProvider();
