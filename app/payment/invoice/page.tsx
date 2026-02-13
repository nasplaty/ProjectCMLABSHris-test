"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import axios from "axios";
import { API_URL } from "../../../utils/config";

// Wrapper for Suspense
function InvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get Data from URL
  const packageId = searchParams.get("id"); // Needed for DB
  const planName = searchParams.get("plan") || "Unknown Plan";
  const basePrice = parseInt(searchParams.get("price") || "0");

  // --- FORM STATE ---
  const [employees, setEmployees] = useState<number | string>(2); 
  const [billingPeriod, setBillingPeriod] = useState<"single" | "monthly">("monthly");
  const [teamSize, setTeamSize] = useState<"1-50" | "50-100">("1-50");
  const [loading, setLoading] = useState(false);

  // --- VISIBILITY STATE ---
  const [showSummary, setShowSummary] = useState(false);

  // Calculations
  const validEmployees = typeof employees === 'string' ? parseInt(employees) || 0 : employees;
  const subtotal = basePrice * validEmployees;
  const tax = 0;
  const total = subtotal + tax;

  // --- HANDLERS ---
  
  const updateEmployeeCount = (val: number | string) => {
      setEmployees(val);
      const num = typeof val === 'string' ? parseInt(val) : val;
      
      if (!isNaN(num) && num > 0) {
          if (num > 50) {
              setTeamSize("50-100");
          } else {
              setTeamSize("1-50");
          }
      }
  };

  const handleTeamSizeChange = (size: "1-50" | "50-100") => {
    setTeamSize(size);
    if (size === "50-100") {
      setEmployees(50); 
    } else {
      setEmployees(1); 
    }
  };

  const handleEmployeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
        setEmployees('');
        return;
    }
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) {
        updateEmployeeCount(num);
    }
  };

  const incrementEmployees = () => {
      const current = typeof employees === 'string' ? 0 : employees;
      updateEmployeeCount(current + 1);
  };

  const decrementEmployees = () => {
      const current = typeof employees === 'string' ? 0 : employees;
      updateEmployeeCount(Math.max(1, current - 1));
  };

  // --- SUBMIT TO DB (DUMMY PAYMENT) ---
  const handleConfirmUpgrade = async () => {
      if (!packageId) return alert("Invalid Package");
      setLoading(true);

      try {
          const token = localStorage.getItem("token");
          
          // Send to Backend
          await axios.post(`${API_URL}/payment/subscribe`, {
              package_id: packageId,
              billing_period: billingPeriod === 'single' ? 'single' : 'monthly',
              num_employees: validEmployees
          }, {
              headers: { Authorization: `Bearer ${token}` }
          });

          alert("Payment Successful! Subscription Active.");
          router.push('/'); // Redirect to Dashboard

      } catch (error: any) {
          console.error("Payment failed", error);
          alert(error.response?.data?.message || "Payment Failed");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto font-sans">
        
        {/* Container */}
        <div className="min-h-full flex justify-center items-center p-6 md:p-12">
            <div className={`flex flex-col lg:flex-row w-full transition-all duration-500 ease-in-out ${showSummary ? 'gap-12 lg:gap-24 justify-center' : 'justify-center'}`}>
            
                {/* --- LEFT COLUMN --- */}
                <div className={`flex-1 transition-all duration-500 ${showSummary ? 'lg:max-w-xl' : 'max-w-2xl mx-auto'}`}>
                    
                    {/* --- LOGO --- */}
                    <div className="mb-6">
                        <img src="/logo-alt.png" alt="HRIS Logo" className="w-[80px] h-auto"/>
                    </div>

                    {/* Header & Back */}
                    <div className="mb-8"> 
                        <h1 className="text-[#1D395E] text-4xl font-semibold mb-2">{planName}</h1>
                        <p className="text-black text-base">Upgrade to {planName}</p>
                        <button onClick={() => router.back()} className="text-[#7CA6BF] text-sm hover:underline"> Change plan </button>
                    </div>

                    {/* --- BILLING PERIOD --- */}
                    <div className="mb-8">
                        <h3 className="text-xl font-medium text-black mb-4">Billing Period</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setBillingPeriod("single")} className={`flex-1 py-3 px-4 rounded-[5px] text-base font-medium transition-all duration-200 border-2 ${billingPeriod === "single" ? "bg-[#1D395E] text-white border-[#1D395E] shadow-md" : "bg-[#EDEDED] text-[#A7A7A7] border-[#D8DDE1] hover:border-[#1D395E]/30"}`}>
                                Single Payment
                            </button>
                            <button onClick={() => setBillingPeriod("monthly")} className={`flex-1 py-3 px-4 rounded-[5px] text-base font-medium transition-all duration-200 border-2 ${billingPeriod === "monthly" ? "bg-[#1D395E] text-white border-[#1D395E] shadow-md" : "bg-[#EDEDED] text-[#A7A7A7] border-[#D8DDE1] hover:border-[#1D395E]/30"}`}>
                                Monthly - Rp {basePrice.toLocaleString("id-ID")} / User
                            </button>
                        </div>
                    </div>

                    {/* Size Matters */}
                    <div className="mb-8">
                        <h3 className="text-xl font-medium text-black mb-2">Size Matters</h3>
                        <p className="text-gray-600 mb-4 text-sm">Choose the right fit for your team!</p>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${teamSize === '1-50' ? 'border-[#1E3A5F]' : 'border-[#80A8C0]'}`}>
                                    {teamSize === '1-50' && <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />}
                                </div>
                                <input type="radio" name="size" className="hidden" checked={teamSize === "1-50"} onChange={() => handleTeamSizeChange("1-50")} />
                                <span className="text-black">1 - 50</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${teamSize === '50-100' ? 'border-[#1E3A5F]' : 'border-[#80A8C0]'}`}>
                                    {teamSize === '50-100' && <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />}
                                </div>
                                <input type="radio" name="size" className="hidden" checked={teamSize === "50-100"} onChange={() => handleTeamSizeChange("50-100")} />
                                <span className="text-black">50 - 100</span>
                            </label>
                        </div>
                    </div>

                    {/* Number of Employees */}
                    <div className="mb-10">
                        <h3 className="text-xl font-medium text-black mb-4">Number of Employees</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={decrementEmployees} className="w-8 h-8 rounded border-2 border-[#D8DDE1] flex items-center justify-center hover:bg-gray-100 text-black font-bold select-none active:bg-gray-200">-</button>
                            <input type="number" value={employees} onChange={handleEmployeeInputChange} className="w-20 text-center text-xl font-medium text-black border-none focus:ring-0 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <button onClick={incrementEmployees} className="w-8 h-8 rounded border-2 border-[#D8DDE1] flex items-center justify-center hover:bg-gray-100 text-black font-bold select-none active:bg-gray-200">+</button>
                        </div>
                    </div>

                    {/* --- CONTINUE TO PAYMENT --- */}
                    {!showSummary ? (
                        <button onClick={() => setShowSummary(true)} className="w-full bg-[#B93B53] text-white py-4 rounded-lg font-semibold hover:bg-[#a12f45] transition-all transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2">
                            Continue to Payment <Icon icon="mdi:arrow-right" className="text-xl" />
                        </button>
                    ) : (
                        <div className="text-[#1D395E] italic text-sm border-t pt-4 border-gray-200">
                            * Review your order summary on the right
                        </div>
                    )}
                </div>

                {/* --- RIGHT COLUMN --- */}
                {showSummary && (
                    <div className="w-full lg:w-[450px] shrink-0 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                        <div className="bg-gradient-to-bl from-[#102543] to-[#010D1C] text-white p-8 rounded-xl shadow-2xl sticky top-6">
                            <h2 className="text-3xl font-normal mb-8">Order Summary</h2>

                            <div className="space-y-4 text-sm mb-6">
                                <div className="flex justify-between"><span className="text-gray-300 w-1/3">Package</span><span className="text-white flex-1">: {planName}</span></div>
                                <div className="flex justify-between"><span className="text-gray-300 w-1/3">Billing Period</span><span className="text-white flex-1 capitalize">: {billingPeriod === 'single' ? 'Single Payment' : 'Monthly'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-300 w-1/3">Team Size</span><span className="text-white flex-1">: {teamSize}</span></div>
                                <div className="flex justify-between"><span className="text-gray-300 w-1/3">Employees</span><span className="text-white flex-1">: {validEmployees}</span></div>
                                <div className="flex justify-between"><span className="text-gray-300 w-1/3">Price per User</span><span className="text-white flex-1">: Rp {basePrice.toLocaleString('id-ID')}</span></div>
                            </div>

                            <div className="border-t border-white/20 my-6" />

                            <div className="flex justify-between mb-4 text-sm">
                                <span className="text-gray-300">Subtotal</span>
                                <span className="text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between mb-6 text-sm">
                                <span className="text-gray-300">Tax</span>
                                <span className="text-white">Rp {tax.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="border-t border-white/20 my-6" />

                            <div className="flex justify-between items-center mb-10">
                                <span className="font-bold text-lg">Total at renewal</span>
                                <span className="font-bold text-lg">Rp {total.toLocaleString('id-ID')}</span>
                            </div>

                            <button onClick={handleConfirmUpgrade} disabled={loading} className="w-full bg-[#1E3A5F]/50 border border-[#AFCBEA]/20 hover:bg-[#1E3A5F] text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 group">
                                {loading ? "Processing..." : "Confirm and Upgrade"}
                                {!loading && <Icon icon="mdi:check-circle-outline" className="text-xl group-hover:text-green-400 transition-colors" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <InvoiceContent />
        </Suspense>
    )
}