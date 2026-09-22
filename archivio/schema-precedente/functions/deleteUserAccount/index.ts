/**
 * deleteUserAccount
 * Elimina i dati dell'utente corrente (dati relazionali).
 * L'eliminazione dell'account auth avviene lato Supabase (admin SDK o Supabase dashboard).
 *
 * Chiamata dal frontend: api.functions.invoke('deleteUserAccount', {})
 */
import { corsHeaders, supabase, getUserFromRequest } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    const userEmail = user.email as string;

    // 1. Delete staff_member records
    await supabase.from('staff_members').delete().eq('email', userEmail);

    // 2. Delete notifications
    if (userEmail) {
      await supabase.from('notifications').delete().eq('user_email', userEmail);
    }
    await supabase.from('notifications').delete().eq('user_id', userId);

    // 3. Delete favorites
    await supabase.from('favorites').delete().eq('user_id', userId);

    // 4. Delete orders (set user_id to null to preserve order history for the company)
    await supabase.from('orders').update({ user_id: null }).eq('user_id', userId);

    // 5. Delete public.users profile (cascade will handle auth.users via FK)
    await supabase.from('users').delete().eq('id', userId);

    // 6. Delete auth user (requires service role)
    await supabase.auth.admin.deleteUser(userId);

    return Response.json({ success: true, message: 'Account deleted' }, { headers: corsHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
