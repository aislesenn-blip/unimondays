import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Order, VendorConfig, MenuItem } from '../types';
import { mockBusinesses, mockMenus } from '../data/mockData';

interface OrderContextType {
  orders: Order[];
  vendors: Record<string, VendorConfig>; // Vendor ID -> Config
  menus: Record<string, MenuItem[]>;     // Vendor ID -> Menu
  createOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  redeemItem: (orderId: string, itemId: string) => void;
  updateVendorConfig: (vendorId: string, config: VendorConfig) => void;
  updateVendorMenu: (vendorId: string, items: MenuItem[]) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('unimonday_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize vendors from mockData
  const [vendors, setVendors] = useState<Record<string, VendorConfig>>(() => {
    const initialVendors: Record<string, VendorConfig> = {};
    mockBusinesses.forEach(b => {
      if (b.lipaNumber && b.lipaName && b.orderWindow) {
         initialVendors[b.id] = {
           lipaNumber: b.lipaNumber,
           lipaName: b.lipaName,
           orderMode: b.orderMode || 'realtime',
           orderWindow: b.orderWindow,
           instructions: b.instructions || ''
         };
      }
    });
    return initialVendors;
  });

  const [menus, setMenus] = useState<Record<string, MenuItem[]>>(mockMenus);

  const createOrder = (order: Order) => {
    setOrders(prev => {
      const newOrders = [...prev, order];
      localStorage.setItem('unimonday_orders', JSON.stringify(newOrders));
      return newOrders;
    });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => {
      const newOrders = prev.map(o => o.id === orderId ? { ...o, status } : o);
      localStorage.setItem('unimonday_orders', JSON.stringify(newOrders));
      return newOrders;
    });
  };

  const redeemItem = (orderId: string, itemId: string) => {
    setOrders(prev => {
      const newOrders = prev.map(o => {
        if (o.id === orderId) {
          const newItems = o.items.map(i => i.id === itemId ? { ...i, status: 'redeemed' as const } : i);
          return {
            ...o,
            items: newItems
          };
        }
        return o;
      });
      localStorage.setItem('unimonday_orders', JSON.stringify(newOrders));
      return newOrders;
    });
  };

  const updateVendorConfig = (vendorId: string, config: VendorConfig) => {
    setVendors(prev => ({ ...prev, [vendorId]: config }));
  };

  const updateVendorMenu = (vendorId: string, items: MenuItem[]) => {
    setMenus(prev => ({ ...prev, [vendorId]: items }));
  };

  return (
    <OrderContext.Provider value={{
      orders, vendors, menus,
      createOrder, updateOrderStatus, redeemItem,
      updateVendorConfig, updateVendorMenu
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within an OrderProvider');
  return context;
};
