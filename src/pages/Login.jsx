import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Failed to login');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#100E0C' }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#FF7A00 1px, transparent 1px), linear-gradient(90deg, #FF7A00 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center gap-3 px-5 py-3 border-2 border-[#FF7A00] bg-[#1E1D1C]"
            style={{ boxShadow: '4px 4px 0px #FF7A00' }}
          >
            <div className="w-2 h-6 bg-[#FF7A00]" />
            <span className="font-black text-white tracking-widest text-lg font-mono uppercase">
              HABIT<span className="text-[#FF7A00]">FLOW</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="bg-[#1E1D1C] border-2 border-[#FF7A00] p-8"
          style={{ boxShadow: '6px 6px 0px #FF7A00' }}
        >
          {/* Title */}
          <div className="mb-7 border-b-2 border-[#FF7A00]/30 pb-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest font-mono">SIGN IN</h2>
            <p className="text-[#FF7A00] text-[10px] uppercase tracking-widest font-mono mt-1">
              // TRACK & SYNC YOUR DAILY HABITS
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 border-2 border-[#FF4444] bg-[#FF4444]/10 text-[#FF4444] px-4 py-3 mb-6 text-xs font-mono uppercase">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1.5 font-mono">
                // EMAIL
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-white text-sm bg-[#100E0C] border-2 border-[#494848] outline-none focus:border-[#FF7A00] placeholder-[#737373] font-mono transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#FF7A00] uppercase tracking-widest mb-1.5 font-mono">
                // PASSWORD
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-white text-sm bg-[#100E0C] border-2 border-[#494848] outline-none focus:border-[#FF7A00] placeholder-[#737373] font-mono transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 font-black text-[#100E0C] bg-[#FF7A00] border-2 border-[#FF7A00] uppercase tracking-widest text-sm transition-all hover:bg-[#FFA64D] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed mt-2 font-mono"
              style={{ boxShadow: '4px 4px 0px #000' }}
            >
              <LogIn size={15} />
              {loading ? 'SIGNING IN…' : 'SIGN IN'}
            </button>
          </form>

          <p className="mt-6 text-center text-[#C1C1C1] text-[11px] font-mono uppercase tracking-wider">
            No account?{' '}
            <Link to="/register" className="text-[#FF7A00] font-black hover:underline">
              CREATE ONE →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
