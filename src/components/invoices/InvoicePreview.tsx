import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendInvoiceEmail } from '@/lib/gmail';
import type { Invoice, BusinessProfile } from '@/types/invoice';
import { DOCUMENT_TYPE_LABELS } from '@/types/invoice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  businessProfile: BusinessProfile;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: he });
  } catch {
    return dateStr;
  }
};

const InvoicePreview = ({ open, onOpenChange, invoice, businessProfile }: InvoicePreviewProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const generatePdfBase64 = async (): Promise<string> => {
    if (!printRef.current) throw new Error('Invoice element not found');

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    return pdf.output('datauristring').split(',')[1];
  };

  const handleDownload = async () => {
    setDownloadingPdf(true);
    try {
      if (!printRef.current) return;
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${DOCUMENT_TYPE_LABELS[invoice.document_type]}-${invoice.document_number}.pdf`);
      toast({ title: 'PDF הורד בהצלחה' });
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'לא ניתן ליצור PDF', variant: 'destructive' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    const email = invoice.client_snapshot.email;
    if (!email) {
      toast({ title: 'אין אימייל ללקוח', description: 'הוסף אימייל ללקוח כדי לשלוח', variant: 'destructive' });
      return;
    }

    setSendingEmail(true);
    try {
      const pdfBase64 = await generatePdfBase64();
      const docLabel = DOCUMENT_TYPE_LABELS[invoice.document_type];
      const subject = `${docLabel} מספר ${invoice.document_number} - ${businessProfile.business_name}`;
      const bodyHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
          <p>שלום ${invoice.client_snapshot.name},</p>
          <p>מצורפת ${docLabel} מספר <strong>${invoice.document_number}</strong> על סך <strong>${formatCurrency(invoice.total)}</strong>.</p>
          <p>בברכה,<br/>${businessProfile.business_name}</p>
          ${businessProfile.phone ? `<p>טל: ${businessProfile.phone}</p>` : ''}
        </div>
      `;
      const filename = `${docLabel}-${invoice.document_number}.pdf`;
      await sendInvoiceEmail(email, subject, bodyHtml, pdfBase64, filename);
      toast({ title: 'המייל נשלח בהצלחה', description: `נשלח אל ${email}` });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'לא ניתן לשלוח מייל';
      toast({ title: 'שגיאה בשליחת מייל', description: message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  const docLabel = DOCUMENT_TYPE_LABELS[invoice.document_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{docLabel} #{invoice.document_number}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Download className="w-4 h-4 ml-1" />}
            הורד PDF
          </Button>
          {invoice.client_snapshot.email && (
            <Button size="sm" onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
              שלח למייל ({invoice.client_snapshot.email})
            </Button>
          )}
          {!invoice.client_snapshot.email && (
            <p className="text-xs text-muted-foreground">אין כתובת מייל ללקוח — הוסף בדף לקוחות לשליחה</p>
          )}
        </div>

        <div className="border-t mx-6" />

        {/* Printable invoice area */}
        <div className="px-6 pb-6">
          <div
            ref={printRef}
            dir="rtl"
            className="bg-white text-gray-900 p-8 rounded border"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif', minWidth: '560px' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{businessProfile.business_name}</h1>
                <p className="text-sm text-gray-600 mt-1">עוסק פטור | ת.ז.: {businessProfile.osek_id}</p>
                {businessProfile.address && <p className="text-sm text-gray-600">{businessProfile.address}</p>}
                {businessProfile.phone && <p className="text-sm text-gray-600">טל: {businessProfile.phone}</p>}
                {businessProfile.email && <p className="text-sm text-gray-600">{businessProfile.email}</p>}
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-800">{docLabel}</h2>
                <p className="text-sm text-gray-600 mt-1">מס׳ מסמך: <span className="font-mono font-bold">{invoice.document_number}</span></p>
                <p className="text-sm text-gray-600">תאריך: {formatDate(invoice.issue_date)}</p>
              </div>
            </div>

            {/* Client */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">פרטי לקוח</h3>
              <p className="font-semibold text-gray-900">{invoice.client_snapshot.name}</p>
              {invoice.client_snapshot.tax_id && (
                <p className="text-sm text-gray-600">ת.ז. / ח.פ.: {invoice.client_snapshot.tax_id}</p>
              )}
              {invoice.client_snapshot.address && (
                <p className="text-sm text-gray-600">{invoice.client_snapshot.address}</p>
              )}
              {invoice.client_snapshot.email && (
                <p className="text-sm text-gray-600">{invoice.client_snapshot.email}</p>
              )}
              {invoice.client_snapshot.phone && (
                <p className="text-sm text-gray-600">{invoice.client_snapshot.phone}</p>
              )}
            </div>

            {/* Items table */}
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-right py-2 font-semibold">תיאור</th>
                  <th className="text-center py-2 font-semibold w-16">כמות</th>
                  <th className="text-left py-2 font-semibold w-28">מחיר יחידה</th>
                  <th className="text-left py-2 font-semibold w-28">סכום</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2 pr-1">{item.description}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-left">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-left font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end mb-4">
              <div className="w-60">
                <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg">
                  <span>סה"כ לתשלום</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                <span className="font-semibold">הערות: </span>{invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p className="font-medium">פטור ממע"מ — עוסק פטור לפי סעיף 31(1) לחוק מע"מ</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;
