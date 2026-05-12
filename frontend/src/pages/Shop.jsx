import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store';
import { sfx } from '../sfx';

const CATEGORY_NAMES = { frame: '🖼 Рамки', title: '🏷 Титулы', color: '🎨 Цвета ника', emoji: '😀 Эмодзи' };

export default function Shop() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [coins, setCoins] = useState(user?.coins || 0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.shopItems().then(setItems).catch(() => {});
    api.shopMy().then(setMyItems).catch(() => {});
    api.me().then((u) => setCoins(u.coins || 0)).catch(() => {});
  }, []);

  const ownedCodes = new Set(myItems.map((i) => i.code));
  const equippedCodes = new Set(myItems.filter((i) => i.equipped).map((i) => i.code));

  const buy = async (code, price) => {
    setMsg('');
    try {
      const res = await api.shopBuy(code);
      setCoins(res.coins);
      setMyItems([...myItems, { code, equipped: false }]);
      sfx.correct();
      setMsg('✓ Куплено!');
    } catch (e) {
      setMsg(e.message);
      sfx.wrong();
    }
  };

  const equip = async (code) => {
    try {
      const res = await api.shopEquip(code);
      // Обновляем локально
      const item = items.find((i) => i.code === code);
      setMyItems((prev) => prev.map((i) => ({
        ...i,
        equipped: i.code === code ? res.equipped : (item && items.find((x) => x.code === i.code)?.category === item.category ? false : i.equipped),
      })));
      sfx.tap();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const grouped = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛒 Магазин</h1>
        <span className="chip-solid text-base">🪙 {coins}</span>
      </div>
      <p className="text-paper-600 text-sm">Монеты зарабатываются за решение судоку и мини-игры.</p>

      {msg && <p className="text-center text-sm text-paper-700">{msg}</p>}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-lg font-semibold">{CATEGORY_NAMES[cat] || cat}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {catItems.map((item) => {
              const owned = ownedCodes.has(item.code);
              const equipped = equippedCodes.has(item.code);
              return (
                <div key={item.id} className={`card p-3 flex items-center gap-3 ${equipped ? 'ring-2 ring-black dark:ring-white' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-paper-500">{item.description}</p>
                  </div>
                  {!owned ? (
                    <button
                      className="btn text-xs py-1 px-2"
                      onClick={() => buy(item.code, item.price)}
                      disabled={coins < item.price}
                    >
                      🪙 {item.price}
                    </button>
                  ) : (
                    <button
                      className={`text-xs py-1 px-2 rounded-lg transition ${equipped ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-paper-200 hover:bg-paper-300'}`}
                      onClick={() => equip(item.code)}
                    >
                      {equipped ? '✓ Надето' : 'Надеть'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
