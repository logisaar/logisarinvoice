import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Loader2, Upload, Trash2, ImageIcon, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3030";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessGST, setBusinessGST] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/api/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then(data => {
        if (data) {
          setBusinessName(data.businessName || "");
          setBusinessAddress(data.businessAddress || "");
          setBusinessGST(data.gstNumber || "");
          setBusinessEmail(data.email || "");
          setBusinessPhone(data.phone || "");
          setInvoicePrefix(data.invoicePrefix || "");
          setDefaultNotes(data.defaultNotes || "");
          setDefaultTerms(data.defaultTerms || "");
          setLogoUrl(data.logoUrl || null);
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          businessName,
          businessAddress,
          gstNumber: businessGST,
          businessEmail,
          businessPhone,
          invoicePrefix,
          defaultNotes,
          defaultTerms,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully!");
    } catch (e: any) {
      toast.error(e.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2 MB)");
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`${API}/api/settings/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      toast.success("Logo uploaded successfully!");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    setLogoDeleting(true);
    try {
      const res = await fetch(`${API}/api/settings/logo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete logo");
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete logo");
    } finally {
      setLogoDeleting(false);
    }
  };

  const fullLogoUrl = logoUrl
    ? (logoUrl.startsWith("http") ? logoUrl : `${API}${logoUrl}`)
    : null;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your business profile and invoice defaults.</p>
        </div>

        {/* ── Company Logo ── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Company Logo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Appears on every invoice — screen, print, and downloaded PDF.
            </p>
          </div>

          <div className="flex items-start gap-5">
            {/* Preview / Placeholder */}
            <div className="relative shrink-0">
              {fullLogoUrl ? (
                <div className="relative w-24 h-24 rounded-xl border-2 border-primary/40 bg-card overflow-hidden shadow-sm">
                  <img
                    src={fullLogoUrl}
                    alt="Company logo"
                    className="w-full h-full object-contain p-1"
                  />
                  {/* Green "uploaded" badge */}
                  <span className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </span>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-6 w-6 opacity-40" />
                  <span className="text-[10px] font-medium opacity-50">No logo</span>
                </div>
              )}
            </div>

            {/* Status + actions */}
            <div className="flex-1 space-y-3">
              {fullLogoUrl ? (
                <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Logo uploaded
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No logo uploaded yet.</p>
              )}

              <div className="flex flex-wrap gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoUploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  {logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>

                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={logoDeleting}
                    onClick={handleLogoDelete}
                  >
                    {logoDeleting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                    Remove Logo
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Accepted: JPG, PNG, WebP, SVG · Max 2 MB
              </p>
            </div>
          </div>
        </div>

        {/* Business Profile */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">Business Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={businessGST} onChange={(e) => setBusinessGST(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">Invoice Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label>Default Notes</Label>
              <Textarea value={defaultNotes} onChange={(e) => setDefaultNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Default Terms &amp; Conditions</Label>
              <Textarea value={defaultTerms} onChange={(e) => setDefaultTerms(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Email Notifications</h2>
              <p className="text-sm text-muted-foreground">Receive email when a payment is received</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}
