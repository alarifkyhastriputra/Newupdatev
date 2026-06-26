
import React, { useState } from 'react';
import { auth } from '../firebase.ts';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useLanguage } from '../LanguageContext.tsx';

interface AuthScreenProps {
  bannedMessage?: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ bannedMessage }) => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      // Simplified error message as requested
      setError('Kesalahan akun. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white max-w-xl mx-auto border-x border-gray-100">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black tracking-tighter mb-2">VIMOS</h1>
        <p className="text-xs uppercase tracking-[0.3em] font-bold text-gray-400">Join the shadows</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {bannedMessage && (
          <div className="p-3 bg-red-50 border border-red-500 text-xs font-bold uppercase text-center text-red-600 animate-pulse">
            {bannedMessage}
          </div>
        )}
        {error && (
          <div className="p-3 bg-gray-50 border border-black text-xs font-bold uppercase text-center">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest ml-2">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-gray-50 border-2 border-black rounded-2xl focus:outline-none focus:bg-white transition-all text-sm"
            placeholder="shadow@vimos.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest ml-2">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border-2 border-black rounded-2xl focus:outline-none focus:bg-white transition-all text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isLogin ? 'Enter Vimos' : 'Sign Up')}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-8 text-xs font-black uppercase tracking-widest hover:underline"
      >
        {isLogin ? "Don't have an account? Join" : "Already a member? Enter"}
      </button>
    </div>
  );
};

export default AuthScreen;
