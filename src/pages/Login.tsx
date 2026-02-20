import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Shield } from 'lucide-react';
import { MOCK_USERS } from '../mockData';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      login(email);
      setLoading(false);
      navigate('/dashboard');
    }, 800);
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    // Auto submit effectively
    setLoading(true);
    setTimeout(() => {
        login(quickEmail);
        setLoading(false);
        navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xl shadow-slate-900/20">
          <span className="text-3xl font-bold">O</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">OSPREY</h1>
        <p className="mt-2 text-slate-500">University Department Management System</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Select a role for demo access</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-3">
             {MOCK_USERS.map(u => (
                 <button
                    key={u.id}
                    onClick={() => handleQuickLogin(u.email)}
                    className="flex flex-col items-center justify-center rounded-lg border border-slate-200 p-3 hover:bg-slate-50 hover:border-slate-300 transition-all text-center h-24"
                 >
                    <div className="font-semibold text-sm text-slate-800">{u.role}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{u.name}</div>
                 </button>
             ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="email"
              type="email"
              placeholder="name@osprey.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
            <Button type="submit" className="w-full h-11" isLoading={loading}>
              Sign In
            </Button>
          </form>

          <div className="flex items-center justify-center text-xs text-slate-400 gap-2 mt-4">
             <Shield className="h-3 w-3" />
             <span>Secured by Osprey Enterprise</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
