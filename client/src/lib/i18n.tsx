import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "pt";

const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: "Dashboard",
      vehicles: "Vehicles",
      bookings: "Bookings",
      sharedRides: "Shared Rides",
      maintenance: "Maintenance",
      fuel: "Fuel Logs",
      users: "Users",
      settings: "Settings",
      reports: "Reports",
      logout: "Logout",
    },
    // Common buttons
    buttons: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      create: "Create",
      submit: "Submit",
      approve: "Approve",
      reject: "Reject",
      export: "Export",
      print: "Print Report",
      close: "Close",
      confirm: "Confirm",
      startTrip: "Start Trip",
      endTrip: "End Trip",
      joinTrip: "Join Trip",
      newBooking: "New Booking",
      newVehicle: "New Vehicle",
      setPending: "Set Pending",
    },
    // Status labels
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      available: "Available",
      in_use: "In Use",
      maintenance: "Maintenance",
      unavailable: "Unavailable",
      open: "Open",
      full: "Full",
    },
    // Common labels
    labels: {
      language: "Language",
      english: "English",
      portuguese: "Portuguese",
      loading: "Loading...",
      noRecords: "No records found",
      welcome: "Welcome",
      search: "Search",
      filter: "Filter",
      all: "All",
    },
    // Dashboard
    dashboard: {
      title: "Dashboard",
      overview: "Overview of your fleet management system",
      totalVehicles: "Total Vehicles",
      inUse: "In Use",
      inMaintenance: "In Maintenance",
      pendingApproval: "Pending Approval",
      available: "available",
      currentlyBooked: "Currently booked",
      requiresAttention: "Requires attention",
      allClear: "All clear",
      actionNeeded: "Action needed",
      noPending: "No pending",
      fuelCostByVehicle: "Fuel Cost by Vehicle",
      top5Vehicles: "Top 5 vehicles by fuel expense",
      total: "total",
      noFuelRecords: "No fuel records yet",
      vehicleStatus: "Vehicle Status",
      currentDistribution: "Current vehicle distribution",
      noVehiclesRegistered: "No vehicles registered",
      bookingOverview: "Booking Overview",
      bookingStatusBreakdown: "Current booking status breakdown",
      completionRate: "Completion Rate",
      recentBookings: "Recent Bookings",
      latestActivity: "Latest booking activity",
      noBookingsYet: "No bookings yet",
    },
  },
  pt: {
    // Navigation
    nav: {
      dashboard: "Painel",
      vehicles: "Veículos",
      bookings: "Reservas",
      sharedRides: "Viagens Partilhadas",
      maintenance: "Manutenção",
      fuel: "Registos de Combustível",
      users: "Utilizadores",
      settings: "Definições",
      reports: "Relatórios",
      logout: "Sair",
    },
    // Common buttons
    buttons: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Adicionar",
      create: "Criar",
      submit: "Submeter",
      approve: "Aprovar",
      reject: "Rejeitar",
      export: "Exportar",
      print: "Imprimir Relatório",
      close: "Fechar",
      confirm: "Confirmar",
      startTrip: "Iniciar Viagem",
      endTrip: "Terminar Viagem",
      joinTrip: "Aderir à Viagem",
      newBooking: "Nova Reserva",
      newVehicle: "Novo Veículo",
      setPending: "Definir Pendente",
    },
    // Status labels
    status: {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
      in_progress: "Em Curso",
      completed: "Concluído",
      cancelled: "Cancelado",
      available: "Disponível",
      in_use: "Em Uso",
      maintenance: "Manutenção",
      unavailable: "Indisponível",
      open: "Aberto",
      full: "Completo",
    },
    // Common labels
    labels: {
      language: "Idioma",
      english: "Inglês",
      portuguese: "Português",
      loading: "A carregar...",
      noRecords: "Nenhum registo encontrado",
      welcome: "Bem-vindo",
      search: "Pesquisar",
      filter: "Filtrar",
      all: "Todos",
    },
    // Dashboard
    dashboard: {
      title: "Painel",
      overview: "Visão geral do sistema de gestão de frota",
      totalVehicles: "Total de Veículos",
      inUse: "Em Uso",
      inMaintenance: "Em Manutenção",
      pendingApproval: "Aprovação Pendente",
      available: "disponíveis",
      currentlyBooked: "Actualmente reservados",
      requiresAttention: "Requer atenção",
      allClear: "Tudo em ordem",
      actionNeeded: "Acção necessária",
      noPending: "Sem pendentes",
      fuelCostByVehicle: "Custo de Combustível por Veículo",
      top5Vehicles: "Top 5 veículos por despesa de combustível",
      total: "total",
      noFuelRecords: "Sem registos de combustível",
      vehicleStatus: "Estado dos Veículos",
      currentDistribution: "Distribuição actual dos veículos",
      noVehiclesRegistered: "Nenhum veículo registado",
      bookingOverview: "Visão Geral das Reservas",
      bookingStatusBreakdown: "Repartição do estado das reservas",
      completionRate: "Taxa de Conclusão",
      recentBookings: "Reservas Recentes",
      latestActivity: "Actividade de reservas mais recente",
      noBookingsYet: "Ainda sem reservas",
    },
  },
};

type Translations = typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("fleetcmd-language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("fleetcmd-language", lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem("fleetcmd-language");
    if (saved && (saved === "en" || saved === "pt")) {
      setLanguageState(saved);
    }
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
