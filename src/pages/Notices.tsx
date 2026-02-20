import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Eye, Plus, Check } from 'lucide-react';
import type { Notice, Role } from '../types';

export const Notices: React.FC = () => {
  const { notices, addNotice, markNoticeRead } = useData();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRoles, setTargetRoles] = useState<Role[]>(['STAFF']);

  if (!user) return null;

  const canPost = ['HOD', 'SECRETARY'].includes(user.role);

  const visibleNotices = notices.filter(n => n.targetRoles.includes(user.role));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotice: Notice = {
      id: `n${Date.now()}`,
      title,
      content,
      authorId: user.id,
      authorName: user.name,
      date: new Date().toISOString().split('T')[0],
      targetRoles,
      readBy: [],
    };
    addNotice(newNotice);
    setIsModalOpen(false);
    setTitle('');
    setContent('');
  };

  const toggleRole = (role: Role) => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notice Board</h1>
           <p className="text-slate-500 mt-1">Announcements and departmental updates.</p>
        </div>
        {canPost && (
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Notice
            </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleNotices.map((notice) => {
           const isRead = notice.readBy.includes(user.id);
           const readCount = notice.readBy.length;
           const isAuthor = notice.authorId === user.id;

           return (
              <Card key={notice.id} className={`transition-all hover:shadow-md ${!isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                 <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                       <Badge variant={isRead ? 'outline' : 'default'} className="mb-2">
                          {notice.targetRoles.includes('HOD') ? 'Public' : 'Targeted'}
                       </Badge>
                       <CardTitle className="text-base">{notice.title}</CardTitle>
                       <p className="text-xs text-slate-400 mt-1">Posted by {notice.authorName} on {notice.date}</p>
                    </div>
                    {isAuthor && (
                       <div className="flex items-center text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                          <Eye className="h-3 w-3 mr-1" />
                          {readCount} Reads
                       </div>
                    )}
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-4 mb-4">
                       {notice.content}
                    </p>

                    {!isRead && (
                       <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-blue-600 hover:bg-blue-50"
                          onClick={() => markNoticeRead(notice.id, user.id)}
                       >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as Read
                       </Button>
                    )}
                    {isRead && (
                       <p className="text-xs text-center text-slate-400 italic">
                          Read on {new Date().toLocaleDateString()}
                       </p>
                    )}
                 </CardContent>
              </Card>
           )
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <Card className="w-full max-w-lg shadow-2xl">
              <CardHeader>
                 <CardTitle>Post New Announcement</CardTitle>
              </CardHeader>
              <CardContent>
                 <form onSubmit={handleCreate} className="space-y-4">
                    <Input
                       label="Title"
                       placeholder="e.g. Monthly Meeting"
                       value={title}
                       onChange={e => setTitle(e.target.value)}
                       required
                    />
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                       <textarea
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                          placeholder="Announcement details..."
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          required
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                       <div className="flex flex-wrap gap-2">
                          {(['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'] as const).map(role => (
                             <button
                                type="button"
                                key={role}
                                onClick={() => toggleRole(role)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                   targetRoles.includes(role)
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                             >
                                {role}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                       <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                       <Button type="submit">Post Notice</Button>
                    </div>
                 </form>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
};
