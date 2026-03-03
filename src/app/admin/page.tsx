import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const currentUser = await requireUser();
  // Simple check - in real app add ADMIN role
  if (!currentUser) redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="min-h-screen bg-muted/20 p-6 md:p-12">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">Manage user accounts and tiers.</p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
           <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Link>
      </header>

      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>All registered users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span>{user.fullName || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{(user as any).university?.name || "-"}</TableCell>
                    <TableCell>{user.isAdmin ? 'ADMIN' : 'USER'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-bold">-</span> / -
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
