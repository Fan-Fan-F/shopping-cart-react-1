import Cart from "../../domain/cart/Cart";
import CartItem from "../../domain/cart/CartItem";
import CartRepository from "../../domain/cart/CartRepository";

const STORAGE_KEY = "shopping-cart:v1";

/**
 * Seed data used the very first time the app runs (when nothing has been
 * persisted yet). Mirrors the previous in-memory defaults so behaviour
 * stays familiar for existing users.
 */
const SEED_ITEMS: CartItem[] = [
  {
    id: "1",
    image:
      "https://m.media-amazon.com/images/I/81oKhu2bsgL._AC_UL640_FMwebp_QL65_.jpg",
    title: "Element Blazin LS tee Shirt, Hombre",
    price: 19.95,
    quantity: 3
  },
  {
    id: "2",
    image:
      "https://m.media-amazon.com/images/I/81HnHYik58L._AC_UL640_FMwebp_QL65_.jpg",
    title: "Element Vertical SS tee Shirt, Hombre",
    price: 21.95,
    quantity: 1
  }
];

/**
 * CartRepository implementation backed by window.localStorage.
 *
 * Improvements over the in-memory repository:
 *  - the cart survives page reloads and browser restarts;
 *  - corrupted JSON or unavailable storage (private mode, quota) degrades
 *    gracefully to an in-memory cart instead of crashing the app;
 *  - items are validated on read so a stale schema never reaches the domain.
 */
export default class CartLocalStorageRepository implements CartRepository {
  private memoryFallback: Cart | null = null;

  get(): Promise<Cart> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.readCart());
      }, 100);
    });
  }

  save(cart: Cart): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.writeCart(cart);
        resolve(true);
      }, 100);
    });
  }

  private readCart(): Cart {
    const raw = this.safeStorage()?.getItem(STORAGE_KEY);
    if (raw == null) {
      return this.memoryFallback ?? new Cart(SEED_ITEMS);
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Cart(SEED_ITEMS);
      }
      const items = parsed.filter(isValidCartItem);
      return new Cart(items);
    } catch {
      // Corrupted payload: start from seed instead of crashing.
      return new Cart(SEED_ITEMS);
    }
  }

  private writeCart(cart: Cart): void {
    const storage = this.safeStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(cart.items));
        return;
      } catch {
        // Quota exceeded or serialization issue: fall through to memory.
      }
    }
    this.memoryFallback = cart;
  }

  private safeStorage(): Storage | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Probe: some environments expose localStorage but throw on access.
        const probe = "__cart_probe__";
        window.localStorage.setItem(probe, probe);
        window.localStorage.removeItem(probe);
        return window.localStorage;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

function isValidCartItem(candidate: unknown): candidate is CartItem {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }
  const item = candidate as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.image === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}
