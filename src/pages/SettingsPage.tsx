import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { businessDefaults } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(businessDefaults.businessName);
  const [businessAddress, setBusinessAddress] = useState(businessDefaults.businessAddress);
  const [businessGST, setBusinessGST] = useState(businessDefaults.businessGST);
  const [businessEmail, setBusinessEmail] = useState(businessDefaults.businessEmail);
  const [businessPhone, setBusinessPhone] = useState(businessDefaults.businessPhone);
  const [invoicePrefix, setInvoicePrefix] = useState(businessDefaults.invoicePrefix);
  const [defaultNotes, setDefaultNotes] = useState(businessDefaults.defaultNotes);
  const [defaultTerms, setDefaultTerms] = useState(businessDefaults.defaultTerms);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your business profile and invoice defaults.</p>
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
              <Label>Default Terms & Conditions</Label>
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

        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
}
