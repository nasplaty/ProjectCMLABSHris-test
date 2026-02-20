"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_URL } from "../../utils/config";

// --- 1. INTERFACE ---
interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  branch: string; 
  position: string;
  grade: string;
  employment_status: 'tetap_permanen' | 'tetap_percobaan' | 'pkwt' | 'magang' | 'resign';
  nik: string;
  education: string;
  place_of_birth: string;
  date_of_birth: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  email: string;
  created_at: string; 
  avatar?: string;
}

export default function EmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Data Utama
  const [employees, setEmployees] = useState<Employee[]>([]);

  // State UI Modal (Add/Edit)
  const [showModal, setShowModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null); 

  // State UI Modal (Import)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // State UI Drawer (Detail View)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // ==========================================================================
  // FILTER & SORTING STATE
  // ==========================================================================
  const [showFilter, setShowFilter] = useState(false);
  const [filterId, setFilterId] = useState("");
  const [filterName, setFilterName] = useState(""); // From Search bar
  
  // Dynamic Dropdown States
  const [filterGender, setFilterGender] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterPosition, setFilterPosition] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOption, setSortOption] = useState("Default");

  // Initial Form State
  const initialFormState = {
    first_name: "", last_name: "", email: "", password: "", gender: "male",
    phone: "", branch: "", position: "", grade: "", employment_status: "tetap_permanen", 
    nik: "", education: "SMA/SMK", place_of_birth: "", date_of_birth: "",
    bank_name: "BCA", bank_account_number: "", bank_account_holder: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  const currentYear = new Date().getFullYear();

  // --- HELPER RESET ---
  const resetForm = () => {
    setFormData(initialFormState);
    setEditId(null);
    setAvatarPreview(null);
  };

  // --- FETCH DATA ---
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }

      const response = await axios.get(`${API_URL}/employees?limit=2000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ==========================================================================
  // SMART DYNAMIC OPTIONS EXTRACTOR
  // Scans the current data to generate dropdown options automatically
  // ==========================================================================
  const uniqueBranches = Array.from(new Set(employees.map(item => item.branch))).filter(Boolean).sort();
  const uniquePositions = Array.from(new Set(employees.map(item => item.position))).filter(Boolean).sort();
  const uniqueGenders = Array.from(new Set(employees.map(item => item.gender))).filter(Boolean).sort();
  const uniqueGrades = Array.from(new Set(employees.map(item => item.grade))).filter(Boolean).sort();
  const uniqueStatuses = Array.from(new Set(employees.map(item => item.employment_status))).filter(Boolean).sort();


  // ========================================================================
  // --- EXPORT FUNCTION ---
  // ========================================================================
  const handleExport = () => {
    if (employees.length === 0) {
        alert("No data to export");
        return;
    }

    const headers = [
        "ID", "First Name", "Last Name", "Email", "Phone", "Gender", 
        "Branch", "Position", "Grade", "Status", "NIK", 
        "Bank Name", "Account Number", "Account Holder"
    ];

    const csvRows = [];
    csvRows.push("sep=,"); // Force Excel separator
    csvRows.push(headers.join(","));

    employees.forEach(emp => {
        const row = [
            emp.id,
            `"${emp.first_name || ''}"`, 
            `"${emp.last_name || ''}"`,
            `"${emp.email || ''}"`,
            `"${emp.phone || ''}"`,
            emp.gender,
            `"${emp.branch || ''}"`,
            `"${emp.position || ''}"`,
            `"${emp.grade || ''}"`,
            emp.employment_status,
            `'${emp.nik || ''}`, // Force string for numbers
            `"${emp.bank_name || ''}"`,
            `'${emp.bank_account_number || ''}`,
            `"${emp.bank_account_holder || ''}"`
        ];
        csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ========================================================================
  // --- IMPORT FUNCTIONS ---
  // ========================================================================
  
  const handleDownloadTemplate = () => {
    const headers = [
        "first_name", "last_name", "email", "password", "phone", "gender", 
        "branch", "position", "grade", "employment_status", "nik", 
        "education", "place_of_birth", "date_of_birth", 
        "bank_name", "bank_account_number", "bank_account_holder"
    ];
    
    const instructions = [
        "Teks (Wajib)", "Teks (Wajib)", "Email (Wajib)", "Minimal 6 Karakter", "Angka (Boleh kosong)", "Pilih: male / female / other",
        "Teks", "Teks", "Teks", "Pilih: tetap_permanen / tetap_percobaan / pkwt / magang / resign", "Angka", 
        "Teks", "Teks", "Format: YYYY-MM-DD", 
        "Teks", "Angka", "Teks"
    ];

    const example = [
        "John", "Doe", "john.doe@example.com", "password123", "08123456789", "male",
        "Jakarta Pusat", "Staff HR", "Level 1", "pkwt", "3201234567890", 
        "S1 Hukum", "Jakarta", "1995-08-17", 
        "BCA", "1234567890", "John Doe"
    ];

    const csvRows = [];
    csvRows.push("sep=,"); 
    csvRows.push(headers.join(","));
    csvRows.push(instructions.map(text => `"[ INFO: ${text} ]"`).join(","));
    csvRows.push(example.map(text => `"${text}"`).join(","));

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        let lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
        if (lines[0].toLowerCase().startsWith("sep=")) lines.shift(); 

        if (lines.length < 2) {
            alert("File is empty or missing headers");
            return;
        }

        const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        
        const result = [];
        let startIndex = 1;
        if (lines[1].includes("[ INFO:")) startIndex = 2; 

        for (let i = startIndex; i < lines.length; i++) {
            const regex = new RegExp(`\\s*${delimiter}\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`);
            const currentLine = lines[i].split(regex);
            
            if (currentLine.length < headers.length - 2) continue; 

            const obj: any = {};
            headers.forEach((header, index) => {
                let value = currentLine[index]?.trim() || "";
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                obj[header] = value;
            });
            
            if (obj.email) result.push(obj);
        }
        setImportData(result);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (importData.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        try {
            if (!row.password) row.password = "123456"; 
            if (!row.gender || !['male','female','other'].includes(row.gender)) row.gender = "male";
            if (!row.employment_status || !['tetap_permanen','tetap_percobaan','pkwt','magang','resign'].includes(row.employment_status)) row.employment_status = "pkwt";
            if (!row.date_of_birth || row.date_of_birth === "") row.date_of_birth = null;

            await axios.post(`${API_URL}/employees`, row, { headers });
            successCount++;
        } catch (err) {
            console.error(`Failed to import row ${i + 1} (${row.email})`, err);
            failCount++;
        }
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));
    }

    setIsImporting(false);
    alert(`Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
    setShowImportModal(false);
    setImportData([]);
    fetchEmployees();
  };

  // ========================================================================
  // --- FORM CRUD LOGIC ---
  // ========================================================================
  const handleEdit = (emp: Employee) => {
    setEditId(emp.id);
    setFormData({
      first_name: emp.first_name, last_name: emp.last_name, email: emp.email, password: "", 
      gender: emp.gender === 'other' ? 'male' : emp.gender,
      phone: emp.phone, branch: emp.branch, position: emp.position, grade: emp.grade,
      employment_status: emp.employment_status, nik: emp.nik, education: emp.education,
      place_of_birth: emp.place_of_birth,
      date_of_birth: emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : "",
      bank_name: emp.bank_name, bank_account_number: emp.bank_account_number, bank_account_holder: emp.bank_account_holder,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editId) {
        const payload = { ...formData };
        if (!payload.password) delete (payload as any).password;
        await axios.put(`${API_URL}/employees/${editId}`, payload, { headers });
        alert("Sukses update data karyawan!");
      } else {
        await axios.post(`${API_URL}/employees`, formData, { headers });
        alert("Sukses menambah karyawan!");
      }
      setShowModal(false);
      fetchEmployees();
      resetForm();
    } catch (error: any) {
      console.error("Error Detail:", error.response?.data);
      const resData = error.response?.data;
      let displayMessage = "Gagal menyimpan data.";
      if (resData) {
        if (resData.error) displayMessage = `Error Detail: ${resData.error}`;
        else if (resData.message) displayMessage = resData.message;
      }
      alert(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Yakin hapus data ini?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  };

  // ========================================================================
  // --- FILTER ENGINE ---
  // ========================================================================
  
  const clearFilters = () => {
    setFilterId("");
    setFilterName("");
    setFilterGender("All");
    setFilterBranch("All");
    setFilterPosition("All");
    setFilterGrade("All");
    setFilterStatus("All");
    setSortOption("Default");
    setShowFilter(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`;
    
    // Search by ID or Name
    const matchesId = filterId === "" || emp.id.toString().includes(filterId);
    const matchesName = filterName === "" || fullName.toLowerCase().includes(filterName.toLowerCase());
    
    // Dynamic Dropdowns
    const matchesGender = filterGender === "All" || emp.gender === filterGender;
    const matchesBranch = filterBranch === "All" || emp.branch === filterBranch;
    const matchesPosition = filterPosition === "All" || emp.position === filterPosition;
    const matchesGrade = filterGrade === "All" || emp.grade === filterGrade;
    const matchesStatus = filterStatus === "All" || emp.employment_status === filterStatus;

    return matchesId && matchesName && matchesGender && matchesBranch && matchesPosition && matchesGrade && matchesStatus;
  }).sort((a, b) => {
    // Sorting Logic
    switch (sortOption) {
      case "Name A-Z": return a.first_name.localeCompare(b.first_name);
      case "Name Z-A": return b.first_name.localeCompare(a.first_name);
      case "Date Newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case "Date Oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      default: return 0;
    }
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'tetap_permanen': return "bg-green-100 text-green-800 border-green-200";
        case 'tetap_percobaan': return "bg-teal-100 text-teal-800 border-teal-200";
        case 'pkwt': return "bg-orange-100 text-orange-800 border-orange-200";
        case 'magang': return "bg-blue-100 text-blue-800 border-blue-200";
        case 'resign': return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'tetap_permanen': return "Tetap Permanen";
        case 'tetap_percobaan': return "Tetap Percobaan";
        case 'pkwt': return "PKWT (Kontrak)";
        case 'magang': return "Magang";
        case 'resign': return "Resign / Keluar";
        default: return status;
    }
  };

  const fullTimeCount = employees.filter(e => 
    e.employment_status === 'tetap_permanen' || 
    e.employment_status === 'tetap_percobaan'
  ).length;

  return (
    <div className="flex-4 p-6 font-['Inter'] relative overflow-hidden">
      
      {/* --- HEADER STATISTIK --- */}
      <div className="grid grid-cols-4 gap-4 my-4">
        <div className="bg-white shadow rounded p-4">
          <p className="text-black">Periode</p>
          <p className="text-xl text-black font-bold">Tahun {currentYear}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-black">Total Employee</p>
          <p className="text-xl text-black font-bold">
             {employees.filter(e => e.employment_status !== 'resign').length}
          </p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-black">Total New Hire</p>
          <p className="text-xl text-black font-bold">
            {employees.filter((emp: any) => {
                const dateString = emp.created_at || emp.createdAt;
                if (!dateString) return false;
                const joinYear = new Date(dateString).getFullYear();
                return joinYear === currentYear && emp.employment_status !== 'resign';
            }).length}
          </p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-black">Full Time Employee</p>
          <p className="text-xl text-black font-bold">{fullTimeCount}</p>
        </div>
      </div>

      {/* --- SEARCH & ACTIONS --- */}
      <div className="flex gap-2 mb-4 text-gray-700 items-center relative">
        <h1 className="font-bold text-black text-3xl flex-1">All Employees Information</h1>

        <div className="relative flex-1">
          <input
            type="text" placeholder="Search Employee Name" value={filterName} onChange={(e) => setFilterName(e.target.value)}
            className="w-full rounded-lg border border-gray-400 bg-gray-10 px-4 py-2 pl-10 text-base text-black placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-xl" />
        </div>

        <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)} className="border border-gray-800 px-4 py-2 rounded hover:bg-gray-100 flex items-center gap-2 text-black">
                <Icon icon="mage:filter-fill" className="w-5 h-5" /> Filter
            </button>

            {/* DYNAMIC FILTER MENU */}
            {showFilter && (
                <div className="absolute right-0 top-12 w-[450px] bg-white border border-gray-300 rounded-lg shadow-xl p-5 z-50 text-black animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                        
                        {/* ID Filter */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nomor (ID)</label>
                            <input type="text" value={filterId} onChange={(e) => setFilterId(e.target.value)} placeholder="Cari ID..." className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#1E3A5F] outline-none" />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status Karyawan</label>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="All">Semua Status</option>
                                {uniqueStatuses.map(status => <option key={status as string} value={status as string}>{getStatusLabel(status as string)}</option>)}
                            </select>
                        </div>

                        {/* Cabang */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cabang</label>
                            <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="All">Semua Cabang</option>
                                {uniqueBranches.map(branch => <option key={branch as string} value={branch as string}>{branch as string}</option>)}
                            </select>
                        </div>

                        {/* Jabatan */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Jabatan</label>
                            <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="All">Semua Jabatan</option>
                                {uniquePositions.map(pos => <option key={pos as string} value={pos as string}>{pos as string}</option>)}
                            </select>
                        </div>

                        {/* Grade */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grade</label>
                            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="All">Semua Grade</option>
                                {uniqueGrades.map(grade => <option key={grade as string} value={grade as string}>{grade as string}</option>)}
                            </select>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
                            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="All">Semua Gender</option>
                                {uniqueGenders.map(gender => (
                                    <option key={gender as string} value={gender as string}>
                                        {gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : gender as string}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Sort By (Spans 2 columns) */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sort By</label>
                            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-[#1E3A5F] outline-none">
                                <option value="Default">Default</option>
                                <option value="Name A-Z">Nama (A-Z)</option>
                                <option value="Name Z-A">Nama (Z-A)</option>
                                <option value="Date Newest">Paling Baru Bergabung</option>
                                <option value="Date Oldest">Paling Lama Bergabung</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-3 border-t border-gray-100">
                        <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-black">Reset Filters</button>
                        <button onClick={() => setShowFilter(false)} className="bg-[#1E3A5F] text-white px-4 py-2 rounded text-sm hover:bg-[#2b4c75] shadow-sm">Terapkan Filter</button>
                    </div>
                </div>
            )}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded text-black hover:bg-gray-100 shadow-sm"
          >
            <Icon icon="lucide:download" className="w-5 h-5" /> Import
          </button>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border rounded text-black hover:bg-gray-100 shadow-sm"
          >
            <Icon icon="lucide:upload" className="w-5 h-5" /> Export
          </button>
        </div>

        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#1E3A5F] text-white px-4 py-2 rounded hover:bg-[#254b7b] flex items-center gap-1 shadow-sm">
          <Icon icon="mdi:plus-circle-outline" className="w-5 h-5" /> Tambah Data
        </button>
      </div>

      {/* --- TABLE --- */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="min-w-full bg-white shadow rounded border-separate border-spacing-y-0">
          <thead>
            <tr className="bg-gray-200 text-left text-black">
              <th className="p-3 whitespace-nowrap">No</th>
              <th className="p-3 whitespace-nowrap">Avatar</th>
              <th className="p-3 whitespace-nowrap">Nama</th>
              <th className="p-3 whitespace-nowrap">Jenis Kelamin</th>
              <th className="p-3 whitespace-nowrap">Nomor Telepon</th>
              <th className="p-3 whitespace-nowrap">Cabang</th>
              <th className="p-3 whitespace-nowrap">Jabatan</th>
              <th className="p-3 whitespace-nowrap">Grade</th>
              <th className="p-3 whitespace-nowrap">Status</th>
              <th className="p-3 text-center whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan={10} className="text-center p-10 text-gray-500"><Icon icon="mdi:loading" className="animate-spin text-4xl mx-auto mb-2" /> Loading data...</td></tr>
            ) : filteredEmployees.length === 0 ? (
                <tr>
                    <td colSpan={10} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center">
                            <div className="bg-gray-50 p-6 rounded-full mb-4">
                                <Icon icon="mdi:account-search-outline" className="text-4xl text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Employees Found</h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-xs">We couldn't find any records matching your current filters or search.</p>
                            <button onClick={clearFilters} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 font-medium flex items-center gap-2">
                                <Icon icon="mdi:refresh" className="text-lg" /> Clear Filters
                            </button>
                        </div>
                    </td>
                </tr>
            ) : filteredEmployees.map((emp, index) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50 text-black">
                <td className="p-3 border-b border-[#EEF2F5]">{index + 1}</td>
                <td className="p-3 border-b border-[#EEF2F5]">
                   <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">
                     {emp.first_name.charAt(0)}
                   </div>
                </td>
                <td className="p-3 border-b border-[#EEF2F5]">
                    <div className="font-medium whitespace-nowrap">{emp.first_name} {emp.last_name}</div>
                    <div className="text-[10px] text-gray-500">{emp.email}</div>
                </td>
                <td className="p-3 border-b border-[#EEF2F5]">
                  <span className={`px-2 py-1 rounded text-sm font-bold whitespace-nowrap ${emp.gender === "male" ? "bg-blue-200 text-blue-800" : emp.gender === "female" ? "bg-pink-200 text-pink-800" : "bg-gray-200 text-gray-800"}`}>
                    {emp.gender === 'male' ? 'Laki-laki' : emp.gender === 'female' ? 'Perempuan' : emp.gender}
                  </span>
                </td>
                <td className="p-3 border-b border-[#EEF2F5] whitespace-nowrap">{emp.phone || '-'}</td>
                <td className="p-3 border-b border-[#EEF2F5] whitespace-nowrap">{emp.branch || '-'}</td>
                <td className="p-3 border-b border-[#EEF2F5] whitespace-nowrap">{emp.position || '-'}</td>
                <td className="p-3 border-b border-[#EEF2F5] whitespace-nowrap font-medium">{emp.grade || '-'}</td>
                
                {/* STATUS TOGGLE */}
                <td className="p-3 border-b border-[#EEF2F5] whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-5 rounded-full ${emp.employment_status !== 'resign' ? "bg-green-500" : "bg-gray-300"} relative transition-colors duration-200`}>
                            <span className={`absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${emp.employment_status !== 'resign' ? "translate-x-5" : ""}`}></span>
                        </div>
                        <span className={`text-xs font-medium ${emp.employment_status === 'resign' ? 'text-red-500' : 'text-gray-600'}`}>
                            {getStatusLabel(emp.employment_status)}
                        </span>
                    </div>
                </td>

                <td className="p-3 text-center border-b border-[#EEF2F5] whitespace-nowrap">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => setSelectedEmployee(emp)} className="bg-blue-500 border border-blue-200 rounded-l p-2 hover:bg-blue-100 transition">
                        <Icon icon="ant-design:file-add-filled" className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => handleEdit(emp)} className="bg-yellow-500 border border-yellow-200 rounded-l p-2 hover:bg-yellow-800 transition">
                        <Icon icon="line-md:edit" className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="bg-red-700 border border-red-100 rounded-l p-2 hover:bg-red-100 transition">
                        <Icon icon="material-symbols:delete" className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL (ADD / EDIT) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white w-[85%] max-w-5xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-semibold text-gray-800">{editId ? "Edit Employee" : "Add New Employee"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
            </div>

            <div className="flex flex-col items-center mb-10">
              <div className="w-32 h-32 rounded-md border border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50">
                {avatarPreview ? <img src={avatarPreview} alt="avatar" className="object-cover w-full h-full" /> : <span className="text-gray-400">No Image</span>}
              </div>
              <label htmlFor="avatar" className="mt-3 px-4 py-2 bg-gray-100 border rounded-lg shadow-sm cursor-pointer hover:bg-gray-200 text-black">Upload Avatar</label>
              <input type="file" id="avatar" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="border border-black rounded-xl p-6">
              <form onSubmit={handleSave} className="grid grid-cols-2 gap-x-10 gap-y-5 text-black">
                
                {/* KIRI */}
                <div className="space-y-4">
                  <div><label className="block mb-1 font-medium">First Name</label><input name="first_name" required type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.first_name} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Mobile Number</label><input name="phone" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.phone} onChange={handleChange} /></div>
                  <div className="bg-blue-50 p-2 rounded border border-blue-200"><label className="block mb-1 font-medium text-blue-800">Email (Login) *</label><input name="email" required type="email" className="w-full border border-blue-300 rounded-md p-2" value={formData.email} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Gender</label><select name="gender" className="w-full border border-gray-400 rounded-md p-2" value={formData.gender} onChange={handleChange}><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></div>
                  <div><label className="block mb-1 font-medium">Tempat Lahir</label><input name="place_of_birth" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.place_of_birth} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Jabatan</label><input name="position" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.position} onChange={handleChange} /></div>
                  <div>
                    <label className="block mb-1 font-medium">Tipe Kontrak / Status</label>
                    <select name="employment_status" className="w-full border border-gray-400 rounded-md p-2 bg-white" value={formData.employment_status} onChange={handleChange}>
                      <option value="tetap_permanen">Tetap Permanen</option><option value="tetap_percobaan">Tetap Percobaan</option><option value="pkwt">PKWT (Kontrak)</option><option value="magang">Magang</option><option value="resign">Resign / Keluar</option>
                    </select>
                  </div>
                  <div><label className="block mb-1 font-medium">Bank</label><select name="bank_name" className="w-full border border-gray-400 rounded-md p-2" value={formData.bank_name} onChange={handleChange}><option value="BCA">BCA</option><option value="BNI">BNI</option><option value="Mandiri">Mandiri</option></select></div>
                  <div><label className="block mb-1 font-medium">Atas Nama Rekening</label><input name="bank_account_holder" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.bank_account_holder} onChange={handleChange} /></div>
                </div>

                {/* KANAN */}
                <div className="space-y-4">
                  <div><label className="block mb-1 font-medium">Last Name</label><input name="last_name" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.last_name} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">NIK</label><input name="nik" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.nik} onChange={handleChange} /></div>
                  <div className="bg-blue-50 p-2 rounded border border-blue-200"><label className="block mb-1 font-medium text-blue-800">Password (Login) {editId ? <span className="text-xs font-normal">(Opsional)</span> : "*"}</label><input name="password" required={!editId} type="password" className="w-full border border-blue-300 rounded-md p-2" value={formData.password} onChange={handleChange} placeholder={editId ? "Biarkan kosong jika tidak ubah" : "Set password"} /></div>
                  <div><label className="block mb-1 font-medium">Pendidikan Terakhir</label><select name="education" className="w-full border border-gray-400 rounded-md p-2" value={formData.education} onChange={handleChange}><option value="SMA/SMK">SMA/SMK</option><option value="D3">D3</option><option value="S1">S1</option><option value="S2">S2</option></select></div>
                  <div><label className="block mb-1 font-medium">Tanggal Lahir</label><input name="date_of_birth" type="date" className="w-full border border-gray-400 rounded-md p-2" value={formData.date_of_birth} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Cabang</label><input name="branch" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.branch} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Grade</label><input name="grade" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.grade} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Nomor Rekening</label><input name="bank_account_number" type="text" className="w-full border border-gray-400 rounded-md p-2" value={formData.bank_account_number} onChange={handleChange} /></div>
                  <div><label className="block mb-1 font-medium">Tipe SP</label><select className="w-full border border-gray-400 rounded-md p-2"><option>- Pilih SP -</option><option>SP1</option><option>SP2</option></select></div>
                </div>

                <div className="col-span-2 flex justify-end gap-4 mt-8 border-t pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 border border-gray-700 rounded-lg hover:bg-gray-100 font-medium text-black">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editId ? "Update Data" : "Save New"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white w-[650px] rounded-2xl shadow-2xl p-6 relative">
                <button onClick={() => {setShowImportModal(false); setImportData([]);}} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <Icon icon="mdi:close" className="text-2xl" />
                </button>
                
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-1 flex items-center gap-2">
                    <Icon icon="mdi:file-import" /> Import Data Karyawan
                </h2>
                <p className="text-gray-500 text-sm mb-6">Tambah banyak karyawan sekaligus menggunakan file CSV.</p>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center shadow-sm">
                    <div>
                        <h3 className="font-semibold text-blue-900 text-sm">Langkah 1: Download Template</h3>
                        <p className="text-xs text-blue-700 mt-1">Template ini sudah berisi instruksi cara mengisi tiap kolom.</p>
                    </div>
                    <button onClick={handleDownloadTemplate} className="bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2">
                        <Icon icon="mdi:microsoft-excel" className="text-lg" /> Download
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 text-sm mb-2">Langkah 2: Upload CSV yang sudah diisi</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 bg-gray-50 transition-colors relative cursor-pointer">
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Icon icon="mdi:cloud-upload" className="text-4xl text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-700 font-bold">Klik disini atau Drag & Drop file CSV Anda</p>
                        <p className="text-xs text-gray-400 mt-1">Pastikan Anda tidak mengubah baris pertama (Header)</p>
                    </div>
                </div>

                {importData.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                            <Icon icon="mdi:eye-check" className="text-green-600" />
                            Preview ({importData.length} data terbaca)
                        </h3>
                        <div className="max-h-40 overflow-y-auto border rounded-lg text-xs bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-gray-700">Nama</th>
                                        <th className="p-3 text-gray-700">Email</th>
                                        <th className="p-3 text-gray-700">Jabatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importData.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="border-t text-gray-600 hover:bg-gray-50">
                                            <td className="p-3 font-medium text-black">{row.first_name} {row.last_name}</td>
                                            <td className="p-3">{row.email}</td>
                                            <td className="p-3">{row.position || '-'}</td>
                                        </tr>
                                    ))}
                                    {importData.length > 5 && (
                                        <tr><td colSpan={3} className="p-3 text-center text-gray-400 italic bg-gray-50">...dan {importData.length - 5} baris lainnya</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {isImporting && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Sedang mengimpor...</span>
                            <span>{importProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={() => {setShowImportModal(false); setImportData([]);}} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-medium">Batal</button>
                    <button onClick={handleBulkImport} disabled={importData.length === 0 || isImporting} className="px-6 py-2 bg-[#1E3A5F] text-white rounded hover:bg-[#162c4b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-sm">
                        {isImporting ? <Icon icon="mdi:loading" className="animate-spin text-lg" /> : <Icon icon="mdi:database-import" className="text-lg" />}
                        {isImporting ? "Memproses..." : "Mulai Import"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- DRAWER (SIDE PANEL) DETAIL KARYAWAN --- */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setSelectedEmployee(null)}></div>
      )}

      <div className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${selectedEmployee ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedEmployee && (
          <div className="p-8 font-['Inter']">
            {/* Header Drawer */}
            <div className="flex justify-between items-start mb-8 border-b pb-4">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500 overflow-hidden border">
                     {selectedEmployee.avatar ? <img src={selectedEmployee.avatar} alt="ava" className="w-full h-full object-cover"/> : selectedEmployee.first_name.charAt(0)}
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-black">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                    <p className="text-gray-500 text-sm">{selectedEmployee.email}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-black transition">
                <Icon icon="mdi:close" className="text-3xl" />
              </button>
            </div>

            {/* Status Card */}
            <div className="border border-[#D8DDE1] rounded-lg p-6 mb-6 flex items-center justify-between bg-gray-50">
                <div>
                    <h3 className="font-bold text-lg text-black">{getStatusLabel(selectedEmployee.employment_status)}</h3>
                    <p className="text-gray-500 text-sm">NIK: {selectedEmployee.nik || '-'}</p>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-semibold border ${getStatusBadge(selectedEmployee.employment_status)}`}>
                    {selectedEmployee.employment_status.toUpperCase()}
                </div>
            </div>

            {/* Employment Info */}
            <div className="border border-[#D8DDE1] rounded-lg p-6 mb-6">
              <h3 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
                <Icon icon="mdi:briefcase-outline" className="text-blue-600"/> Employment Info
              </h3>
              <div className="grid grid-cols-2 gap-y-6">
                <div><p className="text-gray-500 text-xs mb-1">Branch</p><p className="font-semibold text-black text-sm">{selectedEmployee.branch}</p><div className="h-1 w-10 bg-[#D8DDE1] mt-2"></div></div>
                <div><p className="text-gray-500 text-xs mb-1">Position</p><p className="font-semibold text-black text-sm">{selectedEmployee.position}</p><div className="h-1 w-10 bg-[#D8DDE1] mt-2"></div></div>
                <div><p className="text-gray-500 text-xs mb-1">Grade</p><p className="font-semibold text-black text-sm">{selectedEmployee.grade}</p><div className="h-1 w-10 bg-[#D8DDE1] mt-2"></div></div>
                <div><p className="text-gray-500 text-xs mb-1">Join Date</p><p className="font-semibold text-black text-sm">{selectedEmployee.created_at ? selectedEmployee.created_at.substring(0,10) : '-'}</p><div className="h-1 w-10 bg-[#D8DDE1] mt-2"></div></div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="border border-[#D8DDE1] rounded-lg p-6 mb-6">
              <h3 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
                 <Icon icon="mdi:account-outline" className="text-blue-600"/> Personal Info
              </h3>
              <div className="grid grid-cols-2 gap-y-6">
                <div><p className="text-gray-500 text-xs mb-1">Phone</p><p className="font-semibold text-black text-sm">{selectedEmployee.phone}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Gender</p><p className="font-semibold text-black text-sm capitalize">{selectedEmployee.gender}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Place of Birth</p><p className="font-semibold text-black text-sm">{selectedEmployee.place_of_birth}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Date of Birth</p><p className="font-semibold text-black text-sm">{selectedEmployee.date_of_birth ? selectedEmployee.date_of_birth.substring(0,10) : '-'}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Education</p><p className="font-semibold text-black text-sm">{selectedEmployee.education}</p></div>
              </div>
            </div>

            {/* Bank Info */}
             <div className="border border-[#D8DDE1] rounded-lg p-6 mb-6">
              <h3 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
                 <Icon icon="mdi:bank-outline" className="text-blue-600"/> Bank Info
              </h3>
              <div className="grid grid-cols-1 gap-y-4">
                <div><p className="text-gray-500 text-xs mb-1">Bank Name</p><p className="font-semibold text-black text-sm">{selectedEmployee.bank_name}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Account Number</p><p className="font-semibold text-black text-sm font-mono tracking-wide">{selectedEmployee.bank_account_number}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Holder Name</p><p className="font-semibold text-black text-sm">{selectedEmployee.bank_account_holder}</p></div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button 
                    onClick={() => { setShowModal(true); setEditId(selectedEmployee.id); setFormData(selectedEmployee as any); }} 
                    className="flex items-center gap-2 bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600 transition"
                >
                    <Icon icon="line-md:edit" /> Edit Employee
                </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}