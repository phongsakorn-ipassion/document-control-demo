import { create } from 'zustand'

const useAppStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  currentScreen: 'global-dashboard',
  currentSite: null,
  setScreen: (screen) => set({ currentScreen: screen }),
  setSite: (site) => set({
    currentSite: site,
    currentScreen: site ? 'site-overview' : 'global-dashboard',
  }),

  selectedFolder: '01',
  previewDoc: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder, previewDoc: null }),
  setPreviewDoc: (doc) => set({ previewDoc: doc }),

  activePageId: null,
  wikiEditMode: false,
  setActivePageId: (id) => set({ activePageId: id, wikiEditMode: false }),
  setWikiEditMode: (mode) => set({ wikiEditMode: mode }),

  activeListId: null,
  setActiveListId: (id) => set({ activeListId: id }),

  shareToken: null,
  setShareToken: (token) => set({ shareToken: token }),
}))

export default useAppStore
