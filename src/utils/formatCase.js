function formatCase(value, allowedValues) {
  if (typeof value !== "string") return null;

  const formatted = value.trim().toLowerCase();

  return allowedValues[formatted] || null;
}

module.exports = formatCase;
