import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white selection:bg-white selection:text-black">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-zinc-800 bg-gradient-to-b from-zinc-900 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-zinc-900 lg:p-4">
          PLAYBOOK ECOSYSTEM&trade;
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/75 lg:static lg:h-auto lg:w-auto lg:bg-none">
          <span className="text-zinc-500">v1.0.0 (Build: Next.js + Python)</span>
        </div>
      </div>

      <div className="relative flex place-items-center z-[-1] my-20">
        <h1 className="text-6xl font-extralight tracking-tighter text-center">
          The Future of <br/>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
            Assessment Infrastructure
          </span>
        </h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-8">
        <Link
          href="/student"
          className="group rounded-lg border border-zinc-800 px-8 py-8 transition-all hover:bg-zinc-900 hover:border-zinc-700"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Student Account{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-zinc-400`}>
            Enter quiz code, attempt assessments, view results & analytics.
          </p>
        </Link>

        <Link
          href="/lecturer/dashboard" // Skip login for demo/speed or mock login later
          className="group rounded-lg border border-zinc-800 px-8 py-8 transition-all hover:bg-zinc-900 hover:border-zinc-700"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Playbook (Lecturer){' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-zinc-400`}>
            Create quizzes, AI grading queue, deep analytics & chat.
          </p>
        </Link>
      </div>
    </main>
  );
}
