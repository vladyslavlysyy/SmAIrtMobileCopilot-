'use server';

import { prisma } from '@/lib/prisma';

export async function getTechnicians() {
  return await prisma.technician.findMany({
    orderBy: { createdAt: 'asc' }
  });
}

export async function saveTechnician(formData: FormData) {
  const id = formData.get('id') as string | null;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const vehicle = formData.get('vehicle') as string;
  const status = formData.get('status') as string;
  const loc = formData.get('loc') as string;

  try {
    if (id) {
      // Si tiene ID, actualizamos el técnico existente
      await prisma.technician.update({
        where: { id },
        data: { name, email, phone, vehicle, status, loc }
      });
    } else {
      // Si NO tiene ID, creamos un técnico nuevo
      await prisma.technician.create({
        data: { name, email, phone, vehicle, status, loc }
      });
    }
    return { success: true };
  } catch (error) {
    return { error: 'Error al guardar el tècnic. Potser el correu ja existeix.' };
  }
}