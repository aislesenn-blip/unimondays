import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-red-600">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">
            We encountered an issue with your account setup.
          </p>
          <div className="mt-4 rounded-md bg-red-50 p-4 text-left text-sm text-red-700">
            <p className="font-medium">System Diagnostics:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Your account exists in our authentication system.</li>
              <li>However, your user profile is missing or incomplete.</li>
              <li>This prevents access to the dashboard.</li>
            </ul>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Please contact support immediately to resolve this issue.
          </p>
          <div className="mt-2 text-lg font-bold text-gray-900">
            Support: 0745780988
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login"
            className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to Login
          </Link>
          <a
            href="mailto:support@playbook.com"
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
