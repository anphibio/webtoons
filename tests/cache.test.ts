import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbCacheStore, createCacheKey } from "../packages/shared/src/cache";

describe("cache local", () => {
  let databaseName = "webtoon-translator-cache-test";

  beforeEach(() => {
    databaseName = `webtoon-translator-cache-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

  it("armazena e recupera resultados por tipo e chave", async () => {
    const store = new IndexedDbCacheStore(databaseName);
    const key = createCacheKey("image-bytes", "eng", "ocr-v1");

    await store.put("ocr", key, { text: "Hello" }, 60_000);

    await expect(store.get("ocr", key)).resolves.toEqual({ text: "Hello" });
    await expect(store.get("translation", key)).resolves.toBeNull();
  });

  it("não retorna registros expirados e consegue limpar o cache", async () => {
    const store = new IndexedDbCacheStore(databaseName);
    await store.put("ocr", "expired", { text: "old" }, -1);
    await store.put("translation", "active", { text: "Olá" }, 60_000);

    await expect(store.get("ocr", "expired")).resolves.toBeNull();
    await store.clear();
    await expect(store.get("translation", "active")).resolves.toBeNull();
  });

  it("remove entradas expiradas sem apagar as ainda válidas", async () => {
    const store = new IndexedDbCacheStore(databaseName);
    await store.put("ocr", "expired", { text: "old" }, -1);
    await store.put("translation", "active", { text: "Olá" }, 60_000);

    await expect(store.pruneExpired()).resolves.toBe(1);
    await expect(store.get("ocr", "expired")).resolves.toBeNull();
    await expect(store.get("translation", "active")).resolves.toEqual({ text: "Olá" });
  });
});
