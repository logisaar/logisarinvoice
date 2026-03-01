export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "paid" | "pending" | "failed";
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientGST: string;
  businessName: string;
  businessAddress: string;
  businessGST: string;
  businessEmail: string;
  businessPhone: string;
  lineItems: LineItem[];
  subtotal: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  discount: number;
  discountType: "fixed" | "percent";
  grandTotal: number;
  notes: string;
  terms: string;
  paidDate?: string;
  transactionId?: string;
  paymentMethod?: string;
}

export const businessDefaults = {
  businessName: "Nexora Technologies Pvt. Ltd.",
  businessAddress: "301, Techno Park, Andheri East,\nMumbai, Maharashtra - 400069",
  businessGST: "27AABCN1234M1Z5",
  businessEmail: "billing@nexoratech.in",
  businessPhone: "+91 22 4567 8900",
  invoicePrefix: "INV",
  defaultNotes: "Thank you for your business. We appreciate your prompt payment.",
  defaultTerms: "1. Payment is due within the specified due date.\n2. Late payments may attract interest at 1.5% per month.\n3. All disputes must be raised within 7 days of invoice receipt.",
};

export const sampleInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2024-0042",
    invoiceDate: "2024-12-15",
    dueDate: "2025-01-15",
    status: "paid",
    clientName: "Mukesh Ambani",
    clientCompany: "Reliance Industries Ltd.",
    clientEmail: "accounts@reliance.com",
    clientPhone: "+91 22 3555 5000",
    clientAddress: "Maker Chambers IV, Nariman Point,\nMumbai, Maharashtra - 400021",
    clientGST: "27AABCR1234Q1ZP",
    ...businessDefaults,
    lineItems: [
      { id: "1", description: "Web Development Services - Corporate Portal Redesign", quantity: 1, unitPrice: 45000, taxPercent: 18, amount: 45000 },
      { id: "2", description: "Cloud Hosting (Annual) - AWS Enterprise Plan", quantity: 1, unitPrice: 32000, taxPercent: 18, amount: 32000 },
      { id: "3", description: "SSL Certificate - Wildcard (2 Year)", quantity: 1, unitPrice: 8000, taxPercent: 18, amount: 8000 },
    ],
    subtotal: 85000,
    totalTax: 15300,
    cgst: 7650,
    sgst: 7650,
    discount: 0,
    discountType: "fixed",
    grandTotal: 100300,
    notes: "Thank you for your business. We appreciate your prompt payment.",
    terms: "1. Payment is due within the specified due date.\n2. Late payments may attract interest at 1.5% per month.",
    paidDate: "2024-12-20",
    transactionId: "TXN20241220A3F7K9",
    paymentMethod: "UPI",
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2024-0043",
    invoiceDate: "2024-12-18",
    dueDate: "2025-01-18",
    status: "pending",
    clientName: "Rajesh Sharma",
    clientCompany: "Tata Consultancy Services",
    clientEmail: "rajesh.sharma@tcs.com",
    clientPhone: "+91 22 6778 9000",
    clientAddress: "TCS House, Raveline Street,\nFort, Mumbai - 400001",
    clientGST: "27AABCT1234P1ZQ",
    ...businessDefaults,
    lineItems: [
      { id: "1", description: "API Integration Services - Payment Gateway", quantity: 1, unitPrice: 60000, taxPercent: 18, amount: 60000 },
      { id: "2", description: "Technical Consultation (40 hours)", quantity: 40, unitPrice: 2500, taxPercent: 18, amount: 100000 },
    ],
    subtotal: 160000,
    totalTax: 28800,
    cgst: 14400,
    sgst: 14400,
    discount: 5000,
    discountType: "fixed",
    grandTotal: 183800,
    notes: "Please process payment before due date to avoid late fees.",
    terms: "1. Payment is due within the specified due date.\n2. Late payments may attract interest at 1.5% per month.",
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2024-0044",
    invoiceDate: "2024-12-20",
    dueDate: "2025-01-05",
    status: "failed",
    clientName: "Priya Patel",
    clientCompany: "Infosys Ltd.",
    clientEmail: "priya.patel@infosys.com",
    clientPhone: "+91 80 2852 0261",
    clientAddress: "Electronics City, Hosur Road,\nBengaluru, Karnataka - 560100",
    clientGST: "29AABCI1234N1ZR",
    ...businessDefaults,
    lineItems: [
      { id: "1", description: "Mobile App Development - Phase 1", quantity: 1, unitPrice: 120000, taxPercent: 18, amount: 120000 },
    ],
    subtotal: 120000,
    totalTax: 21600,
    cgst: 10800,
    sgst: 10800,
    discount: 0,
    discountType: "fixed",
    grandTotal: 141600,
    notes: "Payment failed. Please retry or contact support.",
    terms: "1. Payment is due within the specified due date.",
  },
  {
    id: "inv-004",
    invoiceNumber: "INV-2024-0045",
    invoiceDate: "2024-12-22",
    dueDate: "2025-01-22",
    status: "pending",
    clientName: "Ankit Gupta",
    clientCompany: "Wipro Technologies",
    clientEmail: "ankit.gupta@wipro.com",
    clientPhone: "+91 80 2844 0011",
    clientAddress: "Doddakannelli, Sarjapur Road,\nBengaluru, Karnataka - 560035",
    clientGST: "29AABCW1234M1ZS",
    ...businessDefaults,
    lineItems: [
      { id: "1", description: "UI/UX Design - Enterprise Dashboard", quantity: 1, unitPrice: 75000, taxPercent: 18, amount: 75000 },
      { id: "2", description: "Frontend Development - React Application", quantity: 1, unitPrice: 95000, taxPercent: 18, amount: 95000 },
    ],
    subtotal: 170000,
    totalTax: 30600,
    cgst: 15300,
    sgst: 15300,
    discount: 10000,
    discountType: "fixed",
    grandTotal: 190600,
    notes: "Thank you for choosing Nexora Technologies.",
    terms: "1. Payment is due within the specified due date.",
  },
  {
    id: "inv-005",
    invoiceNumber: "INV-2024-0046",
    invoiceDate: "2024-12-25",
    dueDate: "2025-01-25",
    status: "paid",
    clientName: "Sunita Reddy",
    clientCompany: "HCL Technologies",
    clientEmail: "sunita.reddy@hcl.com",
    clientPhone: "+91 120 438 2000",
    clientAddress: "Technology Hub, Sector 126,\nNoida, Uttar Pradesh - 201304",
    clientGST: "09AABCH1234K1ZT",
    ...businessDefaults,
    lineItems: [
      { id: "1", description: "Database Migration - Oracle to PostgreSQL", quantity: 1, unitPrice: 55000, taxPercent: 18, amount: 55000 },
      { id: "2", description: "Performance Optimization Services", quantity: 1, unitPrice: 35000, taxPercent: 18, amount: 35000 },
      { id: "3", description: "24/7 Support Package (3 months)", quantity: 3, unitPrice: 15000, taxPercent: 18, amount: 45000 },
    ],
    subtotal: 135000,
    totalTax: 24300,
    cgst: 12150,
    sgst: 12150,
    discount: 0,
    discountType: "fixed",
    grandTotal: 159300,
    notes: "Thank you for your continued partnership.",
    terms: "1. Payment is due within the specified due date.",
    paidDate: "2024-12-28",
    transactionId: "TXN20241228B8G2M4",
    paymentMethod: "Net Banking",
  },
];

export const dashboardStats = {
  totalCollected: 259600,
  pendingPayments: 374400,
  totalInvoices: 5,
  successRate: 40,
};
