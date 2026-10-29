// 在被测模块读取 globalThis.chrome 之前装好一个假的 tabs API，测试里按需改 state
export const state = { tabs: [], removed: [], fresh: {} };

globalThis.chrome = {
  tabs: {
    query: async () => state.tabs,
    get: async (id) => {
      if (state.fresh[id] === null) throw new Error(`No tab with id: ${id}`);
      return { ...state.tabs.find((t) => t.id === id), ...state.fresh[id] };
    },
    remove: async (id) => {
      state.removed.push(id);
    },
  },
  windows: { getCurrent: async () => ({ id: 1 }) },
};
