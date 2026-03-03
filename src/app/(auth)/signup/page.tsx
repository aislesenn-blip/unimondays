'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { registerUser } from '@/app/actions/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const initialState = {
  message: "",
}

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button className='w-full' type='submit' disabled={pending}>
            {pending ? 'Creating account...' : 'Create Account'}
        </Button>
    )
}

export default function SignupPage() {
  const [state, formAction] = useFormState(registerUser, initialState)

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/50 p-4 relative'>
      <div className='absolute top-4 left-4'>
        <Link href='/' className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 text-muted-foreground hover:text-foreground')}>
          <ArrowLeft className='h-4 w-4' />
          Return Home
        </Link>
      </div>
      <Card className='w-full max-w-md border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold tracking-tight'>
            Create an account
          </CardTitle>
          <CardDescription>
            Join the Playbook ecosystem as an educator
          </CardDescription>
        </CardHeader>
          <form action={formAction}>
            <CardContent className='space-y-4'>
              {state?.message && (
                <div className='bg-destructive/15 text-destructive text-sm p-3 rounded-md'>
                  {state.message}
                </div>
              )}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label htmlFor='first-name' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>First name</label>
                  <Input id='first-name' name='first-name' placeholder='John' required />
                </div>
                <div className='space-y-2'>
                  <label htmlFor='last-name' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>Last name</label>
                  <Input id='last-name' name='last-name' placeholder='Doe' required />
                </div>
              </div>
              <div className='space-y-2'>
                <label htmlFor='email' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>Email</label>
                <Input id='email' name='email' type='email' placeholder='john.doe@university.edu' required />
              </div>
              <div className='space-y-2'>
                <label htmlFor='institution' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>Institution</label>
                <Input id='institution' name='institution' placeholder='University of Dar es Salaam' required />
              </div>
              <div className='space-y-2'>
                <label htmlFor='password' className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>Password</label>
                <Input id='password' name='password' type='password' required />
              </div>
            </CardContent>
            <CardFooter className='flex flex-col gap-4'>
              <SubmitButton />
              <div className='text-center text-sm text-muted-foreground'>
                Already have an account?{' '}
                <Link href='/login' className='text-primary hover:underline font-medium'>
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
      </Card>
    </div>
  );
}
