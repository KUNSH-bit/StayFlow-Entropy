import { useState } from 'react';
import { useHotel } from '@/store/HotelStore';

function amount(value: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
}

export function BillingTab() {
  const { invoices, dashboard, currentSession, recordPayment, dataLoading } = useHotel();
  const canOperate = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');
  const currency = dashboard?.hotel.currency ?? 'INR';
  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Invoices &amp; guest payments</h2>
        <p className="text-xs text-gray-400">Record cash, bank, UPI, or card payments. Card data is never stored by StayFlow.</p>
      </div>
      {!dataLoading && invoices.length === 0 && <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">Invoices are created automatically with reservations.</div>}
      <div className="space-y-2">
        {invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} currency={currency} canOperate={canOperate} onRecord={(value, method) => recordPayment(invoice.id, value, method)} />)}
      </div>
    </div>
  );
}

function InvoiceCard({ invoice, currency, canOperate, onRecord }: { invoice: { id: string; bookingId: string; guest: string; room: string; totalDue: number; amountPaid: number; balance: number; status: string }; currency: string; canOperate: boolean; onRecord: (amount: number, method: string) => void }) {
  const [paymentAmount, setPaymentAmount] = useState(invoice.balance.toFixed(2));
  const [method, setMethod] = useState('UPI');
  return <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-xs">
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-bold text-gray-900 dark:text-white">Folio · {invoice.guest}</p><p className="text-[11px] text-gray-400">Room {invoice.room} · Booking {invoice.bookingId.slice(0, 8)}</p><p className="text-[11px] text-gray-500 mt-1">Total {amount(invoice.totalDue, currency)} · Paid {amount(invoice.amountPaid, currency)} · Balance <strong>{amount(invoice.balance, currency)}</strong></p></div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${invoice.status === 'VOID' ? 'bg-gray-100 text-gray-600' : invoice.balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{invoice.status === 'VOID' ? 'Voided' : invoice.balance > 0 ? 'Outstanding' : 'Paid'}</span>
    </div>
    {canOperate && invoice.balance > 0 && <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-2">
      <label className="text-[10px] text-gray-500">Amount<input type="number" min="0.01" max={invoice.balance} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="block w-32 mt-1 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white" /></label>
      <label className="text-[10px] text-gray-500">Method<select value={method} onChange={(event) => setMethod(event.target.value)} className="block mt-1 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white"><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card terminal</option><option value="OTHER">Other</option></select></label>
      <button type="button" disabled={!Number(paymentAmount) || Number(paymentAmount) > invoice.balance} onClick={() => onRecord(Number(paymentAmount), method)} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50">Record payment</button>
    </div>}
  </div>;
}
