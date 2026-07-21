export function hasConfiguredMongoUri(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.MONGODB_URI?.trim());
}
