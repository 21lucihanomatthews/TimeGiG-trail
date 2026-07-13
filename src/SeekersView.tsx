import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, MapPin, Calendar, DollarSign, Upload, Plus, ArrowLeft, Loader2, Image as ImageIcon, X, Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight, Users, MessageSquare } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SeekerCard } from './components/SeekerCard';
import { SkeletonCard } from './components/SkeletonCard';
import { playNotificationSound } from './lib/sound';
import { sendDesktopNotification } from './lib/notifications';

const DEFAULT_SEEKERS: any[] = [];

interface SeekersViewProps {
  onDirectToChat?: (contactId: string, message: string) => void;
  onViewProfile?: (profile: any) => void;
  key?: string;
}

export function SeekersView({ onDirectToChat, onViewProfile }: SeekersViewProps) {
  const [view, setView] = useState<'list' | 'create' | 'success'>('list');
  const [seekers, setSeekers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Database fallback status
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState(false);

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
  const [editingSeekerId, setEditingSeekerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [viewImages, setViewImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      if (localStorage.getItem('notify_seekers') !== 'false') {
        playNotificationSound('notification');
        sendDesktopNotification('🌟 Talent Directory Alert', {
          body: toastMessage,
          tag: 'seeker-toast-alert'
        });
      }
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const deeplinkId = localStorage.getItem('deeplink_id');
    const deeplinkTab = localStorage.getItem('deeplink_tab');
    if (deeplinkId && deeplinkTab === 'seekers' && seekers.length > 0) {
      const linkedSeeker = seekers.find(s => s.id === deeplinkId);
      if (linkedSeeker) {
        setSearch(linkedSeeker.title);
        localStorage.removeItem('deeplink_id');
        localStorage.removeItem('deeplink_tab');
      }
    }
  }, [seekers]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    if (view === 'list') {
      fetchSeekers();
    }

    // Subscribe to profile changes for real-time name/avatar updates
    const profileChannel = supabase
      .channel('seekers-profile-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          if (view === 'list') {
            fetchSeekers();
          }
        }
      )
      .subscribe();

    // Subscribe to seekers changes to see new/updated/deleted posts
    const seekersChannel = supabase
      .channel('seekers-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seekers' },
        () => {
          if (view === 'list') {
            fetchSeekers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(seekersChannel);
    };
  }, [view]);

  // Local storage helpers
  const getLocalSeekers = () => {
    try {
      const saved = localStorage.getItem('local_seekers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalSeekers = (newList: any[]) => {
    try {
      localStorage.setItem('local_seekers', JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSeekers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('seekers')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        // Handle common "table missing" or "insufficient privileges" errors by falling back quietly
        const isMissingTable = supabaseError.code === '42P01' || 
                              supabaseError.message?.toLowerCase().includes('does not exist') ||
                              supabaseError.message?.toLowerCase().includes('relation');
        
        if (isMissingTable) {
          console.warn('Seekers table not found or accessible. Using local fallback.');
          setIsUsingLocalFallback(true);
          setSeekers(getLocalSeekers());
        } else {
          // If it's a real error, we still fallback but maybe log a bit more info as a warning
          console.warn('Supabase error fetching seekers, falling back:', supabaseError);
          setIsUsingLocalFallback(true);
          setSeekers(getLocalSeekers());
        }
      } else {
        setSeekers(data || []);
        setIsUsingLocalFallback(false);
      }
    } catch (err: any) {
      // Catch any unexpected runtime errors
      console.warn('Unexpected error fetching seekers, falling back:', err?.message || err);
      setIsUsingLocalFallback(true);
      setSeekers(getLocalSeekers());
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const previousSeekers = seekers;
    setSeekers(prev => prev.filter(s => s.id !== id));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found. Please login first.");

      if (isUsingLocalFallback) {
        const updated = getLocalSeekers().filter((s: any) => s.id !== id);
        saveLocalSeekers(updated);
        setToastMessage('Seeker post deleted successfully.');
        await fetchSeekers();
        return;
      }

      const { error } = await supabase
        .from("seekers")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setToastMessage('Seeker post deleted successfully.');
      await fetchSeekers();
    } catch (error: any) {
      console.error('Detailed Error deleting seeker post:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'N/A',
        details: error?.details || '',
        hint: error?.hint || '',
        fullError: error
      });
      setSeekers(previousSeekers);
      alert(`Failed to delete seeker post: ${error.message || 'Unknown error'}`);
    }
  };

  const editSeeker = (seeker: any) => {
    setTitle(seeker.title);
    setDescription(seeker.description);
    setCategory(seeker.category || 'General');
    setProvince(seeker.province || '');
    setLocation(seeker.location);
    setPrice(seeker.price);
    setImages(seeker.images || []);
    setIsImmediate(!seeker.scheduled_date);
    setDate(seeker.scheduled_date || '');
    setView('create');
    setEditingSeekerId(seeker.id);
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
      if (!user) throw new Error("No user found. Please login first.");
      
      const newSeeker = {
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
        let localList = getLocalSeekers();
        const storedSeeker = {
          id: editingSeekerId || 'seeker-' + Math.random().toString(36).substring(2, 11),
          ...newSeeker,
          profiles: {
            id: user?.id,
            name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Anonymous',
            avatar_url: user?.user_metadata?.avatar_url || ''
          }
        };
        if (editingSeekerId) {
          localList = localList.map((s: any) => s.id === editingSeekerId ? { ...s, ...storedSeeker } : s);
        } else {
          localList = [storedSeeker, ...localList];
        }
        saveLocalSeekers(localList);
      } else {
        let error;
        if (editingSeekerId) {
          ({ error } = await supabase
            .from('seekers')
            .update(newSeeker)
            .eq('id', editingSeekerId));
        } else {
          ({ error } = await supabase
            .from('seekers')
            .insert([newSeeker]));
        }

        if (error) {
          if (error.code === '42P01') {
            let localList = getLocalSeekers();
            const storedSeeker = {
              id: editingSeekerId || 'seeker-' + Math.random().toString(36).substring(2, 11),
              ...newSeeker,
              profiles: {
                id: user?.id,
                name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Anonymous',
                avatar_url: user?.user_metadata?.avatar_url || ''
              }
            };
            if (editingSeekerId) {
              localList = localList.map((s: any) => s.id === editingSeekerId ? { ...s, ...storedSeeker } : s);
            } else {
              localList = [storedSeeker, ...localList];
            }
            saveLocalSeekers(localList);
            setIsUsingLocalFallback(true);
          } else {
            throw error;
          }
        }
      }

      await fetchSeekers();
      setView('list');
      setEditingSeekerId(null);
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
      console.error('Detailed Error saving seeker post:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
      setError(err.message || 'Failed to save seeker profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHireSeeker = async (seeker: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToastMessage('Please login to contact or hire a seeker.');
        return;
      }

      if (user.id === seeker.user_id) {
        setToastMessage('You cannot hire yourself!');
        return;
      }

      const starterMessage = `Hi, I am interested in hiring you for your posted service "${seeker.title}". Let's coordinate details!`;

      if (onDirectToChat) {
        onDirectToChat(seeker.user_id, starterMessage);
      } else {
        setToastMessage(`Hiring/Contact request initiated! Go to the Chat tab to start messaging.`);
      }
    } catch (e: any) {
      console.error('Detailed Error initiating hire:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
      setToastMessage(`Hiring/Contact request sent! Go to the Chat tab to start messaging.`);
    }
  };

  const filteredSeekers = seekers.filter(seeker => {
    if (seeker.profiles?.is_discoverable === false) return false;
    const matchesCategory = selectedCategory === 'All' || seeker.category === selectedCategory;
    const matchesSearch = seeker.title.toLowerCase().includes(search.toLowerCase()) || seeker.description.toLowerCase().includes(search.toLowerCase());
    const matchesProvince = !filterProvince || seeker.province === filterProvince;
    const matchesLocation = !filterLocation || seeker.location.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesMinPrice = !filterMinPrice || Number(seeker.price) >= Number(filterMinPrice);
    const matchesMaxPrice = !filterMaxPrice || Number(seeker.price) <= Number(filterMaxPrice);

    return matchesCategory && matchesSearch && matchesProvince && matchesLocation && matchesMinPrice && matchesMaxPrice;
  });

  if (view === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full w-full overflow-y-auto px-4 sm:px-6 py-8 max-w-md mx-auto text-center space-y-6"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Users className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Congratulations!</h2>
        <p className="text-gray-500 text-lg">Your seeker profile has been successfully published and is now live for hirers to view and hire you.</p>
        <button
          onClick={() => setView('list')}
          className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
        >
          View All Seekers
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
            <h1 className="text-2xl font-semibold text-gray-900">{editingSeekerId ? 'Edit Seeker Profile' : 'Become a Seeker'}</h1>
            <p className="mt-1 text-sm text-gray-500">List yourself as an available seeker to receive job offers.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">My Showcase Images (Upload work photos or professional profile)</label>
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
                <label className="block text-sm font-medium text-gray-700">Service Title / Job Seeking Name</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="e.g. Experienced Domestic Cleaner & Maid available" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">About Me / My Experience & Skills</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="Describe your experience, reliable references, background, tools you have, and type of work you seek..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialty Category</label>
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
                  <label className="block text-sm font-medium text-gray-700">City / Location</label>
                  <input required type="text" value={location} onChange={e => setLocation(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" placeholder="e.g. Pretoria" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setIsImmediate(true)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${isImmediate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Immediately</button>
                    <button type="button" onClick={() => setIsImmediate(false)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${!isImmediate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Available From Date</button>
                  </div>
                </div>
                
                {!isImmediate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Available Date</label>
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 border" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Desired Daily Rate (ZAR / day)</label>
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
            <button type="button" onClick={() => {setView('list'); setEditingSeekerId(null);}} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || images.length === 0} className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 transition-colors">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingSeekerId ? 'Save Changes' : 'Publish Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full w-full flex flex-col overflow-y-auto px-4 sm:px-6 py-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Seekers</h1>
            <p className="text-sm text-gray-500 mt-1">Browse reliable workers available for immediate hiring.</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by keywords, services or skill..." 
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
                <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
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
                <input type="text" placeholder="City / Location" value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                <div className="flex gap-2">
                  <input type="number" placeholder="Min Price" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                  <input type="number" placeholder="Max Price" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                </div>
                <button onClick={() => setShowFilters(false)} className="w-full bg-indigo-600 text-white p-2 rounded-lg font-medium">Apply Filters</button>
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
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredSeekers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No Seekers Found</h3>
          <p className="text-gray-500 mt-2 max-w-sm">There are no work seekers matching your filters. Be the first to create a Seeker profile!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredSeekers.map((seeker: any, idx: number) => (
              <SeekerCard 
                key={seeker.id || idx} 
                seeker={seeker} 
                user={user} 
                onEdit={editSeeker} 
                onDelete={handleDeleteItem} 
                onViewImage={(images) => { setCurrentImageIndex(0); setViewImages(images); }}
                onHire={handleHireSeeker}
                onViewProfile={onViewProfile}
              />
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
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium text-center max-w-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!search && (
        <button
          onClick={() => { setView('create'); setEditingSeekerId(null); }}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center z-50 shadow-indigo-200"
          title="Become a Seeker"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </motion.div>
  );
}
