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
