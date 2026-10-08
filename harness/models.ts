export function modelList(value: string): string[] {
  if (/[\r\n]/.test(value)) throw new Error("Invalid newline in --model");
  const models = value.split(",").map(model => model.trim());
  if (models.some(model => !model || /[\r\n]/.test(model))) {
    throw new Error("--model requires nonempty comma-separated model names");
  }
  if (new Set(models).size !== models.length) throw new Error("Duplicate model in --model");
  return models;
}
