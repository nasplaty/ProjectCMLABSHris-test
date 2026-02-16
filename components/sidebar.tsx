"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../utils/config";

interface MenuItem {
  href: string;
  icon: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // --- STATE ---
  const [isMounted, setIsMounted] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);

  // --- 1. INIT & AUTH CHECK ---
  useEffect(() => {
    setIsMounted(true);

    const checkUser = () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser((prev: any) => {
                if (JSON.stringify(prev) !== JSON.stringify(parsedUser)) {
                    return parsedUser;
                }
                return prev;
            });
          } catch (e) {
            console.error("Invalid user data in localStorage");
            localStorage.removeItem("user");
          }
        } else {
            setUser(null);
        }
    };

    checkUser();

    const handleClickOutside = (event: any) => {
        if (settingsRef.current && !settingsRef.current.contains(event.target)) {
            setShowSettingsMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pathname]);

  // 2. Fetch Data When Modal Opens
  useEffect(() => {
    if (showProfileModal) {
        fetchUserData();
    }
  }, [showProfileModal]);

  const fetchUserData = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        const res = await axios.get(`${API_URL}/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        setFormData(res.data);

    } catch (err) {
        console.error("Failed to load profile", err);
    } finally {
        setLoading(false);
    }
  };

  // 3. Handle Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
        const response = await axios.put(`${API_URL}/user/profile`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if(response.data.user) {
             localStorage.setItem("user", JSON.stringify(response.data.user));
             setUser(response.data.user);
        }

        alert("Profile updated successfully!");
        setShowProfileModal(false);
        window.location.reload(); 

    } catch (err: any) {
        alert(err.response?.data?.message || "Failed to update profile");
    } finally {
        setLoading(false);
    }
  };

  if (!isMounted || !pathname) return null;

  if (["/payment", "/login", "/register", "/forgot-password"].some(path => pathname.startsWith(path))) return null;

  const adminMenu: MenuItem[] = [
    { href: "/dashboard/", icon: "mdi:view-dashboard" },
    { href: "/employee", icon: "mdi:account-group-outline" },
    { href: "/time", icon: "mdi:clock-outline" },
    { href: "/calendar", icon: "mdi:calendar-month-outline" },
  ];

  const employeeMenu: MenuItem[] = [
    { href: "/karyawan/dashboard", icon: "mdi:view-dashboard-outline" },
    { href: "/karyawan/time", icon: "mdi:clock-time-four-outline" },
    { href: "/karyawan/calendar", icon: "mdi:calendar-month-outline" },
  ];

  const isEmployeePage = pathname.startsWith("/karyawan");
  const menu = isEmployeePage ? employeeMenu : adminMenu;

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); 
    router.push("/login");
  };

  return (
    <div className="h-full w-16 bg-[#1E3A5F] flex flex-col items-center py-3 space-y-1 relative z-40 shrink-0 pb-20 ">
      
      {menu.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className={`p-2 rounded-lg transition-colors ${
            pathname === item.href 
              ? "bg-[#112240] text-white" 
              : "text-gray-400 hover:text-white hover:bg-[#112240]/50"
          }`}
        >
          <Icon icon={item.icon} className="w-6 h-6" />
        </Link>
      ))}

      <div className="flex-1" />

      <button className="text-gray-400 hover:text-white p-2 transition-colors">
        <Icon icon="mdi:headphones" className="w-6 h-6" />
      </button>

      {/* --- SETTINGS "START MENU" --- */}
<div className="relative" ref={settingsRef}>
    <button 
      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
      className={`p-2 rounded-lg transition-colors ${
        showSettingsMenu 
          ? "text-white bg-[#112240]" 
          : "text-gray-400 hover:text-white hover:bg-[#112240]/50"
      }`}
    >
      <Icon icon="mdi:cog-outline" className="w-6 h-6" />
    </button>

    {showSettingsMenu && (
      <div className="absolute left-14 bottom-0 w-52 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-left-2 z-50">
          <div className="py-1">
              <button 
                  onClick={() => { 
                      setShowProfileModal(true); 
                      setShowSettingsMenu(false); 
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                  <Icon icon="mdi:account-edit-outline" className="text-lg" />
                  Edit Profile
              </button>

                    <Link href="/forgot-password" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>
                        <Icon icon="mdi:lock-outline" /> Change Password
                    </Link>

          </div>
      </div>
    )}
</div>

{/* --- EDIT PROFILE MODAL --- */}
{showProfileModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[100] p-4 pt-20 font-sans overflow-hidden">
    {/* Overlay Backdrop to close */}
    <div 
      className="absolute inset-0" 
      onClick={() => setShowProfileModal(false)} 
    />
    
    {/* Responsive Modal Container */}
    <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl flex flex-col relative z-10 animate-in zoom-in-95 duration-200" 
         style={{ maxHeight: 'calc(100vh - 120px)' }}>
        
        {/* Header - Fixed at top of modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="mdi:account-edit" className="text-[#1E3A5F]" />
                Edit Profile
            </h2>
            <button onClick={() => setShowProfileModal(false)}>
                <Icon icon="mdi:close" className="text-xl text-gray-400 hover:text-red-500" />
            </button>
        </div>
        
        {/* Form Body - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-10">
                    <Icon icon="mdi:loading" className="animate-spin text-3xl text-[#1E3A5F]" />
                </div>
            ) : (
                <form id="profileForm" onSubmit={handleUpdateProfile} className="space-y-6">
                    
                    {/* BASIC FIELDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-black mb-1">First Name</label>
                            <input required type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                            <input required type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-black mb-1">Email Address</label>
                            <input required type="email" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.email || ''} />
                        </div>
                    </div>

                    {/* KARYAWAN SPECIFIC FIELDS */}
                    {user?.role === 'user' && (
                        <>
                            <div className="border-t border-gray-100 pt-4"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Personal Details</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium text-black mb-1">Phone</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                                <div><label className="block text-xs font-medium text-black mb-1">NIK</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                                <div><label className="block text-xs font-medium text-black mb-1">Place of Birth</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.place_of_birth || ''} onChange={e => setFormData({...formData, place_of_birth: e.target.value})} /></div>
                                <div><label className="block text-xs font-medium text-black mb-1">Date of Birth</label><input type="date" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.date_of_birth || ''} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} /></div>
                            </div>

                            <div className="border-t border-gray-100 pt-4"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bank Information</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                                <div><label className="block text-xs font-medium text-black mb-1">Bank Name</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} /></div>
                                <div><label className="block text-xs font-medium text-black mb-1">Account Number</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.bank_account_number || ''} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} /></div>
                                <div><label className="block text-xs font-medium text-black mb-1">Account Holder</label><input type="text" className="w-full border rounded p-2 text-sm text-black bg-white focus:border-[#1E3A5F] outline-none" value={formData.bank_account_holder || ''} onChange={e => setFormData({...formData, bank_account_holder: e.target.value})} /></div>
                            </div>
                        </>
                    )}
                </form>
            )}
        </div>

        {/* Footer - Fixed at bottom of modal */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl shrink-0">
            <button type="button" onClick={() => setShowProfileModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 bg-white text-sm font-medium transition-colors">
                Cancel
            </button>
            <button form="profileForm" type="submit" className="px-4 py-2 bg-[#1E3A5F] text-white rounded hover:bg-[#162c4b] text-sm font-medium transition-colors shadow-sm">
                Save Changes
            </button>
        </div>
    </div>
  </div>
)}

    </div>
  );
}