import CartLocalStorageRepository from "../CartLocalStorageRepository";
import Cart from "../../../domain/cart/Cart";
import CartItem from "../../../domain/cart/CartItem";

const STORAGE_KEY = "shopping-cart:v1";

const sampleItem: CartItem = {
  id: "99",
  image: "https://example.com/img.jpg",
  title: "Test product",
  price: 9.99,
  quantity: 2
};

describe("CartLocalStorageRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns seed cart on first run", async () => {
    const repo = new CartLocalStorageRepository();
    const cart = await repo.get();

    expect(cart.items.length).toBeGreaterThan(0);
  });

  it("persists the cart across instances (simulated reload)", async () => {
    const repoA = new CartLocalStorageRepository();
    await repoA.save(new Cart([sampleItem]));

    const repoB = new CartLocalStorageRepository();
    const restored = await repoB.get();

    expect(restored.items).toHaveLength(1);
    expect(restored.items[0]).toEqual(sampleItem);
    expect(restored.totalPrice).toBeCloseTo(19.98, 2);
  });

  it("survives corrupted JSON in storage", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    const repo = new CartLocalStorageRepository();
    const cart = await repo.get();

    expect(cart.items.length).toBeGreaterThan(0); // falls back to seed
  });

  it("drops items with an invalid shape instead of crashing", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        sampleItem,
        { id: "bad" }, // missing fields
        { ...sampleItem, id: "x", quantity: -3 } // invalid quantity
      ])
    );

    const repo = new CartLocalStorageRepository();
    const cart = await repo.get();

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toEqual(sampleItem);
  });
});
