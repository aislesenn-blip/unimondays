import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Store, Clock, Tag, Share2, Plus, Edit2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category } from '../types';

const categories: Category[] = ['Stationary', 'Food', 'Travel', 'Opportunities', 'Tech', 'Grooming', 'Other'];

export const MerchantDashboard = () => {
  const { user } = useAuth();

  const [shopName, setShopName] = useState(user?.name || 'My Campus Shop');
  const [category, setCategory] = useState<Category>('Stationary');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [seoKeywords, setSeoKeywords] = useState('printing, assignment, color, cheap');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // Simulate API save
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const copyLink = () => {
    // Simulate deep link copy
    navigator.clipboard.writeText(`https://unimonday.com/merchant/${user?.id}`);
    alert('Shop link copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Merchant Dashboard</h1>
           <p className="text-slate-500">Manage your store presence.</p>
        </div>
        <Button onClick={copyLink} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
           <Share2 className="w-4 h-4" /> Share Store
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Main Details */}
        <Card className="bg-white shadow-sm border-slate-200">
           <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <Store className="w-5 h-5" />
                 </div>
                 <h2 className="font-bold text-lg text-slate-900">Shop Identity</h2>
              </div>

              <Input
                 label="Shop Name"
                 value={shopName}
                 onChange={(e) => setShopName(e.target.value)}
              />

              <div>
                 <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
                 <select
                   value={category}
                   onChange={(e) => setCategory(e.target.value as Category)}
                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 >
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Opens</label>
                    <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Closes</label>
                    <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
           </CardContent>
        </Card>

        {/* SEO & Visibility */}
        <Card className="bg-white shadow-sm border-slate-200">
           <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <Tag className="w-5 h-5" />
                 </div>
                 <h2 className="font-bold text-lg text-slate-900">SEO & Discovery</h2>
              </div>

              <div>
                 <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Search Keywords (Tags)
                 </label>
                 <p className="text-xs text-slate-500 mb-2">
                    Enter words students might search for. Separate with commas.
                 </p>
                 <textarea
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-900"
                    placeholder="e.g. printing, binding, cheap, late night, food..."
                 />
              </div>

              <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4">
                 {isSaved ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Saved</span> : "Update Profile"}
              </Button>
           </CardContent>
        </Card>
      </div>

      {/* Product Catalogue Placeholder */}
      <Card className="bg-white shadow-sm border-slate-200">
         <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
               <h2 className="font-bold text-lg text-slate-900">Product Catalogue</h2>
               <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200">
                 <Plus className="w-4 h-4" /> Add Product
               </Button>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-300">
               <p className="text-slate-500 font-medium">No products listed yet.</p>
               <p className="text-xs text-slate-400 mt-1">Add items to showcase your menu or services.</p>
            </div>
         </CardContent>
      </Card>
    </div>
  );
};
