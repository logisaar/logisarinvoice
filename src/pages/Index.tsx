import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IndianRupee, Shield, ArrowRight, FileText, CreditCard, Star } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3030";

export default function Index() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminHash = location.hash === "#admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If admin already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) navigate("/admin", { replace: true });
  }, [isAuthenticated, navigate]);

  // Trigger Google OAuth2 popup (no FedCM, no gsi/status)
  const triggerGoogleSignIn = () => {
    const g = (window as any).google;
    if (!g?.accounts?.oauth2) {
      alert("Google Sign-In not loaded. Please refresh the page.");
      return;
    }
    const tokenClient = g.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      scope: 'email profile openid',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) return;
        try {
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const userInfo = await userInfoRes.json();
          const res = await fetch(`${API}/api/portal/auth/google`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: tokenResponse.access_token,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            }),
          });
          if (!res.ok) throw new Error("Sign-in failed");
          const data = await res.json();
          // Clear any stale session from a previous Gmail account before storing the new one
          localStorage.removeItem("client_user");
          localStorage.setItem("client_user", JSON.stringify(data.user));
          // Hard redirect — React Router's navigate() is unreliable inside async OAuth2 callbacks
          window.location.href = "/portal/dashboard";
        } catch {
          toast.error("Google sign-in failed. Please try again.");
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  };


  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { toast.error("Invalid credentials"); return; }
      const data = await res.json();
      login(data.access_token, data.user);
      navigate("/admin");
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">PayLink Pro</span>
        </div>
        {!isAdminHash ? (
          <Link to="/#admin" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1">
            <Shield className="h-4 w-4" /> Staff Login
          </Link>
        ) : (
          <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1">
            ← Client Portal
          </Link>
        )}
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {!isAdminHash ? (
          /* ── CLIENT PORTAL SIGN-IN ── */
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
                <IndianRupee className="h-8 w-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Client Portal</h1>
              <p className="text-slate-400">
                Sign in with Google to view your invoices, track payments, and manage your account.
              </p>
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: FileText, label: "View Invoices" },
                { icon: CreditCard, label: "Track Payments" },
                { icon: Star, label: "Share Feedback" },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <f.icon className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-400">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Google Sign-In */}
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 space-y-4">
              <p className="text-center text-slate-300 text-sm font-medium">Sign in with your Google account</p>
              <div className="flex justify-center">
                <button
                  className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-300 shadow-sm transition-colors w-[280px] justify-center"
                  onClick={() => triggerGoogleSignIn()}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>
              <p className="text-center text-xs text-slate-600">
                First time? Use the link emailed by your service provider.
              </p>
            </div>
          </div>
        ) : (
          /* ── ADMIN LOGIN ── */
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 border border-slate-600 flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-slate-300" />
              </div>
              <h1 className="text-2xl font-bold text-white">Staff Login</h1>
              <p className="text-slate-400 text-sm">Admin access only</p>
            </div>
            <form onSubmit={handleAdminLogin} className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com" required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Password</Label>
                <Input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
