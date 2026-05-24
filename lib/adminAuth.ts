export function isAdminRequest(req: Request): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${key}`;
}
