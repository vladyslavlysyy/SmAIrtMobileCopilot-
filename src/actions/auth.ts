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
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, username, phone, email, password: hashedPassword }
    });

    const cookieStore = await cookies();
    cookieStore.set('session_id', user.id, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 });

    return { success: true, name: user.name, email: user.email };
  } catch (error) {
    return { error: 'El compte o correu ja existeix a la base de dades.' };
  }
}

export async function loginUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { error: 'Usuari no trobat' };

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return { error: 'Contrasenya incorrecta' };

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
    // AÑADIDO: Ahora también traemos el teléfono de la Base de Datos
    select: { name: true, email: true, role: true, phone: true } 
  });
  return user;
}

// --- NUEVA FUNCIÓN PARA GUARDAR EL PERFIL ---
export async function updateProfile(formData: FormData) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return { error: 'No hi ha sessió activa' };

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const currentPass = formData.get('currentPass') as string;
  const newPass = formData.get('newPass') as string;

  try {
    const user = await prisma.user.findUnique({ where: { id: sessionId } });
    if (!user) return { error: 'Usuari no trobat' };

    // Preparamos los datos a actualizar
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Si el usuario intenta cambiar la contraseña
    if (currentPass && newPass) {
      const isValid = await bcrypt.compare(currentPass, user.password);
      if (!isValid) return { error: 'La contrasenya actual és incorrecta' };
      updateData.password = await bcrypt.hash(newPass, 10);
    }

    // Actualizamos la base de datos
    await prisma.user.update({
      where: { id: sessionId },
      data: updateData
    });

    return { success: true };
  } catch (error) {
    return { error: 'Error a l\'actualitzar. Potser el correu ja està en ús per un altre compte.' };
  }
}