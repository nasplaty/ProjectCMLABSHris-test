"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { API_URL } from "../utils/config";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // --- STATE BARU UNTUK SUBSCRIPTION ---
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // --- 1. INIT & REFRESH ON NAVIGATION ---
  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error("Invalid user data");
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        setUser(null); // Ensure we reset if logged out
      }
    };

    checkUser();
    
    // Listen for custom "auth-change" event (optional robustness)
    window.addEventListener("storage", checkUser);
    
    return () => window.removeEventListener("storage", checkUser);
    
  }, [pathname]);

  // --- 2. FETCH DATA (NOTIFICATIONS & SUBSCRIPTION) ---
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // A. FETCH NOTIFICATIONS
    const fetchNotifications = async () => {
      try {
        let newNotifs: any[] = [];

        // ADMIN: Check waiting attendance
        if (['admin_company', 'admin_system'].includes(user.role)) {
          const res = await axios.get(`${API_URL}/attendance`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { status: 'waiting', limit: 5 }
          });
          const waitingItems = res.data.rows || res.data.data || [];
          if (waitingItems.length > 0) {
            newNotifs.push({
              id: 'admin-action',
              title: 'Approval Needed',
              message: `${res.data.count || waitingItems.length} requests waiting.`,
              type: 'warning',
              link: '/time'
            });
          }
        }

        // USER: Check recent status
        if (user.role === 'user') {
          const res = await axios.get(`${API_URL}/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: 1 } 
          });
          const latest = (res.data.rows || res.data.data || [])[0];
          if (latest) {
            const lastSeenId = localStorage.getItem('last_notif_attendance_id');
            if (latest.status_approve !== 'waiting' && lastSeenId !== String(latest.id)) {
               newNotifs.push({
                 id: latest.id,
                 title: `Attendance ${latest.status_approve}`,
                 message: `Your attendance was ${latest.status_approve}.`,
                 type: latest.status_approve === 'approved' ? 'success' : 'error',
                 link: '/karyawan/time'
               });
            }
          }
        }
        setNotifications(newNotifs);
        setUnreadCount(newNotifs.length);
      } catch (err) {
        console.error("Notif Poll Error", err);
      }
    };

    // B. FETCH SUBSCRIPTION (NEW LOGIC)
    const fetchSubscription = async () => {
        // Hanya fetch jika user adalah admin
        if (['admin_company', 'admin_system'].includes(user.role)) {
            try {
                // Pastikan endpoint ini ada di backend Anda!
                // Di dalam Navbar.tsx
                const res = await axios.get(`${API_URL}/payment/subscription/current`, { // Pastikan "subscription" (tunggal)
                    headers: { Authorization: `Bearer ${token}` }
                });                 
                // Asumsi response backend mengembalikan object subscription langsung atau di dalam data
                setSubscriptionData(res.data.data || res.data); 
            } catch (err) {
                console.error("Subscription Fetch Error", err);
                // Opsional: set null jika gagal/404
                setSubscriptionData(null);
            }
        }
    };

    fetchNotifications();
    fetchSubscription(); // Panggil fungsi subscription

    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // --- HELPERS ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
        return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || "?";
  };

  const getDisplayName = () => {
      if (user?.first_name) return `${user.first_name} ${user.last_name}`;
      return user?.email || "User";
  };

  // HIDE on Auth Pages
  if (["/payment", "/login", "/register", "/forgot-password"].some(path => pathname.startsWith(path))) return null;

  // Strict Role Check for Subscription Menu
  const isAdmin = user && ['admin_company', 'admin_system'].includes(user.role);

  // Command Palette Items
  const commands = [
    { name: "Dashboard", href: user?.role === 'user' ? "/karyawan/dashboard" : "/dashboard", icon: "mdi:view-dashboard", roles: ["all"] },
    { name: "Attendance", href: user?.role === 'user' ? "/karyawan/time" : "/time", icon: "mdi:clock-outline", roles: ["all"] },
    { name: "Employees", href: "/employee", icon: "mdi:account-group", roles: ["admin_company", "admin_system"] },
    { name: "Reports", href: "/reports", icon: "mdi:file-chart", roles: ["admin_company"] },
    { name: "Subscription", href: "/payment", icon: "mdi:credit-card-outline", roles: ["admin_company"] },
  ];

  const filteredCommands = commands.filter(cmd => 
    (cmd.roles.includes("all") || (user && cmd.roles.includes(user.role))) &&
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-16 bg-white flex items-center justify-between px-6 shadow relative z-50">
      
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
        <h1 className="text-xl text-black font-semibold hidden md:block">HRIS Panel</h1>
      </div>

      {/* CENTER - SEARCH */}
      <div className="relative w-1/3 max-w-md hidden md:block">
        <div onClick={() => setIsSearchOpen(true)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-sm text-gray-500 cursor-text hover:border-indigo-400 transition-colors flex justify-between items-center">
            <span>Search...</span>
        </div>
        <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
      </div>

      {/* RIGHT - PROFILE & NOTIF */}
      <div className="flex items-center gap-4">
        
        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-1 rounded-full hover:bg-gray-100 transition">
            <Icon icon="mdi:bell-outline" className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{unreadCount}</span>}
          </button>
          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-700 text-sm">Notifications</h3></div>
                <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((notif, idx) => (
                        <Link href={notif.link} key={idx} onClick={() => { setIsNotifOpen(false); if(user?.role === 'user') localStorage.setItem('last_notif_attendance_id', String(notif.id)); }} className="block px-4 py-3 hover:bg-blue-50 border-b border-gray-50">
                            <div className="flex items-start gap-3">
                                <Icon icon={notif.type === 'warning' ? "mdi:alert-circle-outline" : "mdi:check-circle-outline"} className={`mt-1 text-lg ${notif.type === 'warning' ? 'text-yellow-500' : 'text-green-500'}`} />
                                <div><p className="text-sm font-medium text-gray-800">{notif.title}</p><p className="text-xs text-gray-500">{notif.message}</p></div>
                            </div>
                        </Link>
                    )) : <div className="px-4 py-8 text-center text-gray-400 text-sm">No new notifications</div>}
                </div>
            </div>
          )}
        </div>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition">
            <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {getInitials()}
            </div>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-gray-800">{getDisplayName()}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role?.replace('_', ' ') || "Guest"}</span>
            </div>
            <Icon icon="mdi:chevron-down" className="text-gray-400 text-lg" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-14 w-60 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="py-1">
                    
                {/* STRICT ADMIN CHECK for Subscription */}
                {isAdmin && (
                    <Link 
                        href="/payment" 
                        className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 group border-b border-gray-50" 
                        onClick={() => setIsProfileOpen(false)}
                    >
                        <div className="flex items-center gap-3">
                            {/* Icon Background */}
                            <div className="p-1.5 bg-yellow-50 rounded-full">
                                <Icon icon="mdi:star-outline" className="text-yellow-600 text-lg"/> 
                            </div>
                            
                            <div className="flex flex-col text-left">
                                <span className="font-medium text-gray-800">Subscription</span>
                                
                                {/* LOGIC STATUS & DETAIL */}
                                {subscriptionData ? (
                                    <div className="flex flex-col gap-0.5">
                                        {/* 1. Status & Tanggal */}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                                subscriptionData.status === 'active' ? 'text-green-600' : 
                                                subscriptionData.status === 'pending' ? 'text-orange-500' : 'text-red-500'
                                            }`}>
                                                {subscriptionData.status}
                                            </span>
                                            
                                            {subscriptionData.status === 'active' && subscriptionData.end_date && (
                                                <span className="text-[9px] text-gray-400 font-normal">
                                                    • Exp: {new Date(subscriptionData.end_date).toLocaleDateString('id-ID')}
                                                </span>
                                            )}
                                        </div>

                                        {/* 2. BARU: Jumlah Karyawan (Quota) */}
                                        {subscriptionData.num_employees && (
                                            <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                <Icon icon="mdi:account-group-outline" className="w-3 h-3 mr-1" />
                                                <span>{subscriptionData.num_employees} Employees Quota</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-gray-400">Loading info...</span>
                                )}
                            </div>
                        </div>

                        {/* Panah */}
                        <Icon icon="mdi:chevron-right" className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left mt-1 pl-6">
                        <Icon icon="mdi:logout" /> Log Out
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* --- COMMAND PALETTE --- */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-24 px-4" onClick={() => setIsSearchOpen(false)}>
            <div ref={searchRef} className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-gray-200 p-4 flex items-center gap-3">
                    <Icon icon="mdi:magnify" className="text-gray-400 text-xl" />
                    <input autoFocus type="text" placeholder="Type a command or search..." className="flex-1 outline-none text-lg text-gray-800 placeholder-gray-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                    <button onClick={() => setIsSearchOpen(false)} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">ESC</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredCommands.map((cmd, idx) => (
                        <Link key={idx} href={cmd.href} onClick={() => setIsSearchOpen(false)} className="flex items-center gap-3 px-3 py-3 hover:bg-indigo-50 rounded-lg group transition-colors cursor-pointer">
                            <div className="p-2 bg-gray-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded text-gray-500 transition-colors"><Icon icon={cmd.icon} className="text-lg" /></div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{cmd.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}