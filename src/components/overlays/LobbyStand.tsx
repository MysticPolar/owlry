import { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { seasonId, seasonStock } from '../../lib/economy/config';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

/* ============================================================
   The lobby stand — keeper's counter in the front of house.

   The one place brass is spent. Stock rotates with the programme
   (a season is a calendar quarter); the small bottle is the only
   consumable, and it is deliberately never necessary — the well
   refills itself either way. Nothing here sells XP, a level, a
   book, or forgiveness.
   ============================================================ */

/* sprite ids from index.html — only those exist */
const GLYPH: Record<string, string> = {
  bottle: 'ti-inkdrop',
  stationery: 'ti-mail',
  marquee: 'ti-sparkles',
  cushion: 'ti-armchair',
};

export function LobbyStand() {
  const t = useT().profile;
  const open = useStore((s) => s.standOpen);
  const closeStand = useStore((s) => s.closeStand);
  const buyGood = useStore((s) => s.buyGood);
  const coins = useStore((s) => s.coins);
  const goods = useStore((s) => s.goods);
  const bottleUsed = useStore((s) => s.daily.bottle);

  const dialogRef = useRef<HTMLDivElement>(null);
  const { mounted, shown } = useOverlayPresence(open, { ref: dialogRef });
  useModalFocus(open && mounted, closeStand, dialogRef);

  if (!mounted) return null;

  const season = seasonId();
  const stock = seasonStock(season);

  return (
    <>
      {/* the app's shared scrim keys off `sheetId`, which the stand never sets —
          without one of its own an aria-modal dialog would sit over a fully
          live screen (the gear, the tabs and the nav all still tappable) */}
      <div
        className={`backdrop${shown ? ' on' : ''}`}
        onClick={closeStand}
        aria-hidden="true"
      />
      <div
        className={`sheet pb-sheet pb-stand${shown ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.standTitle}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          className="pb-sh-close"
          aria-label={t.standClose}
          onClick={closeStand}
        >
          <Icon name="ti-x" />
        </button>

        <div className="pb-stand-head">
          <CastOwl owl="keeper" cls="mini" />
          <div>
            <div className="pb-stand-t d">{t.standTitle}</div>
            <div className="pb-stand-sub">{t.standSub}</div>
          </div>
          <div
            className="pb-chip pb-stand-purse"
            aria-label={t.standPurse(coins)}
          >
            <Icon name="ti-coin" className="coin" />
            <span className="n">{coins.toLocaleString()}</span>
          </div>
        </div>

        <div className="pb-stand-season">{t.standSeason(season + 1)}</div>

        {stock.length === 0 && (
          <p className="pb-stand-empty it">{t.standEmpty}</p>
        )}

        <ul className="pb-stand-list">
          {stock.map((good) => {
            // copy is keyed by kind (the rotating stationery changes sku each
            // programme but keeps its name), with room for a per-sku override
            const copy = t.goods[good.sku] ??
              t.goods[good.kind] ?? { n: good.sku, d: '' };
            const owned = good.kind !== 'bottle' && goods.includes(good.sku);
            const spent = good.kind === 'bottle' && bottleUsed;
            const afford = coins >= good.price;
            const disabled = owned || spent || !afford;
            return (
              <li
                key={good.sku}
                className={`pb-stand-row${owned ? ' owned' : ''}`}
              >
                <span className="pb-stand-glyph" aria-hidden="true">
                  <Icon name={GLYPH[good.kind] ?? 'ti-ticket'} />
                </span>
                <span className="pb-stand-copy">
                  <span className="pb-stand-n">{copy.n}</span>
                  <span className="pb-stand-d">
                    {copy.d}
                    {good.kind === 'bottle' && ` · ${t.standBottleNote}`}
                  </span>
                </span>
                {owned ? (
                  <span className="pb-stand-owned">{t.standOwned}</span>
                ) : (
                  <button
                    type="button"
                    className="pb-cta pb-stand-buy"
                    disabled={disabled}
                    onClick={() => buyGood(good.sku)}
                    aria-label={`${t.standBuy} — ${copy.n}`}
                  >
                    <Icon name="ti-coin" className="coin" />
                    {t.standPrice(good.price)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export default LobbyStand;
