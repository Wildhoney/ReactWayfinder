const originalWrite = process.stderr.write.bind(
  process.stderr,
) as typeof process.stderr.write;

process.stderr.write = ((
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
  callback?: (error?: Error | null) => void,
): boolean => {
  if (String(chunk).includes("Not implemented")) return true;
  if (typeof encodingOrCallback === "function") {
    return originalWrite(chunk, encodingOrCallback);
  }
  return originalWrite(chunk, encodingOrCallback, callback);
}) as typeof process.stderr.write;
