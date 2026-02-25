"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Mail, Phone } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Account Security</CardTitle>
          <CardDescription>
            Password Reset Request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed">
            For security reasons, automated password resets are currently disabled. Please contact the System Administrator to securely reset your password.
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="font-semibold text-sm text-foreground">Contact Support</h3>

            <div className="flex items-center gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Phone Support</span>
                <span className="text-sm text-muted-foreground">0745780988</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Email Support</span>
                <span className="text-sm text-muted-foreground">support@playbook.edu</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full" variant="outline">
              Return to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
