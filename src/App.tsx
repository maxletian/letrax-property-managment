import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  LogOut, 
  Plus, 
  Lock, 
  Unlock, 
  ChevronRight,
  TrendingUp,
  Home,
  AlertCircle,
  FileText,
  Camera,
  CheckCircle2,
  Menu,
  X,
  UserPlus,
  DollarSign,
  ArrowLeft,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Role = 'ADMIN' | 'LANDLORD' | 'CARETAKER';

interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
}

interface Property {
  id: number;
  name: string;
  location: string;
  owner_id: number;
  owner_name?: string;
  status: 'ACTIVE' | 'LOCKED';
  caretaker_id: number;
  caretaker_name?: string;
}

interface Unit {
  id: number;
  property_id: number;
  unit_number: string;
  monthly_rent: number;
  status: 'VACANT' | 'OCCUPIED';
}

interface Tenant {
  id: number;
  unit_id: number;
  unit_number: string;
  property_name: string;
  full_name: string;
  phone: string;
  national_id: string;
  move_in_date: string;
  deposit: number;
  status: 'ACTIVE' | 'VERIFICATION_REQUIRED';
}

interface Payment {
  id: number;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  transaction_id: string;
  method: string;
  type: 'RENT' | 'DEPOSIT';
}

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50";
  const variants: any = {
    primary: "bg-black text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
      {...props}
    />
  </div>
);

