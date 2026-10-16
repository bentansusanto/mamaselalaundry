'use client';

import React, { useEffect, useState } from 'react';
import { Customer, Order, OrderProgressStatus, PaymentStatus, ServiceItem, SheetsConfig, SyncQueueItem, UserAccount } from '@/types';
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
  getSheetsConfig,
  saveSheetsConfig,
  getSyncQueue,
} from '@/lib/db';
import { syncToGoogleSheets } from '@/lib/sheetsSync';
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
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>({ scriptUrl: '', autoSync: true });
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);

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
      let loadedConfig = await getSheetsConfig();

      // Check if URL has ?sync_url=... (for 1-click cross-device sharing between Laptop & HP)
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const syncUrlParam = urlParams.get('sync_url');
          if (syncUrlParam && syncUrlParam.trim()) {
            loadedConfig = { ...loadedConfig, scriptUrl: syncUrlParam.trim() };
            await saveSheetsConfig(loadedConfig);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {}
      }

      // If local device doesn't have scriptUrl yet, fetch shared scriptUrl from server
      if (!loadedConfig.scriptUrl) {
        try {
          const res = await fetch('/api/sync');
          const data = await res.json();
          if (data?.scriptUrl) {
            loadedConfig = { ...loadedConfig, scriptUrl: data.scriptUrl };
            await saveSheetsConfig(loadedConfig);
          }
        } catch (e) {}
      }

      const loadedOrders = await getAllOrders();
      const loadedCustomers = await getAllCustomers();
      const loadedServices = await getAllServices();
      const loadedUsers = await getAllUsers();
      const loadedQueue = await getSyncQueue();

      setOrders(loadedOrders);
      setCustomers(loadedCustomers);
      setServices(loadedServices);
      setUsers(loadedUsers);
      if (loadedUsers.length > 0) {
        setCurrentUser(loadedUsers[0]);
      }
      setSheetsConfig(loadedConfig);
      setSyncQueue(loadedQueue);

      // Background two-way sync on launch to pull newest data from Google Sheets
      if (loadedConfig.scriptUrl && loadedConfig.autoSync) {
        try {
          const res = await syncToGoogleSheets();
          if (res.success) {
            const freshOrders = await getAllOrders();
            const freshCustomers = await getAllCustomers();
            const freshServices = await getAllServices();
            setOrders(freshOrders);
            setCustomers(freshCustomers);
            setServices(freshServices);
          }
        } catch (syncErr) {
          console.warn('Initial background sync error:', syncErr);
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

    // Online / Offline Listeners
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      showNotice('Koneksi internet kembali online!', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotice('Mode Offline aktif. Data tersimpan di IndexedDB.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic background sync & on window focus / tab visibility change (real-time cross-device sync every 3 seconds)
    let isPerformingSync = false;
    const performBackgroundSync = async () => {
      if (isPerformingSync) return;
      if (typeof window !== 'undefined' && navigator.onLine && document.visibilityState === 'visible') {
        const cfg = await getSheetsConfig();
        if (cfg.scriptUrl && cfg.autoSync) {
          try {
            isPerformingSync = true;
            const res = await syncToGoogleSheets();
            if (res.success) {
              const freshOrders = await getAllOrders();
              const freshCustomers = await getAllCustomers();
              const freshServices = await getAllServices();
              setOrders(freshOrders);
              setCustomers(freshCustomers);
              setServices(freshServices);
            }
          } catch (e) {
          } finally {
            isPerformingSync = false;
          }
        }
      }
    };

    window.addEventListener('focus', performBackgroundSync);
    document.addEventListener('visibilitychange', performBackgroundSync);
    const syncInterval = setInterval(performBackgroundSync, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', performBackgroundSync);
      document.removeEventListener('visibilitychange', performBackgroundSync);
      clearInterval(syncInterval);
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

  // Sync handler
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    const result = await syncToGoogleSheets();
    setIsSyncing(false);

    if (result.success) {
      showNotice(result.message, 'success');
      const updatedConfig = await getSheetsConfig();
      const updatedOrders = await getAllOrders();
      const updatedCustomers = await getAllCustomers();
      const updatedServices = await getAllServices();
      setSheetsConfig(updatedConfig);
      setOrders(updatedOrders);
      setCustomers(updatedCustomers);
      setServices(updatedServices);
      setSyncQueue([]);
    } else {
      showNotice(result.message, 'warning');
    }
  };

  // Order Handlers
  const handleOrderCreated = async (order: Order) => {
    await saveOrder(order);
    const updated = await getAllOrders();
    setOrders(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);

    // Auto sync if online and enabled
    if (isOnline && sheetsConfig.scriptUrl && sheetsConfig.autoSync) {
      handleTriggerSync();
    } else if (!sheetsConfig.scriptUrl) {
      showNotice(
        `Order #${order.id} tersimpan di HP. Sambungkan Google Sheets di menu Sinkronisasi agar tersimpan ke Spreadsheet.`,
        'warning'
      );
    } else {
      showNotice(`Order #${order.id} berhasil dibuat!`, 'success');
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
    const updated = await getAllOrders();
    setOrders(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);
    showNotice(`Status pesanan diperbarui: ${nextStatus}`, 'success');

    if (isOnline && sheetsConfig.scriptUrl && sheetsConfig.autoSync) {
      handleTriggerSync();
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedOrder: Order = {
      ...order,
      paymentStatus,
      paymentDate: paymentStatus === 'Lunas' ? new Date().toISOString() : undefined,
    };
    await saveOrder(updatedOrder);
    const updated = await getAllOrders();
    setOrders(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);
    showNotice(`Pembayaran diperbarui: ${paymentStatus}`, 'success');

    if (isOnline && sheetsConfig.scriptUrl && sheetsConfig.autoSync) {
      handleTriggerSync();
    }
  };

  // Customer Handlers
  const handleSaveCustomer = async (cust: Customer) => {
    await saveCustomer(cust);
    const updated = await getAllCustomers();
    setCustomers(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);

    if (isOnline && sheetsConfig.autoSync) {
      handleTriggerSync();
    } else {
      showNotice(`Pelanggan ${cust.name} tersimpan!`, 'success');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    await deleteCustomer(id);
    const updated = await getAllCustomers();
    setCustomers(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);
    showNotice(`Pelanggan ${cust ? cust.name : ''} berhasil dihapus!`, 'warning');

    if (isOnline && sheetsConfig.autoSync) {
      handleTriggerSync();
    }
  };

  // Service Handlers
  const handleSaveService = async (service: ServiceItem) => {
    await saveService(service);
    const updated = await getAllServices();
    setServices(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);
    showNotice(`Layanan ${service.name} tersimpan!`, 'success');

    if (isOnline && sheetsConfig.autoSync) {
      handleTriggerSync();
    }
  };

  const handleDeleteService = async (id: string) => {
    await deleteService(id);
    const updated = await getAllServices();
    setServices(updated);
    const queue = await getSyncQueue();
    setSyncQueue(queue);
    showNotice('Layanan berhasil dihapus', 'warning');

    if (isOnline && sheetsConfig.autoSync) {
      handleTriggerSync();
    }
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

  // Config Handlers
  const handleSaveConfig = async (cfg: SheetsConfig) => {
    await saveSheetsConfig(cfg);
    setSheetsConfig(cfg);
    showNotice('Pengaturan sinkronisasi tersimpan!', 'success');
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
        onSync={handleTriggerSync}
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
            onSync={handleTriggerSync}
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
                syncQueueCount={syncQueue.length}
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
                config={sheetsConfig}
                syncQueue={syncQueue}
                isSyncing={isSyncing}
                onSaveConfig={handleSaveConfig}
                onTriggerSync={handleTriggerSync}
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
          if (isOnline && sheetsConfig.scriptUrl && (tab === 'customers' || tab === 'orders' || tab === 'dashboard')) {
            syncToGoogleSheets().then(async (res) => {
              if (res.success) {
                const freshOrders = await getAllOrders();
                const freshCustomers = await getAllCustomers();
                const freshServices = await getAllServices();
                setOrders(freshOrders);
                setCustomers(freshCustomers);
                setServices(freshServices);
              }
            }).catch(() => {});
          }
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
