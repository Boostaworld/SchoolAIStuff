import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, MailOpen } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const NotificationTray: React.FC = () => {
  const { notifications, unreadCount, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useOrbitStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-cyan-500/50"
      >
        <Bell className="w-5 h-5 text-slate-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-3 md:right-6 top-20 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl shadow-black/50 z-[9999] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900">
            <span className="text-xs font-mono text-slate-400 uppercase">Notifications</span>
            <button
              onClick={() => markAllNotificationsRead()}
              className="text-[10px] text-cyan-400 hover:text-cyan-200"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
                <MailOpen className="w-4 h-4" />
                <span>No notifications</span>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className="p-3 border-b border-slate-900 flex gap-3 items-start">
                  <CheckCircle className={`w-4 h-4 ${n.is_read ? 'text-slate-600' : 'text-cyan-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{n.content?.message || n.content || 'Update'}</p>
                    {n.link_url && (
                      <a
                        href={n.link_url}
                        className="text-xs text-cyan-400 underline"
                        onClick={() => setOpen(false)}
                      >
                        View
                      </a>
                    )}
                    {!n.is_read && (
                      <button
                        onClick={() => markNotificationRead(n.id)}
                        className="text-[10px] text-slate-500 hover:text-cyan-200"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
