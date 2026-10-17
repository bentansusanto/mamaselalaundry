'use client';

import React, { useEffect, useState } from 'react';
import { Customer, Order, OrderProgressStatus, PaymentStatus, PaymentMethod, ServiceItem, UserAccount } from '@/types';
import {
  initDatabaseDefaults,
  getAllOrders,
  saveOrder,
  getAllCustomers,
  saveCustomer,
  deleteCustomer,
  getAllServices,
  saveService,
  deleteService,
  getAllUsers,
  saveUser,
  getSyncQueue,
} from '@/lib/db';
import {
  pullFromSupabase,
  subscribeToSupabaseRealtime,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  syncOrderToSupabase,
  deleteOrderFromSupabase,
  syncServiceToSupabase,
  deleteServiceFromSupabase,
  syncOfflineQueueToSupabase,
} from '@/lib/supabaseSync';
import { INITIAL_USERS } from '@/lib/initialData';
import { Navbar } from '@/components/Navbar';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { DashboardView } from '@/components/DashboardView';
import { PosView } from '@/components/PosView';
import { OrdersView } from '@/components/OrdersView';
import { CustomersView } from '@/components/CustomersView';
import { MoreMenuView, MoreSubView } from '@/components/MoreMenuView';
import { ServicesView } from '@/components/ServicesView';
import { ReportsView } from '@/components/ReportsView';
import { UsersView } from '@/components/UsersView';
import { SyncSettingsView } from '@/components/SyncSettingsView';
import { ReceiptModal } from '@/components/ReceiptModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Captured by LaundryApp ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4 my-auto">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Terjadi Kesalahan Tampilan</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Aplikasi mendeteksi pembaruan data. Silakan muat ulang halaman untuk memperbarui tampilan.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [moreSubView, setMoreSubView] = useState<MoreSubView>('menu');

  // Application Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USERS[0]);

  // Connectivity & Sync States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Active Receipt & Install Prompt Modals
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load Database and Register Service Worker on Mount
  useEffect(() => {
    async function loadData() {
      await initDatabaseDefaults();

      const loadedOrders = await getAllOrders();
      const loadedCustomers = await getAllCustomers();
      const loadedServices = await getAllServices();
      const loadedUsers = await getAllUsers();

      setOrders(loadedOrders);
      setCustomers(loadedCustomers);
      setServices(loadedServices);
      setUsers(loadedUsers);
      if (loadedUsers.length > 0) {
        setCurrentUser(loadedUsers[0]);
      }

      // Flush offline queue and pull latest data from Supabase Cloud
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await syncOfflineQueueToSupabase();
          if (res.success) {
            setCustomers(res.customers);
            setOrders(res.orders);
            if (res.services.length > 0) setServices(res.services);
          }
        } catch (supaErr) {
          console.warn('Initial Supabase sync error:', supaErr);
        }
      }
    }

    loadData();

    // Register Service Worker for PWA download & offline support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Mama Sela PWA ServiceWorker ready:', reg.scope))
        .catch((err) => console.error('Mama Sela SW registration failed:', err));
    }

    // Capture beforeinstallprompt for instant download/installation
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      showNotice('Aplikasi Mama Sela berhasil terpasang di layar utama!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Online / Offline Listeners (Auto-sync when reconnected)
    setIsOnline(navigator.onLine);
    const handleOnline = async () => {
      setIsOnline(true);
      showNotice('Koneksi internet online! Menyinkronkan data offline...', 'success');
      try {
        const res = await syncOfflineQueueToSupabase();
        if (res.success) {
          setCustomers(res.customers);
          setOrders(res.orders);
          if (res.services.length > 0) setServices(res.services);
        }

        if (res.syncedCount > 0) {
          showNotice(`${res.syncedCount} transaksi offline berhasil disinkronkan ke cloud!`, 'success');
        } else {
          showNotice('Aplikasi online dan data tersinkronisasi.', 'success');
        }
      } catch (e) {
        console.error('Online auto-sync error:', e);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotice('Mode Offline aktif. Data tersimpan di memori perangkat.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Refresh & sync offline data when user focuses / returns to the app tab
    const handleFocusSync = async () => {
      if (typeof window !== 'undefined' && navigator.onLine && document.visibilityState === 'visible') {
        try {
          const res = await syncOfflineQueueToSupabase();
          if (res.success) {
            setCustomers(res.customers);
            setOrders(res.orders);
            if (res.services.length > 0) setServices(res.services);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    // Supabase Instant Realtime Subscription (< 100ms)
    const unsubscribeSupabase = subscribeToSupabaseRealtime(async () => {
      const freshOrders = await getAllOrders();
      const freshCustomers = await getAllCustomers();
      const freshServices = await getAllServices();
      setOrders(freshOrders);
      setCustomers(freshCustomers);
      setServices(freshServices);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
      unsubscribeSupabase();
    };
  }, []);

  const showNotice = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Instant App Download / Install Handler
  const handleDownloadApp = async () => {
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true);

    if (isStandalone) {
      showNotice('Aplikasi Mama Sela sudah terpasang di HP Anda!', 'success');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          showNotice('Sedang mengunduh & memasang aplikasi Mama Sela...', 'success');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // Supabase Manual Refresh Handler
  const handleRefreshSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineQueueToSupabase();
      if (res.success) {
        setCustomers(res.customers);
        setOrders(res.orders);
        if (res.services.length > 0) setServices(res.services);
      }
      showNotice(
        res.syncedCount > 0
          ? `${res.syncedCount} perubahan offline berhasil disinkronkan ke cloud!`
          : 'Data berhasil disinkronkan dari Supabase!',
        'success'
      );
    } catch (e) {
      showNotice('Gagal memuat data dari Supabase', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Order Handlers
  const handleOrderCreated = async (order: Order) => {
    await saveOrder(order);
    const updated = await getAllOrders();
    setOrders(updated);

    if (isOnline) {
      syncOrderToSupabase(order);
      showNotice(`Order #${order.id} berhasil dibuat!`, 'success');
    } else {
      showNotice(`Order #${order.id} tersimpan di memori perangkat (Offline). Akan otomatis disinkronkan saat online.`, 'warning');
    }

    setActiveReceiptOrder(order);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderProgressStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedOrder: Order = {
      ...order,
      progressStatus: nextStatus,
      completedAt: nextStatus === 'Selesai' ? new Date().toISOString() : order.completedAt,
    };
    await saveOrder(updatedOrder);
    if (isOnline) {
      syncOrderToSupabase(updatedOrder);
    }
    const updated = await getAllOrders();
    setOrders(updated);
    showNotice(`Status pesanan diperbarui: ${nextStatus}`, 'success');
  };

  const handleUpdatePaymentStatus = async (
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: PaymentMethod
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const finalMethod = paymentMethod || order.paymentMethod || 'Cash';
    const updatedOrder: Order = {
      ...order,
      paymentStatus,
      paymentMethod: finalMethod,
      paymentDate: paymentStatus === 'Lunas' ? new Date().toISOString() : undefined,
    };
    await saveOrder(updatedOrder);
    if (isOnline) {
      syncOrderToSupabase(updatedOrder);
    }
    const updated = await getAllOrders();
    setOrders(updated);
    showNotice(
      paymentStatus === 'Lunas'
        ? `Pembayaran #${order.id} LUNAS via ${finalMethod}!`
        : `Status pembayaran #${order.id}: Belum Bayar`,
      'success'
    );
  };

  // Customer Handlers
  const handleSaveCustomer = async (cust: Customer) => {
    await saveCustomer(cust);
    if (isOnline) {
      syncCustomerToSupabase(cust);
      showNotice(`Pelanggan ${cust.name} tersimpan!`, 'success');
    } else {
      showNotice(`Pelanggan ${cust.name} tersimpan di memori perangkat (Offline).`, 'warning');
    }
    const updated = await getAllCustomers();
    setCustomers(updated);
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    await deleteCustomer(id);
    if (isOnline) {
      deleteCustomerFromSupabase(id);
    }
    const updated = await getAllCustomers();
    setCustomers(updated);
    showNotice(`Pelanggan ${cust ? cust.name : ''} berhasil dihapus!`, 'warning');
  };

  // Service Handlers
  const handleSaveService = async (service: ServiceItem) => {
    await saveService(service);
    if (isOnline) {
      syncServiceToSupabase(service);
    }
    const updated = await getAllServices();
    setServices(updated);
    showNotice(`Layanan ${service.name} tersimpan!`, 'success');
  };

  const handleDeleteService = async (id: string) => {
    await deleteService(id);
    if (isOnline) {
      deleteServiceFromSupabase(id);
    }
    const updated = await getAllServices();
    setServices(updated);
    showNotice('Layanan berhasil dihapus', 'warning');
  };

  // User Handlers
  const handleSaveUser = async (u: UserAccount) => {
    await saveUser(u);
    const updated = await getAllUsers();
    setUsers(updated);
    if (currentUser.id === u.id) {
      setCurrentUser(u);
    }
    showNotice(`Akun ${u.name} diperbarui!`, 'success');
  };

  const handleResetDemoData = async () => {
    indexedDB.deleteDatabase('laundry_pwa_db');
    window.location.reload();
  };

  const activeOrdersCount = orders.filter((o) => o.progressStatus !== 'Selesai').length;

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={setCurrentUser}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={handleRefreshSupabase}
        onOpenInstall={handleDownloadApp}
      />

      {/* Floating Notification Toast (Strictly bounded inside the mobile container) */}
      {notification && (
        <div className="sticky top-14 z-50 px-3 -mb-12 pointer-events-none transition-all duration-300">
          <div
            className={`pointer-events-auto p-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500/30 shadow-emerald-900/20'
                : notification.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500/30 shadow-rose-900/20'
                : 'bg-amber-500 text-slate-950 border-amber-400/40 shadow-amber-900/20'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            )}
            <span className="flex-1 leading-snug break-words">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 -mr-1 rounded-full hover:bg-black/10 transition shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Container */}
      <div className="p-4 flex-1">
        <ErrorBoundary>
          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
          <DashboardView
            orders={orders}
            customers={customers}
            services={services}
            onGoToPos={() => setCurrentTab('pos')}
            onViewReceipt={setActiveReceiptOrder}
          />
        )}

        {/* Tab 2: Kasir POS */}
        {currentTab === 'pos' && (
          <PosView
            customers={customers}
            services={services}
            currentUser={currentUser}
            onOrderCreated={handleOrderCreated}
            onNewCustomer={handleSaveCustomer}
          />
        )}

        {/* Tab 3: Pesanan */}
        {currentTab === 'orders' && (
          <OrdersView
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onUpdatePayment={handleUpdatePaymentStatus}
            onViewReceipt={setActiveReceiptOrder}
          />
        )}

        {/* Tab 4: Pelanggan */}
        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            orders={orders}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onViewReceipt={setActiveReceiptOrder}
            onSync={handleRefreshSupabase}
            isSyncing={isSyncing}
          />
        )}

        {/* Tab 5: Menu Lainnya & Subviews */}
        {currentTab === 'more' && (
          <div>
            {moreSubView !== 'menu' && (
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => setMoreSubView('menu')}
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Menu</span>
                </button>
              </div>
            )}

            {moreSubView === 'menu' && (
              <MoreMenuView
                onSelectSubView={setMoreSubView}
                syncQueueCount={0}
                onOpenInstall={() => setIsInstallModalOpen(true)}
              />
            )}
            {moreSubView === 'services' && (
              <ServicesView
                services={services}
                onSaveService={handleSaveService}
                onDeleteService={handleDeleteService}
              />
            )}
            {moreSubView === 'reports' && <ReportsView orders={orders} />}
            {moreSubView === 'users' && (
              <UsersView
                users={users}
                currentUser={currentUser}
                onSaveUser={handleSaveUser}
              />
            )}
            {moreSubView === 'sync' && (
              <SyncSettingsView
                isSyncing={isSyncing}
                onRefreshData={handleRefreshSupabase}
                ordersCount={orders.length}
                customersCount={customers.length}
                servicesCount={services.length}
                onResetData={handleResetDemoData}
              />
            )}
          </div>
        )}
        </ErrorBoundary>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'more') setMoreSubView('menu');
        }}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Digital Receipt & Struk WhatsApp Modal */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
      />

      {/* PWA Install / Download App Prompt Modal */}
      <InstallPrompt
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstall={handleDownloadApp}
      />
    </div>
  );
}
