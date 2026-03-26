'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string;
  const username = formData.get('username') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // 1. Encriptar contraseña de verdad
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Guardar en Base de Datos
    const user = await prisma.user.create({
      data: { name, username, phone, email, password: hashedPassword }
    });

    // 3. Crear sesión real con Cookie
    const cookieStore = await cookies();
    cookieStore.set('session_id', user.id, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 });

    return { success: true, name: user.name, email: user.email };
  } catch (error) {
    return { error: 'El usuario o email ja existeix a la base de dades.' };
  }
}

export async function loginUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  // 1. Buscar en BD
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { error: 'Usuari no trobat' };

  // 2. Comprobar contraseña
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return { error: 'Contrasenya incorrecta' };

  // 3. Crear cookie de sesión
  const cookieStore = await cookies();
  cookieStore.set('session_id', user.id, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 });

  return { success: true, name: user.name, email: user.email };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('session_id');
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: { name: true, email: true, role: true } // Nunca enviamos la contraseña al frontend
  });
  return user;
}