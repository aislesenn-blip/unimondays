'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { loginUser } from '@/app/actions/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const initialState = {
  message: "",
}

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign In"}
        </Button>
    )
}

export default function LoginPage() {
    const [state, formAction] = useFormState(loginUser, initialState)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 text-muted-foreground hover:text-foreground")}>
            <ArrowLeft className="h-4 w-4" />
            Return Home
        </Link>
      </div>
      <Card className="w-full max-w-md border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to access your lecturer dashboard
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.message && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {state.message}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
              <Input id="email" name="email" type="email" placeholder="lecturer@university.edu" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton />
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
