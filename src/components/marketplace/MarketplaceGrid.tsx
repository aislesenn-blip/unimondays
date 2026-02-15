import type { Business } from '../../types';
import { BusinessCard } from './BusinessCard';
import { motion } from 'framer-motion';

interface MarketplaceGridProps {
  businesses: Business[];
}

export const MarketplaceGrid = ({ businesses }: MarketplaceGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
      {businesses.map((business, index) => (
        <motion.div
          key={business.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <BusinessCard business={business} />
        </motion.div>
      ))}
    </div>
  );
};
