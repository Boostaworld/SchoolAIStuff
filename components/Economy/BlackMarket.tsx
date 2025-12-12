import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbitStore } from '@/store/useOrbitStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Sparkles, Lock, Check, ShoppingBag, Coins } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  item_type: 'theme' | 'border' | 'cursor' | 'avatar' | 'ai_model';
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  preview_url: string | null;
  metadata: any;
  is_active: boolean;
}

interface UserInventoryItem {
  item_id: string;
  equipped: boolean;
}

export function BlackMarket() {
  const { currentUser, purchaseItem, equipItem, orbitPoints } = useOrbitStore();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch shop items and user inventory
  useEffect(() => {
    fetchShopData();
  }, [currentUser?.id]);

  useEffect(() => {
    setUserPoints(orbitPoints || 0);
  }, [orbitPoints]);

  async function fetchShopData() {
    if (!currentUser?.id) return;

    try {
      // Fetch shop items
      const { data: items } = await supabase
        .from('shop_items')
        .select('id, name, description, item_type, price, rarity, preview_url, metadata, is_active')
        .eq('is_active', true)
        .order('rarity', { ascending: false });

      // Fetch user inventory
      const { data: inv } = await supabase
        .from('user_inventory')
        .select('item_id, equipped')
        .eq('user_id', currentUser.id);

      // Fetch user points
      const { data: profile } = await supabase
        .from('profiles')
        .select('orbit_points')
        .eq('id', currentUser.id)
        .single();

      setShopItems(items || []);
      setInventory(inv || []);
      setUserPoints(profile?.orbit_points || 0);
    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast.error('Failed to load shop');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(item: ShopItem) {
    if (userPoints < item.price) {
      toast.error('Insufficient orbit points!');
      return;
    }

    try {
      const res = await purchaseItem(item.id);
      if (!res.success) {
        toast.error(res.error || 'Purchase failed');
        return;
      }

      toast.success(`${item.name} purchased!`);
      // Live update balance locally
      setUserPoints(prev => Math.max(0, (orbitPoints || 0) - item.price));
      // TODO: future polish - animate coins transferring from button to balance HUD
      await fetchShopData(); // refresh inventory snapshot
      setSelectedItem(null);
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed');
    }
  }

  async function handleEquip(itemId: string) {
    if (!equipItem) return;
    try {
      const res = await equipItem(itemId);
      if (!res.success) {
        toast.error(res.error || 'Failed to equip item');
        return;
      }
      toast.success('Item equipped!');
      await fetchShopData();
    } catch (error: any) {
      console.error('Equip error:', error);
      toast.error(error.message || 'Failed to equip');
    }
  }

  function getRarityGlow(rarity: string) {
    const glows = {
      common: 'shadow-sm shadow-slate-500/20',
      rare: 'shadow-md shadow-blue-500/40',
      epic: 'shadow-lg shadow-purple-500/60',
      legendary: 'shadow-xl shadow-yellow-500/80 animate-pulse'
    };
    return glows[rarity as keyof typeof glows] || glows.common;
  }

  function getRarityBorder(rarity: string) {
    const borders = {
      common: 'border-slate-500/30',
      rare: 'border-blue-500/50',
      epic: 'border-purple-500/70',
      legendary: 'border-yellow-500/90'
    };
    return borders[rarity as keyof typeof borders] || borders.common;
  }

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'theme', label: 'Themes' },
    { id: 'border', label: 'Borders' },
    { id: 'ai_model', label: 'AI Models' },
    { id: 'cursor', label: 'Cursors' }
  ];

  const filteredItems = selectedCategory === 'all'
    ? shopItems
    : shopItems.filter(item => item.item_type === selectedCategory);

  const isOwned = (itemId: string) => inventory.some(inv => inv.item_id === itemId);
  const isEquipped = (itemId: string) => inventory.some(inv => inv.item_id === itemId && inv.equipped);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 relative gap-4 md:gap-0">
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl -z-10" />

        <div>
          <h1 className="text-2xl md:text-4xl font-black flex items-center gap-2 md:gap-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-cyan-400" style={{ fontFamily: 'Orbitron, monospace' }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.5)]"
            >
              <ShoppingBag className="text-white w-4 h-4 md:w-6 md:h-6" />
            </motion.div>
            BLACK MARKET
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-2 font-mono flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-yellow-500" />
            <span className="hidden sm:inline">PREMIUM UPGRADES • EXCLUSIVE ITEMS • LIMITED STOCK</span>
            <span className="sm:hidden">PREMIUM UPGRADES</span>
          </p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <div className="text-xs text-slate-500 font-mono uppercase mb-1">Your Balance</div>
          <div className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 font-mono">{userPoints} <span className="text-base md:text-xl">PTS</span></div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 border-b border-slate-700 pb-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-t transition-colors text-xs md:text-sm whitespace-nowrap ${selectedCategory === cat.id
              ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Shop Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              whileHover={{
                scale: 1.05,
                y: -8,
                transition: { duration: 0.2 }
              }}
              className={`group relative p-5 rounded-2xl border-2 ${getRarityBorder(item.rarity)} ${getRarityGlow(item.rarity)} bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur cursor-pointer overflow-hidden transition-all`}
              onClick={() => setSelectedItem(item)}
            >
              {/* Shimmer effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100"
                animate={{
                  x: ['-200%', '200%']
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
              {/* Rarity Badge */}
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${item.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                item.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                  item.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                }`}>
                {item.rarity}
              </div>

              {/* Status Badges */}
              {isEquipped(item.id) && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Check size={12} /> Equipped
                </div>
              )}
              {isOwned(item.id) && !isEquipped(item.id) && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400">
                  Owned
                </div>
              )}

              {/* Item Info */}
              <div className="mt-6 relative z-10">
                <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors">{item.name}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{item.description}</p>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-center justify-between relative z-10">
                <motion.span
                  className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 font-mono"
                  whileHover={{ scale: 1.1 }}
                >{item.price} <span className="text-sm">PTS</span></motion.span>
                {!isOwned(item.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(item);
                    }}
                    disabled={userPoints < item.price}
                    className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {userPoints < item.price ? <Lock size={16} /> : 'Buy'}
                  </button>
                )}
                {isOwned(item.id) && !isEquipped(item.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquip(item.id);
                    }}
                    className="px-3 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    Equip
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-slate-800 p-6 rounded-lg border-2 ${getRarityBorder(selectedItem.rarity)} ${getRarityGlow(selectedItem.rarity)} max-w-md w-full mx-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-2">{selectedItem.name}</h2>
              <p className="text-slate-400 mb-4">{selectedItem.description}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-lg">Price:</span>
                <span className="text-2xl font-bold text-cyan-400">{selectedItem.price} pts</span>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-lg">Your Balance:</span>
                <span className={`text-2xl font-bold ${userPoints >= selectedItem.price ? 'text-green-400' : 'text-red-400'}`}>
                  {userPoints} pts
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                {!isOwned(selectedItem.id) && (
                  <button
                    onClick={() => handlePurchase(selectedItem)}
                    disabled={userPoints < selectedItem.price}
                    className="flex-1 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                    {userPoints < selectedItem.price ? 'Insufficient Points' : 'Purchase'}
                  </button>
                )}
                {isOwned(selectedItem.id) && !isEquipped(selectedItem.id) && (
                  <button
                    onClick={() => handleEquip(selectedItem.id)}
                    className="flex-1 px-4 py-2 rounded bg-green-500 hover:bg-green-600 transition-colors font-bold"
                  >
                    Equip
                  </button>
                )}
                {isEquipped(selectedItem.id) && (
                  <div className="flex-1 px-4 py-2 rounded bg-green-500/20 text-green-400 flex items-center justify-center gap-2 font-bold">
                    <Check /> Equipped
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
