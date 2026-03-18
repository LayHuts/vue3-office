declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 乾坤(qiankun) 环境下 setImmediate 兼容
declare global {
  interface Window {
    setImmediate?: (callback: (...args: any[]) => void, ...args: any[]) => number;
  }
}
