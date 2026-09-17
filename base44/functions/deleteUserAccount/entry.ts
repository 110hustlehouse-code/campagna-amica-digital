import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete related records first
    const staffMembers = await base44.asServiceRole.entities.StaffMember.filter({ email: user.email });
    for (const staff of staffMembers) {
      await base44.asServiceRole.entities.StaffMember.delete(staff.id);
    }

    // Delete notifications
    const notifications = await base44.asServiceRole.entities.Notification.filter({ user_email: user.email });
    for (const notif of notifications) {
      await base44.asServiceRole.entities.Notification.delete(notif.id);
    }

    // User deletion is handled server-side via auth system
    // This is just for cleanup of related data
    return Response.json({ success: true, message: 'Account deletion initiated' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});