const Select = ({ label, options, placeholder, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select 
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Badge = ({ children, variant = 'neutral' }: any) => {
  const variants: any = {
    neutral: "bg-zinc-100 text-zinc-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState('dashboard');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedPropertyStats, setSelectedPropertyStats] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);

  // Data States
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [landlords, setLandlords] = useState<any[]>([]);
  const [caretakers, setCaretakers] = useState<any[]>([]);
  const [propertyUnits, setPropertyUnits] = useState<Unit[]>([]);
  const [regVacantUnits, setRegVacantUnits] = useState<Unit[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
      fetchInitialData();
    }
  }, [token]);

  const fetchInitialData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/init', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch initialization data");
      
      const data = await res.json();
      setProperties(data.properties || []);
      setTenants(data.tenants || []);
      setPayments(data.payments || []);
      
      if (data.globalStats) setGlobalStats(data.globalStats);
      if (data.landlords) setLandlords(data.landlords);
      if (data.caretakers) setCaretakers(data.caretakers);
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setIsInitialLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: number) => {
    console.log("handleDeleteProperty initiated for ID:", propertyId);
    if (!window.confirm("Are you sure you want to delete this property? This will also delete all associated units, tenants, and payments. This action cannot be undone.")) {
      console.log("Deletion cancelled by user");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchInitialData();
        if (view === 'property-dashboard') setView('properties');
        alert("Property deleted successfully");
      } else {
        const errData = await res.json();
        alert(`Failed to delete property: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Failed to delete property: Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get('password');
    if (!selectedUserForReset) return;
    
    try {
      const res = await fetch(`/api/users/${selectedUserForReset.id}/reset-password`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setActiveModal(null);
        setSelectedUserForReset(null);
        alert("Password reset successfully");
      }
    } catch (err) {
      alert("Failed to reset password");
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setActiveModal(null);
        fetchInitialData();
      }
    } catch (err) {
      alert("Failed to create property");
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...data, property_id: selectedProperty?.id })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchInitialData();
        if (selectedProperty) {
          const unitsRes = await fetch(`/api/properties/${selectedProperty.id}/units`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (unitsRes.ok) {
            const units = await unitsRes.json();
            setPropertyUnits(units);
          }
        }
      }
    } catch (err) {
      alert("Failed to create unit");
    }
  };

  const handleRegPropertyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value;
    if (!propertyId) {
      setRegVacantUnits([]);
      return;
    }
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const units: Unit[] = await res.json();
        setRegVacantUnits(units.filter(u => u.status === 'VACANT'));
      } else {
        setRegVacantUnits([]);
      }
    } catch (err) {
      console.error("Failed to fetch units", err);
      setRegVacantUnits([]);
    }
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setActiveModal(null);
        fetchInitialData();
      }
    } catch (err) {
      alert("Failed to register tenant");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount as string),
          month: parseInt(data.month as string),
          year: parseInt(data.year as string)
        })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchInitialData();
      }
    } catch (err) {
      alert("Failed to record payment");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setActiveModal(null);
        fetchInitialData();
      } else {
        const result = await res.json();
        alert(result.error || "Failed to create user");
      }
    } catch (err) {
      alert("Failed to create user");
    }
  };

  const openPropertyDashboard = async (property: Property) => {
    setSelectedProperty(property);
    setView('property-dashboard');
    setIsLoading(true);
    try {
      const statsRes = await fetch(`/api/analytics/property/${property.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const unitsRes = await fetch(`/api/properties/${property.id}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsRes.ok && unitsRes.ok) {
        const stats = await statsRes.json();
        const units = await unitsRes.json();
        setSelectedPropertyStats(stats);
        setPropertyUnits(units);
      }
    } catch (err) {
      console.error("Failed to fetch property dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openUnitsModal = async (property: Property) => {
    setSelectedProperty(property);
    try {
      const res = await fetch(`/api/properties/${property.id}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPropertyUnits(await res.json());
      setActiveModal('units');
    } catch (err) {
      alert("Failed to fetch units");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'LANDLORD' })
      });
      const result = await res.json();
      if (res.ok) {
        alert("Registration successful! Please sign in.");
        setIsRegistering(false);
      } else {
        alert(result.error || "Registration failed");
      }
    } catch (err) {
      alert("Registration failed");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.token) {
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                <Building2 className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900">RentMaster Pro</h1>
              <p className="text-zinc-500 text-sm">
                {isRegistering ? 'Create your landlord account' : 'Sign in to manage your properties'}
              </p>
            </div>
            
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input label="Full Name" name="name" placeholder="John Doe" required />
                <Input label="Email Address" name="email" type="email" placeholder="john@example.com" required />
                <Input label="Phone Number" name="phone" placeholder="+254..." required />
                <Input label="Password" name="password" type="password" placeholder="••••••••" required />
                <Button type="submit" className="w-full py-3">Create Account</Button>
                <button 
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="w-full text-sm text-zinc-500 hover:text-black transition-colors"
                >
                  Already have an account? Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input label="Email Address" name="email" type="email" placeholder="admin@rentmaster.com" required />
                <Input label="Password" name="password" type="password" placeholder="••••••••" required />
                <Button type="submit" className="w-full py-3">Sign In</Button>
                <button 
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="w-full text-sm text-zinc-500 hover:text-black transition-colors"
                >
                  Don't have an account? Register as Landlord
                </button>
              </form>
            )}

            {!isRegistering && (
              <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
                <p className="text-xs text-zinc-400">
                  Demo Credentials:<br/>
                  Admin: admin@rentmaster.com / admin123
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        view === id ? 'bg-black text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-100 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight">RentMaster</span>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="properties" icon={Building2} label="Properties" />
            <NavItem id="tenants" icon={Users} label="Tenants" />
            <NavItem id="payments" icon={CreditCard} label="Payments" />
            <NavItem id="reports" icon={FileText} label="Reports" />
            {user?.role === 'ADMIN' ? (
              <NavItem id="users" icon={ShieldCheck} label="System Users" />
            ) : user?.role === 'LANDLORD' ? (
              <NavItem id="caretakers" icon={ShieldCheck} label="My Caretakers" />
            ) : null}
          </nav>

          <div className="mt-auto pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 font-bold">
                {user?.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.role}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold capitalize">{view}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchInitialData} 
              disabled={isLoading}
              className={`p-2 hover:bg-zinc-100 rounded-lg transition-all ${isLoading ? 'animate-spin opacity-50' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
            <Badge variant="info">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto relative">
          {isInitialLoad && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-2xl min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading Dashboard...</p>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {user?.role === 'ADMIN' && globalStats && (
                    <>
                      <StatCard icon={Building2} label="Total Properties" value={globalStats.totalProperties} trend="+2 this month" />
                      <StatCard icon={Users} label="Total Tenants" value={globalStats.totalTenants} trend="+12 this month" />
                      <StatCard icon={TrendingUp} label="Occupancy Rate" value={`${globalStats.occupancyRate.toFixed(1)}%`} trend="Stable" />
                      <StatCard icon={DollarSign} label="Total Revenue" value={`$${globalStats.totalRevenue.toLocaleString()}`} trend="+15% vs last month" />
                    </>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <>
                      <StatCard icon={Building2} label="Active Properties" value={properties.filter(p => p.status === 'ACTIVE').length} />
                      <StatCard icon={Users} label="Active Tenants" value={tenants.length} />
                      <StatCard icon={CreditCard} label="Recent Payments" value={payments.length} />
                      <StatCard icon={AlertCircle} label="Pending Verifications" value={tenants.filter(t => t.status === 'VERIFICATION_REQUIRED').length} />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Recent Payments</h3>
                      <Button variant="outline" onClick={() => setView('payments')}>View All</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                            <th className="pb-4">Tenant</th>
                            <th className="pb-4">Unit</th>
                            <th className="pb-4">Amount</th>
                            <th className="pb-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {payments.slice(0, 5).map((p) => (
                            <tr key={p.id} className="text-sm">
                              <td className="py-4 font-medium">{p.tenant_name}</td>
                              <td className="py-4 text-zinc-500">{p.unit_number}</td>
                              <td className="py-4 font-bold">${p.amount}</td>
                              <td className="py-4"><Badge variant="success">Completed</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="font-bold text-lg mb-6">Property Status</h3>
                    <div className="space-y-4">
                      {properties.slice(0, 4).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 group/item">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => openPropertyDashboard(p)}>
                            <div className={`w-2 h-2 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="text-sm font-bold group-hover/item:underline">{p.name}</p>
                              <p className="text-xs text-zinc-500">{p.location}</p>
                            </div>
                          </div>
                          <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'}>{p.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {view === 'properties' && (
              <motion.div 
                key="properties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Properties</h3>
                  {user?.role !== 'CARETAKER' && (
                    <Button onClick={() => setActiveModal('addProperty')}>
                      <Plus size={18} /> Add Property
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map(p => (
                    <PropertyCard 
                      key={p.id} 
                      property={p} 
                      isAdmin={user?.role === 'ADMIN'} 
                      role={user?.role as Role}
                      onManageUnits={() => openUnitsModal(p)} 
                      onViewDashboard={() => openPropertyDashboard(p)}
                      onDelete={() => handleDeleteProperty(p.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'property-dashboard' && selectedProperty && (
              <motion.div 
                key="property-dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => setView('properties')}>
                      <ArrowLeft size={16} /> Back
                    </Button>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedProperty.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 mt-1">
                        <span className="flex items-center gap-1"><ChevronRight size={14} className="text-zinc-300" /> {selectedProperty.location}</span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-zinc-400">Caretaker:</span> 
                          {selectedProperty.caretaker_name || 'Unassigned'}
                        </span>
                        {user?.role === 'ADMIN' && (
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-zinc-400">Landlord:</span> 
                            {selectedProperty.owner_name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user?.role === 'ADMIN' && (
                      <Button 
                        variant="outline" 
                        className="text-red-600 border-red-100 hover:bg-red-50"
                        onClick={() => handleDeleteProperty(selectedProperty.id)}
                      >
                        <Trash2 size={18} /> Delete Property
                      </Button>
                    )}
                    <Badge variant={selectedProperty.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {selectedProperty.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard 
                    icon={Users} 
                    label="Occupancy" 
                    value={`${selectedPropertyStats?.occupancyRate?.toFixed(1) || 0}%`} 
                    trend={`${selectedPropertyStats?.occupiedUnits || 0} / ${selectedPropertyStats?.totalUnits || 0} Units`}
                  />
                  <StatCard 
                    icon={DollarSign} 
                    label="Expected Rent" 
                    value={`$${selectedPropertyStats?.expectedRent?.toLocaleString() || 0}`} 
                  />
                  <StatCard 
                    icon={TrendingUp} 
                    label="Collected (MTD)" 
                    value={`$${selectedPropertyStats?.collectedRent?.toLocaleString() || 0}`} 
                    trend={`${((selectedPropertyStats?.collectedRent / selectedPropertyStats?.expectedRent) * 100 || 0).toFixed(1)}% Collection Rate`}
                  />
                  <StatCard 
                    icon={AlertCircle} 
                    label="Arrears" 
                    value={`$${selectedPropertyStats?.arrears?.toLocaleString() || 0}`} 
                    trend="Outstanding payments"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold">Units Overview</h4>
                      <Button variant="secondary" size="sm" onClick={() => openUnitsModal(selectedProperty)}>Manage Units</Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {propertyUnits.map(u => (
                        <div key={u.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">Unit {u.unit_number}</span>
                            <div className={`w-2 h-2 rounded-full ${u.status === 'VACANT' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          </div>
                          <p className="text-xs text-zinc-500">${u.monthly_rent}/mo</p>
                          <Badge variant={u.status === 'VACANT' ? 'success' : 'neutral'}>{u.status}</Badge>
                        </div>
                      ))}
                      {propertyUnits.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                          <p className="text-sm text-zinc-500">No units registered for this property yet.</p>
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveModal('addUnit')}>
                            <Plus size={14} /> Add First Unit
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card>
                    <h4 className="font-bold mb-6">Recent Property Activity</h4>
                    <div className="space-y-4">
                      {payments.filter(p => p.property_name === selectedProperty.name).slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                          <div>
                            <p className="text-sm font-bold">{p.tenant_name}</p>
                            <p className="text-xs text-zinc-500">Unit {p.unit_number}</p>
                          </div>
                          <p className="text-sm font-bold text-emerald-600">+${p.amount}</p>
                        </div>
                      ))}
                      {payments.filter(p => p.property_name === selectedProperty.name).length === 0 && (
                        <p className="text-sm text-zinc-500 text-center py-4">No recent payments</p>
                      )}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {view === 'tenants' && (
              <motion.div 
                key="tenants"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Tenants</h3>
                  <Button onClick={() => setActiveModal('registerTenant')}>
                    <UserPlus size={18} /> New Tenant
                  </Button>
                </div>

                <Card>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                        <th className="pb-4">Name</th>
                        <th className="pb-4">Property / Unit</th>
                        <th className="pb-4">Phone</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {tenants.map((t) => (
                        <tr key={t.id} className="text-sm">
                          <td className="py-4">
                            <p className="font-bold">{t.full_name}</p>
                            <p className="text-xs text-zinc-500">ID: {t.national_id}</p>
                          </td>
                          <td className="py-4">
                            <p className="font-medium">{t.property_name}</p>
                            <p className="text-xs text-zinc-500">Unit {t.unit_number}</p>
                          </td>
                          <td className="py-4 text-zinc-500">{t.phone}</td>
                          <td className="py-4">
                            <Badge variant={t.status === 'ACTIVE' ? 'success' : 'warning'}>
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              {t.status === 'VERIFICATION_REQUIRED' && (
                                <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => alert("Verification request sent to tenant via SMS")}>
                                  Verify
                                </Button>
                              )}
                              <Button variant="outline" className="h-8 px-2" onClick={() => { setSelectedTenant(t); setActiveModal('tenantDetails'); }}>
                                <ChevronRight size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </motion.div>
            )}

            {view === 'payments' && (
              <motion.div 
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Payment History</h3>
                  <Button onClick={() => setActiveModal('recordPayment')}>
                    <Plus size={18} /> Record Payment
                  </Button>
                </div>

                <Card>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                        <th className="pb-4">Date</th>
                        <th className="pb-4">Tenant</th>
                        <th className="pb-4">Property</th>
                        <th className="pb-4">Amount</th>
                        <th className="pb-4">Method</th>
                        <th className="pb-4">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {payments.map((p) => (
                        <tr key={p.id} className="text-sm">
                          <td className="py-4 text-zinc-500">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="py-4">
                            <p className="font-bold">{p.tenant_name}</p>
                            <p className="text-xs text-zinc-500">Unit {p.unit_number}</p>
                          </td>
                          <td className="py-4 font-medium">{p.property_name}</td>
                          <td className="py-4 font-bold text-emerald-600">${p.amount}</td>
                          <td className="py-4"><Badge variant="info">{p.method}</Badge></td>
                          <td className="py-4 font-mono text-xs text-zinc-400">{p.transaction_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </motion.div>
            )}

            {view === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Financial Reports</h3>
                  <div className="flex gap-2">
                    <Button variant="outline"><FileText size={18} /> Export PDF</Button>
                    <Button variant="outline"><FileText size={18} /> Export Excel</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <h4 className="font-bold mb-6">Monthly Revenue Summary</h4>
                    <div className="space-y-4">
                      {properties.filter(p => isAdmin || p.status !== 'LOCKED').map(p => {
                        const propPayments = payments.filter(pay => pay.property_name === p.name);
                        const total = propPayments.reduce((acc, curr) => acc + curr.amount, 0);
                        return (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                            <div>
                              <p className="font-bold">{p.name}</p>
                              <p className="text-xs text-zinc-500">{propPayments.length} payments recorded</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">${total.toLocaleString()}</p>
                              <p className="text-[10px] text-zinc-400 uppercase font-bold">Collected</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card>
                    <h4 className="font-bold mb-6">Arrears Report</h4>
                    <div className="space-y-4">
                      {tenants.map(t => {
                        const tenantPayments = payments.filter(p => p.tenant_name === t.full_name);
                        const paid = tenantPayments.reduce((acc, curr) => acc + curr.amount, 0);
                        // Simplified arrears calculation for demo
                        const expected = 12000; // Mock expected total
                        const arrears = Math.max(0, expected - paid);
                        if (arrears === 0) return null;
                        return (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl">
                            <div>
                              <p className="font-bold">{t.full_name}</p>
                              <p className="text-xs text-zinc-500">Unit {t.unit_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">${arrears.toLocaleString()}</p>
                              <p className="text-[10px] text-red-400 uppercase font-bold">Outstanding</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {view === 'caretakers' && user?.role === 'LANDLORD' && (
              <motion.div 
                key="caretakers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">My Caretakers</h3>
                  <Button onClick={() => setActiveModal('addUser')}>
                    <UserPlus size={18} /> Add Caretaker
                  </Button>
                </div>

                <Card>
                  <div className="space-y-2">
                    {caretakers.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">No caretakers added yet.</p>
                    ) : (
                      caretakers.map(c => (
                        <div key={c.id} className="p-4 bg-zinc-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold">{c.name}</p>
                            <p className="text-sm text-zinc-500">{c.email}</p>
                          </div>
                          <Badge variant="neutral">Caretaker</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {view === 'users' && user?.role === 'ADMIN' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">System Users</h3>
                  <Button onClick={() => setActiveModal('addUser')}>
                    <UserPlus size={18} /> Add User
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <h4 className="font-bold mb-4">Landlords</h4>
                    <div className="space-y-2">
                      {landlords.map(l => (
                        <div key={l.id} className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{l.name}</p>
                            <p className="text-xs text-zinc-500">{l.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setSelectedUserForReset(l); setActiveModal('resetPassword'); }}>
                              Reset PW
                            </Button>
                            <Badge variant="info">Landlord</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <h4 className="font-bold mb-4">Caretakers</h4>
                    <div className="space-y-2">
                      {caretakers.map(c => (
                        <div key={c.id} className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{c.name}</p>
                            <p className="text-xs text-zinc-500">{c.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setSelectedUserForReset(c); setActiveModal('resetPassword'); }}>
                              Reset PW
                            </Button>
                            <Badge variant="neutral">Caretaker</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals */}
        <Modal 
          isOpen={activeModal === 'resetPassword'} 
          onClose={() => setActiveModal(null)} 
          title={`Reset Password for ${selectedUserForReset?.name}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input label="New Password" type="password" name="password" required />
            <Button type="submit" className="w-full">Update Password</Button>
          </form>
        </Modal>

        <Modal isOpen={activeModal === 'addProperty'} onClose={() => setActiveModal(null)} title="Add New Property">
          <form onSubmit={handleCreateProperty} className="space-y-4">
            <Input label="Property Name" name="name" placeholder="e.g. GreenView Apartments" required />
            <Input label="Location" name="location" placeholder="e.g. Nairobi, Kenya" required />
            {user?.role === 'ADMIN' && (
              <Select label="Owner (Landlord)" name="owner_id" placeholder="Select a landlord" options={landlords.map(l => ({ value: l.id, label: l.name }))} required />
            )}
            <Select label="Caretaker" name="caretaker_id" placeholder="Select a caretaker" options={caretakers.map(c => ({ value: c.id, label: c.name }))} required />
            <Button type="submit" className="w-full">Create Property</Button>
          </form>
        </Modal>

        <Modal isOpen={activeModal === 'units'} onClose={() => setActiveModal(null)} title={`Units - ${selectedProperty?.name}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">Unit List</h4>
              <Button variant="secondary" onClick={() => setActiveModal('addUnit')}>
                <Plus size={16} /> Add Unit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {propertyUnits.map(u => (
                <div key={u.id} className="p-4 border border-zinc-100 rounded-xl">
                  <p className="font-bold">Unit {u.unit_number}</p>
                  <p className="text-sm text-zinc-500">${u.monthly_rent}/mo</p>
                  <Badge variant={u.status === 'VACANT' ? 'neutral' : 'success'}>{u.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Modal>

        <Modal isOpen={activeModal === 'addUnit'} onClose={() => setActiveModal('units')} title="Add New Unit">
          <form onSubmit={handleCreateUnit} className="space-y-4">
            <Input label="Unit Number" name="unit_number" placeholder="e.g. B3" required />
            <Input label="Monthly Rent" name="monthly_rent" type="number" placeholder="10000" required />
            <Button type="submit" className="w-full">Create Unit</Button>
          </form>
        </Modal>

        <Modal isOpen={activeModal === 'registerTenant'} onClose={() => { setActiveModal(null); setRegVacantUnits([]); }} title="Register New Tenant">
          <form onSubmit={handleRegisterTenant} className="space-y-4">
            <Select 
              label="Property" 
              name="property_id" 
              placeholder="Select a property"
              onChange={handleRegPropertyChange}
              options={properties.filter(p => isAdmin || p.status === 'ACTIVE').map(p => ({ value: p.id, label: p.name }))} 
              required 
            />
            <Select 
              label="Vacant Unit" 
              name="unit_id" 
              placeholder={regVacantUnits.length === 0 ? "No vacant units available" : "Select a unit"}
              options={regVacantUnits.map(u => ({ value: u.id, label: `Unit ${u.unit_number} (Rent: ${u.monthly_rent})` }))} 
              disabled={regVacantUnits.length === 0}
              required 
            />
            <Input label="Full Name" name="full_name" required />
            <Input label="Phone Number" name="phone" required />
            <Input label="National ID" name="national_id" required />
            <Input label="Move-in Date" name="move_in_date" type="date" required />
            <Input label="Initial Deposit" name="deposit" type="number" required />
            <div className="p-4 bg-zinc-50 rounded-xl space-y-4">
              <p className="text-xs font-bold text-zinc-500 uppercase">Occupancy Verification</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Tenant Photo</label>
                  <input type="file" className="text-xs w-full" accept="image/*" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">House Entrance Photo</label>
                  <input type="file" className="text-xs w-full" accept="image/*" />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full">Register Tenant</Button>
          </form>
        </Modal>

        <Modal isOpen={activeModal === 'recordPayment'} onClose={() => setActiveModal(null)} title="Record Payment">
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <Select 
              label="Tenant" 
              name="tenant_id" 
              placeholder="Select a tenant"
              options={tenants.map(t => ({ value: t.id, label: `${t.full_name} (${t.property_name} - ${t.unit_number})` }))} 
              required 
            />
            <Input label="Amount" name="amount" type="number" required />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Month" name="month" placeholder="Select month" options={Array.from({length: 12}, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', {month: 'long'}) }))} required />
              <Input label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
            </div>
            <Input label="Transaction ID" name="transaction_id" placeholder="e.g. MPESA-12345" required />
            <Select label="Method" name="method" placeholder="Select method" options={[
              { value: 'MPESA', label: 'M-Pesa' },
              { value: 'AIRTEL', label: 'Airtel Money' },
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK', label: 'Bank Transfer' }
            ]} required />
            <Select label="Type" name="type" placeholder="Select type" options={[
              { value: 'RENT', label: 'Rent' },
              { value: 'DEPOSIT', label: 'Deposit' }
            ]} required />
            <Button type="submit" className="w-full">Record Payment</Button>
          </form>
        </Modal>

        <Modal isOpen={activeModal === 'addUser'} onClose={() => setActiveModal(null)} title={user?.role === 'ADMIN' ? "Add System User" : "Add Caretaker"}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <Input label="Full Name" name="name" required />
            <Input label="Email Address" name="email" type="email" required />
            <Input label="Password" name="password" type="password" required />
            <Input label="Phone Number" name="phone" required />
            {user?.role === 'ADMIN' ? (
              <Select label="Role" name="role" placeholder="Select a role" options={[
                { value: 'LANDLORD', label: 'Landlord' },
                { value: 'CARETAKER', label: 'Caretaker' }
              ]} required />
            ) : (
              <input type="hidden" name="role" value="CARETAKER" />
            )}
            <Button type="submit" className="w-full">
              {user?.role === 'ADMIN' ? "Create User" : "Create Caretaker"}
            </Button>
          </form>
        </Modal>
      </main>
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, trend }: any) => (
  <Card className="relative overflow-hidden group">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        <h4 className="text-2xl font-bold text-zinc-900">{value}</h4>
        {trend && (
          <p className={`text-xs font-medium ${trend.includes('+') ? 'text-emerald-600' : 'text-zinc-400'}`}>
            {trend}
          </p>
        )}
      </div>
      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-colors">
        <Icon size={20} />
      </div>
    </div>
  </Card>
);

const PropertyCard = ({ property, isAdmin, role, onManageUnits, onViewDashboard, onDelete }: { property: Property, isAdmin: boolean, role: Role, onManageUnits: () => void, onViewDashboard: () => void, onDelete: () => void, key?: any }) => {
  const [isLocked, setIsLocked] = useState(property.status === 'LOCKED');

  const toggleLock = async () => {
    if (!isAdmin) return;
    const newStatus = isLocked ? 'ACTIVE' : 'LOCKED';
    try {
      const res = await fetch(`/api/properties/${property.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) setIsLocked(!isLocked);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <Card className={`relative ${isLocked ? 'border-red-100 bg-red-50/10' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
          <Building2 size={24} />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={toggleLock}
              className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
          )}
          <Badge variant={isLocked ? 'danger' : 'success'}>
            {isLocked ? 'LOCKED' : 'ACTIVE'}
          </Badge>
          {isAdmin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Delete Property"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-6 cursor-pointer group/title" onClick={onViewDashboard}>
        <h4 className="font-bold text-lg group-hover/title:text-black transition-colors">{property.name}</h4>
        <p className="text-sm text-zinc-500 flex items-center gap-1">
          <ChevronRight size={14} /> {property.location}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
        {isAdmin && (
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Landlord</p>
            <p className="text-sm font-medium truncate">{property.owner_name || 'Unassigned'}</p>
          </div>
        )}
        {(isAdmin || role === 'LANDLORD') && (
          <div className={isAdmin ? "" : "col-span-2"}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Caretaker</p>
            <p className="text-sm font-medium truncate">{property.caretaker_name || 'Unassigned'}</p>
          </div>
        )}
        {role === 'CARETAKER' && (
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Property Owner</p>
            <p className="text-sm font-medium truncate">{property.owner_name || 'Unassigned'}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Button 
          variant="secondary" 
          className="w-full text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={onManageUnits}
          disabled={isLocked && !isAdmin}
        >
          {isLocked && !isAdmin ? 'Locked' : 'Units'}
        </Button>
        <Button 
          variant="outline" 
          className="w-full text-sm py-2" 
          onClick={onViewDashboard}
        >
          Dashboard
        </Button>
      </div>
    </Card>
  );
};
