"use client";
import { create } from "zustand";

interface FormStoreState {
  formIsOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
  toggleForm: () => void;
}
interface MenuStoreState {
  menuIsOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  formType: string;
  setFormType: (type: string) => void;
}
interface EventsModalStoreState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

export const useFormStore = create<FormStoreState>((set) => ({
  formIsOpen: false,
  openForm: () => set(() => ({ formIsOpen: true })),
  closeForm: () => set(() => ({ formIsOpen: false })),
  toggleForm: () => set((state) => ({ formIsOpen: !state.formIsOpen })),
}));

export const useMenuStore = create<MenuStoreState>((set) => ({
  menuIsOpen: true,
  formType: "",
  setFormType: (type: string) => set({ formType: type }),
  openMenu: () => set(() => ({ menuIsOpen: true })),
  closeMenu: () => set(() => ({ menuIsOpen: false })),
  toggleMenu: () => set((state) => ({ menuIsOpen: !state.menuIsOpen })),
}));

export const useEventsModalStore = create<EventsModalStoreState>((set) => ({
  isOpen: false,
  openModal: () => set(() => ({ isOpen: true })),
  closeModal: () => set(() => ({ isOpen: false })),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
