import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { formatINR, formatDate } from "@/lib/format";
import InvoiceDocument from "@/components/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import html2pdf from "html2pdf.js";
import {
  CheckCircle,
  AlertCircle,
  Download,
  Star,
  Tag,
  MessageSquare,
  CreditCard,
  X,
  Loader2,
  Printer,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────
   TypeScript shim for Google Identity Services
   ───────────────────────────────────────────────────── */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement | null, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const API = import.meta.env.VITE_API_URL ?? "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/* ─────────────────────────────────────────────────────
   Helper: decode JWT to get user info
   ───────────────────────────────────────────────────── */
function decodeJwt(token: string): { email: string; name: string; picture: string } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

type Step = "review" | "signin" | "checkout" | "paid" | "error";

export default function PublicInvoice() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "payment_failed") {
      toast.error("Payment was cancelled or failed. Please try again.");
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  // If opened from the portal Pay Now button, user is pre-authenticated — skip sign-in
  const portalUser = (location.state as any)?.portalUser as
    | { email: string; name: string; picture?: string }
    | undefined;

  /* ── download ── */
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("invoice-print-container");
    if (!element) return;

    setDownloadingPdf(true);

    const opt = {
      margin: 10,
      filename: `${invoice?.invoiceNumber || 'invoice'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  /* ── Load invoice: fetch from API (public endpoint, no auth) ── */
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    setInvoiceLoading(true);
    fetch(`${API}/api/invoices/public/${invoiceId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setInvoice(data))
      .catch(() => setInvoice(null))
      .finally(() => setInvoiceLoading(false));
  }, [invoiceId]);

  const paymentLabel = invoice?.paymentLabel || "Full Payment";
  const paymentAmount = Number(invoice?.paymentAmount ?? invoice?.grandTotal ?? 0);

  /* ── steps ── */
  const [step, setStep] = useState<Step>("review");

  /* ── Google sign-in ── */
  const [googleUser, setGoogleUser] = useState<{
    email: string;
    name: string;
    picture: string;
  } | null>(() => {
    // Prefer portal user passed via router state (already authenticated)
    if (portalUser?.email) return { email: portalUser.email, name: portalUser.name, picture: portalUser.picture || "" };
    const saved = sessionStorage.getItem(`paylink_user_${invoiceId}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [signingIn, setSigningIn] = useState(false);

  // Once invoice loads, set correct initial step
  useEffect(() => {
    if (invoice) {
      if (invoice.status === "paid") setStep("paid");
      // Coming from portal OR already signed in → skip straight to checkout
      else if (googleUser) setStep("checkout");
      else setStep("review");
    }
  }, [invoice, googleUser]);

  /* ── coupon ── */
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    discount_amount: number;
    final_amount: number;
    discount_type: string;
    discount_value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  /* ── feedback ── */
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [paying, setPaying] = useState(false);

  const finalAmount = couponResult ? couponResult.final_amount : paymentAmount;

  /* ── Load Google OAuth2 client when on signin step ──
     Uses google.accounts.oauth2 (NOT .id) to avoid FedCM/gsi/status requests entirely */
  const triggerGoogleSignIn = useCallback(() => {
    if (!(window as any).google?.accounts?.oauth2) {
      toast.error("Google Sign-In not loaded. Please refresh the page.");
      return;
    }
    setSigningIn(true);
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          toast.error("Google sign-in was cancelled or failed.");
          setSigningIn(false);
          return;
        }
        try {
          // Fetch user profile using the access token
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          if (!userInfoRes.ok) throw new Error('Failed to fetch user info');
          const userInfo = await userInfoRes.json();
          await handleGoogleUserInfo(userInfo, tokenResponse.access_token);
        } catch {
          toast.error('Failed to get Google profile. Please try again.');
          setSigningIn(false);
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  }, [invoiceId]);

  // Called after successful OAuth2 token + userinfo fetch
  const handleGoogleUserInfo = useCallback(
    async (userInfo: { email: string; name: string; picture: string }, accessToken: string) => {
      const user = { email: userInfo.email, name: userInfo.name, picture: userInfo.picture };
      // Register client-invoice association in DB
      try {
        const acceptRes = await fetch(`${API}/api/invoices/public/${invoiceId}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, email: user.email, name: user.name, picture: user.picture }),
        });
        if (!acceptRes.ok) {
          const err = await acceptRes.json().catch(() => ({}));
          console.error("ACCEPT ERROR:", err);
        }
      } catch (err) {
        console.error("NETWORK ERROR ON ACCEPT:", err);
      }
      setGoogleUser(user);
      sessionStorage.setItem(`paylink_user_${invoiceId}`, JSON.stringify(user));
      setStep("checkout");
      setSigningIn(false);
      toast.success(`Signed in as ${user.name}`);
    },
    [invoiceId]
  );

  /* ── Coupon validation ── */
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const r = await fetch(`${API}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, amount: paymentAmount }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setCouponError(err.message || "Invalid or expired coupon code.");
        setCouponResult(null);
      } else {
        const data = await r.json();
        setCouponResult(data);
        toast.success(`Coupon applied! ${data.discount_type === 'percent' ? data.discount_value + '%' : '\u20b9' + data.discount_value} off`);
      }
    } catch {
      setCouponError("Failed to validate coupon. Try again.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
  };

  /* ── Pay Now ── */
  const handlePayNow = async () => {
    if (rating === 0) { toast.error("Please rate your experience before paying."); return; }
    setPaying(true);
    try {
      // 1. Save feedback
      await fetch(`${API}/api/invoices/public/${invoiceId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: feedbackText || undefined,
          couponCode: couponCode || undefined,
        }),
      });

      // 2. Initiate Paytm payment — get txnToken from backend
      const res = await fetch(`${API}/api/payments/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invoiceId,
          couponCode: couponCode || undefined,
          payerEmail: googleUser?.email || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Payment initiation failed");
      }

      const { txnToken, orderId, amount, mid, host } = await res.json();

      // 3a. Use Paytm JS Checkout SDK if loaded (preferred)
      if ((window as any).Paytm?.CheckoutJS) {
        const config = {
          root: "",
          flow: "DEFAULT",
          data: {
            orderId,
            token: txnToken,
            tokenType: "TXN_TOKEN",
            amount,
          },
          merchant: {
            mid,
            redirect: true,
          },
          handler: {
            notifyMerchant: (eventName: string, data: unknown) => {
              console.log("Paytm event:", eventName, data);
            },
            transactionStatus: (paymentStatus: unknown) => {
              console.log("Paytm txn status:", paymentStatus);
            },
          },
        };
        await (window as any).Paytm.CheckoutJS.init(config);
        (window as any).Paytm.CheckoutJS.invoke();
        // page navigates away — don't reset paying state
      } else {
        // 3b. Fallback: direct URL redirect to Paytm payment page
        const paytmHost = host || "securestage.paytmpayments.com";
        const url = `https://${paytmHost}/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderId}&txnToken=${txnToken}`;
        window.location.href = url;
      }

    } catch (e: any) {
      toast.error(e.message || "Payment initiation failed. Please try again.");
      setPaying(false);
    }
  };


  /* ────────────────────────────── LOADING ──────────────────── */
  if (invoiceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading invoice...</p>
        </div>
      </div>
    );
  }

  /* ────────────────────────────── ERROR ────────────────────── */
  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-bold text-foreground">Invoice Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The quotation link you're looking for doesn't exist or has expired.
          </p>
        </div>
      </div>
    );
  }


  /* ────────────────────────────── PAID ────────────────────── */
  if (step === "paid" || invoice.status === "paid") {
    return (
      <div className="min-h-screen bg-muted py-8 px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl bg-green-50 border border-green-200 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800 text-lg">Payment Received</p>
                <p className="text-sm text-green-700">
                  Transaction ID: {invoice.transactionId} &bull; Paid on{" "}
                  {formatDate(invoice.paidDate!)} via {invoice.paymentMethod}
                </p>
              </div>
            </div>
          </div>
          <div id="invoice-print-container" className="rounded-xl shadow-lg border p-6 bg-white shrink-0 min-w-0 md:min-w-[800px] print-area">
            <InvoiceDocument invoice={invoice} showWatermark />
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
              <Download className="mr-2 h-4 w-4" /> {downloadingPdf ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── Business Header ── */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Quotation from
          </p>
          <h1 className="text-2xl font-bold text-foreground">{invoice.businessName}</h1>
          <p className="text-sm text-muted-foreground">{invoice.businessEmail}</p>
        </div>

        {/* ── Progress steps ── */}
        <div className="flex items-center justify-center gap-0">
          {(["review", "signin", "checkout"] as const).map((s, i) => {
            const labels = ["Review Quotation", "Sign In", "Pay Now"];
            const isActive = s === step;
            const isDone = (step === "signin" && i === 0) || (step === "checkout" && i <= 1);
            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isDone
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground border"
                      }`}
                  >
                    {isDone ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium whitespace-nowrap ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {labels[i]}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`w-16 h-0.5 mb-4 mx-1 ${isDone ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ════════════ STEP 1: REVIEW ════════════ */}
        {step === "review" && (
          <>
            {/* Payment CTA Banner */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
                    {paymentLabel}
                  </p>
                  <p className="text-2xl font-bold text-amber-900">{formatINR(paymentAmount)}</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Due by {formatDate(invoice.dueDate)} &bull; Review the full quotation below
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => setStep(googleUser ? "checkout" : "signin")}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Accept &amp; Continue
                </Button>
              </div>
            </div>

            {/* Quotation Document */}
            {/* Note: we re-use the same ID here, but since the component unmounts/remounts based on step, 
                it's safe as long as only one is rendered at a time. The outer wrapper ID is what handleDownloadPdf looks for. */}
            <div id="invoice-print-container" className="rounded-xl shadow-lg overflow-hidden border bg-white">
              <InvoiceDocument invoice={invoice} />
            </div>

            {/* Download */}
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <Download className="mr-2 h-4 w-4" /> {downloadingPdf ? "Generating PDF..." : "Download PDF"}
              </Button>
            </div>
          </>
        )}

        {/* ════════════ STEP 2: GOOGLE SIGN-IN ════════════ */}
        {step === "signin" && (
          <div className="rounded-2xl border bg-white shadow-xl p-8">
            <div className="text-center space-y-3 mb-8">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Sign in to Accept</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Sign in with your Google account to accept this quotation and proceed to payment.
                Your identity helps us secure the transaction.
              </p>
            </div>

            {/* Payment summary reminder */}
            <div className="rounded-lg bg-muted/50 border p-4 mb-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{paymentLabel}</span>
                <span className="font-bold text-primary">{formatINR(paymentAmount)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                <span>Due by {formatDate(invoice.dueDate)}</span>
                <span>{invoice.invoiceNumber}</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            {GOOGLE_CLIENT_ID ? (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full max-w-xs border-2 gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                  disabled={signingIn}
                  onClick={() => {
                    triggerGoogleSignIn();
                  }}
                >
                  {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {signingIn ? "Opening sign-in…" : "Continue with Google"}
                </Button>
              </div>
            ) : (
              /* Fallback demo button when no Client ID is set */
              <div className="flex justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full max-w-xs border-2 gap-3"
                  disabled={signingIn}
                  onClick={() => {
                    setSigningIn(true);
                    setTimeout(() => {
                      setGoogleUser({ email: "demo@gmail.com", name: "Demo User", picture: "" });
                      setStep("checkout");
                      setSigningIn(false);
                      toast.success("Signed in as Demo User (add VITE_GOOGLE_CLIENT_ID for real sign-in)");
                    }, 800);
                  }}
                >
                  {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {signingIn ? "Signing in…" : "Continue with Google"}
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              Your Google account is used for identity verification only. We don't post anything.
            </p>

            <div className="flex justify-center mt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
                ← Back to quotation
              </Button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 3: CHECKOUT ════════════ */}
        {step === "checkout" && googleUser && (
          <div className="space-y-4">
            {/* Signed-in as */}
            <div className="rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3">
              {googleUser.picture ? (
                <img src={googleUser.picture} className="w-10 h-10 rounded-full" alt={googleUser.name} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {googleUser.name[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Paying as {googleUser.name}</p>
                <p className="text-xs text-muted-foreground">{googleUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-muted-foreground"
                onClick={() => {
                  setGoogleUser(null);
                  sessionStorage.removeItem(`paylink_user_${invoiceId}`);
                  setStep("signin");
                }}
              >
                Change
              </Button>
            </div>

            {/* Payment summary */}
            <div className="rounded-xl border bg-white shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-foreground">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{paymentLabel}</span>
                  <span className="font-medium">{formatINR(paymentAmount)}</span>
                </div>
                {couponResult && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon discount ({couponResult.discount_type === "percent" ? `${couponResult.discount_value}%` : `₹${couponResult.discount_value}`})</span>
                    <span>- {formatINR(couponResult.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total Payable</span>
                  <span className="text-primary">{formatINR(finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="rounded-xl border bg-white shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Apply Coupon Code
              </h3>
              {couponResult ? (
                <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-800">{couponCode.toUpperCase()} applied!</p>
                    <p className="text-xs text-green-700">You save {formatINR(couponResult.discount_amount)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-destructive h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    placeholder="Enter coupon code"
                    className="flex-1 font-mono uppercase"
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  />
                  <Button
                    variant="outline"
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                  >
                    {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-sm text-destructive">{couponError}</p>}
              <p className="text-xs text-muted-foreground">Try WELCOME20 or FLAT500 as demo codes</p>
            </div>

            {/* Feedback */}
            <div className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Share Your Feedback</h3>
              <div>
                <Label className="text-sm">How would you rate this proposal? *</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                          }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {["", "Needs improvement", "Fair", "Good", "Very good", "Excellent!"][rating]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Any message for us? (optional)</Label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="We'd love to hear your thoughts on this quotation…"
                  rows={3}
                />
              </div>
            </div>

            {/* Pay Now */}
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold shadow-lg"
              onClick={handlePayNow}
              disabled={paying || rating === 0}
            >
              {paying ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="mr-2 h-5 w-5" /> Pay {formatINR(finalAmount)} Now</>
              )}
            </Button>

            {rating === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Please give a star rating before proceeding to payment.
              </p>
            )}

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setStep("review")}>
                ← Back to quotation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
