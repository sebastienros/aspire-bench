export async function withFinalizer<T>(
  operation: () => Promise<T>, finalize: () => Promise<void>,
): Promise<T> {
  let failure: unknown;
  let failed = false;
  try {
    return await operation();
  } catch (error) {
    failed = true;
    failure = error;
    throw error;
  } finally {
    try {
      await finalize();
    } catch (error) {
      if (failed) throw new AggregateError([failure, error], `Execution and cleanup both failed: ${
        [failure, error].map(item => item instanceof Error ? item.message : String(item)).join("; ")}`);
      throw error;
    }
  }
}
