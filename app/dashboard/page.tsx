"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Card from "@/components/card"; 
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_URL } from "../../utils/config";
import { Icon } from "@iconify/react";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // --- RAW DATA STATE ---
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  // --- FILTER STATE ---
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Chart Colors
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  // --- 1. FETCH ALL DATA ON MOUNT ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Employees
        const empRes = await axios.get(`${API_URL}/employees?limit=2000`, { headers });
        setAllEmployees(empRes.data.data);

        // Fetch Attendance
        const attRes = await axios.get(`${API_URL}/attendance?limit=5000`, { headers });
        setAllAttendance(attRes.data.data); 

        setLoading(false);
      } catch (error) {
        console.error("Fetch Dashboard Error:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // --- 2. CALCULATION ENGINE ---
  const dashboardData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const isFiltered = startDate !== '' || endDate !== '';

    // Define Filter Boundaries
    const startMs = startDate ? new Date(startDate).getTime() : new Date(todayStr).getTime();
    const endMs = endDate 
        ? new Date(endDate).setHours(23, 59, 59, 999) 
        : (startDate ? new Date(startDate).setHours(23, 59, 59, 999) : new Date(todayStr).setHours(23, 59, 59, 999));

    // ==========================================
    // A. EMPLOYEE STATISTICS (FIXED)
    // ==========================================
    
    let filteredEmployees = allEmployees;
    let newEmployeesCount = 0;

    if (isFiltered) {
        // --- FILTER MODE ---
        // Filter the MAIN LIST based on Join Date
        filteredEmployees = allEmployees.filter((e: any) => {
            // FIX: Check BOTH 'created_at' and 'createdAt' to be safe
            const dateString = e.created_at || e.createdAt;
            if (!dateString) return false;

            const joinTime = new Date(dateString).getTime();
            return joinTime >= startMs && joinTime <= endMs;
        });
        
        // In filter mode, "New" is the size of the cohort itself
        newEmployeesCount = filteredEmployees.length;
    } else {
        // --- DEFAULT MODE (ALL TIME) ---
        filteredEmployees = allEmployees;
        
        // Default "New" = Joined This Month
        newEmployeesCount = allEmployees.filter((e: any) => {
            const dateString = e.created_at || e.createdAt;
            if (!dateString) return false;

            const joinDate = new Date(dateString);
            return joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth;
        }).length;
    }

    const totalStats = filteredEmployees.length;
    const resignedStats = filteredEmployees.filter((e: any) => e.employment_status === 'resign').length;
    const activeStats = totalStats - resignedStats;

    // Chart: Status Distribution
    const statusCounts: Record<string, number> = {};
    filteredEmployees.forEach((e: any) => {
       let label = e.employment_status;
       if(label === 'pkwt') label = 'PKWT';
       if(label === 'tetap_permanen') label = 'Tetap';
       if(label === 'tetap_percobaan') label = 'Percobaan';
       if(label === 'magang') label = 'Magang';
       if(label === 'resign') label = 'Resign';
       statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    const employeeStatusChart = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
    
    // Chart: New vs Active
    const employeeNewChart = [
      { name: "Joined", value: newEmployeesCount },
      { name: "Active", value: activeStats },
      { name: "Resign", value: resignedStats },
    ];

    // ==========================================
    // B. ATTENDANCE STATISTICS
    // ==========================================
    
    // Filter Logs by Date Range
    const filteredLogs = allAttendance.filter((a: any) => {
        const attTime = new Date(a.date).getTime();
        return attTime >= startMs && attTime <= endMs;
    });

    let countClockIn = 0;
    let countClockOut = 0;
    let countLeave = 0;
    let countAbsent = 0; 

    const recentData: any[] = [];
    const activeEmployeesList = allEmployees.filter((e:any) => e.employment_status !== 'resign');

    const isSingleDay = !isFiltered || (startDate === endDate);

    if (isSingleDay) {
        // --- SINGLE DAY (Detailed) ---
        activeEmployeesList.forEach((emp: any) => {
            const record = filteredLogs.find((a: any) => a.employee_id === emp.id);

            let status = "";
            let statusColor = "";
            let timeInfo = "-";
            let hasRecord = false;

            if (!record) {
                status = "Absent";
                statusColor = "text-red-500 font-bold";
                countAbsent++;
            } else {
                hasRecord = true;
                if (record.type !== 'present') {
                    status = "Leave";
                    statusColor = "text-yellow-500 font-bold";
                    countLeave++;
                    timeInfo = "On Leave";
                } else {
                    const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-";
                    const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null;

                    if (checkOut) {
                        status = "Clock Out";
                        statusColor = "text-green-600 font-bold";
                        countClockOut++;
                        timeInfo = `${checkIn} - ${checkOut}`;
                    } else {
                        status = "Clock In";
                        statusColor = "text-blue-600 font-bold";
                        countClockIn++;
                        timeInfo = `${checkIn} - ...`;
                    }
                }
            }

            recentData.push({
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                status: status,
                color: statusColor,
                time: timeInfo,
                hasRecord: hasRecord,
                date: isFiltered ? startDate : todayStr 
            });
        });
    } else {
        // --- MULTI-DAY (Logs Only) ---
        filteredLogs.forEach((record: any) => {
             const emp = allEmployees.find(e => e.id === record.employee_id);
             const name = emp ? `${emp.first_name} ${emp.last_name}` : "Unknown User";

             let status = "";
             let statusColor = "";
             let timeInfo = "-";

             if (record.type !== 'present') {
                status = "Leave";
                statusColor = "text-yellow-500 font-bold";
                countLeave++;
             } else {
                const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-";
                const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null;

                if (checkOut) {
                    status = "Clock Out";
                    statusColor = "text-green-600 font-bold";
                    countClockOut++;
                    timeInfo = `${checkIn} - ${checkOut}`;
                } else {
                    status = "Clock In";
                    statusColor = "text-blue-600 font-bold";
                    countClockIn++;
                    timeInfo = `${checkIn} - ...`;
                }
             }

             recentData.push({
                id: record.id,
                name: name,
                status: status,
                color: statusColor,
                time: timeInfo,
                hasRecord: true,
                date: record.date
            });
        });
    }

    const attendanceChart = [
          { name: "Clock In", value: countClockIn },
          { name: "Clock Out", value: countClockOut },
          { name: "Leave", value: countLeave },
          { name: "Absent", value: countAbsent }, 
    ];

    const sortedRecent = recentData.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.hasRecord) - Number(a.hasRecord);
    }); 

    return {
        stats: {
            totalEmployees: isFiltered ? filteredEmployees.length : allEmployees.length,
            newEmployees: newEmployeesCount,
            activeEmployees: activeStats,
            resignedEmployees: resignedStats
        },
        employeeStatusChart,
        employeeNewChart,
        attendanceChart,
        recentAttendance: sortedRecent,
        isFiltered
    };

  }, [allEmployees, allAttendance, startDate, endDate]);

  // --- HANDLERS ---
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setShowDateFilter(false);
  };

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Dashboard Overview</h1>
        
        {/* Date Filter Dropdown */}
        <div className="relative z-20">
            <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm shadow-sm hover:bg-gray-50 transition-colors ${startDate || endDate ? 'border-[#1E3A5F] text-[#1E3A5F]' : 'border-[#D8DDE1] text-[#596171]'}`}
            >
                <Icon icon="mdi:calendar-range" className="text-lg" />
                <span>{startDate ? `${startDate} - ${endDate || 'Today'}` : "Select Period"}</span>
                <Icon icon="mdi:chevron-down" className={`text-lg transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Content */}
            {showDateFilter && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4 animate-in fade-in zoom-in duration-200">
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2 text-[#1D395E]">Date Range</label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
                            />
                            <span className="text-gray-400 font-bold">-</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-black underline">Reset to Default</button>
                        <button onClick={() => setShowDateFilter(false)} className="bg-[#1E3A5F] text-white px-4 py-1.5 rounded text-xs hover:bg-[#2b4c75] transition-colors">Apply</button>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Cards Stat */}
        <Card 
            title={dashboardData.isFiltered ? "Employees Joined" : "Total Employee"} 
            value={dashboardData.stats.totalEmployees} 
            color="bg-blue-600 text-white" 
            update={dashboardData.isFiltered ? "In Selected Range" : "All Time"} 
        />
        <Card 
            title="New Employees" 
            value={dashboardData.stats.newEmployees} 
            color="bg-emerald-600 text-white" 
            update={dashboardData.isFiltered ? "In Selected Range" : "This Month"} 
        />
        <Card 
            title="Active Employees" 
            value={dashboardData.stats.activeEmployees} 
            color="bg-amber-500 text-white" 
            update={dashboardData.isFiltered ? "From Selected Cohort" : "Current Status"} 
        />
        <Card 
            title="Resigned Employees" 
            value={dashboardData.stats.resignedEmployees} 
            color="bg-rose-600 text-white" 
            update={dashboardData.isFiltered ? "From Selected Cohort" : "All Time"} 
        />

        {/* Chart 1: Employee Growth/Status */}
        <div className="col-span-2 bg-white p-5 rounded-xl shadow">
            <h2 className="font-semibold text-gray-800 mb-4">
                {dashboardData.isFiltered ? "Cohort Status" : "Employee Growth"}
            </h2>
            <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.employeeNewChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                    {dashboardData.employeeNewChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#10B981" : index === 1 ? "#F59E0B" : "#EF4444"} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Chart 2: Status Distribution */}
        <div className="col-span-2 bg-white p-5 rounded-xl shadow">
            <h2 className="font-semibold text-gray-800 mb-4">
                Status Distribution {dashboardData.isFiltered ? "(Filtered Cohort)" : ""}
            </h2>
            <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.employeeStatusChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} style={{fontSize: '12px'}} />
                <Tooltip />
                <Bar dataKey="value" fill="#1E3A5F" barSize={20} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Chart 3: Attendance Pie */}
        <div className="bg-white p-5 rounded-xl shadow col-span-1">
            <h2 className="font-semibold text-gray-800 mb-3">
                Attendance ({startDate ? "Period" : "Today"})
            </h2>
            <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={dashboardData.attendanceChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    label
                >
                    {dashboardData.attendanceChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '12px'}} />
                </PieChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Table: Attendance Logs */}
        <div className="col-span-3 bg-white p-5 rounded-xl shadow">
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-gray-800">
                    Attendance Logs {startDate ? `(${startDate} - ${endDate || 'Now'})` : `(${todayDate})`}
                </h2>
                {dashboardData.recentAttendance.length > 5 && (
                    <span className="text-xs text-gray-400">Showing top results</span>
                )}
            </div>
            <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-sm border-t border-gray-200">
                <thead className="text-gray-500 bg-gray-50 sticky top-0">
                    <tr>
                    <th className="py-3 px-4 text-left">No</th>
                    <th className="py-3 text-left">Date</th>
                    <th className="py-3 text-left">Name</th>
                    <th className="py-3 text-left">Status</th>
                    <th className="py-3 text-left">Time (In - Out)</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {dashboardData.recentAttendance.map((item, index) => (
                        <tr key={`${item.id}-${index}`} className="border-t hover:bg-gray-50">
                            <td className="py-3 px-4">{index + 1}.</td>
                            <td className="text-gray-500 text-xs">{item.date}</td>
                            <td className="font-medium">{item.name}</td>
                            <td><span className={`${item.color} text-xs uppercase tracking-wide`}>{item.status}</span></td>
                            <td className="text-gray-500 font-mono text-xs">{item.time}</td>
                        </tr>
                    ))}
                    {dashboardData.recentAttendance.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-4">No data available for this period.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}