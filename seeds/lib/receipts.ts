import fs from 'fs';
import path from 'path';

export interface TestReceipt {
  suite: "smoke" | "canary" | "seed";
  id: string;
  timestamp: string;
  ok: boolean;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  logs?: Array<{ level: string; msg: string; timestamp?: string }>;
  durationMs?: number;
  error?: string;
}

export class ReceiptCapture {
  private logs: Array<{ level: string; msg: string; timestamp: string }> = [];
  private startTime = Date.now();

  log(level: "info" | "warn" | "error", msg: string) {
    const entry = { level, msg, timestamp: new Date().toISOString() };
    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] ${msg}`);
  }

  async writeReceipts(suite: TestReceipt['suite'], id: string, data: {
    ok: boolean;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    error?: string;
  }): Promise<TestReceipt> {
    const receipt: TestReceipt = {
      suite,
      id,
      timestamp: new Date().toISOString(),
      ok: data.ok,
      inputs: data.inputs,
      outputs: data.outputs,
      logs: this.logs,
      durationMs: Date.now() - this.startTime,
      error: data.error,
    };

    // Console JSONL for CI
    console.log(JSON.stringify({
      type: suite,
      id,
      ok: data.ok,
      durationMs: receipt.durationMs,
      ...(data.outputs && { counts: data.outputs }),
    }));

    // File artifact for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    const dir = path.join(process.cwd(), 'test-receipts', `${suite}s`, id, timestamp);
    await fs.promises.mkdir(dir, { recursive: true });
    
    const filename = path.join(dir, 'receipt.json');
    await fs.promises.writeFile(filename, JSON.stringify(receipt, null, 2));
    
    this.log('info', `Receipt written to ${filename}`);
    return receipt;
  }
}

export function createReceiptCapture(): ReceiptCapture {
  return new ReceiptCapture();
}
