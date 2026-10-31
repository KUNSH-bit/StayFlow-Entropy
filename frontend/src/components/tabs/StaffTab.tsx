import { useEffect, useState, type FormEvent } from 'react';
import { useHotel } from '@/store/HotelStore';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api';

const INPUT = 'px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs';

export function StaffTab() {
  const { staffMembers, currentSession, createStaffMember, createStaffSchedule, updateStaffMember, dataLoading, showToast } = useHotel();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Front Desk');
  const [email, setEmail] = useState('');
  const canManage = ['OWNER', 'MANAGER'].includes(currentSession?.membershipRole ?? '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createStaffMember({ name: name.trim(), department: department.trim(), email: email.trim() });
    setName(''); setEmail(''); setShowForm(false);
  }

  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center gap-3">
        <div><h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Staff directory &amp; shift schedule</h2><p className="text-xs text-gray-400">Manage property staff and assign date-specific shifts.</p></div>
        {canManage && <button type="button" onClick={() => setShowForm((visible) => !visible)} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">{showForm ? 'Cancel' : '+ Add staff'}</button>}
      </div>
      {showForm && <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="text-[11px] text-gray-500">Full name<input required minLength={2} maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
        <label className="text-[11px] text-gray-500">Department<input required maxLength={100} value={department} onChange={(event) => setDepartment(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
        <label className="text-[11px] text-gray-500">Work email<input required type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
        <button disabled={dataLoading} type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Save staff member</button>
      </form>}
      {!dataLoading && staffMembers.length === 0 && <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">No staff members have been added.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {staffMembers.map((staff) => <StaffCard key={staff.id} staff={staff} canManage={canManage} onSchedule={(schedule) => createStaffSchedule(staff.id, schedule)} onStatus={(isActive) => updateStaffMember(staff.id, isActive)} />)}
      </div>
      {canManage && <HotelTeamPanel onToast={showToast} />}
    </div>
  );
}

interface HotelMemberRow { id: string; userId: string; name: string; email: string; role: string; createdAt: string }

function HotelTeamPanel({ onToast }: { onToast: (message: string) => void }) {
  const [members, setMembers] = useState<HotelMemberRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('FRONT_DESK');
  const [inviteUrl, setInviteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    apiGet<{ memberships: HotelMemberRow[] }>('/hotels/memberships').then((result) => { if (active) setMembers(result.memberships); }).catch((error: unknown) => { if (active) onToast(error instanceof Error ? error.message : 'Could not load hotel access.'); });
    return () => { active = false; };
  }, [onToast]);

  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy(true); setInviteUrl('');
    try {
      const result = await apiPost<{ invite: { inviteUrl: string } }>('/hotels/invites', { email: email.trim(), role });
      setInviteUrl(result.invite.inviteUrl); setEmail(''); onToast('Invitation created. Share the link with the team member.');
    } catch (error) { onToast(error instanceof Error ? error.message : 'Could not create the invitation.'); }
    finally { setBusy(false); }
  }

  async function changeRole(memberId: string, nextRole: string) {
    try {
      await apiPatch(`/hotels/memberships/${encodeURIComponent(memberId)}`, { role: nextRole });
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role: nextRole } : member));
      onToast('Hotel access role updated.');
    } catch (error) { onToast(error instanceof Error ? error.message : 'Could not update the role.'); }
  }

  async function removeMember(member: HotelMemberRow) {
    if (!window.confirm(`Remove ${member.name} from this hotel?`)) return;
    try {
      await apiDelete(`/hotels/memberships/${encodeURIComponent(member.id)}`);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      onToast('Hotel access removed.');
    } catch (error) { onToast(error instanceof Error ? error.message : 'Could not remove hotel access.'); }
  }

  return <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="mb-3"><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Hotel access &amp; roles</h3><p className="text-[10px] text-gray-400 mt-1">Hotel access is separate from employee records. Invite links are shown once.</p></div>
    <form onSubmit={(event) => void invite(event)} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end mb-3">
      <label className="text-[10px] text-gray-500">Team member email<input required type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
      <label className="text-[10px] text-gray-500">Hotel role<select value={role} onChange={(event) => setRole(event.target.value)} className={`${INPUT} block w-full mt-1`}><option value="MANAGER">Manager</option><option value="FRONT_DESK">Front desk</option><option value="HOUSEKEEPING">Housekeeping</option><option value="VIEWER">Read only</option></select></label>
      <button disabled={busy} type="submit" className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50">Create invitation</button>
    </form>
    {inviteUrl && <div className="mb-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2 text-[10px] break-all text-blue-800 dark:text-blue-200"><span className="font-semibold">Invitation link:</span> {inviteUrl}<button type="button" onClick={() => void navigator.clipboard?.writeText(inviteUrl).then(() => onToast('Invitation link copied.')).catch(() => onToast('Copy the invitation link from this field.'))} className="ml-2 underline">Copy</button></div>}
    <div className="space-y-2">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700 pt-2 text-xs"><div><p className="font-semibold text-gray-800 dark:text-gray-100">{member.name}</p><p className="text-[10px] text-gray-400">{member.email}</p></div><div className="flex items-center gap-2"><select aria-label={`Role for ${member.name}`} value={member.role} disabled={member.role === 'OWNER'} onChange={(event) => void changeRole(member.id, event.target.value)} className="px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 text-xs">{member.role === 'OWNER' && <option value="OWNER">Owner</option>}<option value="MANAGER">Manager</option><option value="FRONT_DESK">Front desk</option><option value="HOUSEKEEPING">Housekeeping</option><option value="VIEWER">Read only</option></select>{member.role !== 'OWNER' && <button type="button" onClick={() => void removeMember(member)} className="text-red-600 text-[10px]">Remove</button>}</div></div>)}</div>
  </section>;
}

function StaffCard({ staff, canManage, onSchedule, onStatus }: { staff: { id: string; name: string; role: string; shift: string; status: string }; canManage: boolean; onSchedule: (schedule: { shiftDate: string; startTime: string; endTime: string }) => void; onStatus: (active: boolean) => void }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  function submit(event: FormEvent) { event.preventDefault(); onSchedule({ shiftDate, startTime, endTime }); setShowSchedule(false); }
  return <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-xs">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center space-x-3 min-w-0"><div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0">{staff.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="font-bold text-gray-900 dark:text-white truncate">{staff.name}</p><p className="text-[11px] text-gray-400">{staff.role} · {staff.shift}</p></div></div>
      <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${staff.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{staff.status}</span>{canManage && <button type="button" onClick={() => onStatus(staff.status !== 'Active')} className="text-[10px] text-brand-600 underline">{staff.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button>}</div>
    </div>
    {canManage && staff.status === 'Active' && <div className="mt-3"><button type="button" onClick={() => setShowSchedule((visible) => !visible)} className="text-[10px] text-brand-600 dark:text-brand-300 font-semibold">{showSchedule ? 'Close shift form' : 'Schedule a shift'}</button>
      {showSchedule && <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2"><label className="text-[10px] text-gray-500">Date<input type="date" required value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} className="block mt-1 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600" /></label><label className="text-[10px] text-gray-500">Start<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} className="block mt-1 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600" /></label><label className="text-[10px] text-gray-500">End<input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} className="block mt-1 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600" /></label><button className="px-2 py-1.5 rounded bg-brand-600 text-white text-[10px]">Save shift</button></form>}
    </div>}
  </div>;
}
