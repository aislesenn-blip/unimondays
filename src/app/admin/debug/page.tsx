import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DebugDashboard() {
  const isDebugMode = process.env.DEBUG_MODE === 'true';
  const isSimulationMode = !process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'dummy';

  const recentLogs = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const recentSubmissions = await prisma.submission.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 10,
    include: {
        score: true
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">System Debug Dashboard</h1>
          <p className="text-slate-500 mt-2">Observability and pipeline verification view.</p>
        </div>

        {/* Global Status Flags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border flex items-center justify-between ${isDebugMode ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-200'}`}>
            <div>
              <p className="text-sm font-medium opacity-80">DEBUG_MODE</p>
              <p className="text-lg font-semibold">{isDebugMode ? 'Enabled' : 'Disabled'}</p>
            </div>
            {isDebugMode && <span className="flex h-3 w-3 rounded-full bg-amber-500"></span>}
          </div>

          <div className={`p-4 rounded-lg border flex items-center justify-between ${isSimulationMode ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div>
              <p className="text-sm font-medium opacity-80">AI Grading Engine</p>
              <p className="text-lg font-semibold">{isSimulationMode ? 'Simulation Mode' : 'Live Mode'}</p>
            </div>
            <span className={`flex h-3 w-3 rounded-full ${isSimulationMode ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
          </div>
        </div>

        {/* Pipeline Summary / Recent Submissions */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700">Recent Pipeline Executions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSubmissions.map(sub => (
              <div key={sub.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-700">Submission: {sub.id}</p>
                  <div className="flex gap-4 text-sm text-slate-500 mt-1">
                    <span>Status: <span className="font-medium">{sub.status}</span></span>
                    <span>Score: {sub.score?.totalMarks ?? 'N/A'}</span>
                    <span>Chunks: {sub.processedChunks}/{sub.totalChunks}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(sub.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {recentSubmissions.length === 0 && (
                <div className="p-8 text-center text-slate-500">No recent submissions found.</div>
            )}
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-slate-900 rounded-lg shadow-sm overflow-hidden text-emerald-400 font-mono text-sm">
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                <span className="text-slate-300 font-semibold tracking-wide">System Logs (Live Trace)</span>
                <span className="text-xs text-slate-500">Last 50 entries</span>
            </div>
            <div className="p-6 h-[500px] overflow-y-auto space-y-3">
                {recentLogs.map(log => (
                    <div key={log.id} className="break-words">
                        <span className="text-slate-500">[{new Date(log.createdAt).toISOString()}]</span>{' '}
                        <span className={log.level === 'WARN' ? 'text-amber-400' : log.level === 'ERROR' ? 'text-red-400' : 'text-emerald-400'}>[{log.level}]</span>{' '}
                        <span className="text-slate-300">{log.message}</span>
                        {log.metadata && (
                            <pre className="mt-1 ml-4 text-xs text-slate-500 whitespace-pre-wrap">
                                {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
                {recentLogs.length === 0 && (
                    <div className="text-slate-500 italic">No logs found. Enable DEBUG_MODE to capture pipeline traces.</div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
