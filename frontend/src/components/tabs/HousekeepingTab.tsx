import { useState, type FormEvent } from 'react';
import { useHotel } from '@/store/HotelStore';

export function HousekeepingTab() {
  const { housekeepingTasks, rooms, staffMembers, currentSession, toggleTaskStatus, createHousekeepingTask, dataLoading } = useHotel();
  const [showForm, setShowForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [title, setTitle] = useState('Room cleaning');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [employeeId, setEmployeeId] = useState('');
  const canOperate = ['OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING'].includes(currentSession?.membershipRole ?? '');
  const canCreate = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createHousekeepingTask({ roomNumber, title: title.trim(), priority, ...(employeeId ? { employeeId } : {}) });
    setTitle('Room cleaning'); setShowForm(false);
  }

  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center gap-3">
        <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Housekeeping &amp; task assignments</h2><p className="text-xs text-gray-400">Tasks completed after checkout move the room to inspected status.</p></div>
        {canCreate && rooms.length > 0 && <button type="button" onClick={() => setShowForm((visible) => !visible)} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">{showForm ? 'Cancel' : '+ Add task'}</button>}
      </div>
      {showForm && <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        <label className="text-[11px] text-gray-500">Room<select required value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600"><option value="">Select room</option>{rooms.map((room) => <option key={room.id} value={room.roomNumber}>{room.roomNumber}</option>)}</select></label>
        <label className="text-[11px] text-gray-500">Task<input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></label>
        <label className="text-[11px] text-gray-500">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        <label className="text-[11px] text-gray-500">Assign staff<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600"><option value="">Unassigned</option>{staffMembers.filter((staff) => staff.status === 'Active').map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label>
        <button disabled={dataLoading || !roomNumber} type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Create task</button>
      </form>}
      {!dataLoading && housekeepingTasks.length === 0 && <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">No housekeeping tasks are open.</div>}
      <div className="space-y-2">
        {housekeepingTasks.map((task) => <div key={task.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 min-w-0"><div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center shrink-0"><i className="fa-solid fa-broom"></i></div><div className="min-w-0"><p className="font-bold text-gray-900 dark:text-white">Room {task.room} · {task.task}</p><p className="text-[11px] text-gray-400">Assigned: {task.staff} · Priority: <span className="font-semibold text-amber-500">{task.priority}</span></p></div></div>
          {canOperate && task.status !== 'Completed' && task.status !== 'Cancelled' ? <button type="button" onClick={() => void toggleTaskStatus(task.id)} className="px-2 py-1 bg-brand-600 text-white rounded text-[10px] shrink-0">{task.status === 'Pending' ? 'Start task' : 'Complete task'}</button> : <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300">{task.status}</span>}
        </div>)}
      </div>
    </div>
  );
}
