"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GroupManagement({ sessionId }: { sessionId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Group management features are currently disabled due to schema constraints.
          Submissions can still be tagged with Group IDs manually if needed.
        </p>
      </CardContent>
    </Card>
  );
}
