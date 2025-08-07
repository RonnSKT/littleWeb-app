import { ElectronAPI } from '@electron-toolkit/preload'

export interface Product {
  id: number
  name: string
  price: number
  quantity: number
}

export interface CartItem {
  id: number; // product id
  name: string;
  price: number;
  quantity: number; // quantity in cart
}

export interface Theme {
  name: string;
  colors: Record<string, string>;
}

export interface IApi {
  getProducts: () => Promise<Product[]>
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>
  updateProduct: (product: Product) => Promise<Product>
  deleteProduct: (id: number) => Promise<void>
  finalizeSale: (payload: { cartItems: CartItem[], totalAmount: number }) => Promise<{ saleId: number }>
  themes: {
    get: () => Promise<Theme[]>;
    onThemeAdded: (callback: (theme: Theme) => void) => void;
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IApi
  }
}
