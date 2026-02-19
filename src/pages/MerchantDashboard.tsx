import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Store, Settings, CheckCircle, Search, Plus, Trash2, Smartphone } from 'lucide-react';
import type { Category, MenuItem } from '../types';

const categories: Category[] = ['Stationary', 'Food', 'Travel'];

export const MerchantDashboard = () => {
  const { user } = useAuth();
  const { vendors, menus, orders, updateVendorConfig, updateVendorMenu, updateOrderStatus } = useOrder();
  const [activeTab, setActiveTab] = useState<'settings' | 'menu' | 'verification'>('settings');

  // Determine vendor ID (prioritize businessId for linked accounts)
  const vendorId = user?.businessId || user?.id;

  // Vendor Config State
  const [shopName, setShopName] = useState(user?.name || 'My Campus Shop');
  const [category, setCategory] = useState<Category>('Stationary');
  const [lipaName, setLipaName] = useState('');
  const [lipaNumber, setLipaNumber] = useState('');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [orderMode, setOrderMode] = useState<'realtime' | 'batch'>('realtime');
  const [instructions, setInstructions] = useState('Pay to the Lipa Namba and wait for confirmation.');
  const [isSaved, setIsSaved] = useState(false);

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Verification State
  const [searchPaymentName, setSearchPaymentName] = useState('');

  useEffect(() => {
    if (vendorId) {
        const config = vendors[vendorId];
        if (config) {
            setLipaName(config.lipaName);
            setLipaNumber(config.lipaNumber);
            setOpenTime(config.orderWindow.open);
            setCloseTime(config.orderWindow.close);
            setOrderMode(config.orderMode);
            setInstructions(config.instructions);
        }
        const menu = menus[vendorId];
        if (menu) {
            setMenuItems(menu);
        }
    }
  }, [vendorId, vendors, menus]);

  const handleSaveSettings = () => {
      if (!vendorId) return;
      updateVendorConfig(vendorId, {
          lipaName,
          lipaNumber,
          orderMode,
          orderWindow: { open: openTime, close: closeTime },
          instructions
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddMenuItem = () => {
      if (!vendorId || !newItemName || !newItemPrice) return;
      const newItem: MenuItem = {
          id: Date.now().toString(),
          name: newItemName,
          price: parseInt(newItemPrice),
          description: newItemDesc
      };
      const updatedMenu = [...menuItems, newItem];
      setMenuItems(updatedMenu);
      updateVendorMenu(vendorId, updatedMenu);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemDesc('');
  };

  const handleDeleteMenuItem = (id: string) => {
      if (!vendorId) return;
      const updatedMenu = menuItems.filter(item => item.id !== id);
      setMenuItems(updatedMenu);
      updateVendorMenu(vendorId, updatedMenu);
  };

  const pendingOrders = orders.filter(o => o.vendorId === vendorId && o.status === 'pending');
  const filteredOrders = pendingOrders.filter(o =>
      o.paymentName.toLowerCase().includes(searchPaymentName.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Merchant Dashboard</h1>
           <p className="text-slate-500">Manage orders & storefront.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
          {['settings', 'menu', 'verification'].map((tab) => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                      activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
          {activeTab === 'settings' && (
              <div className="grid md:grid-cols-2 gap-6">
                  {/* Shop Identity */}
                  <Card className="bg-white shadow-sm border-slate-200">
                     <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Store className="w-5 h-5 text-emerald-600" />
                            <h2 className="font-bold text-lg text-slate-900">Shop Details</h2>
                        </div>
                        <Input label="Shop Name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                        <div>
                           <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
                           <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg">
                             {categories.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                     </CardContent>
                  </Card>

                  {/* Order Configuration */}
                  <Card className="bg-white shadow-sm border-slate-200">
                      <CardContent className="p-6 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-5 h-5 text-emerald-600" />
                              <h2 className="font-bold text-lg text-slate-900">Order Settings</h2>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <Input label="Lipa Name" placeholder="e.g. Juma Juma" value={lipaName} onChange={(e) => setLipaName(e.target.value)} />
                              <Input label="Lipa Number" placeholder="07XXXXXXXX" value={lipaNumber} onChange={(e) => setLipaNumber(e.target.value)} />
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

                          <div>
                              <label className="text-sm font-medium text-slate-700 mb-1 block">Order Mode</label>
                              <div className="flex gap-2">
                                  <button onClick={() => setOrderMode('realtime')} className={`flex-1 py-2 border rounded-lg text-sm font-medium ${orderMode === 'realtime' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>Real-time</button>
                                  <button onClick={() => setOrderMode('batch')} className={`flex-1 py-2 border rounded-lg text-sm font-medium ${orderMode === 'batch' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>Batch / Pre-order</button>
                              </div>
                          </div>

                          <Button onClick={handleSaveSettings} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
                             {isSaved ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Saved</span> : "Save Configuration"}
                          </Button>
                      </CardContent>
                  </Card>
              </div>
          )}

          {activeTab === 'menu' && (
              <Card className="bg-white shadow-sm border-slate-200">
                  <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="font-bold text-lg text-slate-900">Menu Management</h2>
                          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">No photos allowed</div>
                      </div>

                      {/* Add Item Form */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                          <h3 className="text-sm font-bold text-slate-700">Add New Item</h3>
                          <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                  <Input placeholder="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                              </div>
                              <div>
                                  <Input placeholder="Price" type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                              </div>
                          </div>
                          <Input placeholder="Description (Optional)" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} />
                          <Button onClick={handleAddMenuItem} size="sm" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                              <Plus className="w-4 h-4 mr-2" /> Add to Menu
                          </Button>
                      </div>

                      {/* Menu List */}
                      <div className="space-y-3">
                          {menuItems.length === 0 ? (
                              <p className="text-center text-slate-400 py-8">Your menu is empty.</p>
                          ) : (
                              menuItems.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-emerald-100 transition-colors bg-white">
                                      <div>
                                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                                          <p className="text-xs text-slate-500">{item.description}</p>
                                          <span className="text-sm font-semibold text-emerald-600">{item.price} TZS</span>
                                      </div>
                                      <button onClick={() => handleDeleteMenuItem(item.id)} className="text-slate-400 hover:text-red-500 p-2">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </CardContent>
              </Card>
          )}

          {activeTab === 'verification' && (
              <Card className="bg-white shadow-sm border-slate-200 h-full">
                  <CardContent className="p-6 space-y-6">
                      <div className="space-y-2">
                          <h2 className="font-bold text-lg text-slate-900">Order Verification</h2>
                          <p className="text-slate-500 text-sm">Search by the name on the payment.</p>
                      </div>

                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input
                             type="text"
                             placeholder="Search Payment Name..."
                             value={searchPaymentName}
                             onChange={(e) => setSearchPaymentName(e.target.value)}
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                      </div>

                      <div className="space-y-4 mt-4">
                          {filteredOrders.length === 0 ? (
                              <div className="text-center py-12 text-slate-400">
                                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p>No pending orders found.</p>
                              </div>
                          ) : (
                              filteredOrders.map((order) => (
                                  <div key={order.id} className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl space-y-3">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <h3 className="font-bold text-slate-900">{order.paymentName}</h3>
                                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                                  <Smartphone className="w-3 h-3" /> {order.contactPhone}
                                              </p>
                                          </div>
                                          <span className="text-lg font-bold text-emerald-600">
                                              {order.totalAmount} TZS
                                          </span>
                                      </div>

                                      <div className="bg-white p-3 rounded-lg border border-emerald-100/50 text-sm space-y-1">
                                          {order.items.map((item, idx) => (
                                              <div key={idx} className="flex justify-between text-slate-700">
                                                  <span>1x {item.name}</span>
                                                  <span>{item.price}</span>
                                              </div>
                                          ))}
                                      </div>

                                      <div className="pt-2 flex gap-3">
                                          <Button
                                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                          >
                                              Confirm Payment
                                          </Button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </CardContent>
              </Card>
          )}
      </div>
    </div>
  );
};
