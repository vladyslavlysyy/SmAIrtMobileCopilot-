'use server';

import { cookies } from 'next/headers';

type SessionUser = {
  name: string;
  email: string;
  role: string;
  phone: string;
};

function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), 'utf-8').toString('base64url');
}

function decodeSession(value: string): SessionUser | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf-8')) as SessionUser;
  } catch {
    return null;
  }
}

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const username = (formData.get('username') as string) || email;
  const password = (formData.get('password') as string) || 'changeme';

  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username,
        phone,
        email,
        passwd: password,
        is_technician: false,
      }),
    });

    if (!response.ok) {
      return { error: 'No s\'ha pogut registrar l\'usuari a l\'API.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('session_user', encodeSession({ name, email, role: 'operations', phone }), {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
    });

    return { success: true, name, email };
  } catch {
    return { error: 'Error de xarxa registrant l\'usuari.' };
  }
}

export async function loginUser(formData: FormData) {
  const username = (formData.get('username') as string) || '';
  const email = username.includes('@') ? username : `${username}@local.dev`;

  const cookieStore = await cookies();
  cookieStore.set('session_user', encodeSession({ name: username || 'User', email, role: 'operations', phone: '' }), {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true, name: username || 'User', email };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('session_user');
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session_user')?.value;
  if (!session) {
    return null;
  }
  return decodeSession(session);
}

export async function updateProfile(formData: FormData) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session_user')?.value;
  const current = session ? decodeSession(session) : null;
  if (!current) {
    return { error: 'No hi ha sessio activa' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  const nextUser: SessionUser = {
    name: name || current.name,
    email: email || current.email,
    phone: phone || current.phone,
    role: current.role || 'operations',
  };

  cookieStore.set('session_user', encodeSession(nextUser), {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true };
}