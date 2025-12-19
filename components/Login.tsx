
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { BotIcon } from './Icons';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear errors when switching modes
  useEffect(() => {
    setError(null);
  }, [isRegistering]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const generateId = () => {
    return `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getRegisteredUsers = (): User[] => {
    try {
      const data = localStorage.getItem('pl_registered_users');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const users = getRegisteredUsers();

    if (isRegistering) {
      // REGISTRATION LOGIC
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (users.find(u => u.email === email)) {
        setError('An account with this email already exists.');
        return;
      }

      setLoading(true);
      setTimeout(() => {
        const role = (users.length === 0 || email === 'admin@productlens.com') ? 'admin' : 'user';
        
        const newUser: User = { 
          id: generateId(), 
          email, 
          name, 
          provider: 'email',
          role,
          isBlocked: false
        };
        
        // Note: For demo we store password in local but User type hides it
        const storageUser = { ...newUser, password };
        localStorage.setItem('pl_registered_users', JSON.stringify([...users, storageUser]));
        setIsRegistering(false);
        setLoading(false);
        setError(`Registration successful! Please log in.`);
      }, 1000);

    } else {
      // LOGIN LOGIC
      setLoading(true);
      setTimeout(() => {
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (user) {
          if (user.isBlocked) {
            setError('Your account has been blocked by an administrator.');
            setLoading(false);
            return;
          }
          const { password: _, ...userWithoutPassword } = user as any;
          onLogin(userWithoutPassword);
        } else {
          setError('Invalid email or password.');
        }
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <BotIcon className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-slate-500 mt-2">
            {isRegistering ? 'Join ProductLens Pro for smart translation' : 'Log in to your ProductLens account'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          {error && (
            <div className={`mb-6 p-3 text-sm rounded-lg border ${error.includes('successful') ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-2">
              <div className={isRegistering ? '' : 'sm:col-span-2'}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              {isRegistering && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegistering ? 'Sign Up' : 'Log In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-sm text-slate-500">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-indigo-600 font-bold hover:underline"
              >
                {isRegistering ? 'Log in here' : 'Sign up for free'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
