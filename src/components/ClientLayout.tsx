import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    // Parse once on mount — avoids re-parsing (and re-requesting the picture) on every render
    const [user] = useState<{ name?: string; email?: string; picture?: string }>(() => {
        try { return JSON.parse(localStorage.getItem("client_user") || "{}"); }
        catch { return {}; }
    });
    // Track if the Google profile picture failed (e.g. 429) — fall back to icon
    const [imgError, setImgError] = useState(false);

    const logout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3030"}/api/portal/auth/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (e) {
            console.error("Logout error", e);
        }
        localStorage.removeItem("client_user");
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Top nav */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Logo */}
                    <button onClick={() => navigate("/portal/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-sm text-white">PayLink Pro</span>
                    </button>

                    {/* Nav */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-1.5"
                            onClick={() => navigate("/portal/dashboard")}>
                            <LayoutDashboard className="h-4 w-4" /> My Invoices
                        </Button>
                    </nav>

                    {/* User */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            {user.picture && !imgError ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-5 h-5 rounded-full"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <User className="h-4 w-4 text-slate-400" />
                            )}
                            <span className="text-sm text-slate-300 max-w-[120px] truncate">{user.name || user.email}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-white">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </div>
    );
}
