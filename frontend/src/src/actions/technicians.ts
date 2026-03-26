'use server';

const API_BASE = 'http://127.0.0.1:8000';

export async function getTechnicians() {
  const response = await fetch(`${API_BASE}/api/v1/users`, { cache: 'no-store' });
  if (!response.ok) {
    return [];
  }

  const users = await response.json();
  return (users || [])
    .filter((u: any) => u.is_technician)
    .map((u: any) => ({
      id: String(u.id),
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      vehicle: 'N/A',
      status: 'En servei actiu',
      loc: 'Base',
    }));
}

export async function saveTechnician(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  try {
    const createRes = await fetch(`${API_BASE}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username: email || `tech_${Date.now()}`,
        phone,
        email,
        passwd: 'changeme',
        is_technician: true,
        zone: 'General',
      }),
    });

    if (!createRes.ok && createRes.status !== 409) {
      return { error: 'Error al guardar el tecnic a l\'API.' };
    }

    return { success: true };
  } catch {
    return { error: 'Error de xarxa al guardar el tecnic.' };
  }
}