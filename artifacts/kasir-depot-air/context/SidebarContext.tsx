/**
 * SidebarContext — State buka/tutup sidebar navigasi
 */
import React, { createContext, useContext, useState } from 'react';

type SidebarCtx = {
  isOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
};

const SidebarContext = createContext<SidebarCtx>({
  isOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{
      isOpen,
      openSidebar: () => setIsOpen(true),
      closeSidebar: () => setIsOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
