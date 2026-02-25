import { cookies } from 'next/headers';
import { prisma } from './prisma';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth-session');
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    return await prisma.user.findUnique({ where: { id: session.userId } });
  } catch {
    return null;
  }
}
