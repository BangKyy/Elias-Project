import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const fail = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status });

/**
 * Deletes the signed-in user's account. Removing the auth user cascades to
 * profiles and elias_usage; cached Elias answers carry the user id only in
 * their key, so they are cleared here. Browsers can't send a cross-site DELETE
 * without a CORS preflight, which this route never allows.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, 'Sesi kamu sudah berakhir. Masuk lagi untuk menghapus akun.');

  const admin = createAdminClient();
  if (!admin) return fail(503, 'Penghapusan akun belum tersedia di server ini. Coba lagi nanti.');

  const { error: cacheError } = await admin.from('elias_insight_cache').delete().like('key', `%${user.id}%`);
  // Not fatal: the rows expire at midnight WIB anyway
  if (cacheError) console.error('Elias cache could not be cleared for a deleted account', cacheError);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Account could not be deleted', error);
    return fail(500, 'Akun gagal dihapus. Silakan coba lagi.');
  }
  return NextResponse.json({ ok: true });
}
