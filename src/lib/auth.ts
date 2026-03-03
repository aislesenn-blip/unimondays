export async function getAuthenticatedUser() {
  return { id: "mock-user-id", email: "teacher@example.com", name: "Mock Teacher", role: "TEACHER" };
}

export async function requireAuth() {
  return await getAuthenticatedUser();
}

export async function verifyToken(token: string) {
  return { valid: true, decoded: { userId: "mock-user-id", role: "TEACHER" } };
}

export async function createToken(payload: any) {
  return "mock-jwt-token";
}
