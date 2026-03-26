const originalWrite = process.stderr.write.bind(process.stderr);

process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  if (String(chunk).includes("Not implemented")) return true;
  return originalWrite(chunk, ...rest);
}) as typeof process.stderr.write;
