import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ChevronLeft, Upload, FileText, Smartphone, DollarSign, Clock } from 'lucide-react';
import type { VendorConfig, Business } from '../types';

export const SubmitTask = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { createOrder } = useOrder();

    // Get state from navigation
    const { vendorId, vendorConfig, business } = location.state as {
        vendorId: string,
        vendorConfig: VendorConfig,
        business: Business
    } || {};

    // Local State
    const [instructions, setInstructions] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paymentName, setPaymentName] = useState(user?.name || '');
    const [contactPhone, setContactPhone] = useState(user?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);

    if (!business) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <p>Vendor details missing.</p>
                <Button onClick={() => navigate('/home')}>Go Home</Button>
            </div>
        );
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0].name);
        }
    };

    const handleSubmit = () => {
        if (!instructions || !totalAmount || !paymentName || !contactPhone) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);

        const newOrder = {
            id: Date.now().toString(),
            vendorId,
            studentId: user?.id || 'guest',
            items: [], // No standard items
            totalAmount: parseInt(totalAmount),
            status: 'pending' as const,
            paymentName,
            contactPhone,
            timestamp: new Date(),
            type: 'custom_task' as const,
            customDetails: {
                description: instructions,
                fileUrl: uploadedFile || undefined
            }
        };

        createOrder(newOrder);

        // Simulation happens in OrderContext, just redirect
        setTimeout(() => {
            setIsSubmitting(false);
            navigate('/orders');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 flex items-center gap-2 border-b border-slate-100 sticky top-0 z-10">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                   <h1 className="font-bold text-lg text-slate-900 leading-none">Submit Task</h1>
                   <p className="text-xs text-slate-500">{business.name}</p>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">

                {/* File Upload Zone */}
                <Card className="bg-white border-dashed border-2 border-slate-300 shadow-none hover:border-indigo-400 transition-colors cursor-pointer relative group">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                         <div className="bg-indigo-50 p-4 rounded-full group-hover:bg-indigo-100 transition-colors">
                            {uploadedFile ? <FileText className="w-8 h-8 text-indigo-600" /> : <Upload className="w-8 h-8 text-slate-400" />}
                         </div>
                         <p className="font-bold text-slate-700">{uploadedFile || "Upload File (Optional)"}</p>
                         <p className="text-xs text-slate-400">PDF, Word, or Images supported.</p>
                    </CardContent>
                </Card>

                {/* Instructions Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Custom Instructions <span className="text-red-500">*</span></label>
                        <textarea
                            className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 resize-none"
                            placeholder="Explain your order. E.g., Print pages 1-15 in color, add spiral binding, and include 1 Manila card."
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>
                </div>

                {/* Payment Section */}
                <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-indigo-900">
                             <DollarSign className="w-5 h-5" />
                             <h2 className="font-bold">Payment Details</h2>
                        </div>

                        <div className="bg-white p-3 rounded-lg text-center border border-indigo-200 mb-4">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Send Money To</p>
                            <p className="text-xl font-mono font-bold text-slate-900">{vendorConfig?.lipaNumber || 'N/A'}</p>
                            <p className="text-sm font-medium text-slate-600">{vendorConfig?.lipaName || business.name}</p>
                        </div>

                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-indigo-900 mb-1">Total Amount Paid (TZS) <span className="text-red-500">*</span></label>
                                <Input
                                   type="number"
                                   placeholder="e.g. 4500"
                                   value={totalAmount}
                                   onChange={(e) => setTotalAmount(e.target.value)}
                                   className="bg-white border-indigo-200 focus:border-indigo-500"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-indigo-900 mb-1">Payment Name <span className="text-red-500">*</span></label>
                                <Input
                                   placeholder="Name on SimCard"
                                   value={paymentName}
                                   onChange={(e) => setPaymentName(e.target.value)}
                                   className="bg-white border-indigo-200 focus:border-indigo-500"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-indigo-900 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                <Input
                                   placeholder="e.g. 07XXXXXXXX"
                                   value={contactPhone}
                                   onChange={(e) => setContactPhone(e.target.value)}
                                   className="bg-white border-indigo-200 focus:border-indigo-500"
                                />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 text-lg font-bold shadow-xl shadow-indigo-200 rounded-xl"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Order'}
                </Button>
            </div>
        </div>
    );
};
