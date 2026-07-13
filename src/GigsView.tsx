import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, MapPin, Calendar, DollarSign, Upload, Plus, ArrowLeft, Loader2, Image as ImageIcon, X, Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './lib/supabase';
import { GigCard } from './components/GigCard';
import { SkeletonCard } from './components/SkeletonCard';
import { playNotificationSound } from './lib/sound';
import { sendDesktopNotification } from './lib/notifications';

interface GigsViewProps {
  onDirectToChat?: (contactId: string, message: string) => void;
  onViewProfile?: (profile: any) => void;
  key?: string;
}

export function GigsView({ onDirectToChat, onViewProfile }: GigsViewProps) {
  const [view, setView] = useState<'list' | 'create' | 'success'>('list');
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterProvince, setFilterProvince] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isImmediate, setIsImmediate] = useState(true);
  const [date, setDate] = useState('');
  const [province, setProvince] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState('General');
  const [editingGigId, setEditingGigId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [viewImages, setViewImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState(false);

  // Local storage helpers
  const getLocalGigs = () => {
    try {
      const saved = localStorage.getItem('local_gigs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalGigs = (newList: any[]) => {
    try {
      localStorage.setItem('local_gigs', JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      if (localStorage.getItem('notify_gigs') !== 'false') {
        playNotificationSound('notification');
        sendDesktopNotification('💼 Gig Hub Update', {
          body: toastMessage,
          tag: 'gig-toast-alert'
        });
      }
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    if (view === 'list') {
      fetchGigs();
    }

    // Subscribe to profile changes for real-time name/avatar updates
    const profileChannel = supabase
      .channel('gigs-profile-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          if (view === 'list') {
            fetchGigs();
          }
        }
      )
      .subscribe();

    // Subscribe to gigs changes to see new/updated/deleted gigs
    const gigsChannel = supabase
      .channel('gigs-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gigs' },
        () => {
          if (view === 'list') {
            fetchGigs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(gigsChannel);
    };
  }, [view]);

  const fetchGigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('gigs')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        const isMissingTable = supabaseError.code === '42P01' || 
                              supabaseError.message?.toLowerCase().includes('does not exist') ||
                              supabaseError.message?.toLowerCase().includes('relation');
        if (isMissingTable) {
          console.warn('Gigs table not found or accessible. Using local fallback.');
          setIsUsingLocalFallback(true);
          setGigs(getLocalGigs());
        } else {
          console.warn('Supabase error fetching gigs, falling back:', supabaseError);
          setIsUsingLocalFallback(true);
          setGigs(getLocalGigs());
        }
      } else {
        setGigs(data || []);
        setIsUsingLocalFallback(false);
      }
    } catch (err: any) {
      console.warn('Unexpected error fetching gigs, falling back:', err?.message || err);
      setIsUsingLocalFallback(true);
      setGigs(getLocalGigs());
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    // 1. Optimistic update
    const previousGigs = gigs;
    setGigs(prev => prev.filter(g => g.id !== id));

    try {
      // 2. Define the delete function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (isUsingLocalFallback) {
        const updated = getLocalGigs().filter((g: any) => g.id !== id);
        saveLocalGigs(updated);
        setToastMessage('Gig deleted successfully.');
        await fetchGigs();
        return;
      }

      // 3. Execute the deletion
      const { error } = await supabase
        .from("gigs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      // 4. Success logic
      setToastMessage('Gig deleted successfully.');
      await fetchGigs();
    } catch (error: any) {
      // 5. Error logic
      console.error('Detailed Error deleting gig:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'N/A',
        details: error?.details || '',
        hint: error?.hint || '',
        fullError: error
      });
      setGigs(previousGigs);
      alert(`Failed to delete gig: ${error.message || 'Unknown error'}`);
    }
  };

  const editGig = (gig: any) => {
    // Populate form with gig data
    setTitle(gig.title);
    setDescription(gig.description);
    setCategory(gig.category || 'General');
    setProvince(gig.province || '');
    setLocation(gig.location);
    setPrice(gig.price);
    setImages(gig.images || []);
    setIsImmediate(!gig.scheduled_date);
    setDate(gig.scheduled_date || '');
    setView('create');
    setEditingGigId(gig.id);
    // Note: This implementation is simplified for brevity. Real edit would need to track `editingGigId`.
  };

  const handleApplyGig = async (gig: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToastMessage('Please login to apply to this gig.');
        return;
      }

      if (user.id === gig.user_id) {
        setToastMessage('You cannot apply to your own gig!');
        return;
      }

      const starterMessage = `Hi, I am applying for your gig "${gig.title}". Let's chat about the details!`;
      
      if (onDirectToChat) {
        onDirectToChat(gig.user_id, starterMessage);
      } else {
        setToastMessage(`Application sent! Go to the Chat tab to message the owner.`);
      }
    } catch (e: any) {
      console.error('Detailed Error applying to gig:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
      setToastMessage('Could not apply to gig.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newImages = await Promise.all(
      files.map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_SIZE = 1000;
              
              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );
    
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newGig = {
        title,
        description,
        is_immediate: isImmediate,
        scheduled_date: isImmediate ? null : date,
        province,
        location,
        category,
        price: Number(price),
        images,
        user_id: user?.id,
        created_at: new Date().toISOString()
      };

      if (isUsingLocalFallback) {
        let localList = getLocalGigs();
        const storedGig = {
          id: editingGigId || 'gig-' + Math.random().toString(36).substring(2, 11),
          ...newGig,
          profiles: {
            id: user?.id,
            name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Anonymous',
            avatar_url: user?.user_metadata?.avatar_url || ''
          }
        };
        if (editingGigId) {
          localList = localList.map((g: any) => g.id === editingGigId ? { ...g, ...storedGig } : g);
        } else {
          localList = [storedGig, ...localList];
        }
        saveLocalGigs(localList);
      } else {
        let error;
        if (editingGigId) {
          ({ error } = await supabase
            .from('gigs')
            .update(newGig)
            .eq('id', editingGigId));
        } else {
          ({ error } = await supabase
            .from('gigs')
            .insert([newGig]));
        }

        if (error) {
          if (error.code === '42P01') {
            let localList = getLocalGigs();
            const storedGig = {
              id: editingGigId || 'gig-' + Math.random().toString(36).substring(2, 11),
              ...newGig,
              profiles: {
                id: user?.id,
                name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Anonymous',
                avatar_url: user?.user_metadata?.avatar_url || ''
              }
            };
            if (editingGigId) {
              localList = localList.map((g: any) => g.id === editingGigId ? { ...g, ...storedGig } : g);
            } else {
              localList = [storedGig, ...localList];
            }
            saveLocalGigs(localList);
            setIsUsingLocalFallback(true);
          } else {
            throw error;
          }
        }
      }

      await fetchGigs();

      setView('list');
      setEditingGigId(null);
      // Reset form
      setTitle('');
      setDescription('');
      setIsImmediate(true);
      setDate('');
      setProvince('');
      setLocation('');
      setPrice('');
      setImages([]);
    } catch (err: any) {
      console.error('Detailed Error saving gig:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
      setError(err.message || 'Failed to create gig');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full w-full overflow-y-auto px-4 sm:px-6 py-8 max-w-md mx-auto text-center space-y-6"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Briefcase className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Congratulations!</h2>
        <p className="text-gray-500 text-lg">Your gig has been successfully published and is now live for other users to view and apply to.</p>
        <button
          onClick={() => setView('list')}
          className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
        >
          View All GiGs
        </button>
      </motion.div>
    );
  }

  if (view === 'create') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="h-full w-full overflow-y-auto px-4 sm:px-6 py-8 max-w-2xl mx-auto space-y-6"
      >
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('list')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create a GiG</h1>
            <p className="mt-1 text-sm text-gray-500">Provide details about the gig you are posting.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gig Images</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-indigo-500 transition-colors bg-gray-50 hover:bg-indigo-50/50">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-xs font-medium">Add Images</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gig Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="e.g. Need a plumber for bathroom pipe" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="Describe the job in detail..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select required value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border bg-white">
                    <option value="Cleaning">Cleaning</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Security">Security</option>
                    <option value="Construction">Construction</option>
                    <option value="Gardening">Gardening</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Province</label>
                  <select required value={province} onChange={e => setProvince(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border bg-white">
                    <option value="">Select Province</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="Northern Cape">Northern Cape</option>
                    <option value="North West">North West</option>
                    <option value="Western Cape">Western Cape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input required type="text" value={location} onChange={e => setLocation(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="e.g. Cape Town" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timing</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setIsImmediate(true)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${isImmediate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Immediately</button>
                    <button type="button" onClick={() => setIsImmediate(false)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${!isImmediate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Set Date</button>
                  </div>
                </div>
                
                {!isImmediate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price Offered (ZAR)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R</span>
                  </div>
                  <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="block w-full pl-8 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button type="button" onClick={() => {setView('list'); setEditingGigId(null);}} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || images.length === 0} className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 transition-colors">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingGigId ? 'Save Changes' : 'Create GiG'}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  const filteredGigs = gigs.filter(gig => {
    const matchesCategory = selectedCategory === 'All' || gig.category === selectedCategory;
    const matchesSearch = gig.title.toLowerCase().includes(search.toLowerCase()) || gig.description.toLowerCase().includes(search.toLowerCase());
    const matchesProvince = !filterProvince || gig.province === filterProvince;
    const matchesLocation = !filterLocation || gig.location.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesMinPrice = !filterMinPrice || Number(gig.price) >= Number(filterMinPrice);
    const matchesMaxPrice = !filterMaxPrice || Number(gig.price) <= Number(filterMaxPrice);

    return matchesCategory && matchesSearch && matchesProvince && matchesLocation && matchesMinPrice && matchesMaxPrice;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full flex flex-col overflow-y-auto px-4 sm:px-6 py-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">GiGs Marketplace</h1>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for gigs..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-5 h-5" /> Filters
          </button>
        </div>

        {/* Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <div className="space-y-4">
                <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                  <option value="">All Provinces</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="North West">North West</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
                <input type="text" placeholder="Location" value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                <div className="flex gap-2">
                  <input type="number" placeholder="Min Price" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                  <input type="number" placeholder="Max Price" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                </div>
                <button onClick={() => setShowFilters(false)} className="w-full bg-indigo-600 text-white p-2 rounded-lg font-medium">Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Cleaning', 'Delivery', 'Security', 'Construction', 'Gardening'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredGigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Briefcase className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No GiGs Available</h3>
          <p className="text-gray-500 mt-2 max-w-sm">There are currently no active gigs matching your search. Be the first to post a gig.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredGigs.map((gig: any, idx: number) => (
              <GigCard key={gig.id || idx} gig={gig} user={user} onEdit={editGig} onDelete={handleDeleteItem} onViewImage={(images) => { setCurrentImageIndex(0); setViewImages(images); }} onApply={handleApplyGig} onViewProfile={onViewProfile} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Image Viewer */}
      {viewImages && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button onClick={() => setViewImages(null)} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full z-10"><X /></button>
          
          {currentImageIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev - 1); }} className="absolute left-4 text-white p-2 bg-black/50 rounded-full z-10"><ChevronLeft /></button>
          )}
          {currentImageIndex < viewImages.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev + 1); }} className="absolute right-4 text-white p-2 bg-black/50 rounded-full z-10"><ChevronRight /></button>
          )}

          <img src={viewImages[currentImageIndex]} alt={`Image ${currentImageIndex + 1}`} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg z-50"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!search && (
        <button
          onClick={() => { setView('create'); setEditingGigId(null); }}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center z-50"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </motion.div>
  );
}

