"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

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

  const getIcon = (action: string) => {
    switch (action) {
      case 'GRADED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'FLAGGED': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
             <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive shadow-sm animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No new notifications.</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(notif.action)}</div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{notif.action}</p>
                      <p className="text-xs text-muted-foreground">{notif.details}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {new Date(notif.timestamp).toLocaleString()}
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
