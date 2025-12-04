import { createAuthClient } from '@better-auth/client';

const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL || 'http://localhost:3000',
});

export async function signUp(email, password, name) {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await authClient.signOut();
  return { error };
}

export async function getSession() {
  const session = await authClient.getSession();
  return session;
}

export { authClient };
