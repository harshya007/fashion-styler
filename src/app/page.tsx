"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Shirt, Sparkles, Plus, LayoutDashboard, X, Camera, Trash2, Heart, Calendar as CalendarIcon, BarChart3, User as UserIcon, Send, RotateCcw, UploadCloud, Zap, Edit3, Mail, Filter, Star, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient, User } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uyfxxeaxewrwhgrxaozp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Znh4ZWF4ZXdyd2hncnhhb3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTQ2NjIsImV4cCI6MjA4NjI5MDY2Mn0.8IKACcmaZHO5r1DJgvCWXtZ8FeiBwQ_n8dGhyK09gqM'
);

const ADMIN_ID = 'e2c00fb2-02dc-4f15-a789-07bc2572409d'; 

export default function BeauStyler() {
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [closet, setCloset] = useState<any[]>([]);
  const [adminCloset, setAdminCloset] = useState<any[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [wardrobeFilter, setWardrobeFilter] = useState('all'); 
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [stylePreference, setStylePreference] = useState('masculine');
  const [currentOutfit, setCurrentOutfit] = useState<any>({ top: null, bottom: null, shoes: null });
  const [adminStats, setAdminStats] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  // Survey State (2nd Q Removed as requested)
  const [survey, setSurvey] = useState({
    rating: 0,
    mostHelpful: '',
    regularUse: '',
    payingConsideration: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const LOGO_URL = "https://uyfxxeaxewrwhgrxaozp.supabase.co/storage/v1/object/public/user_uploads/public/logo.png";

  const zoomSettings = {
    whileHover: { scale: 1.1 },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  } as const;

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      fetchAdminWardrobe();
      if (user) {
        fetchUserWardrobe(user.id);
        fetchCalendarPrompts(user.id);
        const savedLooks = localStorage.getItem(`savedOutfits_${user.id}`);
        const savedCal = localStorage.getItem(`userCalendar_${user.id}`);
        if (savedLooks) setSavedOutfits(JSON.parse(savedLooks));
        if (savedCal) setCalendar((prev: Record<string, any>) => ({...prev, ...JSON.parse(savedCal)}));
        if (user.email === 'harshalpohekar@gmail.com') analyzeMarketTrends();
      }
    };
    initializeUser();
  }, []);

  const fetchAdminWardrobe = async () => {
    const { data } = await supabase.from('wardrobe').select('*').eq('user_id', ADMIN_ID); 
    if (data) setAdminCloset(data);
  };

  const fetchUserWardrobe = async (userId: string) => {
    const { data } = await supabase.from('wardrobe').select('*').eq('user_id', userId); 
    if (data) setCloset(data);
  };

  const fetchCalendarPrompts = async (userId: string) => {
    const { data } = await supabase.from('calendar_prompts').select('*').eq('user_id', userId);
    if (data) {
        const dbNotes: Record<string, any> = {};
        data.forEach(item => { dbNotes[item.date_string] = { ...calendar[item.date_string], note: item.note }; });
        setCalendar((prev: Record<string, any>) => ({ ...prev, ...dbNotes }));
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    if (!fileToUpload || !user) return alert("Select photo & Login!");
    setIsUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webp`;
      await supabase.storage.from('user_uploads').upload(fileName, fileToUpload);
      const { data: { publicUrl } } = supabase.storage.from('user_uploads').getPublicUrl(fileName);
      const newItem = {
        user_id: user.id, 
        name: formData.get('name') || "Untitled",
        type: String(formData.get('type')).toLowerCase(),
        style: String(formData.get('style')).toLowerCase(), 
        image_url: publicUrl, 
      };
      await supabase.from('wardrobe').insert([newItem]);
      setIsModalOpen(false);
      setPreviewImg(null);
      fetchUserWardrobe(user.id);
      alert("Style added! ☁️");
    } catch (error: any) { alert(error.message); } finally { setIsUploading(false); }
  };

  const performSmartShuffle = () => {
    const activePool = closet.length > 0 ? closet : adminCloset;
    const pool = activePool.filter(i => (i.style === stylePreference));
    const tops = pool.filter(i => i.type.includes('top') || i.type.includes('upper'));
    const bottoms = pool.filter(i => i.type.includes('bottom') || i.type.includes('lower'));
    const shoes = pool.filter(i => i.type.includes('shoe') || i.type.includes('foot'));
    if (!tops.length || !bottoms.length || !shoes.length) return alert("Add more items to shuffle!");
    setCurrentOutfit({ 
      top: tops[Math.floor(Math.random() * tops.length)], 
      bottom: bottoms[Math.floor(Math.random() * bottoms.length)],
      shoes: shoes[Math.floor(Math.random() * shoes.length)]
    });
  };

  const scheduleForDate = (dateStr: string) => {
    if (!currentOutfit.top) return alert("Shuffle an outfit first!");
    const existing = calendar[dateStr] || {};
    const newCal = { ...calendar, [dateStr]: { ...existing, ...currentOutfit } };
    setCalendar(newCal);
    if(user) localStorage.setItem(`userCalendar_${user.id}`, JSON.stringify(newCal));
    alert(`OOTD set! 📅`);
  };

  const saveCalendarNote = async (dateStr: string, note: string) => {
    const existing = calendar[dateStr] || {};
    const newCal = { ...calendar, [dateStr]: { ...existing, note } };
    setCalendar(newCal);
    if (user) {
        await supabase.from('calendar_prompts').upsert({
            user_id: user.id,
            date_string: dateStr,
            note: note
        }, { onConflict: 'user_id,date_string' });
        localStorage.setItem(`userCalendar_${user.id}`, JSON.stringify(newCal));
    }
  };

  const removeOOTD = (dateStr: string) => {
    const existing = calendar[dateStr] || {};
    const { top, bottom, shoes, ...rest } = existing;
    const newCal = { ...calendar, [dateStr]: rest };
    setCalendar(newCal);
    if(user) localStorage.setItem(`userCalendar_${user.id}`, JSON.stringify(newCal));
  };

  const handleSurveySubmit = async () => {
    if (survey.rating === 0) return alert("Please give a rating!");
    setIsSubmittingSurvey(true);
    await supabase.from('feedback').insert([{ 
        user_id: user?.id, 
        content: "SURVEY_RESPONSE", 
        survey_data: survey 
    }]);
    setIsSubmittingSurvey(false);
    setSurveySubmitted(true);
    alert("Survey submitted! Thank you. ❤️");
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) return;
    setIsSubmittingFeedback(true);
    await supabase.from('feedback').insert([{ user_id: user?.id, content: feedback }]);
    setIsSubmittingFeedback(false);
    setFeedback('');
    alert("Response sent! 🚀");
  };

  const analyzeMarketTrends = async () => {
    const { data } = await supabase.from('wardrobe').select('type');
    if (data) {
      const counts = data.reduce((acc: any, i: any) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {});
      setAdminStats(counts);
    }
  };

  const isOutfitSaved = savedOutfits.some(o => 
    o.top?.id === currentOutfit.top?.id && o.bottom?.id === currentOutfit.bottom?.id && o.shoes?.id === currentOutfit.shoes?.id
  );

  const toggleSaveOutfit = () => {
    if(!user) return alert("Login to save!");
    if (!currentOutfit.top) return alert("Shuffle first!");
    let newList;
    if (isOutfitSaved) {
      newList = savedOutfits.filter(o => !(o.top?.id === currentOutfit.top?.id && o.bottom?.id === currentOutfit.bottom?.id && o.shoes?.id === currentOutfit.shoes?.id));
    } else {
      newList = [...savedOutfits, { ...currentOutfit, id: Date.now() }];
    }
    setSavedOutfits(newList);
    localStorage.setItem(`savedOutfits_${user.id}`, JSON.stringify(newList));
  };

  const filteredCloset = closet.filter(item => {
    if (wardrobeFilter === 'all') return true;
    if (wardrobeFilter === 'tops') return item.type.includes('top') || item.type.includes('upper');
    if (wardrobeFilter === 'bottoms') return item.type.includes('bottom') || item.type.includes('lower');
    if (wardrobeFilter === 'shoes') return item.type.includes('shoe') || item.type.includes('foot');
    return true;
  });

  return (
    <div className="min-h-screen bg-white text-zinc-950 pb-32 font-sans selection:bg-lime-300">
      <nav className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-zinc-100">
        <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
        <div className="flex gap-3">
             {user?.email === 'harshalpohekar@gmail.com' && (
               <button onClick={() => setActiveTab('admin')} className={`p-3 rounded-full transition ${activeTab === 'admin' ? 'bg-lime-400 text-black' : 'bg-zinc-100 text-zinc-400'}`}><BarChart3 size={20} /></button>
             )}
             <button onClick={() => setIsModalOpen(true)} className="bg-zinc-950 text-white p-3 rounded-full shadow-2xl transition active:scale-90"><Plus size={20} /></button>
        </div>
      </nav>

      <main className="max-w-lg mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <section className="text-center pt-8 pb-4 space-y-5">
                <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={LOGO_URL} className="h-20 mx-auto mb-2" />
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">The Future of You</h2>
                  <div className="bg-lime-400 inline-block px-3 py-1 rounded-full shadow-sm">
                    <p className="text-[9px] font-black text-zinc-900 uppercase tracking-widest leading-none">Selected Date: {new Date(selectedDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                  </div>
                </div>
              </section>
              
              <div className="space-y-6">
                <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
                  {['masculine', 'feminine'].map(g => (
                    <button key={g} onClick={() => setStylePreference(g)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${stylePreference === g ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400'}`}>{g}</button>
                  ))}
                </div>
                
                <div className="relative bg-zinc-50 rounded-[3rem] p-8 border border-zinc-100 min-h-[540px] flex flex-col justify-center items-center overflow-hidden shadow-sm">
                    <div className="flex flex-col gap-6 items-center w-full">
                      {[currentOutfit.top, currentOutfit.bottom, currentOutfit.shoes].map((item, idx) => (
                        <div key={idx} className="h-32 w-full flex justify-center overflow-hidden">
                          {item ? <motion.img whileHover={zoomSettings.whileHover} transition={zoomSettings.transition} src={item.image_url} className="h-full object-contain drop-shadow-2xl" /> : <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-200" />}
                        </div>
                      ))}
                    </div>
                    <div className="w-full mt-12 grid grid-cols-5 gap-3">
                      <button onClick={performSmartShuffle} className="col-span-3 bg-zinc-950 text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition">
                        <Sparkles size={16} className="text-lime-400" /> Shuffle
                      </button>
                      <button onClick={() => scheduleForDate(selectedDate)} className="bg-white border border-zinc-200 rounded-[1.5rem] flex items-center justify-center active:scale-90 transition"><CalendarIcon size={20}/></button>
                      <button onClick={toggleSaveOutfit} className="bg-white border border-zinc-200 rounded-[1.5rem] flex items-center justify-center active:scale-90 transition">
                         <Heart size={20} className={isOutfitSaved ? "fill-red-500 text-red-500" : "text-zinc-400"} />
                      </button>
                    </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Look Queue.</h2>
                <button onClick={() => { setCalendar({}); if(user) localStorage.removeItem(`userCalendar_${user.id}`); }} className="p-2 text-zinc-400 hover:text-zinc-950 transition"><RotateCcw size={18}/></button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {[...Array(14)].map((_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i);
                  const dStr = d.toISOString().split('T')[0];
                  const active = selectedDate === dStr;
                  return (
                    <button key={dStr} onClick={() => setSelectedDate(dStr)} className={`min-w-[70px] p-4 rounded-3xl border flex flex-col items-center transition-all ${active ? 'bg-zinc-950 border-zinc-950 text-white scale-105 shadow-lg' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                      <span className="text-[8px] font-black uppercase mb-1">{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                      <span className="text-lg font-black">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-zinc-50 rounded-[3rem] p-8 border border-zinc-100 space-y-6">
                <div className="text-center relative">
                    {calendar[selectedDate]?.top && (
                      <button onClick={() => removeOOTD(selectedDate)} className="absolute -top-2 -right-2 p-3 bg-white rounded-full text-red-500 shadow-md active:scale-75 transition z-10"><Trash2 size={16}/></button>
                    )}
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest">OOTD: {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    {calendar[selectedDate]?.top ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <motion.img whileHover={zoomSettings.whileHover} transition={zoomSettings.transition} src={calendar[selectedDate].top?.image_url} className="h-24 object-contain" />
                        <motion.img whileHover={zoomSettings.whileHover} transition={zoomSettings.transition} src={calendar[selectedDate].bottom?.image_url} className="h-24 object-contain" />
                        <motion.img whileHover={zoomSettings.whileHover} transition={zoomSettings.transition} src={calendar[selectedDate].shoes?.image_url} className="h-16 object-contain" />
                    </div>
                    ) : (
                      <div className="py-10 space-y-4">
                        <p className="text-[10px] font-bold text-zinc-300 uppercase italic">Nothing planned</p>
                        <button onClick={() => setActiveTab('home')} className="bg-zinc-950 text-white px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Shuffle Now</button>
                      </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100">
                    <div className="flex items-center gap-2 mb-3 text-zinc-400"><Edit3 size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Notes / Prompt</span></div>
                    <textarea value={calendar[selectedDate]?.note || ''} onChange={(e) => saveCalendarNote(selectedDate, e.target.value)} placeholder="Plan your vibe..." className="w-full text-xs font-bold uppercase border-none focus:ring-0 p-0 placeholder:text-zinc-200 min-h-[80px] resize-none outline-none bg-transparent" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wardrobe' && (
            <motion.div key="wardrobe" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Your Closet.</h2></div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {['all', 'tops', 'bottoms', 'shoes'].map(f => (
                  <button key={f} onClick={() => setWardrobeFilter(f)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${wardrobeFilter === f ? 'bg-zinc-950 text-white border-zinc-950 shadow-md' : 'bg-white text-zinc-400 border-zinc-100'}`}>{f}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6 pb-20">
                {filteredCloset.map(item => (
                  <div key={item.id} className="relative bg-zinc-50 rounded-[2.2rem] p-4 aspect-[3/4] flex items-center justify-center border border-zinc-100 overflow-hidden group">
                    <motion.img whileHover={zoomSettings.whileHover} transition={zoomSettings.transition} src={item.image_url} className="max-h-full object-contain" />
                    {/* iPhone Fix: Visible delete button */}
                    <button onClick={async () => { if(confirm("Delete item?")) { await supabase.from('wardrobe').delete().eq('id', item.id); if(user) fetchUserWardrobe(user.id); } }} className="absolute top-2 right-2 p-2.5 bg-white/90 backdrop-blur rounded-full text-red-500 shadow-md active:scale-75 transition"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setIsModalOpen(true)} className="aspect-[3/4] border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-300 active:bg-zinc-50 transition shadow-sm"><Plus size={24}/></button>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {!user ? (
                <div className="bg-zinc-50 p-10 rounded-[3.5rem] border border-zinc-100 text-center space-y-6">
                   <UserIcon size={48} className="mx-auto text-zinc-200" />
                   <h2 className="text-2xl font-black uppercase tracking-tighter italic">Join Beau</h2>
                   <p className="text-xs text-zinc-400 font-bold uppercase">Login to save your closet and plan your style.</p>
                   <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="w-full bg-zinc-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition flex items-center justify-center gap-3">
                      Login with Google
                   </button>
                </div>
              ) : (
                <>
                  <div className="bg-zinc-50 p-10 rounded-[3.5rem] border border-zinc-100 text-center">
                    <div className="w-24 h-24 bg-lime-400 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black shadow-inner">{user?.email?.charAt(0).toUpperCase()}</div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic">{user?.email?.split('@')[0]}</h2>
                    <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-8 px-10 py-3 bg-white border border-zinc-200 text-zinc-400 rounded-full text-[10px] font-black uppercase active:text-red-500 transition shadow-sm">Log Out</button>
                  </div>

                  <div className="space-y-4 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 px-2">Saved Looks <Heart size={10} className="fill-red-500 text-red-500"/></h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {savedOutfits.map((look, i) => (
                        <div key={i} className="min-w-[150px] bg-zinc-50 rounded-[2.5rem] p-4 border border-zinc-100 flex flex-col items-center gap-2 relative shadow-sm overflow-hidden">
                          <div className="flex flex-col items-center gap-1">
                            <motion.img {...zoomSettings} src={look.top?.image_url} className="h-12 object-contain" />
                            <motion.img {...zoomSettings} src={look.bottom?.image_url} className="h-12 object-contain" />
                            <motion.img {...zoomSettings} src={look.shoes?.image_url} className="h-8 object-contain" />
                          </div>
                          <button onClick={() => { const f = savedOutfits.filter((_, idx) => idx !== i); setSavedOutfits(f); if(user) localStorage.setItem(`savedOutfits_${user.id}`, JSON.stringify(f)); }} className="absolute -top-1 -right-1 bg-white p-2 rounded-full shadow-md text-zinc-300 active:text-red-500"><X size={10}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SURVEY SECTION - 2nd Q Removed */}
                  <div className="bg-zinc-50 p-8 rounded-[3rem] border border-zinc-100 space-y-8">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Zap size={14} className="text-lime-500 fill-lime-500" /> App Experience</h3>
                    {surveySubmitted ? (
                        <div className="text-center py-10 space-y-3"><CheckCircle2 size={40} className="mx-auto text-lime-500" /><p className="text-[10px] font-black uppercase text-zinc-950">Survey Saved! Thanks.</p></div>
                    ) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <p className="text-[11px] font-bold uppercase text-zinc-600 px-2">1. Useful for choosing existing outfits?</p>
                                <div className="flex justify-between px-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button key={s} onClick={() => setSurvey({...survey, rating: s})} className={`p-3 rounded-2xl transition-all ${survey.rating >= s ? 'bg-lime-400 text-zinc-950 scale-110 shadow-lg' : 'bg-white text-zinc-300'}`}>
                                            <Star size={18} fill={survey.rating >= s ? "currentColor" : "none"} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase text-zinc-600 px-2">2. Which part helped MOST?</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Outfit suggestions', 'Mixing & matching', 'Style Ideas', 'Saving outfits', 'None'].map(opt => (<button key={opt} onClick={() => setSurvey({...survey, mostHelpful: opt})} className={`text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${survey.mostHelpful === opt ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{opt}</button>))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase text-zinc-600 px-2">3. Would you use Beau regularly?</p>
                                <div className="flex gap-2">
                                    {['Yes', 'No', 'Maybe'].map(opt => ( <button key={opt} onClick={() => setSurvey({...survey, regularUse: opt})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${survey.regularUse === opt ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{opt}</button> ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase text-zinc-600 px-2">4. Consider paying?</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {["No", "Affordable Price", "Subscription", "One-time purchase"].map(opt => (<button key={opt} onClick={() => setSurvey({...survey, payingConsideration: opt})} className={`text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${survey.payingConsideration === opt ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{opt}</button>))}
                                </div>
                            </div>
                            <button onClick={handleSurveySubmit} disabled={isSubmittingSurvey || survey.rating === 0} className="w-full bg-lime-400 text-black py-6 rounded-2xl font-black uppercase text-[12px] flex items-center justify-center gap-3 transition active:scale-95 disabled:opacity-50">Submit Survey</button>
                        </div>
                    )}
                  </div>

                  <div className="bg-zinc-50 p-8 rounded-[3rem] border border-zinc-100"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-2">Support & Collab</h3><a href="mailto:connectwithbeau@gmail.com" className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm active:scale-95 transition"><div className="bg-zinc-950 p-3 rounded-full text-white"><Mail size={20} /></div><div><p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Contact Us</p><p className="text-xs font-bold uppercase text-zinc-950">connectwithbeau@gmail.com</p></div></a></div>
                  
                  <div className="bg-zinc-950 text-white p-10 rounded-[3.5rem] shadow-2xl"><h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Build the future<span className="text-lime-400">.</span></h3><p className="text-[10px] font-bold uppercase text-zinc-500 mb-4 px-1">One thing to make Beau a must-have?</p><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Type your idea here..." className="w-full bg-zinc-900 border-none rounded-3xl p-6 text-[11px] font-bold uppercase min-h-[140px] mb-6 focus:ring-1 ring-lime-400 outline-none" /><button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback || !feedback} className="w-full bg-lime-400 text-black py-6 rounded-2xl font-black uppercase text-[12px] flex items-center justify-center gap-3 transition active:scale-95">{isSubmittingFeedback ? "Sending..." : <>Submit Idea <Send size={16}/></>}</button></div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-zinc-950/95 backdrop-blur-2xl px-8 py-6 flex justify-between rounded-[2.8rem] shadow-2xl z-50 border border-white/10">
        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-lime-400' : 'text-zinc-500'}><LayoutDashboard size={22}/></button>
        <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-lime-400' : 'text-zinc-500'}><CalendarIcon size={22}/></button>
        <button onClick={() => setActiveTab('wardrobe')} className={activeTab === 'wardrobe' ? 'text-lime-400' : 'text-zinc-500'}><Shirt size={22}/></button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-lime-400' : 'text-zinc-500'}><UserIcon size={22}/></button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-end">
            <motion.form ref={formRef} onSubmit={handleAddItem} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full rounded-t-[3.5rem] p-10 max-w-lg mx-auto shadow-2xl">
              <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black tracking-tighter uppercase italic">New Style.</h3><button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-100 rounded-full active:scale-75 transition"><X size={20}/></button></div>
              <div className="space-y-6">
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-52 bg-zinc-50 border-2 border-dashed rounded-[2.5rem] flex items-center justify-center overflow-hidden cursor-pointer relative shadow-inner">
                  {previewImg ? <img src={previewImg} className="w-full h-full object-cover" /> : <Camera size={32} className="opacity-10" />}
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setFileToUpload(file); const r = new FileReader(); r.onloadend = () => setPreviewImg(r.result as string); r.readAsDataURL(file); }
                  }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select name="type" className="p-5 bg-zinc-50 rounded-2xl font-bold text-[11px] uppercase outline-none focus:ring-1 ring-lime-400"><option value="top">Top</option><option value="bottom">Bottom</option><option value="shoes">Shoes</option></select>
                  <select name="style" className="p-5 bg-zinc-50 rounded-2xl font-bold text-[11px] uppercase outline-none focus:ring-1 ring-lime-400"><option value="masculine">Masculine</option><option value="feminine">Feminine</option></select>
                </div>
                <input name="name" required placeholder="ITEM NAME" className="w-full p-5 bg-zinc-50 rounded-2xl font-bold text-[11px] uppercase focus:ring-1 ring-lime-400 outline-none" />
                <button type="submit" disabled={isUploading} className="w-full bg-zinc-950 text-white py-6 rounded-2xl font-black uppercase text-xs transition active:scale-95 disabled:bg-zinc-400">
                  {isUploading ? "Uploading..." : "Save Style"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
