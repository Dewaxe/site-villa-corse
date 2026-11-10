import { performance } from "node:perf_hooks";

const origin = "http://127.0.0.1:8789";
const sampleCount = 10;
const paths = ["/baseline", "/pbkdf2", "/scrypt"];

async function measure(path) {
  const start = performance.now();
  const response = await fetch(origin + path, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();
  return { elapsed: performance.now() - start, status: response.status, body };
}

for (const path of paths) {
  const warmup = await measure(path);
  if (warmup.status !== 204) {
    console.log(`${path}: HTTP ${warmup.status} ${warmup.body}`);
    if (path === "/baseline") process.exitCode = 1;
    continue;
  }

  const samples = [];
  for (let run = 0; run < sampleCount; run++) {
    const result = await measure(path);
    if (result.status !== 204) {
      throw new Error(`${path}: HTTP ${result.status} ${result.body}`);
    }
    samples.push(result.elapsed);
  }

  samples.sort((a, b) => a - b);
  const middle = sampleCount / 2;
  const median = (samples[middle - 1] + samples[middle]) / 2;
  console.log(`${path}: n=${sampleCount}, median=${median.toFixed(1)} ms, max=${samples.at(-1).toFixed(1)} ms`);
}
