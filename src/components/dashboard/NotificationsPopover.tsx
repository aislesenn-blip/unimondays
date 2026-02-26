"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle, Info, Gavel } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  action: string;
  details: string;
  timestamp: string;
  link?: string;
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = () => {
      // Don't set loading for background refreshes to avoid UI flicker
      fetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        })
        .catch(() => {});
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Initial Poll & Event Listener for Real-time Updates
  useEffect(() => {
      fetchNotifications();

      // Listen for global update events (e.g. from SubmissionDrawer)
      const handleUpdate = () => fetchNotifications();
      window.addEventListener('notification-update', handleUpdate);

      return () => window.removeEventListener('notification-update', handleUpdate);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPEAL': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'APPEAL_RESOLVED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
      setOpen(false);
      if (notif.link) {
          router.push(notif.link);
      }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
             <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center font-bold shadow-sm animate-pulse">
                 {notifications.length > 9 ? '9+' : notifications.length}
             </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/20">
          <h4 className="font-semibold text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
          </h4>
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center gap-2 text-muted-foreground">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="text-xs">Checking updates...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
                No pending actions.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted"
                    onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex gap-3 items-start">
                    <div className="mt-1 shrink-0">{getIcon(notif.type)}</div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-tight">{notif.action}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.details}</p>
                      <p className="text-[10px] text-muted-foreground/70 pt-1">
                        {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
