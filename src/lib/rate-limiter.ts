export class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(private capacity: number, private refillRate: number) {
      this.tokens = capacity;
      this.lastRefill = Date.now();
    }

    async consume(): Promise<void> {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      // Wait for next token
      const waitTime = (1 - this.tokens) * (1000 / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
      this.tokens -= 1;
    }

    private refill() {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      const newTokens = elapsed * (this.refillRate / 1000);
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }