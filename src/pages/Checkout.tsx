import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ChevronLeft, Smartphone } from 'lucide-react';
import type { MenuItem, VendorConfig, Business } from '../types';

export const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { createOrder } = useOrder();

    // Get state from navigation
    const { cart, vendorId, vendorConfig, business } = location.state as {
        cart: { item: MenuItem, quantity: number }[],
        vendorId: string,
        vendorConfig: VendorConfig,
        business: Business
    } || {};

    // Local State
    const [paymentName, setPaymentName] = useState(user?.name || '');
    const [contactPhone, setContactPhone] = useState(user?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!cart || cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <p>Your cart is empty.</p>
                <Button onClick={() => navigate('/home')}>Go Home</Button>
            </div>
        );
    }

    const totalAmount = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

    const handlePlaceOrder = () => {
        if (!paymentName || !contactPhone) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);

        // Flatten items for individual tracking (1 plate = 1 coupon logic later)
        const orderItems = cart.flatMap(cartItem => {
            return Array.from({ length: cartItem.quantity }).map(() => ({
                id: Math.random().toString(36).substr(2, 9), // unique instance id
                menuItemId: cartItem.item.id,
                name: cartItem.item.name,
                price: cartItem.item.price,
                status: 'active' as const
            }));
        });

        const newOrder = {
            id: Date.now().toString(),
            vendorId,
            studentId: user?.id || 'guest',
            items: orderItems,
            totalAmount,
            status: 'pending' as const,
            paymentName,
            contactPhone,
            timestamp: new Date()
        };

        createOrder(newOrder);

        // Simulate network delay then redirect
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
                <h1 className="font-bold text-lg text-slate-900">Checkout</h1>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">
                {/* Order Summary */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                         <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Order Summary</h2>
                         {cart.map((c, idx) => (
                             <div key={idx} className="flex justify-between text-sm">
                                 <span className="text-slate-600">{c.quantity}x {c.item.name}</span>
                                 <span className="font-medium text-slate-900">{c.item.price * c.quantity} TZS</span>
                             </div>
                         ))}
                         <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-lg text-emerald-600">
                             <span>Total</span>
                             <span>{totalAmount} TZS</span>
                         </div>
                    </CardContent>
                </Card>

                {/* Payment Instructions */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <Smartphone className="w-6 h-6 text-emerald-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-emerald-900">Manual Payment Required</h3>
                            <p className="text-sm text-emerald-700 leading-relaxed mt-1">
                                Please pay exactly <strong>{totalAmount} TZS</strong> to Lipa Namba <strong>{vendorConfig?.lipaNumber || business?.whatsapp || 'N/A'}</strong>.
                                Your order will be confirmed based on the vendor's processing window.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 text-center border border-emerald-200">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Send Money To</p>
                        <p className="text-xl font-mono font-bold text-slate-900">{vendorConfig?.lipaNumber || business?.whatsapp || 'N/A'}</p>
                        <p className="text-sm font-medium text-slate-600">{vendorConfig?.lipaName || business?.name}</p>
                    </div>
                </div>

                {/* Checkout Form */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 space-y-4">
                        <h2 className="font-bold text-slate-900">Verification Details</h2>
                        <Input
                           label="Payment Name (Name on SimCard)"
                           placeholder="e.g. Juma Juma"
                           value={paymentName}
                           onChange={(e) => setPaymentName(e.target.value)}
                        />
                        <Input
                           label="Phone Number"
                           placeholder="e.g. 07XXXXXXXX"
                           value={contactPhone}
                           onChange={(e) => setContactPhone(e.target.value)}
                        />

                        <Button
                           onClick={handlePlaceOrder}
                           disabled={isSubmitting}
                           className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold shadow-lg shadow-emerald-500/20"
                        >
                            {isSubmitting ? 'Placing Order...' : 'I Have Sent Payment'}
                        </Button>
                        <p className="text-xs text-center text-slate-400">
                            By clicking, you confirm you have sent the money manually.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
